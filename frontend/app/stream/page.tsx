"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS } from "@/lib/wagmi";
import { ArrowUpRight, Sparkles, Wallet, Activity } from "lucide-react";

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
] as const;

const reveal = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

export default function StreamPage() {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isMining } = useWaitForTransactionReceipt({ hash });

  const [recipient, setRecipient] = useState("");
  const [monthly, setMonthly] = useState("");
  const [deposit, setDeposit] = useState("");

  const { data: rate } = useReadContract({
    address: CONTRACTS.arcFlow,
    abi: ABI,
    functionName: "monthlyToRate",
    args: monthly ? [parseUnits(monthly, 6)] : undefined,
    query: { enabled: !!monthly },
  });

  function handleCreate() {
    if (!recipient || !monthly || !deposit) return;
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
          <Reveal>
            <GlassCard className="overflow-hidden">
              <div className="border-b border-white/10 p-7 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-white/50">New stream</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Create a live payment flow</h2>
                  </div>
                  <div className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs text-white/70">
                    ArcFlow
                  </div>
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
                      <Input
                        type="number"
                        placeholder="1000"
                        value={monthly}
                        onChange={(e) => setMonthly(e.target.value)}
                      />
                      {rate !== undefined && (
                        <p className="mt-2 text-sm text-white/45">≈ {rate.toString()} wei/sec</p>
                      )}
                    </div>

                    <div>
                      <Label>Initial deposit (USDC)</Label>
                      <Input
                        type="number"
                        placeholder="3000"
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value)}
                      />
                      {runwayDays !== null && (
                        <p className="mt-2 text-sm text-white/45">≈ {runwayDays} days of runway</p>
                      )}
                    </div>

                    <button
                      onClick={handleCreate}
                      disabled={!isConnected || busy || !recipient || !monthly || !deposit}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#fff4ec] px-6 py-4 text-sm font-semibold text-[#291c28] transition disabled:opacity-40"
                    >
                      {busy ? "Processing..." : "Create stream"}
                      <ArrowUpRight className="h-4 w-4" />
                    </button>

                    {!isConnected && <p className="text-sm text-white/45">Connect wallet to continue.</p>}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-4 w-4 text-[#ffd7c7]" />
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Preview</p>
                      </div>
                      <div className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white">
                        {monthly || "0"} USDC
                      </div>
                      <div className="mt-2 text-sm text-white/50">monthly flow amount</div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center gap-3">
                        <Activity className="h-4 w-4 text-[#ffb38a]" />
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Runway</p>
                      </div>
                      <div className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white">
                        {runwayDays ?? "—"}
                      </div>
                      <div className="mt-2 text-sm text-white/50">estimated days funded</div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
