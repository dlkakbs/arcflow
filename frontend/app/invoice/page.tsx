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

export default function InvoicePage() {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Create
  const [amount, setAmount]       = useState("");
  const [desc, setDesc]           = useState("");
  const [deadline, setDeadline]   = useState("");

  // Pay
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
        <p className="text-xs font-mono mb-3" style={{ color: "var(--blue)" }}>
          INVOICE
        </p>
        <h1 className="text-4xl font-semibold" style={{ letterSpacing: "-0.03em" }}>
          Request & receive USDC.
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Create an invoice, share the ID. Client pays on-chain, funds arrive instantly.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">

        {/* Create */}
        <div className="p-6 rounded" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm font-medium mb-6">Create Invoice</p>
          <div className="space-y-4">
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
              className="w-full py-2.5 text-sm font-medium rounded transition-all disabled:opacity-40"
              style={{ background: "var(--blue)", color: "#fff" }}
            >
              {busy ? "Processing…" : "Create Invoice →"}
            </button>
            {isSuccess && (
              <p className="text-xs font-mono text-center" style={{ color: "var(--blue)" }}>
                Invoice created. Check explorer for ID.
              </p>
            )}
          </div>
        </div>

        {/* Pay */}
        <div className="p-6 rounded" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm font-medium mb-6">Pay Invoice</p>
          <div className="space-y-4">
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
              className="w-full py-2.5 text-sm font-medium rounded transition-all disabled:opacity-40"
              style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              {busy ? "Processing…" : "Pay Invoice →"}
            </button>
            <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs font-mono mb-2" style={{ color: "var(--muted)" }}>CONTRACT</p>
              <a
                href={`https://testnet.arcscan.app/address/${CONTRACTS.arcInvoice}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono break-all hover:text-[#0066FF] transition-colors"
                style={{ color: "var(--muted)" }}
              >
                {CONTRACTS.arcInvoice}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
