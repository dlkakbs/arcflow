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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "16px 20px", background: "var(--surface)" }}>
      <p className="mono mb-2" style={{ fontSize: "9px", letterSpacing: "0.12em", color: "var(--muted)" }}>{label}</p>
      <p className="mono" style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-0.02em", color: "var(--text)" }}>{value}</p>
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
        <div className="flex items-center gap-3 mb-6">
          <span className="tag">Paywall</span>
          <span className="mono" style={{ fontSize: "10px", color: "var(--muted)" }}>03 / 03</span>
        </div>
        <h1
          className="mono mb-3"
          style={{ fontSize: "36px", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          Pay per request.
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "14px", lineHeight: 1.7 }}>
          Deposit USDC once. Every API call costs{" "}
          <span className="mono" style={{ color: "var(--accent)" }}>
            {price !== undefined ? formatUnits(price, 6) : "0.001"} USDC
          </span>
          . No subscriptions, no API keys.
        </p>
      </div>

      {/* Stats */}
      {isConnected && (
        <div className="grid grid-cols-3 gap-3 mb-10">
          <StatCard
            label="BALANCE"
            value={balance !== undefined ? `${formatUnits(balance, 6)} USDC` : "—"}
          />
          <StatCard
            label="REQUESTS REMAINING"
            value={remaining !== undefined ? remaining.toString() : "—"}
          />
          <StatCard
            label="PRICE / REQUEST"
            value={price !== undefined ? `${formatUnits(price, 6)} USDC` : "—"}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">

        {/* Deposit */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "24px" }}>
          <div className="flex items-center justify-between mb-6">
            <p className="mono" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
              DEPOSIT CREDITS
            </p>
            <span className="mono" style={{ fontSize: "9px", color: "var(--muted)" }}>ArcPaywall</span>
          </div>

          <div className="space-y-5">
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
                <p className="mono mt-1.5" style={{ fontSize: "10px", color: "var(--muted)" }}>
                  = {Math.floor(Number(depositAmt) / Number(formatUnits(price, 6)))} requests
                </p>
              )}
            </div>

            <button
              onClick={handleDeposit}
              disabled={!isConnected || busy || !depositAmt}
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
              {busy ? "PROCESSING…" : "DEPOSIT →"}
            </button>

            {!isConnected && (
              <p className="mono text-center" style={{ fontSize: "10px", color: "var(--muted)" }}>
                Connect wallet to continue
              </p>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-4">
          <div style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "24px" }}>
            <p className="mono mb-5" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--muted)" }}>
              HOW IT WORKS
            </p>
            <div className="space-y-4">
              {[
                "Deposit USDC to get request credits",
                "Each API call deducts 0.001 USDC",
                "Payments signed off-chain — no gas per call",
                "Agent owner batch settles periodically",
                "Withdraw unused balance anytime",
              ].map((s, i) => (
                <div key={i} className="flex gap-4">
                  <span className="mono shrink-0" style={{ color: "var(--accent)", fontSize: "10px", marginTop: "1px" }}>
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
              href={`https://testnet.arcscan.app/address/${CONTRACTS.arcPaywall}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono"
              style={{ fontSize: "10px", color: "var(--text-dim)", wordBreak: "break-all", textDecoration: "none" }}
              onMouseOver={e => ((e.target as HTMLElement).style.color = "var(--accent)")}
              onMouseOut={e => ((e.target as HTMLElement).style.color = "var(--text-dim)")}
            >
              {CONTRACTS.arcPaywall} ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
