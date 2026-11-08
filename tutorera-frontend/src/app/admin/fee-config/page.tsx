"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sliders, ArrowLeft, RefreshCw, Save, CheckCircle, History, AlertCircle, Percent, DollarSign } from "lucide-react";
import api from "@/lib/axios";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import InfoTooltip from "@/components/admin/InfoTooltip";

interface FeeConfigData {
  _id?: string;
  version: string;
  countryCode: string;
  currency: string;
  studentFeePercent: number;
  tutorFeePercent: number;
  minimumFee: number;
  maximumFee: number;
  gatewayFeePercent: number;
  gatewayFixedFee: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export default function FeeConfigPage() {
  const [config, setConfig] = useState<FeeConfigData | null>(null);
  const [history, setHistory] = useState<FeeConfigData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [studentFee, setStudentFee] = useState<number>(5);
  const [tutorFee, setTutorFee] = useState<number>(15);
  const [minFee, setMinFee] = useState<number>(100);
  const [maxFee, setMaxFee] = useState<number>(5000);
  const [gatewayFeePercent, setGatewayFeePercent] = useState<number>(2.9);
  const [gatewayFixedFee, setGatewayFixedFee] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  const fetchConfig = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get("/admin/finance/fee-config");
      const active = res.data.config;
      setConfig(active);
      setHistory(res.data.history || []);
      if (active) {
        setStudentFee(active.studentFeePercent);
        setTutorFee(active.tutorFeePercent);
        setMinFee(active.minimumFee);
        setMaxFee(active.maximumFee);
        setGatewayFeePercent(active.gatewayFeePercent);
        setGatewayFixedFee(active.gatewayFixedFee);
        setNotes("");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error("Failed to load fee config:", err);
      setErrorMessage(error.response?.data?.message || "Failed to load fee configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const res = await api.put("/admin/finance/fee-config", {
        studentFeePercent: studentFee,
        tutorFeePercent: tutorFee,
        minimumFee: minFee,
        maximumFee: maxFee,
        gatewayFeePercent,
        gatewayFixedFee,
        notes: notes || "Updated via Admin Console",
      });

      setSaveSuccess(res.data.message || "Fee configuration updated successfully!");
      await fetchConfig();
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error("Failed to update fee config:", err);
      setErrorMessage(error.response?.data?.message || "Failed to update fee configuration.");
    } finally {
      setSaving(false);
    }
  };

  // Live simulation calculation based on 10,000 PKR hypothetical booking.
  // Mirrors services/pricing.service.ts's calculateMarketplaceFees() exactly -
  // gateway fee is charged on the student's total checkout amount and comes
  // out of the platform's own margin, never the tutor's payout. Government
  // tax (VAT/GST) is configured per-country in Tax Configuration, not here -
  // this simulator shows TutorEra's own commission + gateway cost only.
  const sampleBookingGmv = 10000;
  const sampleStudentFeeAmount = (sampleBookingGmv * studentFee) / 100;
  const sampleTutorFeeAmount = (sampleBookingGmv * tutorFee) / 100;
  const sampleStudentTotal = sampleBookingGmv + sampleStudentFeeAmount;
  const sampleTutorPayout = sampleBookingGmv - sampleTutorFeeAmount;
  const sampleGatewayFeeAmount = (sampleStudentTotal * gatewayFeePercent) / 100 + gatewayFixedFee;
  const samplePlatformGross = sampleStudentFeeAmount + sampleTutorFeeAmount;
  const samplePlatformNet = samplePlatformGross - sampleGatewayFeeAmount;

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
            <span style={{ color: TEXT_COLORS.muted, fontSize: "0.85rem" }}>Finance</span>
            <span style={{ color: UI_COLORS.border }}>/</span>
            <span style={{ color: TEXT_COLORS.body, fontSize: "0.85rem", fontWeight: 600 }}>Fee Configuration</span>
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: TEXT_COLORS.body, margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Sliders size={26} color={UI_COLORS.accent} /> Dynamic Fee & Commission Engine
          </h1>
          <p style={{ color: TEXT_COLORS.muted, margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Configure TutorEra's own commission percentages, minimum/maximum fee bounds, and payment gateway processing cost. Government tax (VAT/GST) is configured per-country on the{" "}
            <Link href="/admin/tax-config" style={{ color: UI_COLORS.accent, fontWeight: 600 }}>Tax Configuration</Link> page.
          </p>
        </div>

        <button
          onClick={fetchConfig}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 0.95rem",
            background: UI_COLORS.surface,
            border: `1px solid ${UI_COLORS.border}`,
            borderRadius: "7px",
            color: TEXT_COLORS.secondary,
            fontSize: "0.83rem",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {saveSuccess && (
        <div style={{ padding: "0.9rem 1.25rem", background: STATUS_COLORS.success.bg, border: `1px solid ${STATUS_COLORS.success.border}`, borderRadius: "8px", color: STATUS_COLORS.success.color, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.88rem" }}>
          <CheckCircle size={18} /> {saveSuccess}
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: "0.9rem 1.25rem", background: STATUS_COLORS.danger.bg, border: `1px solid ${STATUS_COLORS.danger.border}`, borderRadius: "8px", color: STATUS_COLORS.danger.color, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.88rem" }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      {/* Grid: Form & Real-Time Settlement Simulator */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Editor Card */}
        <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: `1px solid ${UI_COLORS.border}`, paddingBottom: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: TEXT_COLORS.body, margin: 0 }}>Active Policy Parameters</h2>
              <span style={{ fontSize: "0.78rem", color: TEXT_COLORS.muted }}>Version: {config?.version || "2026.1"} (Live in Production)</span>
            </div>
            <span style={{ background: STATUS_COLORS.success.bg, color: STATUS_COLORS.success.color, padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, border: `1px solid ${STATUS_COLORS.success.border}` }}>
              ACTIVE
            </span>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.35rem" }}>
                  Student Service Fee (%)
                  <InfoTooltip text="Added on top of the agreed tuition rate at checkout. This is what the student pays beyond the tutor's rate - it does not affect what the tutor receives." />
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={studentFee}
                    onChange={(e) => setStudentFee(parseFloat(e.target.value) || 0)}
                    required
                    style={{ width: "100%", padding: "0.55rem 2rem 0.55rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "6px", fontSize: "0.9rem", color: TEXT_COLORS.body }}
                  />
                  <Percent size={14} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: UI_COLORS.gray500 }} />
                </div>
                <span style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted, marginTop: "0.2rem", display: "block" }}>Added to tuition request at checkout</span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.35rem" }}>
                  Tutor Commission (%)
                  <InfoTooltip text="Deducted from the tutor's payout at settlement. This is TutorEra's take-rate on the tutor's side - the tutor never sees or pays this directly, it's subtracted before payout." />
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={tutorFee}
                    onChange={(e) => setTutorFee(parseFloat(e.target.value) || 0)}
                    required
                    style={{ width: "100%", padding: "0.55rem 2rem 0.55rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "6px", fontSize: "0.9rem", color: TEXT_COLORS.body }}
                  />
                  <Percent size={14} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: UI_COLORS.gray500 }} />
                </div>
                <span style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted, marginTop: "0.2rem", display: "block" }}>Deducted from tutor earnings upon payout</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.35rem" }}>
                  Minimum Fee Floor (PKR)
                  <InfoTooltip text="Applies to both the student fee and tutor commission - if the percentage-based amount comes out below this, it's raised to this floor instead." />
                </label>
                <input
                  type="number"
                  min="0"
                  value={minFee}
                  onChange={(e) => setMinFee(parseInt(e.target.value) || 0)}
                  required
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "6px", fontSize: "0.9rem", color: TEXT_COLORS.body }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.35rem" }}>
                  Maximum Fee Cap (PKR)
                  <InfoTooltip text="Applies to both the student fee and tutor commission - if the percentage-based amount comes out above this, it's capped at this ceiling instead. Prevents runaway fees on very large bookings." />
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxFee}
                  onChange={(e) => setMaxFee(parseInt(e.target.value) || 0)}
                  required
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "6px", fontSize: "0.9rem", color: TEXT_COLORS.body }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.35rem" }}>
                  Gateway Processing Fee (%)
                  <InfoTooltip text="Gateway processing cost, for example 2.9%. It is charged on the student's full checkout amount and absorbed from TUTORERA's margin; it never reduces the tutor's payout." />
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="15"
                    value={gatewayFeePercent}
                    onChange={(e) => setGatewayFeePercent(parseFloat(e.target.value) || 0)}
                    required
                    style={{ width: "100%", padding: "0.55rem 2rem 0.55rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "6px", fontSize: "0.9rem", color: TEXT_COLORS.body }}
                  />
                  <Percent size={14} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: UI_COLORS.gray500 }} />
                </div>
                <span style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted, marginTop: "0.2rem", display: "block" }}>Match the approved RapidPay merchant agreement rate</span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.35rem" }}>
                  Gateway Fixed Fee (PKR)
                  <InfoTooltip text="A flat amount the gateway charges per transaction, on top of the percentage fee, if your merchant agreement includes one. Leave at 0 if it doesn't." />
                </label>
                <input
                  type="number"
                  min="0"
                  value={gatewayFixedFee}
                  onChange={(e) => setGatewayFixedFee(parseFloat(e.target.value) || 0)}
                  required
                  style={{ width: "100%", padding: "0.55rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "6px", fontSize: "0.9rem", color: TEXT_COLORS.body }}
                />
                <span style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted, marginTop: "0.2rem", display: "block" }}>Per-transaction flat charge, if any</span>
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.35rem" }}>
                Revision Notes / Audit Reason
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Q3 2026 Promotional reduction in tutor take-rate"
                style={{ width: "100%", padding: "0.55rem 0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "6px", fontSize: "0.9rem", color: TEXT_COLORS.body }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.7rem",
                background: UI_COLORS.accent,
                color: UI_COLORS.surface,
                border: "none",
                borderRadius: "7px",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(3,41,178,0.2)",
              }}
            >
              <Save size={16} /> {saving ? "Publishing Rule Changes..." : "Publish & Enforce New Fee Policy"}
            </button>
          </form>
        </div>

        {/* Live Simulation Engine */}
        <div style={{ background: STATUS_COLORS.neutral.bg, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: `1px solid ${UI_COLORS.border}`, paddingBottom: "0.75rem" }}>
            <DollarSign size={20} color={STATUS_COLORS.success.color} />
            <div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: TEXT_COLORS.body, margin: 0 }}>Real-Time Policy Impact Simulator</h2>
              <span style={{ fontSize: "0.78rem", color: TEXT_COLORS.muted }}>Simulating a 10,000 PKR monthly tuition booking</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: UI_COLORS.surface, borderRadius: "8px", border: `1px solid ${UI_COLORS.border}` }}>
              <span style={{ fontSize: "0.85rem", color: TEXT_COLORS.muted }}>Base Tuition Rate (GMV)</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: TEXT_COLORS.body }}>Rs {sampleBookingGmv.toLocaleString()}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: UI_COLORS.surface, borderRadius: "8px", border: `1px solid ${UI_COLORS.border}` }}>
              <span style={{ fontSize: "0.85rem", color: TEXT_COLORS.muted }}>Student Platform Fee ({studentFee}%)</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: UI_COLORS.accent }}>+ Rs {sampleStudentFeeAmount.toLocaleString()}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: STATUS_COLORS.info.bg, borderRadius: "8px", border: `1px solid ${STATUS_COLORS.info.border}` }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: STATUS_COLORS.info.color }}>Student Total Checkout Price</span>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: STATUS_COLORS.info.color }}>Rs {sampleStudentTotal.toLocaleString()}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: UI_COLORS.surface, borderRadius: "8px", border: `1px solid ${UI_COLORS.border}` }}>
              <span style={{ fontSize: "0.85rem", color: TEXT_COLORS.muted }}>Tutor Commission Cut ({tutorFee}%)</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: UI_COLORS.error }}>- Rs {sampleTutorFeeAmount.toLocaleString()}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: STATUS_COLORS.success.bg, borderRadius: "8px", border: `1px solid ${STATUS_COLORS.success.border}` }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: STATUS_COLORS.success.color }}>Tutor Net Take-Home Payout</span>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: STATUS_COLORS.success.color }}>Rs {sampleTutorPayout.toLocaleString()}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: UI_COLORS.surface, borderRadius: "8px", border: `1px solid ${UI_COLORS.border}` }}>
              <span style={{ fontSize: "0.85rem", color: TEXT_COLORS.muted }}>Gateway Processing Cost ({gatewayFeePercent}%{gatewayFixedFee > 0 ? ` + Rs ${gatewayFixedFee}` : ""})</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: UI_COLORS.error }}>- Rs {sampleGatewayFeeAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>

            <div style={{ marginTop: "0.5rem", padding: "1rem", background: TEXT_COLORS.body, borderRadius: "8px", color: UI_COLORS.surface, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.78rem", color: UI_COLORS.gray500, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Platform Net (after gateway cost)
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: UI_COLORS.accentBright, marginTop: "0.2rem" }}>
                  Rs {samplePlatformNet.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: "0.7rem", color: UI_COLORS.gray500, marginTop: "0.15rem" }}>
                  Gross before gateway cost: Rs {samplePlatformGross.toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.78rem", color: UI_COLORS.border }}>Total Take Rate:</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: STATUS_COLORS.success.color }}>
                  {(studentFee + tutorFee).toFixed(1)}%
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted, margin: 0 }}>
              Excludes government tax (VAT/GST), which is calculated separately per country in Tax Configuration and does not appear in this simulator.
            </p>
          </div>
        </div>
      </div>

      {/* Historical Audit Log */}
      <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${UI_COLORS.border}`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <History size={18} color={TEXT_COLORS.muted} />
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: TEXT_COLORS.body, margin: 0 }}>Fee Policy Version Audit Log</h2>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: STATUS_COLORS.neutral.bg, borderBottom: `1px solid ${UI_COLORS.border}`, color: TEXT_COLORS.muted }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Version</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Student Fee</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Tutor Fee</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Min / Max Limits</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Gateway Fee</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Published At</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: UI_COLORS.gray500 }}>
                    No prior revisions recorded.
                  </td>
                </tr>
              ) : (
                history.map((h, i) => (
                  <tr key={h._id || i} style={{ borderBottom: `1px solid ${UI_COLORS.border}` }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: TEXT_COLORS.body }}>v{h.version}</td>
                    <td style={{ padding: "0.75rem 1rem", color: UI_COLORS.accent, fontWeight: 600 }}>{h.studentFeePercent}%</td>
                    <td style={{ padding: "0.75rem 1rem", color: UI_COLORS.error, fontWeight: 600 }}>{h.tutorFeePercent}%</td>
                    <td style={{ padding: "0.75rem 1rem", color: TEXT_COLORS.muted }}>Rs {h.minimumFee} – {h.maximumFee}</td>
                    <td style={{ padding: "0.75rem 1rem", color: TEXT_COLORS.muted }}>{h.gatewayFeePercent}%{h.gatewayFixedFee > 0 ? ` + Rs ${h.gatewayFixedFee}` : ""}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {h.isActive ? (
                        <span style={{ background: STATUS_COLORS.success.bg, color: STATUS_COLORS.success.color, padding: "0.2rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700 }}>
                          ACTIVE
                        </span>
                      ) : (
                        <span style={{ background: UI_COLORS.border, color: TEXT_COLORS.muted, padding: "0.2rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 500 }}>
                          SUPERSEDED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: TEXT_COLORS.muted }}>
                      {new Date(h.createdAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: TEXT_COLORS.muted, maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.notes || "Standard configuration"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
