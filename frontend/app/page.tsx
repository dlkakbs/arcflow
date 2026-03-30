import Link from "next/link";

const FEATURES = [
  {
    href:  "/stream",
    tag:   "01",
    title: "Stream",
    desc:  "Send USDC every second. Recipients withdraw anytime.",
  },
  {
    href:  "/invoice",
    tag:   "02",
    title: "Invoice",
    desc:  "Request exact USDC amounts with optional deadlines.",
  },
  {
    href:  "/paywall",
    tag:   "03",
    title: "Paywall",
    desc:  "Monetize any API at 0.001 USDC per request.",
  },
];

const CONTRACTS = [
  { name: "ArcFlow",    addr: "0xAB78614fED57bB451b70EE194fC4043CADCC39eF" },
  { name: "ArcInvoice", addr: "0x8d533a6DF78ef01F6E4E998588D3Ccb21F668486" },
  { name: "ArcPaywall", addr: "0xb1f95F4d86C743cbe1797C931A9680dF5766633A" },
];

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-8 pt-24 pb-32">

      {/* Hero */}
      <div className="mb-20">
        <p
          className="text-xs font-mono mb-6 tracking-widest"
          style={{ color: "var(--blue)" }}
        >
          NATIVE USDC · ARC TESTNET
        </p>
        <h1
          className="text-6xl font-semibold leading-none mb-6"
          style={{ letterSpacing: "-0.03em" }}
        >
          Payment infrastructure
          <br />
          for the onchain economy.
        </h1>
        <p className="text-lg max-w-lg" style={{ color: "var(--muted)" }}>
          Stream salaries, request invoices, charge per API call —
          all settled natively on Arc with no bridges, no wrapped tokens.
        </p>
      </div>

      {/* Feature grid */}
      <div
        className="grid grid-cols-3"
        style={{ border: "1px solid var(--border)" }}
      >
        {FEATURES.map((f, i) => (
          <Link
            key={f.href}
            href={f.href}
            className="group p-8 block transition-colors hover:bg-white/[0.02]"
            style={{ borderRight: i < 2 ? "1px solid var(--border)" : undefined }}
          >
            <p className="text-xs font-mono mb-6" style={{ color: "var(--muted)" }}>
              {f.tag}
            </p>
            <h2
              className="text-2xl font-semibold mb-3 transition-colors group-hover:text-[#0066FF]"
              style={{ letterSpacing: "-0.02em" }}
            >
              {f.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              {f.desc}
            </p>
          </Link>
        ))}
      </div>

      {/* Contracts */}
      <div className="mt-16 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs font-mono mb-4" style={{ color: "var(--muted)" }}>
          DEPLOYED CONTRACTS
        </p>
        <div className="space-y-2">
          {CONTRACTS.map((c) => (
            <div key={c.addr} className="flex items-center gap-6 text-sm">
              <span className="w-24 shrink-0" style={{ color: "var(--muted)" }}>
                {c.name}
              </span>
              <a
                href={`https://testnet.arcscan.app/address/${c.addr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono transition-colors hover:text-[#0066FF]"
                style={{ color: "var(--muted)" }}
              >
                {c.addr}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
