"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-mono mb-2" style={{ color: "var(--muted)" }}>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-transparent text-sm font-mono px-3 py-2.5 rounded outline-none focus:border-[#0066FF] transition-colors"
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
    <div className="max-w-4xl mx-auto px-8 py-16">

      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-mono mb-3" style={{ color: "var(--blue)" }}>
          STREAM
        </p>
        <h1 className="text-4xl font-semibold" style={{ letterSpacing: "-0.03em" }}>
          Continuous payments.
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          USDC flows every second. Recipients withdraw whenever they want.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">

        {/* Create stream */}
        <div className="p-6 rounded" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm font-medium mb-6">New Stream</p>

          <div className="space-y-4">
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
                <p className="text-xs font-mono mt-1.5" style={{ color: "var(--muted)" }}>
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
                <p className="text-xs font-mono mt-1.5" style={{ color: "var(--muted)" }}>
                  ≈ {(Number(deposit) / Number(monthly) * 30).toFixed(0)} days of runway
                </p>
              )}
            </div>

            <button
              onClick={handleCreate}
              disabled={!isConnected || busy || !recipient || !monthly || !deposit}
              className="w-full py-2.5 text-sm font-medium rounded transition-all disabled:opacity-40"
              style={{ background: "var(--blue)", color: "#fff" }}
            >
              {busy ? "Processing…" : "Create Stream →"}
            </button>

            {!isConnected && (
              <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
                Connect wallet to continue
              </p>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          <div className="p-6 rounded" style={{ border: "1px solid var(--border)" }}>
            <p className="text-xs font-mono mb-4" style={{ color: "var(--muted)" }}>HOW IT WORKS</p>
            <div className="space-y-3 text-sm" style={{ color: "var(--muted)" }}>
              {[
                "Deposit USDC upfront as runway",
                "Recipient accrues balance every second",
                "Withdraw anytime, no waiting",
                "Cancel to recover unspent deposit",
              ].map((s, i) => (
                <div key={i} className="flex gap-3">
                  <span className="font-mono text-xs mt-0.5" style={{ color: "var(--blue)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded" style={{ border: "1px solid var(--border)" }}>
            <p className="text-xs font-mono mb-3" style={{ color: "var(--muted)" }}>CONTRACT</p>
            <a
              href={`https://testnet.arcscan.app/address/${CONTRACTS.arcFlow}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono break-all hover:text-[#0066FF] transition-colors"
              style={{ color: "var(--muted)" }}
            >
              {CONTRACTS.arcFlow}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
