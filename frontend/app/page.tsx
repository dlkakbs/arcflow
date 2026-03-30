import Link from "next/link";

const FEATURES = [
  {
    href:  "/stream",
    tag:   "01",
    title: "Stream",
    desc:  "Send USDC every second. Recipients withdraw anytime.",
    stat:  "∞ / sec",
  },
  {
    href:  "/invoice",
    tag:   "02",
    title: "Invoice",
    desc:  "Request exact USDC amounts with optional deadlines.",
    stat:  "0 fees",
  },
  {
    href:  "/paywall",
    tag:   "03",
    title: "Paywall",
    desc:  "Monetize any API at 0.001 USDC per request.",
    stat:  "0.001 USDC",
  },
];

const STATS = [
  { label: "Network", value: "Arc Testnet" },
  { label: "Gas Token", value: "USDC" },
  { label: "Finality", value: "< 1s" },
  { label: "Bridges", value: "None" },
];

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-8 pt-20 pb-32">

      {/* Top status bar */}
      <div
        className="flex items-center justify-between mb-16 py-2 px-4"
        style={{ border: "1px solid var(--border)", borderRadius: "2px", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="mono text-xs" style={{ color: "var(--muted)", fontSize: "10px", letterSpacing: "0.08em" }}>
                {s.label.toUpperCase()}
              </span>
              <span className="mono text-xs" style={{ color: "var(--accent)", fontSize: "10px" }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
          <span className="mono text-xs" style={{ color: "var(--muted)", fontSize: "10px", letterSpacing: "0.08em" }}>
            ALL SYSTEMS OPERATIONAL
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <span className="tag">Native USDC</span>
          <span className="tag">Arc Testnet</span>
        </div>

        <h1
          className="mono mb-6"
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 300,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: "#E8E8F0",
          }}
        >
          Payment infrastructure
          <br />
          <span style={{ color: "var(--accent)" }}>for the onchain</span>
          <br />
          economy.
        </h1>

        <p style={{ color: "var(--text-dim)", maxWidth: "480px", lineHeight: 1.7, fontSize: "15px" }}>
          Stream salaries, request invoices, charge per API call —
          all settled natively on Arc with no bridges, no wrapped tokens.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/how-to-work"
            className="mono text-xs px-6 py-2.5 transition-all"
            style={{
              background: "var(--accent)",
              color: "#000000",
              letterSpacing: "0.1em",
              borderRadius: "2px",
              fontWeight: 600,
              border: "2px solid var(--accent)",
            }}
          >
            GET STARTED →
          </Link>
          <a
            href="https://testnet.arcscan.app"
            target="_blank"
            rel="noopener noreferrer"
            className="mono text-xs px-6 py-2.5 transition-all"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-dim)",
              letterSpacing: "0.1em",
              borderRadius: "2px",
            }}
          >
            EXPLORER ↗
          </a>
        </div>
      </div>

      {/* Feature grid */}
      <div className="mb-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="mono text-xs" style={{ color: "var(--muted)", fontSize: "10px", letterSpacing: "0.12em" }}>
            MODULES
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        <div className="grid grid-cols-3" style={{ border: "1px solid var(--border)", borderRadius: "3px", overflow: "hidden" }}>
          {FEATURES.map((f, i) => (
            <Link
              key={f.href}
              href={f.href}
              className="group p-8 block transition-all relative"
              style={{
                borderRight: i < 2 ? "1px solid var(--border)" : undefined,
                background: "transparent",
              }}
            >
              {/* Hover fill */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "var(--accent-glow)" }}
              />

              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <span className="mono text-xs" style={{ color: "var(--muted)", fontSize: "10px" }}>
                    {f.tag}
                  </span>
                  <span
                    className="mono text-xs"
                    style={{ color: "var(--accent)", fontSize: "10px", letterSpacing: "0.05em" }}
                  >
                    {f.stat}
                  </span>
                </div>

                <h2
                  className="mono mb-3 transition-colors group-hover:text-[var(--accent)]"
                  style={{ fontSize: "24px", fontWeight: 400, letterSpacing: "-0.02em", color: "var(--text)" }}
                >
                  {f.title}
                </h2>
                <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-dim)" }}>
                  {f.desc}
                </p>

                <div
                  className="mt-8 mono text-xs flex items-center gap-2 transition-all"
                  style={{ color: "var(--muted)", fontSize: "10px", letterSpacing: "0.08em" }}
                >
                  <span className="group-hover:text-[var(--accent)] transition-colors">OPEN MODULE</span>
                  <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>



    </div>
  );
}
