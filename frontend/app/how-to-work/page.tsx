import Link from "next/link";

const MODULES = [
  {
    tag: "01",
    href: "/stream",
    title: "Stream",
    subtitle: "Send USDC every second",
    what: "Start a continuous payment flow to any address. Balance accrues every second automatically — the recipient can withdraw whenever they want.",
    useCases: [
      "Salary payments — per second instead of monthly",
      "Freelancer payments throughout a project",
      "Subscription-based service payments",
    ],
    steps: [
      "Connect your wallet (MetaMask or compatible)",
      "Enter the recipient address",
      "Set the monthly USDC amount",
      "Deposit initial funds (determines how long the stream stays active)",
      "Click Create Stream →",
    ],
  },
  {
    tag: "02",
    href: "/invoice",
    title: "Invoice",
    subtitle: "Create and pay USDC invoices",
    what: "Create an invoice for a service or product. The other party pays using the invoice ID on-chain — funds arrive instantly to your wallet.",
    useCases: [
      "Freelance work — design, development, consulting",
      "Net-term payment requests to suppliers",
      "Project payments with deadlines",
    ],
    steps: [
      "Connect your wallet",
      "Enter the USDC amount and description",
      "Optionally add a payment deadline",
      "Create the invoice with Create Invoice →",
      "Share the invoice ID with the other party",
      "They pay via the Pay Invoice section using the ID",
    ],
  },
  {
    tag: "03",
    href: "/paywall",
    title: "Paywall",
    subtitle: "Pay 0.001 USDC per API request",
    what: "Deposit USDC upfront to access a service or API. A small amount is deducted per request automatically. No subscriptions, no API keys.",
    useCases: [
      "Usage-based payments for AI agent services",
      "Data APIs — pay only for what you fetch",
      "Any digital service requiring micropayments",
    ],
    steps: [
      "Connect your wallet",
      "Deposit the amount of USDC you want to spend",
      "0.001 USDC is deducted automatically per API call",
      "Top up when balance runs low",
      "Withdraw unused balance at any time",
    ],
  },
];

const REQUIREMENTS = [
  { label: "Wallet",  value: "MetaMask or any EIP-1193 compatible wallet" },
  { label: "Network", value: "Arc Testnet — track your transactions at testnet.arcscan.app" },
  { label: "Token",   value: "USDC — used as the native gas token on Arc, no bridging required" },
];

export default function HowToWorkPage() {
  return (
    <div className="max-w-6xl mx-auto px-12 py-16">

      {/* Header */}
      <div className="mb-14">
        <p className="text-sm font-mono mb-4" style={{ color: "var(--blue)" }}>GET STARTED</p>
        <h1 className="text-5xl font-semibold mb-6" style={{ letterSpacing: "-0.03em" }}>
          How ArcFlow works
        </h1>
        <p className="text-xl max-w-xl leading-relaxed" style={{ color: "var(--muted)" }}>
          ArcFlow is a payment infrastructure built on Arc Testnet using native USDC.
          Three modules — stream, invoice, and paywall — cover all on-chain payment needs.
        </p>
      </div>

      {/* Requirements */}
      <div className="p-8 rounded mb-12" style={{ border: "1px solid var(--border)" }}>
        <p className="text-sm font-mono mb-6" style={{ color: "var(--muted)" }}>BEFORE YOU START</p>
        <div className="space-y-5">
          {REQUIREMENTS.map((r) => (
            <div key={r.label} className="flex gap-8">
              <span className="font-mono shrink-0 w-20 text-sm" style={{ color: "var(--blue)" }}>
                {r.label.toUpperCase()}
              </span>
              <span className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Module cards */}
      <div className="space-y-6 mb-16">
        <p className="text-sm font-mono" style={{ color: "var(--muted)" }}>MODULES</p>

        {MODULES.map((m) => (
          <div
            key={m.tag}
            className="group p-8 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
          >
            {/* Card header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-mono mb-2 transition-colors group-hover:text-[#0066FF]" style={{ color: "var(--muted)" }}>
                  {m.tag}
                </p>
                <h2 className="text-3xl font-semibold mb-2 transition-colors group-hover:text-[#0066FF]" style={{ letterSpacing: "-0.02em" }}>
                  {m.title}
                </h2>
                <p className="text-lg" style={{ color: "var(--muted)" }}>{m.subtitle}</p>
              </div>
              <Link
                href={m.href}
                className="text-sm font-mono px-4 py-2 rounded-lg transition-all"
                style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--bg)" }}
              >
                Open →
              </Link>
            </div>

            <p className="text-lg mb-8 leading-relaxed" style={{ color: "var(--muted)" }}>
              {m.what}
            </p>

            {/* Use cases */}
            <div className="mb-6">
              <p className="text-sm font-mono mb-4" style={{ color: "var(--muted)" }}>USE CASES</p>
              <div className="space-y-3">
                {m.useCases.map((u, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="font-mono shrink-0 text-sm" style={{ color: "var(--blue)", marginTop: "2px" }}>—</span>
                    <span className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>{u}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <p className="text-sm font-mono mb-4" style={{ color: "var(--muted)" }}>HOW TO USE</p>
              <div className="space-y-3">
                {m.steps.map((s, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="font-mono shrink-0 text-sm" style={{ color: "var(--blue)", marginTop: "2px" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between p-8 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div>
          <p className="text-xl font-semibold mb-2">Ready to get started?</p>
          <p className="text-base" style={{ color: "var(--muted)" }}>Connect your wallet and make your first transaction.</p>
        </div>
        <div className="flex gap-3 shrink-0 ml-8">
          <Link
            href="/stream"
            className="text-base px-6 py-2.5 rounded font-semibold transition-all hover:opacity-90"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            Try Stream →
          </Link>
          <Link
            href="/"
            className="text-base px-6 py-2.5 rounded transition-all hover:border-[#0066FF]"
            style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
