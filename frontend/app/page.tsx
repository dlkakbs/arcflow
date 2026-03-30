import Link from "next/link";

const FEATURES = [
  {
    href:  "/stream",
    title: "Stream",
    desc:  "Send USDC every second. Recipients withdraw anytime.",
    tag:   "Continuous",
  },
  {
    href:  "/invoice",
    title: "Invoice",
    desc:  "Request exact USDC amounts with optional deadlines.",
    tag:   "On-demand",
  },
  {
    href:  "/paywall",
    title: "Paywall",
    desc:  "Monetize any API at 0.001 USDC per request.",
    tag:   "Per-request",
  },
];

export default function Home() {
  return (
    <div style={{ background: "var(--bg)" }}>

      {/* Hero — split layout */}
      <div className="max-w-6xl mx-auto px-12 pt-24 pb-20">
        <div className="flex items-center gap-16">

          {/* Left */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono mb-6 tracking-widest" style={{ color: "var(--blue)" }}>
              NATIVE USDC · ARC TESTNET
            </p>
            <h1
              className="font-semibold leading-none mb-6"
              style={{ fontSize: "64px", letterSpacing: "-0.03em", color: "var(--text)" }}
            >
              Payment<br />
              infrastructure<br />
              for the onchain<br />
              economy.
            </h1>
            <p className="text-xl leading-relaxed mb-10 max-w-md" style={{ color: "var(--muted)" }}>
              Stream salaries, request invoices, charge per API call —
              all settled natively on Arc with no bridges, no wrapped tokens.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/how-to-work"
                className="text-base px-7 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                style={{ background: "var(--blue)", color: "#fff" }}
              >
                Get Started →
              </Link>
              <a
                href="https://testnet.arcscan.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-base px-7 py-3 rounded-xl transition-all"
                style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--surface)" }}
              >
                Explorer ↗
              </a>
            </div>
          </div>

          {/* Right — UI mockup card */}
          <div className="shrink-0 w-96">
            <div
              className="rounded-2xl p-6"
              style={{
                background: "var(--surface)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.10)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-mono font-semibold" style={{ color: "var(--text)" }}>ARC PAYMENTS</span>
                <span className="w-2 h-2 rounded-full" style={{ background: "#22C55E" }} />
              </div>

              {/* Stream widget */}
              <div className="rounded-xl p-4 mb-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>STREAM</span>
                  <span className="text-xs font-mono" style={{ color: "#22C55E" }}>● LIVE</span>
                </div>
                <p className="text-xl font-semibold font-mono" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                  1,000 <span className="text-sm font-mono" style={{ color: "var(--muted)" }}>USDC/mo</span>
                </p>
                <p className="text-xs font-mono mt-1" style={{ color: "var(--blue)" }}>→ 0x7f2c…4a1b</p>
              </div>

              {/* Invoice widget */}
              <div className="rounded-xl p-4 mb-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>INVOICE #42</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: "var(--blue-light)", color: "var(--blue)" }}>PENDING</span>
                </div>
                <p className="text-xl font-semibold font-mono" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>500 USDC</p>
                <p className="text-xs font-mono mt-1" style={{ color: "var(--muted)" }}>Logo design · due Apr 5</p>
              </div>

              {/* Paywall widget */}
              <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>PAYWALL</span>
                  <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>0.001 USDC/req</span>
                </div>
                <p className="text-xl font-semibold font-mono" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>2,847 <span className="text-sm" style={{ color: "var(--muted)" }}>requests</span></p>
                <p className="text-xs font-mono mt-1" style={{ color: "var(--blue)" }}>Balance: 2.847 USDC</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-6xl mx-auto px-12 pb-32">
        <div className="grid grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group p-8 rounded-2xl block transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <span
                  className="text-xs font-mono px-2.5 py-1 rounded-full"
                  style={{ background: "var(--blue-light)", color: "var(--blue)" }}
                >
                  {f.tag}
                </span>
              </div>
              <h2
                className="text-2xl font-semibold mb-3 transition-colors group-hover:text-[#0055FF]"
                style={{ letterSpacing: "-0.02em", color: "var(--text)" }}
              >
                {f.title}
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                {f.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
