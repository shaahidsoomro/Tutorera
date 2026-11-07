"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useAppGuard } from "@/hooks/useAppGuard";
import api from "@/lib/axios";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { AlertCircle, ArrowRight, BriefcaseBusiness, RefreshCw, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Score = {
  score: number;
  grade: string;
  components: { demandScore: number; supplyScore: number; fillRateScore: number; competitionScore: number };
  meta: { openRequests: number; eligibleTutors: number; fillRate: number; avgOffersPerRequest: number; avgSessionPrice: number; sampleSize: number; currency: string | null };
};
type Segment = { key: string; city: string; subject: string; mode: string; currency: string; score: Score; opportunity: number };

const srOnly: React.CSSProperties = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", borderWidth: 0 };

export default function TutorOpportunitiesPage() {
  const { user } = useAuth();
  const guard = useAppGuard();
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("all");
  const [countryCode, setCountryCode] = useState("");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("country")?.toUpperCase();
    if (requested && /^[A-Z]{2}$/.test(requested)) setCountryCode(requested);
  }, []);

  const effectiveCountryCode = countryCode || user?.countryCode || "PK";

  const load = useCallback(async () => {
    if (!user || user.role !== "tutor") return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/liquidity/overview", { params: { countryCode: effectiveCountryCode } });
      setScores(response.data?.scores || {});
    } catch {
      setError("Opportunity data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [effectiveCountryCode, user]);

  useEffect(() => { void load(); }, [load]);

  const segments = useMemo<Segment[]>(() =>
    Object.entries(scores).map(([key, score]) => {
      const [, _currency = "PKR", city = "Unknown", subject = "Tutoring", segmentMode = "online"] = key.split("|");
      const scarcity = score.meta.openRequests / Math.max(score.meta.eligibleTutors, 1);
      const opportunity = Math.min(100, Math.round(score.components.demandScore * 0.65 + Math.min(scarcity * 20, 35)));
      return { key, city, subject, mode: segmentMode, currency: score.meta.currency || _currency, score, opportunity };
    })
    .filter(item => (mode === "all" || item.mode === mode) && `${item.city} ${item.subject}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.opportunity - a.opportunity),
  [mode, query, scores]);

  if (guard !== "ok" || !user) return null;

  if (user.role !== "tutor") return (
    <DashboardLayout>
      <section style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 2rem", textAlign: "center", gap: "1rem" }}>
        <AlertCircle size={40} color={STATUS_COLORS.danger.color} />
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: TEXT_COLORS.body }}>Tutor access only</h1>
        <p style={{ color: TEXT_COLORS.muted }}>This workspace is available to approved tutors.</p>
        <Link href="/dashboard" style={{ color: UI_COLORS.accent, fontWeight: 700 }}>Return to dashboard</Link>
      </section>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div style={{ padding: "1.75rem 2rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", fontWeight: 700, color: UI_COLORS.accent, marginBottom: "0.4rem" }}>
              <TrendingUp size={16} aria-hidden="true" /> Tutor market intelligence
            </p>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 0.4rem" }}>Teaching opportunities</h1>
            <p style={{ color: TEXT_COLORS.muted, fontSize: "0.875rem", margin: 0 }}>
              Find subjects and locations with active student demand. Scores use anonymized marketplace activity from the last 30 days.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.9rem", minHeight: 44, borderRadius: "0.4rem", border: `1px solid ${UI_COLORS.border}`, backgroundColor: UI_COLORS.surface, fontWeight: 700, fontSize: "0.82rem", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            <RefreshCw size={17} aria-hidden="true" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Explainer */}
        <section
          aria-label="How opportunity scores work"
          style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "1rem 1.25rem", backgroundColor: UI_COLORS.accentLight, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, marginBottom: "1.25rem" }}
        >
          <BriefcaseBusiness aria-hidden="true" size={20} color={UI_COLORS.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ fontSize: "0.875rem", color: TEXT_COLORS.body }}>Opportunity score</strong>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: TEXT_COLORS.muted }}>
              Higher scores indicate stronger recent demand relative to currently eligible tutor supply. They are directional signals, not guaranteed work.
            </p>
          </div>
        </section>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.5rem", backgroundColor: UI_COLORS.surface, flex: "1 1 200px" }}>
            <Search size={17} aria-hidden="true" color={TEXT_COLORS.muted} />
            <span style={srOnly}>Search city or subject</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search city or subject"
              style={{ border: "none", outline: "none", fontSize: "0.875rem", color: TEXT_COLORS.body, background: "transparent", flex: 1 }}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: TEXT_COLORS.secondary }}>
            <span>Teaching mode</span>
            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              aria-label="Filter by teaching mode"
              style={{ padding: "0.5rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.4rem", fontSize: "0.875rem", color: TEXT_COLORS.body }}
            >
              <option value="all">All modes</option>
              <option value="online">Online</option>
              <option value="in-person">In person</option>
            </select>
          </label>
        </div>

        {/* Content */}
        {error ? (
          <div role="alert" style={{ display: "flex", gap: "0.75rem", padding: "1rem 1.25rem", backgroundColor: STATUS_COLORS.danger.bg, borderRadius: "0.75rem", border: `1px solid ${STATUS_COLORS.danger.border}`, color: STATUS_COLORS.danger.color, marginBottom: "1.25rem" }}>
            <AlertCircle aria-hidden="true" size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>Unable to load opportunities</strong>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>{error}</p>
              <button onClick={() => void load()} style={{ padding: "0.4rem 0.875rem", background: STATUS_COLORS.danger.color, color: "white", border: "none", borderRadius: "0.375rem", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", minHeight: 36 }}>Try again</button>
            </div>
          </div>
        ) : loading ? (
          <div role="status" aria-label="Loading teaching opportunities" style={{ display: "flex", gap: "1rem", padding: "2rem 0" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ flex: 1, height: 160, backgroundColor: UI_COLORS.border, borderRadius: "0.75rem", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
          </div>
        ) : segments.length === 0 ? (
          <section style={{ textAlign: "center", padding: "3rem 2rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: TEXT_COLORS.body, marginBottom: "0.5rem" }}>No observed opportunities match</h2>
            <p style={{ color: TEXT_COLORS.muted, marginBottom: "1.25rem" }}>Try another filter or browse live tuition requests directly.</p>
            <Link href="/browse-requests" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.65rem 1.25rem", backgroundColor: UI_COLORS.accent, color: "white", borderRadius: "0.5rem", fontWeight: 700, textDecoration: "none", minHeight: 44 }}>Browse requests</Link>
          </section>
        ) : (
          <section aria-label="Ranked teaching opportunities" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {segments.map((item, index) => (
              <article
                key={item.key}
                style={{ position: "relative", backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, padding: "1.25rem 1.5rem" }}
              >
                <span style={{ position: "absolute", top: "0.75rem", right: "0.75rem", fontSize: "0.75rem", fontWeight: 800, color: TEXT_COLORS.muted }}>#{index + 1}</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 0.2rem" }}>{item.subject}</h2>
                    <p style={{ fontSize: "0.82rem", color: TEXT_COLORS.muted, margin: 0 }}>{item.city} · {item.mode}</p>
                  </div>
                  <strong style={{ fontSize: "1.5rem", fontWeight: 900, color: UI_COLORS.accent }}>
                    {item.opportunity}<small style={{ fontSize: "0.75rem", fontWeight: 600, color: TEXT_COLORS.muted }}>/100</small>
                  </strong>
                </div>
                <div
                  role="meter"
                  aria-label={`${item.subject} opportunity score`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.opportunity}
                  style={{ height: 6, backgroundColor: UI_COLORS.border, borderRadius: "999px", overflow: "hidden", marginBottom: "1rem" }}
                >
                  <span style={{ display: "block", height: "100%", width: `${item.opportunity}%`, backgroundColor: UI_COLORS.accent, borderRadius: "999px" }} />
                </div>
                <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", fontSize: "0.82rem", margin: "0 0 0.75rem" }}>
                  {[
                    { dt: "Open requests", dd: item.score.meta.openRequests },
                    { dt: "Eligible tutors", dd: item.score.meta.eligibleTutors },
                    { dt: "Offers per request", dd: item.score.meta.avgOffersPerRequest },
                    { dt: "Observed rate", dd: item.score.meta.avgSessionPrice ? `${item.currency} ${item.score.meta.avgSessionPrice.toLocaleString()}` : "Limited data" },
                  ].map(({ dt, dd }) => (
                    <div key={dt}>
                      <dt style={{ color: TEXT_COLORS.muted, marginBottom: "0.1rem" }}>{dt}</dt>
                      <dd style={{ fontWeight: 700, color: TEXT_COLORS.body, margin: 0 }}>{dd}</dd>
                    </div>
                  ))}
                </dl>
                <p style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted, margin: "0 0 0.75rem" }}>
                  Based on {item.score.meta.sampleSize} marketplace observations.
                </p>
                <Link
                  href={`/browse-requests?city=${encodeURIComponent(item.city)}&subject=${encodeURIComponent(item.subject)}&teachingMode=${encodeURIComponent(item.mode)}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.875rem", fontWeight: 700, color: UI_COLORS.accent, textDecoration: "none" }}
                >
                  View matching requests <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
