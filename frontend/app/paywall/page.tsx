"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CONTRACTS } from "@/lib/wagmi";

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

const HOW_TO_USE = [
  "Connect your wallet (MetaMask or compatible)",
  "Deposit USDC — this becomes your request credit balance",
  "Each API call automatically deducts 0.001 USDC from your balance",
  "Payments are signed off-chain — no gas fee per call",
  "The service provider settles periodically on-chain",
  "Top up your balance whenever it runs low",
  "Withdraw any unused balance at any time",
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 rounded" style={{ border: "1px solid var(--border)" }}>
      <p className="text-sm font-mono mb-2" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-3xl font-semibold font-mono" style={{ letterSpacing: "-0.02em" }}>{value}</p>
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

  return (
    <div className="max-w-6xl mx-auto px-12 py-16">

      {/* Header */}
      <div className="mb-12">
        <p className="text-base font-mono mb-4" style={{ color: "var(--blue)" }}>PAYWALL</p>
        <h1 className="font-semibold mb-5" style={{ fontSize: "52px", letterSpacing: "-0.03em" }}>
          Pay per request.
        </h1>
        <p className="text-xl" style={{ color: "var(--muted)" }}>
          Deposit USDC once. Every API call costs{" "}
          <span className="font-mono" style={{ color: "var(--text)" }}>
            {price !== undefined ? formatUnits(price, 6) : "0.001"} USDC
          </span>
          . No subscriptions, no API keys.
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

      {/* Stats */}
      {isConnected && (
        <div className="grid grid-cols-3 gap-5 mb-8">
          <Stat label="BALANCE" value={balance !== undefined ? `${formatUnits(balance, 6)} USDC` : "—"} />
          <Stat label="REQUESTS REMAINING" value={remaining !== undefined ? remaining.toString() : "—"} />
          <Stat label="PRICE / REQUEST" value={price !== undefined ? `${formatUnits(price, 6)} USDC` : "—"} />
        </div>
      )}

      {/* Deposit form */}
      <div className="p-8 rounded" style={{ border: "1px solid var(--border)" }}>
        <p className="text-lg font-semibold mb-8">Deposit Credits</p>
        <div className="space-y-6 max-w-lg">
          <div>
            <Label>AMOUNT (USDC)</Label>
            <Input
              type="number"
              placeholder="1.00"
              step="0.001"
              value={depositAmt}
              onChange={(e) => setDepositAmt(e.target.value)}
            />
            {depositAmt && price !== undefined && (
              <p className="text-base font-mono mt-2" style={{ color: "var(--muted)" }}>
                = {Math.floor(Number(depositAmt) / Number(formatUnits(price, 6)))} requests
              </p>
            )}
          </div>
          <button
            onClick={handleDeposit}
            disabled={!isConnected || busy || !depositAmt}
            className="w-full py-4 text-lg font-semibold rounded transition-all disabled:opacity-40"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            {busy ? "Processing…" : "Deposit →"}
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
