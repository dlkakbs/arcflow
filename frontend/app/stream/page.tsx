"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS } from "@/lib/wagmi";

const ABI = [
  {
    name: "createStream",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "rate",      type: "uint256" },
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

const HOW_TO_USE = [
  "Connect your wallet (MetaMask or compatible)",
  "Enter the recipient's wallet address",
  "Set the monthly USDC amount you want to stream",
  "Deposit initial funds — this is the runway (e.g. 3 months = 3× monthly amount)",
  "Click Create Stream → and confirm the transaction",
  "The recipient can withdraw their accrued balance at any time",
  "Cancel the stream anytime to recover the remaining deposit",
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-base font-mono mb-2" style={{ color: "var(--muted)" }}>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-transparent text-base font-mono px-4 py-3 rounded outline-none focus:border-[#0066FF] transition-colors"
      style={{ border: "1px solid var(--border)", color: "var(--text)" }}
    />
  );
}

export default function StreamPage() {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isMining } = useWaitForTransactionReceipt({ hash });

  const [recipient, setRecipient] = useState("");
  const [monthly, setMonthly]     = useState("");
  const [deposit, setDeposit]     = useState("");

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

  return (
    <div className="max-w-6xl mx-auto px-12 py-16">

      {/* Header */}
      <div className="mb-12">
        <p className="text-base font-mono mb-4" style={{ color: "var(--blue)" }}>STREAM</p>
        <h1 className="font-semibold mb-5" style={{ fontSize: "52px", letterSpacing: "-0.03em" }}>
          Continuous payments.
        </h1>
        <p className="text-xl" style={{ color: "var(--muted)" }}>
          USDC flows every second. Recipients withdraw whenever they want.
        </p>
      </div>

      {/* How to use — first */}
      <div className="p-8 rounded mb-8" style={{ border: "1px solid var(--border)" }}>
        <p className="text-base font-mono mb-6" style={{ color: "var(--muted)" }}>HOW TO USE</p>
        <div className="space-y-4">
          {HOW_TO_USE.map((s, i) => (
            <div key={i} className="flex gap-5">
              <span className="font-mono shrink-0 text-base" style={{ color: "var(--blue)", marginTop: "2px" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-lg" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action form */}
      <div className="p-8 rounded" style={{ border: "1px solid var(--border)" }}>
        <p className="text-lg font-semibold mb-8">New Stream</p>
        <div className="space-y-6">
          <div>
            <Label>RECIPIENT ADDRESS</Label>
            <Input
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div>
            <Label>MONTHLY AMOUNT (USDC)</Label>
            <Input
              type="number"
              placeholder="1000"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
            />
            {rate !== undefined && (
              <p className="text-sm font-mono mt-2" style={{ color: "var(--muted)" }}>
                ≈ {rate.toString()} wei/sec
              </p>
            )}
          </div>
          <div>
            <Label>INITIAL DEPOSIT (USDC)</Label>
            <Input
              type="number"
              placeholder="3000"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
            {deposit && monthly && Number(monthly) > 0 && (
              <p className="text-sm font-mono mt-2" style={{ color: "var(--muted)" }}>
                ≈ {(Number(deposit) / Number(monthly) * 30).toFixed(0)} days of runway
              </p>
            )}
          </div>
          <button
            onClick={handleCreate}
            disabled={!isConnected || busy || !recipient || !monthly || !deposit}
            className="w-full py-4 text-lg font-semibold rounded transition-all disabled:opacity-40"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            {busy ? "Processing…" : "Create Stream →"}
          </button>
          {!isConnected && (
            <p className="text-base text-center" style={{ color: "var(--muted)" }}>
              Connect wallet to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
