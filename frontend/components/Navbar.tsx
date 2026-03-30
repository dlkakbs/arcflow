"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

const NAV = [
  { href: "/stream",  label: "Stream"  },
  { href: "/invoice", label: "Invoice" },
  { href: "/paywall", label: "Paywall" },
];

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <nav
      className="flex items-center justify-between px-8 py-4"
      style={{ borderBottom: "1px solid var(--border)", background: "rgba(5,5,8,0.95)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <span
          className="mono text-xs px-2 py-1"
          style={{
            background: "transparent",
            color: "var(--accent)",
            border: "1px solid var(--accent-dim)",
            letterSpacing: "0.15em",
            borderRadius: "2px",
          }}
        >
          ARC
        </span>
        <span
          className="font-semibold tracking-tight"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "14px", letterSpacing: "-0.01em" }}
        >
          Flow
        </span>
        <span
          className="mono text-xs"
          style={{ color: "var(--muted)", fontSize: "10px", letterSpacing: "0.05em" }}
        >
          v1.0
        </span>
      </Link>

      {/* Tabs */}
      <div className="flex items-center gap-0" style={{ border: "1px solid var(--border)", borderRadius: "3px", overflow: "hidden" }}>
        {NAV.map((n, i) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className="mono text-xs px-5 py-2 transition-all"
              style={{
                color:      active ? "var(--bg)" : "var(--muted)",
                background: active ? "var(--accent)" : "transparent",
                borderRight: i < NAV.length - 1 ? "1px solid var(--border)" : undefined,
                letterSpacing: "0.08em",
                fontWeight: active ? 500 : 400,
              }}
            >
              {n.label.toUpperCase()}
            </Link>
          );
        })}
      </div>

      {/* Status + Wallet */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isConnected ? "var(--accent)" : "var(--muted)",
              boxShadow: isConnected ? "0 0 6px var(--accent)" : "none",
              animation: isConnected ? "flicker 3s ease infinite" : "none",
            }}
          />
          <span className="mono text-xs" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
            {isConnected ? "TESTNET" : "DISCONNECTED"}
          </span>
        </div>

        {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="mono flex items-center gap-2 text-xs px-3 py-1.5 transition-all"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-dim)",
              borderRadius: "2px",
              fontSize: "11px",
              letterSpacing: "0.05em",
            }}
          >
            {shortAddr(address!)}
            <span style={{ color: "var(--muted)" }}>✕</span>
          </button>
        ) : (
          <button
            onClick={() => connect({ connector: injected() })}
            className="mono text-xs px-4 py-1.5 font-medium transition-all"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              borderRadius: "2px",
              letterSpacing: "0.08em",
              fontSize: "11px",
            }}
          >
            CONNECT →
          </button>
        )}
      </div>
    </nav>
  );
}
