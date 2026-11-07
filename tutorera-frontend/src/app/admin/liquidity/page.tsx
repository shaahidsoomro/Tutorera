"use client";
import api from "@/lib/axios";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { AlertCircle, ArrowLeft, Filter, RefreshCw, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Score = { score: number; grade: "High" | "Moderate" | "Low" | "Very Low"; components: { demandScore: number; supplyScore: number; fillRateScore: number; competitionScore: number }; meta: { openRequests: number; eligibleTutors: number; fillRate: number; avgOffersPerRequest: number; avgSessionPrice: number; sampleSize: number; currency: string | null } };
type Segment = { key: string; city: string; subject: string; mode: string; currency: string; value: Score };
type Summary = { avgScore: number; totalSegments: number; high: number; moderate: number; low: number };
const EMPTY: Summary = { avgScore: 0, totalSegments: 0, high: 0, moderate: 0, low: 0 };

const GRADE_COLORS: Record<string, { color: string; bg: string }> = {
  High:       { color: STATUS_COLORS.success.color,  bg: STATUS_COLORS.success.bg },
  Moderate:   { color: STATUS_COLORS.warning.color,  bg: STATUS_COLORS.warning.bg },
  Low:        { color: STATUS_COLORS.danger.color,   bg: STATUS_COLORS.danger.bg },
  "Very Low": { color: STATUS_COLORS.danger.color,   bg: STATUS_COLORS.danger.bg },
};

export default function AdminLiquidityPage() {
  const [scores, setScores]         = useState<Record<string, Score>>({});
  const [summary, setSummary]       = useState(EMPTY);
  const [countryCode, setCountryCode] = useState("PK");
  const [query, setQuery]           = useState("");
  const [mode, setMode]             = useState("all");
  const [grade, setGrade]           = useState("all");
  const [sort, setSort]             = useState("score-desc");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api.get("/liquidity/overview", { params: { countryCode } });
      setScores(response.data?.scores || {});
      setSummary({ ...EMPTY, ...(response.data?.summary || {}) });
      setRefreshedAt(new Date());
    } catch {
      setError("Liquidity data could not be loaded. Check the marketplace API and try again.");
    } finally {
      setLoading(false);
    }
  }, [countryCode]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const segments: Segment[] = Object.entries(scores).map(([key, value]) => {
      const [, _currency = "PKR", city = "Unknown", subject = "Unknown", segmentMode = "unknown"] = key.split("|");
      return { key, city, subject, mode: segmentMode, currency: value.meta.currency || _currency, value };
    }).filter(segment =>
      (!needle || `${segment.city} ${segment.subject}`.toLocaleLowerCase().includes(needle)) &&
      (mode === "all" || segment.mode === mode) &&
      (grade === "all" || segment.value.grade === grade)
    );
    return segments.sort((a, b) =>
      sort === "score-asc"    ? a.value.score - b.value.score :
      sort === "demand-desc"  ? b.value.meta.openRequests - a.value.meta.openRequests :
      sort === "supply-asc"   ? a.value.meta.eligibleTutors - b.value.meta.eligibleTutors :
      b.value.score - a.value.score
    );
  }, [grade, mode, query, scores, sort]);

  const inputStyle: React.CSSProperties = { padding: "0.45rem 0.75rem", borderRadius: "0.4rem", border: `1px solid ${UI_COLORS.border}`, fontSize: "0.82rem", backgroundColor: UI_COLORS.surface, color: TEXT_COLORS.body, minHeight: 36 };
  const labelStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.secondary };

  return (
    <div style={{ padding: "1.75rem 2rem" }}>

      {/* Page header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
            <ArrowLeft size={14} aria-hidden="true" /> Control Tower
          </Link>
          <span style={{ color: UI_COLORS.border }}>/</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: STATUS_COLORS.purple.color }}>Supply Intelligence</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>Marketplace Liquidity</h1>
            <p style={{ color: TEXT_COLORS.muted, fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
              Inspect real city, subject, and teaching-mode segments using demand, eligible supply, fill rate, and offer competition.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <label style={labelStyle}>
              <span>Country</span>
              <input
                value={countryCode}
                maxLength={2}
                onChange={e => setCountryCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                aria-label="Two-letter ISO country code"
                aria-describedby="country-help"
                style={{ ...inputStyle, width: 56, textAlign: "center", textTransform: "uppercase", fontWeight: 700 }}
              />
            </label>
            <span id="country-help" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>Enter a two-letter ISO country code.</span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || countryCode.length !== 2}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.9rem", minHeight: 44, backgroundColor: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.4rem", fontSize: "0.82rem", fontWeight: 700, cursor: (loading || countryCode.length !== 2) ? "not-allowed" : "pointer", color: TEXT_COLORS.secondary }}
            >
              <RefreshCw aria-hidden="true" size={14} /> {loading ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </div>
      </div>

      {/* Summary metric cards */}
      <section
        aria-label="Liquidity summary"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}
      >
        {([
          [summary.avgScore,       "Average score",      "Current segment health"],
          [summary.totalSegments,  "Observed segments",  "No artificial combinations"],
          [summary.high,           "High liquidity",     "Score 75 or above"],
          [summary.moderate,       "Moderate",           "Score from 50 to 74"],
          [summary.low,            "Needs attention",    "Score below 50"],
        ] as [number, string, string][]).map(([value, label, hint]) => (
          <article key={label} style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, padding: "1rem 1.1rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: TEXT_COLORS.muted, margin: "0 0 0.3rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
            <strong style={{ display: "block", fontSize: "1.6rem", fontWeight: 800, color: TEXT_COLORS.body, lineHeight: 1.2 }}>{value}</strong>
            <small style={{ fontSize: "0.75rem", color: TEXT_COLORS.muted }}>{hint}</small>
          </article>
        ))}
      </section>

      {/* Filter toolbar */}
      <div
        aria-busy={loading}
        style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, overflow: "hidden" }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", padding: "1rem 1.25rem", borderBottom: `1px solid ${UI_COLORS.border}`, alignItems: "center" }}>
          <label style={{ ...labelStyle, flex: "1 1 180px" }}>
            <Search aria-hidden="true" size={15} />
            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>Search segments</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search city or subject…"
              aria-label="Search city or subject"
              style={{ ...inputStyle, flex: 1 }}
            />
          </label>
          <label style={labelStyle}>
            <Filter aria-hidden="true" size={14} />
            <span>Mode</span>
            <select value={mode} onChange={e => setMode(e.target.value)} style={inputStyle} aria-label="Filter by teaching mode">
              <option value="all">All modes</option>
              <option value="online">Online</option>
              <option value="in-person">In person</option>
            </select>
          </label>
          <label style={labelStyle}>
            <span>Grade</span>
            <select value={grade} onChange={e => setGrade(e.target.value)} style={inputStyle} aria-label="Filter by liquidity grade">
              <option value="all">All grades</option>
              <option>High</option><option>Moderate</option><option>Low</option><option>Very Low</option>
            </select>
          </label>
          <label style={labelStyle}>
            <span>Sort</span>
            <select value={sort} onChange={e => setSort(e.target.value)} style={inputStyle} aria-label="Sort segments">
              <option value="score-desc">Score: high to low</option>
              <option value="score-asc">Score: low to high</option>
              <option value="demand-desc">Most open requests</option>
              <option value="supply-asc">Lowest tutor supply</option>
            </select>
          </label>
        </div>

        {refreshedAt && !error && (
          <p aria-live="polite" style={{ fontSize: "0.78rem", color: TEXT_COLORS.muted, padding: "0.5rem 1.25rem", borderBottom: `1px solid ${UI_COLORS.border}`, margin: 0 }}>
            Updated {refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · showing {rows.length} of {summary.totalSegments} segments
          </p>
        )}

        {error ? (
          <div role="alert" style={{ display: "flex", gap: "0.75rem", padding: "1.5rem", alignItems: "flex-start" }}>
            <AlertCircle aria-hidden="true" size={18} color={STATUS_COLORS.danger.color} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ display: "block", color: TEXT_COLORS.body, fontSize: "0.9rem", marginBottom: "0.25rem" }}>Unable to load liquidity</strong>
              <p style={{ color: TEXT_COLORS.muted, fontSize: "0.82rem", margin: "0 0 0.75rem" }}>{error}</p>
              <button type="button" onClick={() => void load()} style={{ padding: "0.45rem 0.9rem", minHeight: 36, borderRadius: "0.4rem", border: `1px solid ${UI_COLORS.border}`, backgroundColor: UI_COLORS.surface, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", color: TEXT_COLORS.secondary }}>
                Try again
              </button>
            </div>
          </div>
        ) : loading ? (
          <div role="status" aria-label="Loading liquidity segments" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} aria-hidden="true" style={{ height: 44, borderRadius: "0.4rem", backgroundColor: UI_COLORS.card, animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <strong style={{ display: "block", color: TEXT_COLORS.body, fontSize: "1rem", marginBottom: "0.4rem" }}>No matching segments</strong>
            <p style={{ color: TEXT_COLORS.muted, fontSize: "0.85rem", margin: 0 }}>Adjust the filters or use a country with active marketplace demand.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
                Marketplace liquidity segments and score components
              </caption>
              <thead>
                <tr style={{ borderBottom: `1px solid ${UI_COLORS.border}`, backgroundColor: UI_COLORS.card }}>
                  {["Segment", "Score", "Demand / supply", "Fill rate", "Competition", "Rate / sample"].map(h => (
                    <th key={h} scope="col" style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 700, color: TEXT_COLORS.secondary, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((segment, idx) => {
                  const gc = GRADE_COLORS[segment.value.grade] ?? GRADE_COLORS.Low;
                  return (
                    <tr key={segment.key} style={{ borderBottom: idx < rows.length - 1 ? `1px solid ${UI_COLORS.border}` : "none" }}>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <strong style={{ display: "block", color: TEXT_COLORS.body }}>{segment.city}</strong>
                        <span style={{ color: TEXT_COLORS.muted }}>{segment.subject} · {segment.mode}</span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, backgroundColor: gc.bg, color: gc.color }}>
                          {segment.value.score}/100 · {segment.value.grade}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <strong style={{ display: "block", color: TEXT_COLORS.body }}>{segment.value.meta.openRequests} / {segment.value.meta.eligibleTutors}</strong>
                        <span style={{ color: TEXT_COLORS.muted }}>open requests / eligible tutors</span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <strong style={{ display: "block", color: TEXT_COLORS.body }}>{Math.round(segment.value.meta.fillRate * 100)}%</strong>
                        <ScoreBar value={segment.value.components.fillRateScore} label="Fill-rate component" />
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <strong style={{ display: "block", color: TEXT_COLORS.body }}>{segment.value.meta.avgOffersPerRequest}</strong>
                        <span style={{ color: TEXT_COLORS.muted }}>offers per request</span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <strong style={{ display: "block", color: TEXT_COLORS.body }}>
                          {segment.value.meta.avgSessionPrice ? `${segment.currency} ${segment.value.meta.avgSessionPrice.toLocaleString()}` : "Not enough data"}
                        </strong>
                        <span style={{ color: TEXT_COLORS.muted }}>sample {segment.value.meta.sampleSize}</span>
                        <details style={{ marginTop: "0.3rem" }}>
                          <summary style={{ fontSize: "0.75rem", color: UI_COLORS.accent, cursor: "pointer", fontWeight: 600 }}>Score detail</summary>
                          <div style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                            <ScoreBar value={segment.value.components.demandScore}      label="Demand"      />
                            <ScoreBar value={segment.value.components.supplyScore}      label="Supply"      />
                            <ScoreBar value={segment.value.components.competitionScore} label="Competition" />
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: TEXT_COLORS.muted, marginTop: "1rem" }}>
        <TrendingUp aria-hidden="true" size={14} />
        Liquidity scores are operational signals, not guarantees. Use At-Risk Requests for case-level intervention.
      </p>
    </div>
  );
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem" }}>
      <span style={{ color: TEXT_COLORS.muted, minWidth: 72 }}>{label}</span>
      <span
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        style={{ flex: 1, height: 6, backgroundColor: UI_COLORS.border, borderRadius: 999, overflow: "hidden" }}
      >
        <span style={{ display: "block", height: "100%", width: `${value}%`, backgroundColor: UI_COLORS.accent, borderRadius: 999 }} />
      </span>
      <b style={{ color: TEXT_COLORS.secondary, minWidth: 24, textAlign: "right" }}>{value}</b>
    </span>
  );
}
