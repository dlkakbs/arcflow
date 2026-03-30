import Link from "next/link";

const MODULES = [
  {
    tag: "01",
    href: "/stream",
    title: "Stream",
    subtitle: "Saniyede USDC gönder",
    what: "Bir kişiye sürekli ödeme akışı başlatırsın. Para her saniye otomatik olarak birikiyor, alıcı istediği zaman çekebilir.",
    useCases: [
      "Maaş ödemeleri — aylık yerine saniye bazlı",
      "Freelance çalışanlara proje süreci boyunca ödeme",
      "Abonelik tabanlı servis ödemeleri",
    ],
    steps: [
      "Cüzdanını bağla (MetaMask veya uyumlu)",
      "Alıcı adresini gir",
      "Aylık USDC miktarını belirle",
      "Başlangıç depozitini yatır (ne kadar süre aktif kalacağını belirler)",
      'Create Stream → butonuna bas',
    ],
  },
  {
    tag: "02",
    href: "/invoice",
    title: "Invoice",
    subtitle: "USDC fatura oluştur ve öde",
    what: "Hizmet veya ürün karşılığı fatura oluşturursun. Karşı taraf fatura ID'siyle ödeme yapar, para anında cüzdanına gelir.",
    useCases: [
      "Freelance iş — tasarım, yazılım, danışmanlık",
      "Tedarikçilere net vadeli ödeme talebi",
      "Deadline'lı proje ödemeleri",
    ],
    steps: [
      "Cüzdanını bağla",
      "USDC miktarını ve açıklamayı gir",
      "İsteğe bağlı son ödeme tarihi ekle",
      "Create Invoice → ile fatura oluştur",
      "Oluşan fatura ID'sini karşı tarafa ilet",
      "Karşı taraf ID ile Pay Invoice bölümünden öder",
    ],
  },
  {
    tag: "03",
    href: "/paywall",
    title: "Paywall",
    subtitle: "API başına 0.001 USDC öde",
    what: "Bir API veya servisi kullanmak için önceden USDC yatırırsın. Her istek otomatik olarak küçük bir miktar düşer. Abonelik yok, API key yok.",
    useCases: [
      "AI agent servislerini kullanım bazlı ödeme",
      "Veri API'leri — ne kadar çekersen o kadar öde",
      "Mikro ödeme gerektiren her türlü dijital servis",
    ],
    steps: [
      "Cüzdanını bağla",
      "Kullanmak istediğin kadar USDC yatır",
      "Her API çağrısında 0.001 USDC otomatik düşer",
      "Bakiye bitince tekrar yatır",
      "Kullanmadığın bakiyeyi istediğin zaman geri çek",
    ],
  },
];

const REQUIREMENTS = [
  {
    label: "Cüzdan",
    value: "MetaMask veya EIP-1193 uyumlu herhangi bir cüzdan",
  },
  {
    label: "Ağ",
    value: "Arc Testnet — testnet.arcscan.app üzerinden işlemlerini takip edebilirsin",
  },
  {
    label: "Token",
    value: "USDC — Arc üzerinde native gas token olarak kullanılır, köprü gerekmez",
  },
];

export default function HowToWorkPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-16">

      {/* Header */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="tag">Başlangıç Rehberi</span>
        </div>
        <h1
          className="mono mb-4"
          style={{ fontSize: "40px", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          ArcFlow nasıl çalışır?
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "15px", lineHeight: 1.8, maxWidth: "560px" }}>
          ArcFlow, Arc Testnet üzerinde native USDC ile çalışan bir ödeme altyapısıdır.
          Üç farklı modül — akış, fatura ve ödeme duvarı — tüm on-chain ödeme ihtiyaçlarını karşılar.
        </p>
      </div>

      {/* Requirements */}
      <div className="mb-14" style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "24px" }}>
        <p className="mono mb-5" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--muted)" }}>
          BAŞLAMADAN ÖNCE
        </p>
        <div className="space-y-4">
          {REQUIREMENTS.map((r) => (
            <div key={r.label} className="flex gap-6">
              <span
                className="mono shrink-0"
                style={{ fontSize: "10px", letterSpacing: "0.08em", color: "var(--accent)", width: "72px", paddingTop: "2px" }}
              >
                {r.label.toUpperCase()}
              </span>
              <span style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.6 }}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-6 mb-16">
        <div className="flex items-center gap-3 mb-2">
          <span className="mono" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--muted)" }}>
            MODÜLLER
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {MODULES.map((m) => (
          <div
            key={m.tag}
            style={{ border: "1px solid var(--border)", borderRadius: "3px", padding: "28px" }}
          >
            {/* Module header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="mono" style={{ fontSize: "10px", color: "var(--muted)" }}>{m.tag}</span>
                  <span className="tag">{m.title}</span>
                </div>
                <p className="mono" style={{ fontSize: "18px", fontWeight: 300, letterSpacing: "-0.02em", color: "var(--text)" }}>
                  {m.subtitle}
                </p>
              </div>
              <Link
                href={m.href}
                className="mono shrink-0"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-dim)",
                  padding: "5px 12px",
                  borderRadius: "2px",
                  textDecoration: "none",
                }}
              >
                AÇ →
              </Link>
            </div>

            {/* What it does */}
            <p style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.7, marginBottom: "20px" }}>
              {m.what}
            </p>

            <div className="grid grid-cols-2 gap-6">
              {/* Use cases */}
              <div>
                <p className="mono mb-3" style={{ fontSize: "9px", letterSpacing: "0.12em", color: "var(--muted)" }}>
                  KULLANIM ALANLARI
                </p>
                <div className="space-y-2">
                  {m.useCases.map((u, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="mono shrink-0" style={{ color: "var(--accent)", fontSize: "10px", marginTop: "2px" }}>—</span>
                      <span style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: 1.5 }}>{u}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <p className="mono mb-3" style={{ fontSize: "9px", letterSpacing: "0.12em", color: "var(--muted)" }}>
                  NASIL KULLANILIR
                </p>
                <div className="space-y-2">
                  {m.steps.map((s, i) => (
                    <div key={i} className="flex gap-3">
                      <span
                        className="mono shrink-0"
                        style={{ color: "var(--accent)", fontSize: "9px", marginTop: "3px", minWidth: "16px" }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ border: "1px solid var(--accent-dim)", borderRadius: "3px", background: "rgba(0,212,170,0.04)" }}
      >
        <div>
          <p className="mono mb-1" style={{ fontSize: "13px", color: "var(--text)", letterSpacing: "-0.01em" }}>
            Hazır mısın?
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>
            Cüzdanını bağla ve ilk işlemini yap.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/stream"
            className="mono"
            style={{
              background: "var(--accent)",
              color: "#000000",
              padding: "9px 20px",
              fontSize: "11px",
              letterSpacing: "0.1em",
              fontWeight: 600,
              borderRadius: "2px",
              textDecoration: "none",
            }}
          >
            STREAM →
          </Link>
          <Link
            href="/"
            className="mono"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-dim)",
              padding: "9px 20px",
              fontSize: "11px",
              letterSpacing: "0.1em",
              borderRadius: "2px",
              textDecoration: "none",
            }}
          >
            ANA SAYFA
          </Link>
        </div>
      </div>
    </div>
  );
}
