"use client";

import api from "@/lib/axios";
import { AlertCircle,ArrowLeft,CheckCircle,DollarSign,Edit2,Globe,MapPin,RefreshCw,ShieldCheck,ToggleLeft,ToggleRight,X } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

interface MarketConfig {
  _id: string;
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  timezones?: string[];
  supportedLanguages?: string[];
  paymentProvider?: string;
  paymentsEnabled?: boolean;
  payoutsEnabled?: boolean;
  featureFlags?: Record<string, boolean>;
  onlineEnabled: boolean;
  homeTuitionEnabled: boolean;
  backgroundCheckRequired: boolean;
  platformFeePercent: number;
  taxPercent: number;
  isActive: boolean;
  launchStatus: "planning" | "beta" | "live" | "paused";
  supportedCities: string[];
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<MarketConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMarket, setEditingMarket] = useState<MarketConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/markets");
      setMarkets(res.data.markets || []);
    } catch (err) {
      console.error("Failed to load market configs:", err);
      setStatusMessage({ type: "error", text: "Failed to load global market configurations." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMarket) return;
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await api.put(`/admin/markets/${editingMarket._id}`, editingMarket);
      setStatusMessage({ type: "success", text: `${editingMarket.countryName} market configuration updated successfully.` });
      setMarkets((prev) => prev.map((m) => (m._id === editingMarket._id ? res.data.market : m)));
      setEditingMarket(null);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error("Failed to update market:", err);
      setStatusMessage({ type: "error", text: error.response?.data?.message || "Failed to update market." });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <span style={{ background: "#ecfdf5", color: "#059669", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, border: "1px solid #a7f3d0" }}>LIVE</span>;
      case "beta":
        return <span style={{ background: "#fef3c7", color: "#b45309", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, border: "1px solid #fde68a" }}>BETA</span>;
      case "paused":
        return <span style={{ background: "#fef2f2", color: "#dc2626", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, border: "1px solid #fca5a5" }}>PAUSED</span>;
      default:
        return <span style={{ background: "#f1f5f9", color: "#64748b", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>PLANNING</span>;
    }
  };

  const liveCount = markets.filter((m) => m.launchStatus === "live").length;
  const betaCount = markets.filter((m) => m.launchStatus === "beta").length;

  return (
    <div style={{ padding: "1.75rem 2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Global Operations</span>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ color: "#0f172a", fontSize: "0.85rem", fontWeight: 600 }}>Markets</span>
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Globe size={26} color="#0329b2" /> Global Market Governance & Geofencing
          </h1>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Control multi-country expansion rules, in-person vs online availability, background check compliance, and localized take-rates.
          </p>
        </div>

        <button
          onClick={fetchMarkets}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 0.95rem",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "7px",
            color: "#334155",
            fontSize: "0.83rem",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: "0.9rem 1.25rem",
            background: statusMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${statusMessage.type === "success" ? "#86efac" : "#fca5a5"}`,
            borderRadius: "8px",
            color: statusMessage.type === "success" ? "#166534" : "#991b1b",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "0.88rem",
          }}
        >
          {statusMessage.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {statusMessage.text}
        </div>
      )}

      {/* KPI Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Operating Jurisdictions</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#0f172a", marginTop: "0.25rem" }}>{markets.length}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Live Production Markets</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#059669", marginTop: "0.25rem" }}>{liveCount}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Beta Test Markets</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#d97706", marginTop: "0.25rem" }}>{betaCount}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Police Checks Enforced</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#0329b2", marginTop: "0.25rem" }}>
            {markets.filter((m) => m.backgroundCheckRequired).length}
          </div>
        </div>
      </div>

      {/* Markets Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.25rem" }}>
        {markets.map((market) => (
          <div
            key={market._id}
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "1.25rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{market.countryName}</span>
                    <span style={{ fontSize: "0.78rem", color: "#64748b", background: "#f1f5f9", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>
                      {market.countryCode}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>
                    Currency: <strong style={{ color: "#0f172a" }}>{market.currency} ({market.currencySymbol})</strong> • TZ: {market.timezone}
                  </div>
                </div>
                {getStatusBadge(market.launchStatus)}
              </div>

              {/* Toggles Status Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", margin: "1rem 0", background: "#f8fafc", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
                  {market.onlineEnabled ? <ToggleRight size={18} color="#059669" /> : <ToggleLeft size={18} color="#94a3b8" />}
                  <span style={{ color: market.onlineEnabled ? "#0f172a" : "#94a3b8", fontWeight: 500 }}>Online Tuition</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
                  {market.homeTuitionEnabled ? <ToggleRight size={18} color="#059669" /> : <ToggleLeft size={18} color="#94a3b8" />}
                  <span style={{ color: market.homeTuitionEnabled ? "#0f172a" : "#94a3b8", fontWeight: 500 }}>Home Tuition</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
                  <ShieldCheck size={16} color={market.backgroundCheckRequired ? "#059669" : "#94a3b8"} />
                  <span style={{ color: market.backgroundCheckRequired ? "#0f172a" : "#94a3b8", fontWeight: 500 }}>Safety verification</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
                  <DollarSign size={16} color="#0329b2" />
                  <span style={{ color: "#0f172a", fontWeight: 600 }}>{market.paymentsEnabled ? `${market.paymentProvider || "Configured"} payments` : "Discovery only"}</span>
                </div>
              </div>

              {/* Supported Cities */}
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  <MapPin size={12} /> Active Cities / Hubs
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {market.supportedCities?.length > 0 ? (
                    market.supportedCities.map((city) => (
                      <span key={city} style={{ background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 500 }}>
                        {city}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Nationwide Coverage</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditingMarket({ ...market })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.45rem 0.85rem",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  color: "#334155",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Edit2 size={13} /> Edit Policies
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Market Modal */}
      {editingMarket && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              padding: "1.75rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Edit {editingMarket.countryName} ({editingMarket.countryCode})
                </h2>
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Update regulatory controls and teaching mode allowances</span>
              </div>
              <button
                onClick={() => setEditingMarket(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                  Launch Status
                </label>
                <select
                  value={editingMarket.launchStatus}
                  onChange={(e) => setEditingMarket({ ...editingMarket, launchStatus: e.target.value as "planning" | "beta" | "live" | "paused" })}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem" }}
                >
                  <option value="live">Live in Production</option>
                  <option value="beta">Beta (Restricted Access)</option>
                  <option value="planning">Planning (Coming Soon)</option>
                  <option value="paused">Paused / Temporarily Suspended</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Platform Fee (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editingMarket.platformFeePercent}
                    onChange={(e) => setEditingMarket({ ...editingMarket, platformFeePercent: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Sales Tax / VAT (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editingMarket.taxPercent}
                    onChange={(e) => setEditingMarket({ ...editingMarket, taxPercent: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editingMarket.onlineEnabled}
                    onChange={(e) => setEditingMarket({ ...editingMarket, onlineEnabled: e.target.checked })}
                  />
                  <span>Allow Online Tuition</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editingMarket.homeTuitionEnabled}
                    onChange={(e) => setEditingMarket({ ...editingMarket, homeTuitionEnabled: e.target.checked })}
                  />
                  <span>Allow In-Person Home Tuition</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editingMarket.backgroundCheckRequired}
                    onChange={(e) => setEditingMarket({ ...editingMarket, backgroundCheckRequired: e.target.checked })}
                  />
                  <span>Require Mandatory Police Clearance for Tutors</span>
                </label>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                  Supported Cities (comma separated)
                </label>
                <input
                  type="text"
                  value={editingMarket.supportedCities.join(", ")}
                  onChange={(e) =>
                    setEditingMarket({
                      ...editingMarket,
                      supportedCities: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setEditingMarket(null)}
                  style={{ padding: "0.55rem 1rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "0.55rem 1.25rem", background: "#0329b2", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                >
                  {saving ? "Saving Changes..." : "Save Market Rules"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
