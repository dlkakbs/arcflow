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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded" style={{ border: "1px solid var(--border)" }}>
      <p className="text-xs font-mono mb-2" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-2xl font-semibold font-mono" style={{ letterSpacing: "-0.02em" }}>{value}</p>
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
    <div className="max-w-4xl mx-auto px-8 py-16">

      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-mono mb-3" style={{ color: "var(--blue)" }}>
          PAYWALL
        </p>
        <h1 className="text-4xl font-semibold" style={{ letterSpacing: "-0.03em" }}>
          Pay per request.
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Deposit USDC once. Every API call costs{" "}
          <span className="font-mono" style={{ color: "var(--text)" }}>
            {price !== undefined ? formatUnits(price, 6) : "0.001"} USDC
          </span>
          . No subscriptions, no API keys.
        </p>
      </div>

      {/* Stats */}
      {isConnected && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Stat
            label="BALANCE"
            value={balance !== undefined ? `${formatUnits(balance, 6)} USDC` : "—"}
          />
          <Stat
            label="REQUESTS REMAINING"
            value={remaining !== undefined ? remaining.toString() : "—"}
          />
          <Stat
            label="PRICE / REQUEST"
            value={price !== undefined ? `${formatUnits(price, 6)} USDC` : "—"}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">

        {/* Deposit */}
        <div className="p-6 rounded" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm font-medium mb-6">Deposit Credits</p>
          <div className="space-y-4">
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
                <p className="text-xs font-mono mt-1.5" style={{ color: "var(--muted)" }}>
                  = {Math.floor(Number(depositAmt) / Number(formatUnits(price, 6)))} requests
                </p>
              )}
            </div>
            <button
              onClick={handleDeposit}
              disabled={!isConnected || busy || !depositAmt}
              className="w-full py-2.5 text-sm font-medium rounded transition-all disabled:opacity-40"
              style={{ background: "var(--blue)", color: "#fff" }}
            >
              {busy ? "Processing…" : "Deposit →"}
            </button>
            {!isConnected && (
              <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
                Connect wallet to continue
              </p>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-4">
          <div className="p-6 rounded" style={{ border: "1px solid var(--border)" }}>
            <p className="text-xs font-mono mb-4" style={{ color: "var(--muted)" }}>HOW IT WORKS</p>
            <div className="space-y-3 text-sm" style={{ color: "var(--muted)" }}>
              {[
                "Deposit USDC to get request credits",
                "Each API call deducts 0.001 USDC",
                "Payments are signed off-chain — no gas per call",
                "Agent owner batch settles periodically",
                "Withdraw unused balance anytime",
              ].map((s, i) => (
                <div key={i} className="flex gap-3">
                  <span className="font-mono text-xs mt-0.5 shrink-0" style={{ color: "var(--blue)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded" style={{ border: "1px solid var(--border)" }}>
            <p className="text-xs font-mono mb-2" style={{ color: "var(--muted)" }}>CONTRACT</p>
            <a
              href={`https://testnet.arcscan.app/address/${CONTRACTS.arcPaywall}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono break-all hover:text-[#0066FF] transition-colors"
              style={{ color: "var(--muted)" }}
            >
              {CONTRACTS.arcPaywall}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
