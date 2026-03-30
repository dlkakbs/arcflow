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
      className="flex items-center justify-between px-12 py-4"
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-1">
        <span style={{ fontWeight: 800, fontSize: "24px", color: "#0F172A", letterSpacing: "-0.03em" }}>ARC</span>
        <span style={{ fontWeight: 800, fontSize: "24px", color: "var(--blue)", letterSpacing: "-0.03em" }}>Flow</span>
      </Link>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className="px-5 py-2 rounded-lg transition-all text-base font-medium"
              style={{
                color:      active ? "var(--blue)" : "var(--muted)",
                background: active ? "var(--blue-light)" : "transparent",
              }}
            >
              {n.label}
            </Link>
          );
        })}
      </div>

      {/* Wallet */}
      {isConnected ? (
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-2 mono px-4 py-2 rounded-lg transition-all text-base"
          style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "#fff" }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: "#22C55E" }} />
          {shortAddr(address!)}
        </button>
      ) : (
        <button
          onClick={() => connect({ connector: injected() })}
          className="px-5 py-2 rounded-lg font-semibold transition-all text-base hover:opacity-90"
          style={{ background: "var(--blue)", color: "#fff" }}
        >
          Connect Wallet
        </button>
      )}
    </nav>
  );
}
