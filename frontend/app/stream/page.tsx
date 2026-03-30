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
    <label
      className="block mono mb-2"
      style={{ color: "var(--muted)", fontSize: "10px", letterSpacing: "0.1em" }}
    >
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full mono"
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--text)",
        fontSize: "13px",
        padding: "10px 12px",
        outline: "none",
        borderRadius: "2px",
        transition: "border-color 0.15s",
        fontFamily: "'IBM Plex Mono', monospace",
      }}
      onFocus={e => (e.target.style.borderColor = "var(--accent)")}
      onBlur={e => (e.target.style.borderColor = "var(--border)")}
    />
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mono mt-1.5" style={{ color: "var(--muted)", fontSize: "10px", letterSpacing: "0.03em" }}>
      {children}
    </p>
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
        <div className="flex items-center gap-3 mb-6">
          <span className="tag">Stream</span>
          <span className="mono" style={{ fontSize: "10px", color: "var(--muted)" }}>01 / 03</span>
        </div>
        <h1
          className="mono mb-3"
          style={{ fontSize: "36px", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          Continuous payments.
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "14px", lineHeight: 1.7 }}>
          USDC flows every second. Recipients withdraw whenever they want.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">

        {/* Create stream */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "24px" }}>
          <div className="flex items-center justify-between mb-6">
            <p className="mono" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
              NEW STREAM
            </p>
            <span className="mono" style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "0.05em" }}>
              ArcFlow
            </span>
          </div>

          <div className="space-y-5">
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
                <Hint>≈ {rate.toString()} wei/sec</Hint>
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
                <Hint>≈ {(Number(deposit) / Number(monthly) * 30).toFixed(0)} days runway</Hint>
              )}
            </div>

            <button
              onClick={handleCreate}
              disabled={!isConnected || busy || !recipient || !monthly || !deposit}
              className="w-full mono transition-all disabled:opacity-30"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                border: "none",
                padding: "11px",
                fontSize: "11px",
                letterSpacing: "0.1em",
                fontWeight: 500,
                borderRadius: "2px",
                cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {busy ? "PROCESSING…" : "CREATE STREAM →"}
            </button>

            {!isConnected && (
              <p className="mono text-center" style={{ fontSize: "10px", color: "var(--muted)" }}>
                Connect wallet to continue
              </p>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "24px" }}>
            <p className="mono mb-5" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--muted)" }}>
              HOW IT WORKS
            </p>
            <div className="space-y-4">
              {[
                "Deposit USDC upfront as runway",
                "Recipient accrues balance every second",
                "Withdraw anytime, no waiting",
                "Cancel to recover unspent deposit",
              ].map((s, i) => (
                <div key={i} className="flex gap-4">
                  <span
                    className="mono shrink-0"
                    style={{ color: "var(--accent)", fontSize: "10px", marginTop: "1px" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "16px 20px" }}>
            <p className="mono mb-2" style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--muted)" }}>
              CONTRACT
            </p>
            <a
              href={`https://testnet.arcscan.app/address/${CONTRACTS.arcFlow}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono"
              style={{
                fontSize: "10px",
                color: "var(--text-dim)",
                wordBreak: "break-all",
                letterSpacing: "0.02em",
                textDecoration: "none",
              }}
              onMouseOver={e => ((e.target as HTMLElement).style.color = "var(--accent)")}
              onMouseOut={e => ((e.target as HTMLElement).style.color = "var(--text-dim)")}
            >
              {CONTRACTS.arcFlow} ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
