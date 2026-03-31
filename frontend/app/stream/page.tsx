"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { decodeEventLog, formatUnits, parseUnits } from "viem";
import { CONTRACTS } from "@/lib/wagmi";
import { ArrowUpRight, Sparkles, Wallet, Activity, Radio } from "lucide-react";

const ABI = [
  {
    name: "createStream",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "rate", type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelStream",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    name: "monthlyToRate",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "monthlyUsdc", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "streams",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "payer", type: "address" },
      { name: "recipient", type: "address" },
      { name: "rate", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "deposit", type: "uint256" },
      { name: "withdrawn", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    name: "withdrawable",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "remainingTime",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "StreamCreated",
    type: "event",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "rate", type: "uint256", indexed: false },
      { name: "deposit", type: "uint256", indexed: false },
    ],
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
    <div className={`rounded-[2rem] border border-white/12 bg-white/8 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.22)] ${className}`}>
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

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function timeAgo(startTime: bigint) {
  const seconds = Math.floor(Date.now() / 1000) - Number(startTime);
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export default function StreamPage() {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isMining, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const [recipient, setRecipient] = useState("");
  const [monthly, setMonthly] = useState("");
  const [deposit, setDeposit] = useState("");
  const [streamId, setStreamId] = useState<bigint | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [confirmedLookupId, setConfirmedLookupId] = useState("");
  const [tick, setTick] = useState(0);

  // Tick every second for live withdrawable display
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: rate } = useReadContract({
    address: CONTRACTS.arcFlow,
    abi: ABI,
    functionName: "monthlyToRate",
    args: monthly ? [parseUnits(monthly, 6)] : undefined,
    query: { enabled: !!monthly },
  });

  // Active stream ID (from creation or manual lookup)
  const activeId = streamId ?? (confirmedLookupId ? BigInt(confirmedLookupId) : null);

  const { data: streamData } = useReadContract({
    address: CONTRACTS.arcFlow,
    abi: ABI,
    functionName: "streams",
    args: activeId !== null ? [activeId] : undefined,
    query: { enabled: activeId !== null, refetchInterval: 10000 },
  });

  const { data: withdrawableRaw } = useReadContract({
    address: CONTRACTS.arcFlow,
    abi: ABI,
    functionName: "withdrawable",
    args: activeId !== null ? [activeId] : undefined,
    query: { enabled: activeId !== null, refetchInterval: 5000 },
  });

  const { data: remainingTimeSec } = useReadContract({
    address: CONTRACTS.arcFlow,
    abi: ABI,
    functionName: "remainingTime",
    args: activeId !== null ? [activeId] : undefined,
    query: { enabled: activeId !== null, refetchInterval: 10000 },
  });

  // Extract stream ID from receipt logs after creation
  useEffect(() => {
    if (!receipt) return;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: ABI, eventName: "StreamCreated", data: log.data, topics: log.topics });
        setStreamId((decoded.args as { id: bigint }).id);
        break;
      } catch {
        continue;
      }
    }
  }, [receipt]);

  // Client-side accrual between refetches — adds rate*tick for smooth display
  const withdrawableDisplay = useMemo(() => {
    if (withdrawableRaw === undefined || !streamArr) return null;
    const ratePerSec = streamArr[2];
    const extra = ratePerSec * BigInt(tick % 5);
    const total = withdrawableRaw + extra;
    return formatUnits(total, 6);
  }, [withdrawableRaw, streamArr, tick]);

  function handleCreate() {
    if (!recipient || !monthly || !deposit) return;
    setStreamId(null);
    writeContract({
      address: CONTRACTS.arcFlow,
      abi: ABI,
      functionName: "createStream",
      args: [recipient as `0x${string}`, rate ?? 0n],
      value: parseUnits(deposit, 6),
    });
  }

  const busy = isPending || isMining;

  const runwayDays = useMemo(() => {
    if (!deposit || !monthly || Number(monthly) <= 0) return null;
    return Math.floor((Number(deposit) / Number(monthly)) * 30);
  }, [deposit, monthly]);

  // payer[0], recipient[1], rate[2], startTime[3], deposit[4], withdrawn[5], active[6]
  const streamArr = streamData as readonly [string, string, bigint, bigint, bigint, bigint, boolean] | undefined;
  const streamMonthly = streamArr ? Number(formatUnits(streamArr[2], 6)) * 2_592_000 : null;
  const streamRunwayDays = remainingTimeSec !== undefined
    ? Math.floor(Number(remainingTimeSec) / 86400)
    : null;

  return (
    <div className="min-h-screen overflow-hidden bg-[#120f1d] text-white">
      <div className="fixed inset-0 -z-20 bg-[linear-gradient(180deg,#120f1d_0%,#1d1530_42%,#0f1722_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-90 bg-[radial-gradient(circle_at_12%_18%,rgba(255,179,138,0.18),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(255,215,199,0.12),transparent_22%),radial-gradient(circle_at_68%_55%,rgba(255,140,80,0.10),transparent_28%),radial-gradient(circle_at_18%_78%,rgba(255,179,138,0.08),transparent_22%)]" />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10 md:px-10 lg:px-12">
        <Reveal className="flex min-h-[72vh] items-center justify-center">
          <div className="max-w-4xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#ffd7c7] backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" /> Stream · continuous payments
            </div>
            <h1 className="mt-8 text-5xl font-semibold leading-[0.9] tracking-[-0.06em] text-white md:text-7xl lg:text-[86px]">
              Pay people
              <span className="block text-[#ffb38a]">continuously</span>
              <span className="block text-white/85">with native USDC.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-white/68 md:text-[21px]">
              Stream salaries, retainers, or subscriptions in real time. Funds accrue every second and recipients
              withdraw whenever they want.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6">
          {/* Create stream card */}
          <Reveal>
            <GlassCard className="overflow-hidden">
              <div className="border-b border-white/10 p-7 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-white/50">New stream</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Create a live payment flow</h2>
                  </div>
                  <div className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs text-white/70">ArcFlow</div>
                </div>
              </div>

              <div className="p-7 md:p-8">
                <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
                  <div className="space-y-5">
                    <div>
                      <Label>Recipient address</Label>
                      <Input placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                    </div>
                    <div>
                      <Label>Monthly amount (USDC)</Label>
                      <Input type="number" placeholder="1000" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
                      {rate !== undefined && <p className="mt-2 text-sm text-white/45">≈ {rate.toString()} wei/sec</p>}
                    </div>
                    <div>
                      <Label>Initial deposit (USDC)</Label>
                      <Input type="number" placeholder="3000" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
                      {runwayDays !== null && <p className="mt-2 text-sm text-white/45">≈ {runwayDays} days of runway</p>}
                    </div>
                    <button
                      onClick={handleCreate}
                      disabled={!isConnected || busy || !recipient || !monthly || !deposit}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#fff4ec] px-6 py-4 text-sm font-semibold text-[#291c28] transition disabled:opacity-40"
                    >
                      {busy ? "Processing..." : "Create stream"}
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                    {isSuccess && (
                      <div className="rounded-2xl border border-[#ffb38a]/20 bg-[#ffb38a]/10 p-4 text-sm text-[#ffd7c7] space-y-2">
                        {streamId !== null ? (
                          <p>Stream created. Your stream ID is <span className="font-bold text-white text-base">#{streamId.toString()}</span> — enter this ID below to track the live status.</p>
                        ) : (
                          <p>Stream created. Enter your stream ID below to track the live status.</p>
                        )}
                        {hash && (
                          <a
                            href={`https://testnet.arcscan.app/tx/${hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-medium text-[#ffb38a] underline underline-offset-2"
                          >
                            View transaction
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                    {!isConnected && <p className="text-sm text-white/45">Connect wallet to continue.</p>}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-4 w-4 text-[#ffd7c7]" />
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Preview</p>
                      </div>
                      <div className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white">{monthly || "0"} USDC</div>
                      <div className="mt-2 text-sm text-white/50">monthly flow amount</div>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center gap-3">
                        <Activity className="h-4 w-4 text-[#ffb38a]" />
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Runway</p>
                      </div>
                      <div className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white">{runwayDays ?? "—"}</div>
                      <div className="mt-2 text-sm text-white/50">estimated days funded</div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </Reveal>

          {/* Live stream status */}
          <Reveal>
            <GlassCard className="overflow-hidden">
              <div className="border-b border-white/10 p-7 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/12 bg-black/20 p-3">
                      <Radio className="h-5 w-5 text-[#ffb38a]" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-white/50">Live stream status</p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Check any stream by ID</h2>
                    </div>
                  </div>
                  {streamArr?.[6] && (
                    <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </div>
                  )}
                </div>
              </div>

              <div className="p-7 md:p-8">
                <div className="mb-6 flex gap-3 max-w-sm">
                  <Input
                    type="number"
                    placeholder="Stream ID (e.g. 1)"
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && lookupId) {
                        setStreamId(null);
                        setConfirmedLookupId(lookupId);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!lookupId) return;
                      setStreamId(null);
                      setConfirmedLookupId(lookupId);
                    }}
                    className="rounded-2xl border border-white/12 bg-white/8 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/12 whitespace-nowrap"
                  >
                    Check
                  </button>
                </div>

                {!activeId && (
                  <p className="text-sm text-white/40">Enter a stream ID above, or create a stream — status will appear automatically.</p>
                )}

                {activeId !== null && !streamArr && (
                  <p className="text-sm text-white/40">Loading stream data...</p>
                )}

                {streamArr && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Withdrawable now — most critical */}
                    <div className="sm:col-span-2 lg:col-span-1 rounded-[1.6rem] border border-[#ffb38a]/20 bg-[#ffb38a]/8 p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">Withdrawable now</p>
                      <div className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white tabular-nums">
                        {withdrawableDisplay !== null ? Number(withdrawableDisplay).toFixed(6) : "—"}
                      </div>
                      <div className="mt-1 text-sm text-white/50">USDC · updates every second</div>
                    </div>

                    <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">Monthly amount</p>
                      <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
                        {streamMonthly !== null ? streamMonthly.toFixed(2) : "—"} USDC
                      </div>
                      <div className="mt-1 text-sm text-white/50">per month</div>
                    </div>

                    <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">Runway</p>
                      <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
                        {streamRunwayDays !== null ? `${streamRunwayDays} days` : "—"}
                      </div>
                      <div className="mt-1 text-sm text-white/50">remaining</div>
                    </div>

                    <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">Recipient</p>
                      <div className="mt-4 text-lg font-semibold tracking-[-0.02em] text-white font-mono">
                        {shortAddr(streamArr[1]as string)}
                      </div>
                      <div className="mt-1 text-sm text-white/50">receiving address</div>
                    </div>

                    <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">Started</p>
                      <div className="mt-4 text-lg font-semibold tracking-[-0.02em] text-white">
                        {timeAgo(streamArr[3] as bigint)}
                      </div>
                      <div className="mt-1 text-sm text-white/50">stream age</div>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
