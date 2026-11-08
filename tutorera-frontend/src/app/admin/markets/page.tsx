"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, ArrowLeft, RefreshCw, CheckCircle, AlertCircle, ShieldCheck, MapPin, DollarSign, ToggleLeft, ToggleRight, Edit2, X } from "lucide-react";
import api from "@/lib/axios";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

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
  isActive: boolean;
  launchStatus: "coming_soon" | "beta" | "live" | "paused";
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
        return <span style={{ background: STATUS_COLORS.success.bg, color: STATUS_COLORS.success.color, padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, border: `1px solid ${STATUS_COLORS.success.border}` }}>LIVE</span>;
      case "beta":
        return <span style={{ background: STATUS_COLORS.warning.bg, color: STATUS_COLORS.warning.color, padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, border: `1px solid ${STATUS_COLORS.warning.border}` }}>BETA</span>;
      case "paused":
        return <span style={{ background: STATUS_COLORS.danger.bg, color: STATUS_COLORS.danger.color, padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, border: `1px solid ${STATUS_COLORS.danger.border}` }}>PAUSED</span>;
      default:
        return <span style={{ background: STATUS_COLORS.neutral.bg, color: STATUS_COLORS.neutral.color, padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>PLANNING</span>;
    }
  };

  const liveCount = markets.filter((m) => m.launchStatus === "live").length;
  const betaCount = markets.filter((m) => m.launchStatus === "beta").length;
  const paymentAvailability = (market: MarketConfig) => {
    if (market.paymentsEnabled && market.paymentProvider === "rapidpay") return "RapidPay checkout";
    if (market.paymentsEnabled) return "Configured checkout";
    return "Discovery only — checkout disabled";
  };

  return (
    <div style={{ padding: "1.75rem 2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: UI_COLORS.border }}>/</span>
            <span style={{ color: TEXT_COLORS.muted, fontSize: "0.85rem" }}>Global Operations</span>
            <span style={{ color: UI_COLORS.border }}>/</span>
            <span style={{ color: TEXT_COLORS.body, fontSize: "0.85rem", fontWeight: 600 }}>Markets</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Globe size={26} color={UI_COLORS.accent} /> Global Market Governance & Geofencing
          </h1>
          <p style={{ color: TEXT_COLORS.muted, margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
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
            background: UI_COLORS.surface,
            border: `1px solid ${UI_COLORS.border}`,
            borderRadius: "0.4rem",
            color: TEXT_COLORS.secondary,
            fontSize: "0.83rem",
            cursor: "pointer",
            fontWeight: 700,
            minHeight: 44,
          }}
        >
          <RefreshCw size={14} aria-hidden="true" /> Refresh
        </button>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: "0.9rem 1.25rem",
            background: statusMessage.type === "success" ? STATUS_COLORS.success.bg : STATUS_COLORS.danger.bg,
            border: `1px solid ${statusMessage.type === "success" ? STATUS_COLORS.success.border : STATUS_COLORS.danger.border}`,
            borderRadius: "8px",
            color: statusMessage.type === "success" ? STATUS_COLORS.success.color : STATUS_COLORS.danger.color,
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
        <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
          <div style={{ fontSize: "0.78rem", color: TEXT_COLORS.muted, fontWeight: 600, textTransform: "uppercase" }}>Total Operating Jurisdictions</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: TEXT_COLORS.body, marginTop: "0.25rem" }}>{markets.length}</div>
        </div>
        <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
          <div style={{ fontSize: "0.78rem", color: TEXT_COLORS.muted, fontWeight: 600, textTransform: "uppercase" }}>Live Production Markets</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: STATUS_COLORS.success.color, marginTop: "0.25rem" }}>{liveCount}</div>
        </div>
        <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
          <div style={{ fontSize: "0.78rem", color: TEXT_COLORS.muted, fontWeight: 600, textTransform: "uppercase" }}>Beta Test Markets</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: STATUS_COLORS.warning.color, marginTop: "0.25rem" }}>{betaCount}</div>
        </div>
        <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
          <div style={{ fontSize: "0.78rem", color: TEXT_COLORS.muted, fontWeight: 600, textTransform: "uppercase" }}>Safety Checks Required</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: UI_COLORS.accent, marginTop: "0.25rem" }}>
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
              background: UI_COLORS.surface,
              border: `1px solid ${UI_COLORS.border}`,
              borderRadius: "10px",
              padding: "1.25rem",
              boxShadow: UI_COLORS.shadowCard,
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
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: TEXT_COLORS.body }}>{market.countryName}</span>
                    <span style={{ fontSize: "0.78rem", color: TEXT_COLORS.muted, background: UI_COLORS.card, padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>
                      {market.countryCode}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: TEXT_COLORS.muted, marginTop: "0.2rem" }}>
                    Currency: <strong style={{ color: TEXT_COLORS.body }}>{market.currency} ({market.currencySymbol})</strong> • TZ: {market.timezone}
                  </div>
                </div>
                {getStatusBadge(market.launchStatus)}
              </div>

              {/* Toggles Status Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", margin: "1rem 0", background: UI_COLORS.card, padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
                  {market.onlineEnabled ? <ToggleRight size={18} color={STATUS_COLORS.success.color} /> : <ToggleLeft size={18} color={TEXT_COLORS.muted} />}
                  <span style={{ color: market.onlineEnabled ? TEXT_COLORS.body : TEXT_COLORS.muted, fontWeight: 500 }}>Online Tuition</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
                  {market.homeTuitionEnabled ? <ToggleRight size={18} color={STATUS_COLORS.success.color} /> : <ToggleLeft size={18} color={TEXT_COLORS.muted} />}
                  <span style={{ color: market.homeTuitionEnabled ? TEXT_COLORS.body : TEXT_COLORS.muted, fontWeight: 500 }}>Home Tuition</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
                  <ShieldCheck size={16} color={market.backgroundCheckRequired ? STATUS_COLORS.success.color : TEXT_COLORS.muted} />
                  <span style={{ color: market.backgroundCheckRequired ? TEXT_COLORS.body : TEXT_COLORS.muted, fontWeight: 500 }}>Safety verification</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}>
                  <DollarSign size={16} color={UI_COLORS.accent} />
                  <span style={{ color: TEXT_COLORS.body, fontWeight: 600 }}>{paymentAvailability(market)}</span>
                </div>
              </div>

              {/* Supported Cities */}
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: TEXT_COLORS.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  <MapPin size={12} /> Active Cities / Hubs
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {market.supportedCities?.length > 0 ? (
                    market.supportedCities.map((city) => (
                      <span key={city} style={{ background: UI_COLORS.accentLight, color: UI_COLORS.accent, padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 500 }}>
                        {city}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: TEXT_COLORS.muted }}>Nationwide Coverage</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div style={{ borderTop: `1px solid ${UI_COLORS.border}`, paddingTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditingMarket({ ...market })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.45rem 0.85rem",
                  background: UI_COLORS.card,
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: "6px",
                  color: TEXT_COLORS.secondary,
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
              background: UI_COLORS.surface,
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              padding: "1.75rem",
              boxShadow: UI_COLORS.shadowCardHover,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: TEXT_COLORS.body, margin: 0 }}>
                  Edit {editingMarket.countryName} ({editingMarket.countryCode})
                </h2>
                <span style={{ fontSize: "0.78rem", color: TEXT_COLORS.muted }}>Update regulatory controls and teaching mode allowances</span>
              </div>
              <button
                onClick={() => setEditingMarket(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_COLORS.muted }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.35rem" }}>
                  Launch Status
                </label>
                <select
                  value={editingMarket.launchStatus}
                  disabled={editingMarket.countryCode === "GB"}
                  onChange={(e) => setEditingMarket({ ...editingMarket, launchStatus: e.target.value as "coming_soon" | "beta" | "live" | "paused" })}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "6px", fontSize: "0.88rem" }}
                >
                  <option value="live">Live in Production</option>
                  <option value="beta">Beta (Restricted Access)</option>
                  <option value="coming_soon">Coming soon</option>
                  <option value="paused">Paused / Temporarily Suspended</option>
                </select>
                {editingMarket.countryCode === "GB" && <p style={{ fontSize: ".78rem", color: STATUS_COLORS.warning.color, margin: ".4rem 0 0" }}>This discovery market is locked to beta until a compliant payment provider is configured.</p>}
              </div>

              <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", background: UI_COLORS.card, borderRadius: "8px", fontSize: "0.82rem", color: TEXT_COLORS.secondary }}>
                Platform commission, gateway cost, and per-country tax are configured on{" "}
                <Link href="/admin/fee-config" style={{ color: UI_COLORS.accent, fontWeight: 600 }}>Fee Configuration</Link>{" "}
                and <Link href="/admin/tax-config" style={{ color: UI_COLORS.accent, fontWeight: 600 }}>Tax Configuration</Link> — not here.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem", background: UI_COLORS.card, padding: "0.75rem", borderRadius: "8px" }}>
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
                  <span>Require local background / safety verification for in-person tutors</span>
                </label>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.35rem" }}>
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
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "6px", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setEditingMarket(null)}
                  style={{ padding: "0.55rem 1rem", background: UI_COLORS.card, border: `1px solid ${UI_COLORS.border}`, borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "0.55rem 1.25rem", background: UI_COLORS.accent, color: UI_COLORS.surface, border: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
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
