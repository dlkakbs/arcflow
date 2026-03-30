"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS } from "@/lib/wagmi";

const ABI = [
  {
    name: "createInvoice",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount",      type: "uint256" },
      { name: "description", type: "string"  },
      { name: "deadline",    type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    name: "payInvoice",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
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

export default function InvoicePage() {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [amount, setAmount]       = useState("");
  const [desc, setDesc]           = useState("");
  const [deadline, setDeadline]   = useState("");
  const [payId, setPayId]         = useState("");
  const [payAmount, setPayAmount] = useState("");

  const busy = isPending || isMining;

  function handleCreate() {
    if (!amount || !desc) return;
    const deadlineTs = deadline ? Math.floor(new Date(deadline).getTime() / 1000) : 0;
    writeContract({
      address: CONTRACTS.arcInvoice,
      abi: ABI,
      functionName: "createInvoice",
      args: [parseUnits(amount, 6), desc, BigInt(deadlineTs)],
    });
  }

  function handlePay() {
    if (!payId || !payAmount) return;
    writeContract({
      address: CONTRACTS.arcInvoice,
      abi: ABI,
      functionName: "payInvoice",
      args: [BigInt(payId)],
      value: parseUnits(payAmount, 6),
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">

      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="tag">Invoice</span>
          <span className="mono" style={{ fontSize: "10px", color: "var(--muted)" }}>02 / 03</span>
        </div>
        <h1
          className="mono mb-3"
          style={{ fontSize: "36px", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          Request & receive USDC.
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "14px", lineHeight: 1.7 }}>
          Create an invoice, share the ID. Client pays on-chain, funds arrive instantly.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">

        {/* Create */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "24px" }}>
          <div className="flex items-center justify-between mb-6">
            <p className="mono" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
              CREATE INVOICE
            </p>
            <span className="mono" style={{ fontSize: "9px", color: "var(--muted)" }}>ArcInvoice</span>
          </div>

          <div className="space-y-5">
            <div>
              <Label>AMOUNT (USDC)</Label>
              <Input
                type="number"
                placeholder="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>DESCRIPTION</Label>
              <Input
                placeholder="Logo design, March consulting…"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div>
              <Label>DEADLINE (optional)</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!isConnected || busy || !amount || !desc}
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
              {busy ? "PROCESSING…" : "CREATE INVOICE →"}
            </button>
            {isSuccess && (
              <p className="mono text-center" style={{ fontSize: "10px", color: "var(--accent)", letterSpacing: "0.05em" }}>
                ✓ Invoice created. Check explorer for ID.
              </p>
            )}
          </div>
        </div>

        {/* Pay */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "24px" }}>
          <div className="flex items-center justify-between mb-6">
            <p className="mono" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
              PAY INVOICE
            </p>
            <span className="mono" style={{ fontSize: "9px", color: "var(--muted)" }}>ArcInvoice</span>
          </div>

          <div className="space-y-5">
            <div>
              <Label>INVOICE ID</Label>
              <Input
                type="number"
                placeholder="0"
                value={payId}
                onChange={(e) => setPayId(e.target.value)}
              />
            </div>
            <div>
              <Label>AMOUNT (USDC)</Label>
              <Input
                type="number"
                placeholder="500"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <button
              onClick={handlePay}
              disabled={!isConnected || busy || !payId || !payAmount}
              className="w-full mono transition-all disabled:opacity-30"
              style={{
                background: "transparent",
                color: "var(--text-dim)",
                border: "1px solid var(--border)",
                padding: "11px",
                fontSize: "11px",
                letterSpacing: "0.1em",
                borderRadius: "2px",
                cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseOver={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)";
              }}
            >
              {busy ? "PROCESSING…" : "PAY INVOICE →"}
            </button>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
              <p className="mono mb-2" style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--muted)" }}>
                CONTRACT
              </p>
              <a
                href={`https://testnet.arcscan.app/address/${CONTRACTS.arcInvoice}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
                style={{ fontSize: "10px", color: "var(--text-dim)", wordBreak: "break-all", textDecoration: "none" }}
                onMouseOver={e => ((e.target as HTMLElement).style.color = "var(--accent)")}
                onMouseOut={e => ((e.target as HTMLElement).style.color = "var(--text-dim)")}
              >
                {CONTRACTS.arcInvoice} ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
