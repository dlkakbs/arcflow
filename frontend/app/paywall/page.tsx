"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract, useSignMessage } from "wagmi";
import { formatUnits, parseUnits, keccak256, encodePacked, toBytes } from "viem";
import { CONTRACTS } from "@/lib/wagmi";
import { PAYWALL_ADDRESS } from "@/lib/arcChain";

const ARC_CHAIN_ID = 5042002;
import { ArrowUpRight, Sparkles, Wallet, Gauge, Coins, Zap } from "lucide-react";

const ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "client", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "requestsRemaining",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "client", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "pricePerRequest",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const reveal = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.18 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[2rem] border border-white/12 bg-white/8 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.22)] ${className}`}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm uppercase tracking-[0.22em] text-white/55">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-white/12 bg-black/20 px-4 py-3.5 text-white outline-none transition focus:border-white/30"
    />
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <div className="text-[#ffd7c7]">{icon}</div>
        <p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
      </div>
      <div className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
    </div>
  );
}

export default function PaywallPage() {
  const { address, isConnected } = useAccount();

  const { writeContract: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract();
  const { writeContract: writeWithdraw, data: withdrawHash, isPending: isWithdrawPending } = useWriteContract();
  const { signMessageAsync } = useSignMessage();

  const { isLoading: isDepositMining, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });
  const { isLoading: isWithdrawMining, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [prompt, setPrompt] = useState("");
  const [apiResult, setApiResult] = useState<null | { success?: boolean; response?: { message: string; model: string; timestamp: string }; creditsUsed?: number; creditsRemaining?: string; error?: string }>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const { data: balance } = useReadContract({
    address: CONTRACTS.arcPaywall,
    abi: ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { data: remaining } = useReadContract({
    address: CONTRACTS.arcPaywall,
    abi: ABI,
    functionName: "requestsRemaining",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { data: price } = useReadContract({
    address: CONTRACTS.arcPaywall,
    abi: ABI,
    functionName: "pricePerRequest",
    query: { refetchInterval: 60000 },
  });

  const depositBusy = isDepositPending || isDepositMining;
  const withdrawBusy = isWithdrawPending || isWithdrawMining;

  function handleDeposit() {
    if (!depositAmt) return;
    writeDeposit({
      address: CONTRACTS.arcPaywall,
      abi: ABI,
      functionName: "deposit",
      value: parseUnits(depositAmt, 6),
    });
  }

  async function handleTryRequest() {
    if (!address || !prompt.trim()) return;
    setApiLoading(true);
    setApiResult(null);
    try {
      // 1. Nonce rezerve et — server authoritative pricePerRequest döner
      const nonceRes = await fetch("/api/get-nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientAddress: address }),
      });
      const { nonce, reservationId, deadline, pricePerRequest, error: nonceErr } = await nonceRes.json();
      if (nonceErr) { setApiResult({ error: nonceErr }); return; }

      // 2. Hash oluştur (contract ile aynı encoding)
      const msgHash = keccak256(
        encodePacked(
          ["address", "uint256", "address", "uint256", "uint256", "uint256"],
          [
            PAYWALL_ADDRESS,
            BigInt(ARC_CHAIN_ID),
            address,
            BigInt(nonce),
            BigInt(deadline),
            BigInt(pricePerRequest),
          ]
        )
      );

      // 3. Off-chain imzala — gas yok, zincire gitmez
      const signature = await signMessageAsync({ message: { raw: toBytes(msgHash) } });

      // 4. API'ye gönder — imza queue'ya eklenir, response anında döner
      const idempotencyKey = crypto.randomUUID();
      const reqRes = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
          idempotencyKey,
          signature,
          prompt: prompt.trim(),
          clientAddress: address,
        }),
      });
      const data = await reqRes.json();
      setApiResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed. Try again.";
      setApiResult({ error: msg });
    } finally {
      setApiLoading(false);
    }
  }

  function handleWithdraw() {
    if (!withdrawAmt) return;
    writeWithdraw({
      address: CONTRACTS.arcPaywall,
      abi: ABI,
      functionName: "withdraw",
      args: [parseUnits(withdrawAmt, 6)],
    });
  }

  const requestEstimate = useMemo(() => {
    if (!depositAmt || price === undefined) return null;
    const numericPrice = Number(formatUnits(price, 6));
    if (!numericPrice) return null;
    return Math.floor(Number(depositAmt) / numericPrice);
  }, [depositAmt, price]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#120f1d] text-white">
      <div className="fixed inset-0 -z-20 bg-[linear-gradient(180deg,#120f1d_0%,#1d1530_42%,#0f1722_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-90 bg-[radial-gradient(circle_at_14%_18%,rgba(255,179,138,0.18),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(255,215,199,0.12),transparent_22%),radial-gradient(circle_at_68%_55%,rgba(255,140,80,0.10),transparent_28%),radial-gradient(circle_at_18%_78%,rgba(255,179,138,0.08),transparent_22%)]" />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10 md:px-10 lg:px-12">
        <Reveal className="flex min-h-[72vh] items-center justify-center">
          <div className="max-w-4xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#ffd7c7] backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" /> Paywall · micro access
            </div>

            <h1 className="mt-8 text-5xl font-semibold leading-[0.9] tracking-[-0.06em] text-white md:text-7xl lg:text-[86px]">
              Turn access
              <span className="block text-[#ffb38a]">into micropayments</span>
              <span className="block text-white/85">with one deposit.</span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-white/68 md:text-[21px]">
              Deposit once, consume request credits over time, and pay only for actual usage instead of bloated subscriptions.
            </p>
          </div>
        </Reveal>

        {isConnected && (
          <Reveal>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <Stat
                label="Balance"
                value={balance !== undefined ? `${formatUnits(balance, 6)} USDC` : "—"}
                icon={<Wallet className="h-4 w-4" />}
              />
              <Stat
                label="Requests remaining"
                value={remaining !== undefined ? remaining.toString() : "—"}
                icon={<Gauge className="h-4 w-4" />}
              />
              <Stat
                label="Price / request"
                value={price !== undefined ? `${formatUnits(price, 6)} USDC` : "—"}
                icon={<Coins className="h-4 w-4" />}
              />
            </div>
          </Reveal>
        )}

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <Reveal className="h-full">
            <GlassCard className="h-full overflow-hidden flex flex-col">
              <div className="border-b border-white/10 p-7 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-white/50">Deposit credits</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Fund your request balance</h2>
              </div>

              <div className="flex flex-col justify-between flex-1 space-y-5 p-7 md:p-8">
                <div className="space-y-5">
                  <div>
                    <Label>Amount (USDC)</Label>
                    <Input
                      type="number"
                      placeholder="1.00"
                      step="0.001"
                      value={depositAmt}
                      onChange={(e) => setDepositAmt(e.target.value)}
                    />
                    {requestEstimate !== null && (
                      <p className="mt-2 text-sm text-white/45">≈ {requestEstimate} requests</p>
                    )}
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={!isConnected || depositBusy || !depositAmt}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#fff4ec] px-6 py-4 text-sm font-semibold text-[#291c28] transition disabled:opacity-40"
                  >
                    {depositBusy ? "Processing..." : "Deposit credits"}
                    <ArrowUpRight className="h-4 w-4" />
                  </button>

                  {isDepositSuccess && depositHash && (
                    <div className="rounded-2xl border border-[#ffb38a]/20 bg-[#ffb38a]/10 p-4 text-sm text-[#ffd7c7] space-y-2">
                      <p>Deposit confirmed. Your request credits have been added.</p>
                      <a
                        href={`https://testnet.arcscan.app/tx/${depositHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-[#ffb38a] underline underline-offset-2"
                      >
                        View transaction
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}

                  {!isConnected && <p className="text-sm text-white/45">Connect wallet to continue.</p>}
                </div>
              </div>
            </GlassCard>
          </Reveal>

          <Reveal className="h-full">
            <GlassCard className="h-full overflow-hidden flex flex-col">
              <div className="border-b border-white/10 p-7 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-white/50">Withdraw credits</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Recover unused balance</h2>
              </div>

              <div className="flex flex-col justify-between flex-1 space-y-5 p-7 md:p-8">
                <div className="space-y-5">
                  <div>
                    <Label>Amount (USDC)</Label>
                    <Input
                      type="number"
                      placeholder="1.00"
                      step="0.001"
                      value={withdrawAmt}
                      onChange={(e) => setWithdrawAmt(e.target.value)}
                    />
                    {balance !== undefined && (
                      <p className="mt-2 text-sm text-white/45">Available: {formatUnits(balance, 6)} USDC</p>
                    )}
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={!isConnected || withdrawBusy || !withdrawAmt}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/14 bg-white/8 px-6 py-4 text-sm font-semibold text-white transition disabled:opacity-40"
                  >
                    {withdrawBusy ? "Processing..." : "Withdraw"}
                    <ArrowUpRight className="h-4 w-4" />
                  </button>

                  {isWithdrawSuccess && withdrawHash && (
                    <div className="rounded-2xl border border-[#ffb38a]/20 bg-[#ffb38a]/10 p-4 text-sm text-[#ffd7c7] space-y-2">
                      <p>Withdrawal confirmed. Funds have been returned to your wallet.</p>
                      <a
                        href={`https://testnet.arcscan.app/tx/${withdrawHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-[#ffb38a] underline underline-offset-2"
                      >
                        View transaction
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}

                  {!isConnected && <p className="text-sm text-white/45">Connect wallet to continue.</p>}
                </div>
              </div>
            </GlassCard>
          </Reveal>
        </div>
        <Reveal>
          <GlassCard className="mt-6 overflow-hidden">
            <div className="border-b border-white/10 p-7 md:p-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/12 bg-black/20 p-3">
                  <Zap className="h-5 w-5 text-[#ffb38a]" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-white/50">Live demo</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Try a paid API request</h2>
                </div>
              </div>
            </div>

            <div className="p-7 md:p-8">
              <p className="max-w-xl text-sm leading-7 text-white/60">
                Make a request and pay per call using your on-chain balance. Each request deducts one credit automatically.
              </p>

              <div className="mt-6 space-y-3 max-w-xl">
                <textarea
                  rows={3}
                  placeholder="Ask something..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleTryRequest();
                    }
                  }}
                  className="w-full rounded-2xl border border-white/12 bg-black/20 px-4 py-3.5 text-white outline-none transition focus:border-white/30 resize-none text-sm leading-7"
                />
                <button
                  onClick={handleTryRequest}
                  disabled={!isConnected || apiLoading || !prompt.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#fff4ec] px-6 py-4 text-sm font-semibold text-[#291c28] transition disabled:opacity-40"
                >
                  {apiLoading ? "Sending request..." : "Send request"}
                  <ArrowUpRight className="h-4 w-4" />
                </button>
                {!isConnected && <p className="text-sm text-white/45">Connect wallet to continue.</p>}
              </div>

              {apiResult && (
                <div className="mt-6 max-w-xl space-y-4">
                  {apiResult.error ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/8 p-5 text-sm text-red-300">
                      {apiResult.error}
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/40 mb-3">Response</p>
                        <p className="text-base leading-7 text-white">{apiResult.response?.message}</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Credits used</div>
                          <div className="text-xl font-semibold text-white">{apiResult.creditsUsed}</div>
                        </div>
                        <div className="flex-1 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Credits remaining</div>
                          <div className="text-xl font-semibold text-white">{apiResult.creditsRemaining}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </Reveal>
      </main>
    </div>
  );
}
