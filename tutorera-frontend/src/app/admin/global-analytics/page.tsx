"use client";

import api from "@/lib/axios";
import { useEffect,useState } from "react";

interface CountryMetrics {
  countryCode: string;
  countryName: string;
  flag?: string;
  launchStatus: string;
  totalTutors: number;
  verifiedTutors: number;
  totalStudents: number;
  totalRequests: number;
  activeRequests: number;
  totalBookings: number;
  totalRevenueUSD: number;
  avgRating: number;
  matchRate: number;
  avgResponseMin: number;
}

interface GlobalSummary {
  totalCountries: number;
  liveCountries: number;
  totalTutors: number;
  totalStudents: number;
  totalBookings: number;
  totalRevenueUSD: number;
  countries: CountryMetrics[];
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  live: { bg: "#10b98122", fg: "#10b981" },
  beta: { bg: "#f59e0b22", fg: "#f59e0b" },
  planning: { bg: "#3b82f622", fg: "#3b82f6" },
  paused: { bg: "#ef444422", fg: "#ef4444" },
};

const PLACEHOLDER_COUNTRIES: CountryMetrics[] = [
  { countryCode: "PK", countryName: "Pakistan", flag: "🇵🇰", launchStatus: "live", totalTutors: 0, verifiedTutors: 0, totalStudents: 0, totalRequests: 0, activeRequests: 0, totalBookings: 0, totalRevenueUSD: 0, avgRating: 0, matchRate: 0, avgResponseMin: 0 },
  { countryCode: "AE", countryName: "United Arab Emirates", flag: "🇦🇪", launchStatus: "beta", totalTutors: 0, verifiedTutors: 0, totalStudents: 0, totalRequests: 0, activeRequests: 0, totalBookings: 0, totalRevenueUSD: 0, avgRating: 0, matchRate: 0, avgResponseMin: 0 },
  { countryCode: "GB", countryName: "United Kingdom", flag: "🇬🇧", launchStatus: "planning", totalTutors: 0, verifiedTutors: 0, totalStudents: 0, totalRequests: 0, activeRequests: 0, totalBookings: 0, totalRevenueUSD: 0, avgRating: 0, matchRate: 0, avgResponseMin: 0 },
  { countryCode: "US", countryName: "United States", flag: "🇺🇸", launchStatus: "planning", totalTutors: 0, verifiedTutors: 0, totalStudents: 0, totalRequests: 0, activeRequests: 0, totalBookings: 0, totalRevenueUSD: 0, avgRating: 0, matchRate: 0, avgResponseMin: 0 },
  { countryCode: "SA", countryName: "Saudi Arabia", flag: "🇸🇦", launchStatus: "planning", totalTutors: 0, verifiedTutors: 0, totalStudents: 0, totalRequests: 0, activeRequests: 0, totalBookings: 0, totalRevenueUSD: 0, avgRating: 0, matchRate: 0, avgResponseMin: 0 },
  { countryCode: "CA", countryName: "Canada", flag: "🇨🇦", launchStatus: "planning", totalTutors: 0, verifiedTutors: 0, totalStudents: 0, totalRequests: 0, activeRequests: 0, totalBookings: 0, totalRevenueUSD: 0, avgRating: 0, matchRate: 0, avgResponseMin: 0 },
  { countryCode: "AU", countryName: "Australia", flag: "🇦🇺", launchStatus: "planning", totalTutors: 0, verifiedTutors: 0, totalStudents: 0, totalRequests: 0, activeRequests: 0, totalBookings: 0, totalRevenueUSD: 0, avgRating: 0, matchRate: 0, avgResponseMin: 0 },
  { countryCode: "IN", countryName: "India", flag: "🇮🇳", launchStatus: "planning", totalTutors: 0, verifiedTutors: 0, totalStudents: 0, totalRequests: 0, activeRequests: 0, totalBookings: 0, totalRevenueUSD: 0, avgRating: 0, matchRate: 0, avgResponseMin: 0 },
];

