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
      className="flex items-center justify-between px-8 py-5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <span
          className="text-xs mono px-2 py-1 rounded"
          style={{ background: "var(--blue)", color: "#fff", letterSpacing: "0.1em" }}
        >
          ARC
        </span>
        <span className="font-semibold tracking-tight">Flow</span>
      </Link>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className="px-4 py-1.5 rounded text-sm transition-colors"
              style={{
                color:      active ? "var(--text)" : "var(--muted)",
                background: active ? "var(--surface)" : "transparent",
                border:     active ? "1px solid var(--border)" : "1px solid transparent",
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
          className="flex items-center gap-2 text-sm mono px-3 py-1.5 rounded transition-colors"
          style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--blue)" }}
          />
          {shortAddr(address!)}
        </button>
      ) : (
        <button
          onClick={() => connect({ connector: injected() })}
          className="text-sm px-4 py-1.5 rounded font-medium transition-all"
          style={{
            background: "var(--blue)",
            color: "#fff",
          }}
        >
          Connect
        </button>
      )}
    </nav>
  );
}
