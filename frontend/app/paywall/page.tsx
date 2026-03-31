"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CONTRACTS } from "@/lib/wagmi";
import { ArrowUpRight, Sparkles, Wallet, Gauge, Coins } from "lucide-react";

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
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
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
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isMining } = useWaitForTransactionReceipt({ hash });

  const [depositAmt, setDepositAmt] = useState("");

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

  const busy = isPending || isMining;

  function handleDeposit() {
    if (!depositAmt) return;
    writeContract({
      address: CONTRACTS.arcPaywall,
      abi: ABI,
      functionName: "deposit",
      value: parseUnits(depositAmt, 6),
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

        <div className="grid gap-6">
          <Reveal>
            <GlassCard className="overflow-hidden">
              <div className="border-b border-white/10 p-7 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-white/50">Deposit credits</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Fund your request balance</h2>
              </div>

              <div className="space-y-6 p-7 md:p-8">
                {isConnected && (
                  <div className="grid gap-4 md:grid-cols-3">
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
                )}

                <div className="max-w-xl">
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
                  disabled={!isConnected || busy || !depositAmt}
                  className="inline-flex w-full max-w-xl items-center justify-center gap-2 rounded-full bg-[#fff4ec] px-6 py-4 text-sm font-semibold text-[#291c28] transition disabled:opacity-40"
                >
                  {busy ? "Processing..." : "Deposit credits"}
                  <ArrowUpRight className="h-4 w-4" />
                </button>

                {!isConnected && <p className="text-sm text-white/45">Connect wallet to continue.</p>}
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
