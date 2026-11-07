"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingDown, ArrowLeft, RefreshCw, AlertCircle, CheckCircle, ShieldCheck, MapPin, BookOpen } from "lucide-react";
import api from "@/lib/axios";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

interface SupplyGap {
  subject: string;
  city: string;
  teachingMode: string;
  activeRequests: number;
  eligibleTutors: number;
  policeVerifiedTutors: number;
  supplyDemandRatio: number;
  gapStatus: "CRITICAL_GAP" | "MODERATE_GAP" | "HEALTHY";
}

export default function SupplyGapsPage() {
  const [gaps, setGaps] = useState<SupplyGap[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGaps = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/supply-gaps");
      setGaps(res.data.gaps || []);
    } catch (err) {
      console.error("Failed to load supply gaps:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGaps();
  }, []);

  const criticalCount = gaps.filter((g) => g.gapStatus === "CRITICAL_GAP").length;

  return (
    <div style={{ padding: "1.75rem 2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: UI_COLORS.border }}>/</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: UI_COLORS.purple }}>Tutor Operations</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: TEXT_COLORS.body, margin: 0 }}>
            Supply Gap & Tutor Density Intelligence
          </h1>
          <p style={{ color: TEXT_COLORS.muted, fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
            Identify localized demand deficits where verified tutor supply is insufficient.
          </p>
        </div>

        <button
          onClick={fetchGaps}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 0.9rem",
            backgroundColor: UI_COLORS.surface,
            border: `1px solid ${UI_COLORS.border}`,
            borderRadius: "0.4rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Analytics
        </button>
      </div>

      {/* Summary Card */}
      <div style={{ backgroundColor: criticalCount > 0 ? STATUS_COLORS.danger.bg : STATUS_COLORS.success.bg, border: `1px solid ${criticalCount > 0 ? STATUS_COLORS.danger.border : STATUS_COLORS.success.border}`, borderRadius: "0.75rem", padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <AlertCircle size={20} color={criticalCount > 0 ? UI_COLORS.error : UI_COLORS.success} />
        <div>
          <strong style={{ color: criticalCount > 0 ? STATUS_COLORS.danger.color : UI_COLORS.success, fontSize: "0.9rem" }}>
            {criticalCount} Critical Marketplace Supply Deficits Detected
          </strong>
          <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: criticalCount > 0 ? STATUS_COLORS.danger.color : STATUS_COLORS.success.color }}>
            High-density student request areas requiring targeted tutor acquisition campaigns or online conversion incentives.
          </p>
        </div>
      </div>

      {/* Supply Gaps Table */}
      <div style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: TEXT_COLORS.muted }}>Calculating Supply-Demand Ratios…</div>
        ) : gaps.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: TEXT_COLORS.muted }}>No active demand recorded for supply gap calculation.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ backgroundColor: STATUS_COLORS.neutral.bg, borderBottom: `1px solid ${UI_COLORS.border}`, textAlign: "left", color: TEXT_COLORS.muted }}>
                <th style={{ padding: "0.85rem 1.25rem", fontWeight: 800 }}>Subject & Curriculum</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Location & Mode</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Active Requests</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Eligible Tutors</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Police Verified</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Supply / Demand</th>
                <th style={{ padding: "0.85rem 1.25rem", fontWeight: 800 }}>Status & Action</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((gap, idx) => (
                <tr key={`${gap.subject}-${gap.city}-${idx}`} style={{ borderBottom: `1px solid ${STATUS_COLORS.neutral.bg}` }}>
                  <td style={{ padding: "1rem 1.25rem", fontWeight: 800, color: TEXT_COLORS.body }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <BookOpen size={14} color={UI_COLORS.accent} />
                      {gap.subject}
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1rem", color: TEXT_COLORS.secondary }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <MapPin size={13} color={TEXT_COLORS.muted} />
                      <span>{gap.city}</span>
                      <span style={{ fontSize: "0.7rem", background: STATUS_COLORS.neutral.bg, padding: "0.1rem 0.4rem", borderRadius: "999px" }}>
                        {gap.teachingMode}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1rem", fontWeight: 800, color: TEXT_COLORS.body }}>
                    {gap.activeRequests}
                  </td>
                  <td style={{ padding: "1rem 1rem", fontWeight: 700, color: TEXT_COLORS.secondary }}>
                    {gap.eligibleTutors}
                  </td>
                  <td style={{ padding: "1rem 1rem", fontWeight: 700, color: gap.policeVerifiedTutors === 0 ? UI_COLORS.error : UI_COLORS.success }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <ShieldCheck size={14} />
                      {gap.policeVerifiedTutors}
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        backgroundColor:
                          gap.gapStatus === "CRITICAL_GAP"
                            ? STATUS_COLORS.danger.bg
                            : gap.gapStatus === "MODERATE_GAP"
                            ? STATUS_COLORS.warning.bg
                            : STATUS_COLORS.success.bg,
                        color:
                          gap.gapStatus === "CRITICAL_GAP"
                            ? STATUS_COLORS.danger.color
                            : gap.gapStatus === "MODERATE_GAP"
                            ? "#9a3412"
                            : UI_COLORS.success,
                      }}
                    >
                      {gap.supplyDemandRatio.toFixed(2)}x
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.78rem", color: gap.gapStatus === "CRITICAL_GAP" ? UI_COLORS.error : gap.gapStatus === "MODERATE_GAP" ? STATUS_COLORS.warning.color : UI_COLORS.success }}>
                      {gap.gapStatus === "CRITICAL_GAP"
                        ? "🚨 Recruit Tutors / Propose Online"
                        : gap.gapStatus === "MODERATE_GAP"
                        ? "⚡ Re-engage Inactive Tutors"
                        : "✓ Healthy Liquidity"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