export default function GlobalAnalyticsPage() {
  const [data, setData] = useState<GlobalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/global-analytics");
      setData(res.data);
    } catch {
      setError("Global analytics endpoint not yet available. Showing placeholder data.");
      setData({
        totalCountries: 8,
        liveCountries: 2,
        totalTutors: 0,
        totalStudents: 0,
        totalBookings: 0,
        totalRevenueUSD: 0,
        countries: PLACEHOLDER_COUNTRIES,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredCountries = data?.countries.filter(
    c => statusFilter === "all" || c.launchStatus === statusFilter
  ) || [];

  const cardStyle: React.CSSProperties = { background: "#18181f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: 160 };
  const metricLabel: React.CSSProperties = { fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 2 };

  return (
    <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 12 }}>🌍 Global Analytics</h2>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.875rem" }}>Cross-country performance metrics and market health</p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#0f0f13", color: "#f1f5f9", fontSize: "0.875rem" }}>
          <option value="all">All Markets</option>
          <option value="live">Live</option>
          <option value="beta">Beta</option>
          <option value="planning">Planning</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      {error && <div style={{ background: "#f59e0b22", border: "1px solid #f59e0b", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#fcd34d" }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#94a3b8" }}>Loading…</div>
      ) : data ? (
        <>
          {/* Summary Row */}
          <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
            <div style={cardStyle}>
              <div style={metricLabel}>Markets</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{data.totalCountries}</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{data.liveCountries} live</div>
            </div>
            <div style={cardStyle}>
              <div style={metricLabel}>Total Tutors</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{data.totalTutors.toLocaleString()}</div>
            </div>
            <div style={cardStyle}>
              <div style={metricLabel}>Total Students</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{data.totalStudents.toLocaleString()}</div>
            </div>
            <div style={cardStyle}>
              <div style={metricLabel}>Total Bookings</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{data.totalBookings.toLocaleString()}</div>
            </div>
            <div style={cardStyle}>
              <div style={metricLabel}>Revenue (USD)</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981" }}>${data.totalRevenueUSD.toLocaleString()}</div>
            </div>
          </div>

          {/* Per-Country Cards */}
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 16 }}>Market Breakdown</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {filteredCountries.map((c) => {
              const statusColor = STATUS_COLORS[c.launchStatus] || { bg: "rgba(255,255,255,0.06)", fg: "#94a3b8" };
              return (
                <div key={c.countryCode} style={{ background: "#18181f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 24, position: "relative" }}>
                  {/* Status chip */}
                  <span style={{ position: "absolute", top: 12, right: 12, display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 600, background: statusColor.bg, color: statusColor.fg, border: `1px solid ${statusColor.fg}44` }}>{c.launchStatus}</span>

                  {/* Country header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>{c.flag || "🌐"}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{c.countryName}</div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{c.countryCode}</div>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                    <div>
                      <div style={metricLabel}>Tutors</div>
                      <div style={{ fontWeight: 700 }}>{c.totalTutors} <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>({c.verifiedTutors} verified)</span></div>
                    </div>
                    <div>
                      <div style={metricLabel}>Students</div>
                      <div style={{ fontWeight: 700 }}>{c.totalStudents}</div>
                    </div>
                    <div>
                      <div style={metricLabel}>Requests</div>
                      <div style={{ fontWeight: 700 }}>{c.totalRequests} <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>({c.activeRequests} active)</span></div>
                    </div>
                    <div>
                      <div style={metricLabel}>Bookings</div>
                      <div style={{ fontWeight: 700 }}>{c.totalBookings}</div>
                    </div>
                    <div>
                      <div style={metricLabel}>Revenue</div>
                      <div style={{ fontWeight: 700, color: "#10b981" }}>${c.totalRevenueUSD.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={metricLabel}>Match Rate</div>
                      <div style={{ fontWeight: 700 }}>{c.matchRate}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
