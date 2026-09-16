"use client";

import api from "@/lib/axios";
import { useEffect,useState } from "react";

interface ExchangeRateRow {
  currency: string;
  rateToUSD: number;
  inverse: number;
  source: string;
  updatedAt: string;
}

export default function ExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/exchange-rates");
      const data = res.data.rates || {};
      const rows: ExchangeRateRow[] = Object.entries(data).map(([currency, info]: [string, any]) => ({
        currency,
        rateToUSD: typeof info === "number" ? info : info.rateToUSD || 0,
        inverse: typeof info === "number" ? (info > 0 ? 1 / info : 0) : (info.rateToUSD > 0 ? 1 / info.rateToUSD : 0),
        source: typeof info === "object" ? info.source || "api" : "api",
        updatedAt: typeof info === "object" ? info.updatedAt || "" : "",
      }));
      rows.sort((a, b) => a.currency.localeCompare(b.currency));
      setRates(rows);
      setLastRefresh(res.data.lastRefresh || new Date().toISOString());
    } catch {
      setError("Failed to load exchange rates.");
    } finally {
      setLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post("/admin/exchange-rates/refresh");
      setSuccess("Exchange rates refreshed successfully from upstream provider.");
      await fetchRates();
    } catch {
      setError("Failed to refresh exchange rates. The upstream provider may be unavailable.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  const filtered = rates.filter(r =>
    r.currency.toLowerCase().includes(search.toLowerCase())
  );

  const formatRate = (rate: number) => {
    if (rate >= 100) return rate.toFixed(2);
    if (rate >= 1) return rate.toFixed(4);
    return rate.toFixed(6);
  };

  const cellStyle: React.CSSProperties = { padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" };
  const headCell: React.CSSProperties = { ...cellStyle, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em", fontSize: "0.72rem" };
  const cardStyle: React.CSSProperties = { background: "#18181f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: 180 };

  return (
    <div style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 12 }}>📈 Exchange Rates</h2>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.875rem" }}>
            Live currency rates (base: USD) — refreshed hourly
            {lastRefresh && <> • Last refresh: <strong>{new Date(lastRefresh).toLocaleString()}</strong></>}
          </p>
        </div>
        <button onClick={handleForceRefresh} disabled={refreshing} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#6366f1", color: "white", cursor: refreshing ? "wait" : "pointer", fontWeight: 600, fontSize: "0.875rem", opacity: refreshing ? 0.6 : 1 }}>
          {refreshing ? "Refreshing…" : "⟳ Force Refresh"}
        </button>
      </div>

      {error && <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#fca5a5" }}>{error}</div>}
      {success && <div style={{ background: "#10b98122", border: "1px solid #10b981", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#6ee7b7" }}>{success}</div>}

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={cardStyle}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: 4 }}>Total Currencies</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{rates.length}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: 4 }}>Base Currency</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>💲 USD</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: 4 }}>Last Updated</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{lastRefresh ? new Date(lastRefresh).toLocaleTimeString() : "—"}</div>
        </div>
      </div>

      {/* Search */}
      <input placeholder="Search currency…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#0f0f13", color: "#f1f5f9", width: 300, marginBottom: 16, fontSize: "0.875rem" }} />

      {loading ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#94a3b8" }}>Loading…</div>
      ) : (
        <div style={{ background: "#18181f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={headCell}>Currency</th>
                <th style={{ ...headCell, textAlign: "right" }}>1 CUR = ? USD</th>
                <th style={{ ...headCell, textAlign: "right" }}>1 USD = ? CUR</th>
                <th style={headCell}>Source</th>
                <th style={headCell}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ ...cellStyle, textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>No rates match your search.</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.currency} style={{ transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.05)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={cellStyle}>
                    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: "0.8rem", fontWeight: 700, border: "1px solid rgba(255,255,255,0.15)" }}>{row.currency}</span>
                  </td>
                  <td style={{ ...cellStyle, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{formatRate(row.rateToUSD)}</td>
                  <td style={{ ...cellStyle, textAlign: "right", fontFamily: "monospace" }}>{formatRate(row.inverse)}</td>
                  <td style={cellStyle}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: "0.72rem", fontWeight: 600, background: row.source === "manual" ? "#f59e0b22" : "rgba(255,255,255,0.06)", color: row.source === "manual" ? "#f59e0b" : "#94a3b8" }}>{row.source}</span>
                  </td>
                  <td style={{ ...cellStyle, color: "#94a3b8", fontSize: "0.85rem" }}>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
