"use client";

import {
  TRADING_NAME
} from "@/lib/site";
import {
  CheckCircle2,
  Save,
  Settings2
} from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";
import s from "../compliance-pages.module.css";

const cookieCategories = [
  {
    key: "necessary",
    title: "1. Strictly Necessary Cookies (Always Active)",
    mandatory: true,
    desc: "Essential for navigating the platform, authenticating user sessions, keeping your shopping and negotiation state secure, and delivering requested tutoring software features. These cannot be disabled.",
    examples: [
      { name: "token", provider: "TUTORERA", duration: "7 days", purpose: "Maintains secure JWT session authentication." },
      { name: "csrf_token", provider: "TUTORERA", duration: "Session", purpose: "Prevents cross-site request forgery attacks." },
      { name: "cookie_consent", provider: "TUTORERA", duration: "1 year", purpose: "Stores your verified cookie preference selections." },
    ]
  },
  {
    key: "preferences",
    title: "2. Functionality & Preference Cookies",
    mandatory: false,
    desc: "Remember choices you have made—such as your preferred operating currency (PKR, USD, AED, GBP, SAR), default IANA timezone, and search filter parameters—to provide a customized learning experience.",
    examples: [
      { name: "user_currency", provider: "TUTORERA", duration: "180 days", purpose: "Remembers your selected marketplace display currency." },
      { name: "user_tz", provider: "TUTORERA", duration: "180 days", purpose: "Stores timezone to accurately render lesson schedules." },
      { name: "recent_filters", provider: "TUTORERA", duration: "30 days", purpose: "Remembers last selected subject/level in directory search." },
    ]
  },
  {
    key: "analytics",
    title: "3. Performance & Analytics Cookies",
    mandatory: false,
    desc: "Help us understand how visitors interact with TUTORERA by collecting aggregated, anonymized information regarding page load speeds, error rates, and traffic sources. This data allows us to optimize platform reliability.",
    examples: [
      { name: "_ga, _gid", provider: "Google Analytics", duration: "Up to 2 years", purpose: "Anonymized page view statistics and user flow tracking." },
      { name: "perf_metrics", provider: "TUTORERA", duration: "Session", purpose: "Measures search latency and request wizard drop-off." },
    ]
  },
  {
    key: "marketing",
    title: "4. Marketing & Communication Cookies",
    mandatory: false,
    desc: "Used to deliver relevant tutoring announcements and prevent showing the same promotional notification repeatedly. We do NOT use marketing cookies on accounts designated for minor learners.",
    examples: [
      { name: "_fbp", provider: "Meta", duration: "90 days", purpose: "Measures conversion effectiveness of educational campaigns." },
      { name: "promo_dismissed", provider: "TUTORERA", duration: "60 days", purpose: "Prevents displaying educational promo banners repeatedly." },
    ]
  }
];

export default function CookiePolicyPage() {
  const [preferences, setPreferences] = useState({
    preferences: true,
    analytics: false,
    marketing: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tutorera_cookie_consent");
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch {
      // fallback
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem("tutorera_cookie_consent", JSON.stringify(preferences));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // fallback
    }
  };

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <h1>TUTORERA Cookie & Tracking Policy</h1>
        <p>
          Transparent information on how {TRADING_NAME} uses cookies, local storage tokens, and tracking technologies to keep your session secure and customize your global tutoring experience.
        </p>
      </header>

      <section className={s.container}>
        {/* Interactive Consent Management Panel */}
        <div style={{ backgroundColor: "#F8FAFF", border: "1.5px solid #bfdbfe", borderRadius: 20, padding: "2rem", marginBottom: "3.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Settings2 size={24} color="#0329B2" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#021550", margin: 0 }}>
              Manage Your Cookie Preferences
            </h2>
          </div>
          <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.6, marginBottom: "1.75rem" }}>
            Customize your tracking choices below. Strictly necessary cookies remain enabled to provide essential security and booking services. We respect "Do Not Track" signals and never sell your browsing data.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#021550", fontSize: "0.95rem" }}>Strictly Necessary Cookies</div>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Authentication, CSRF security, and payment processing.</div>
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#16a34a", backgroundColor: "#F0FDF4", padding: "0.3rem 0.75rem", borderRadius: 999, border: "1px solid #bbf7d0" }}>
                Always Active
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#021550", fontSize: "0.95rem" }}>Preferences & Customization</div>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Remember your operating currency, timezone, and recent search filters.</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.preferences}
                onChange={(e) => setPreferences({ ...preferences, preferences: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#0329B2" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#021550", fontSize: "0.95rem" }}>Performance & Analytics</div>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Help us analyze marketplace traffic patterns and software speed.</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#0329B2" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#021550", fontSize: "0.95rem" }}>Marketing & Promotions</div>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Delivers relevant tutoring updates. Never enabled for minor student accounts.</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#0329B2" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={handleSave}
              style={{
                backgroundColor: "#0329B2",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.75rem 1.5rem",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <Save size={16} /> Save Preferences
            </button>
            {saved && (
              <span style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <CheckCircle2 size={16} /> Preferences successfully updated!
              </span>
            )}
          </div>
        </div>

        {/* Detailed Cookie Category Disclosures */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {cookieCategories.map((cat) => (
            <article key={cat.key} className={s.card}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
                {cat.title}
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.7, marginBottom: "1.25rem" }}>
                {cat.desc}
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid #E2E8F0", color: "#021550" }}>
                      <th style={{ padding: "0.6rem 0.75rem" }}>Cookie / Identifier</th>
                      <th style={{ padding: "0.6rem 0.75rem" }}>Provider</th>
                      <th style={{ padding: "0.6rem 0.75rem" }}>Lifespan</th>
                      <th style={{ padding: "0.6rem 0.75rem" }}>Specific Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.examples.map((ex) => (
                      <tr key={ex.name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.65rem 0.75rem", fontFamily: "monospace", fontWeight: 700, color: "#0329B2" }}>{ex.name}</td>
                        <td style={{ padding: "0.65rem 0.75rem", color: "#334155" }}>{ex.provider}</td>
                        <td style={{ padding: "0.65rem 0.75rem", color: "#64748b" }}>{ex.duration}</td>
                        <td style={{ padding: "0.65rem 0.75rem", color: "#475569" }}>{ex.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>

        {/* Browser Controls Info */}
        <div className={s.infoBox} style={{ marginTop: "3.5rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
            Browser Cookie Controls & Inquiries
          </h2>
          <p style={{ color: "#475569", lineHeight: 1.6, fontSize: "0.88rem", marginBottom: "1rem" }}>
            Most web browsers automatically accept cookies, but you can alter your browser settings to reject cookies or prompt you before accepting cookies. Please note that disabling strictly necessary cookies will disrupt essential platform features such as account login and booking checkout.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link href="/privacy" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Global Privacy Policy →</Link>
            <Link href="/privacy-center" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Privacy Request Center →</Link>
            <Link href="/legal/subprocessors" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Subprocessors Directory →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
