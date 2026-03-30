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

const HOW_TO_USE = [
  "Connect your wallet (MetaMask or compatible)",
  "Enter the USDC amount and a description for the invoice",
  "Optionally set a payment deadline",
  "Click Create Invoice → and confirm — an invoice ID will be generated",
  "Share the invoice ID with the person who needs to pay",
  "The payer enters the invoice ID and amount in the Pay Invoice section",
  "Funds arrive in your wallet instantly once paid",
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
    <div className="max-w-6xl mx-auto px-12 py-16">

      {/* Header */}
      <div className="mb-12">
        <p className="text-base font-mono mb-4" style={{ color: "var(--blue)" }}>INVOICE</p>
        <h1 className="font-semibold mb-5" style={{ fontSize: "52px", letterSpacing: "-0.03em" }}>
          Request & receive USDC.
        </h1>
        <p className="text-xl" style={{ color: "var(--muted)" }}>
          Create an invoice, share the ID. Client pays on-chain, funds arrive instantly.
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

      {/* Action forms */}
      <div className="grid grid-cols-2 gap-8">

        {/* Create */}
        <div className="p-8 rounded" style={{ border: "1px solid var(--border)" }}>
          <p className="text-lg font-semibold mb-8">Create Invoice</p>
          <div className="space-y-6">
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
              className="w-full py-4 text-lg font-semibold rounded transition-all disabled:opacity-40"
              style={{ background: "var(--blue)", color: "#fff" }}
            >
              {busy ? "Processing…" : "Create Invoice →"}
            </button>
            {isSuccess && (
              <p className="text-base font-mono text-center" style={{ color: "var(--blue)" }}>
                ✓ Invoice created. Check explorer for ID.
              </p>
            )}
          </div>
        </div>

        {/* Pay */}
        <div className="p-8 rounded" style={{ border: "1px solid var(--border)" }}>
          <p className="text-lg font-semibold mb-8">Pay Invoice</p>
          <div className="space-y-6">
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
              className="w-full py-4 text-lg font-semibold rounded transition-all disabled:opacity-40"
              style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              {busy ? "Processing…" : "Pay Invoice →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
