"use client";

import api from "@/lib/axios";
import { AlertCircle,ArrowLeft,BookOpen,MapPin,RefreshCw,ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

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
            <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#4f46e5" }}>Tutor Operations</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            Supply Gap & Tutor Density Intelligence
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
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
            backgroundColor: "white",
            border: "1px solid #cbd5e1",
            borderRadius: "0.4rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Analytics
        </button>
      </div>

      {/* Summary Card */}
      <div style={{ backgroundColor: criticalCount > 0 ? "#fef2f2" : "#f0fdf4", border: `1px solid ${criticalCount > 0 ? "#fecaca" : "#bbf7d0"}`, borderRadius: "0.75rem", padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <AlertCircle size={20} color={criticalCount > 0 ? "#dc2626" : "#16a34a"} />
        <div>
          <strong style={{ color: criticalCount > 0 ? "#991b1b" : "#166534", fontSize: "0.9rem" }}>
            {criticalCount} Critical Marketplace Supply Deficits Detected
          </strong>
          <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: criticalCount > 0 ? "#b91c1c" : "#15803d" }}>
            High-density student request areas requiring targeted tutor acquisition campaigns or online conversion incentives.
          </p>
        </div>
      </div>

      {/* Supply Gaps Table */}
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Calculating Supply-Demand Ratios…</div>
        ) : gaps.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>No active demand recorded for supply gap calculation.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
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
                <tr key={`${gap.subject}-${gap.city}-${idx}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "1rem 1.25rem", fontWeight: 800, color: "#0f172a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <BookOpen size={14} color="#0329b2" />
                      {gap.subject}
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1rem", color: "#475569" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <MapPin size={13} color="#64748b" />
                      <span>{gap.city}</span>
                      <span style={{ fontSize: "0.7rem", background: "#f1f5f9", padding: "0.1rem 0.4rem", borderRadius: "999px" }}>
                        {gap.teachingMode}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1rem", fontWeight: 800, color: "#0f172a" }}>
                    {gap.activeRequests}
                  </td>
                  <td style={{ padding: "1rem 1rem", fontWeight: 700, color: "#334155" }}>
                    {gap.eligibleTutors}
                  </td>
                  <td style={{ padding: "1rem 1rem", fontWeight: 700, color: gap.policeVerifiedTutors === 0 ? "#dc2626" : "#059669" }}>
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
                            ? "#fee2e2"
                            : gap.gapStatus === "MODERATE_GAP"
                            ? "#ffedd5"
                            : "#ecfdf5",
                        color:
                          gap.gapStatus === "CRITICAL_GAP"
                            ? "#991b1b"
                            : gap.gapStatus === "MODERATE_GAP"
                            ? "#9a3412"
                            : "#059669",
                      }}
                    >
                      {gap.supplyDemandRatio.toFixed(2)}x
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.78rem", color: gap.gapStatus === "CRITICAL_GAP" ? "#dc2626" : gap.gapStatus === "MODERATE_GAP" ? "#d97706" : "#059669" }}>
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
