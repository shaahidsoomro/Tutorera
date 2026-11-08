"use client";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { useEffect, useState } from "react";
import { Download, Gift, Save, Plus, Trash2, AlertTriangle } from "lucide-react";
import api from "@/lib/axios";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { showSuccess, showError } from "@/lib/toast";

const C = UI_COLORS;

interface ReferralMilestone {
  fromReferral: number;
  toReferral: number | null;
  referrerRewardAmount: number;
}

interface Referral {
  _id: string;
  referrer: { name: string; email: string };
  referred: { name: string; email: string; createdAt: string };
  status: "pending" | "credited" | "reversed" | "fraud_hold";
  creditAmount: number;
  creditCurrency: string;
  milestoneIndex?: number;
  fraudFlag: boolean;
  fraudReason?: string;
  createdAt: string;
}

interface ReferralConfig {
  referrerRewardAmount: number;
  referredDiscountAmount: number;
  currency: string;
  isActive: boolean;
  milestonesEnabled: boolean;
  milestones: ReferralMilestone[];
}

function ReferralConfigPanel() {
  const [, setConfig] = useState<ReferralConfig | null>(null);
  const [form, setForm] = useState<ReferralConfig>({
    referrerRewardAmount: 200,
    referredDiscountAmount: 200,
    currency: "PKR",
    isActive: true,
    milestonesEnabled: false,
    milestones: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/referral-config")
      .then(res => {
        const c: ReferralConfig | null = res.data?.config ?? null;
        if (!c) return;
        setConfig(c);
        setForm({
          referrerRewardAmount: c.referrerRewardAmount ?? 200,
          referredDiscountAmount: c.referredDiscountAmount ?? 200,
          currency: c.currency || "PKR",
          isActive: c.isActive ?? true,
          milestonesEnabled: c.milestonesEnabled ?? false,
          milestones: c.milestones ?? [],
        });
      })
      .catch(err => showError(err, "Failed to load referral configuration"))
      .finally(() => setLoading(false));
  }, []);

  const addMilestone = () => {
    const last = form.milestones[form.milestones.length - 1];
    const from = last ? (last.toReferral ?? last.fromReferral) + 1 : 1;
    setForm(f => ({ ...f, milestones: [...f.milestones, { fromReferral: from, toReferral: null, referrerRewardAmount: 0 }] }));
  };

  const removeMilestone = (i: number) => {
    setForm(f => ({ ...f, milestones: f.milestones.filter((_, idx) => idx !== i) }));
  };

  const updateMilestone = (i: number, key: keyof ReferralMilestone, value: unknown) => {
    setForm(f => {
      const milestones = f.milestones.map((m, idx) => idx === i ? { ...m, [key]: value } : m);
      return { ...f, milestones };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/admin/referral-config", {
        referrerRewardAmount: Number(form.referrerRewardAmount),
        referredDiscountAmount: Number(form.referredDiscountAmount),
        currency: form.currency,
        isActive: form.isActive,
        milestonesEnabled: form.milestonesEnabled,
        milestones: form.milestones,
      });
      setConfig(res.data.config);
      showSuccess("Referral reward settings updated");
    } catch (err) {
      showError(err, "Failed to update referral configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{ backgroundColor: C.surface, borderRadius: "0.875rem", border: `1px solid ${C.border}`, padding: "1.5rem", marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: C.primary, margin: "0 0 0.25rem" }}>Reward Configuration</h2>
      <p style={{ color: C.gray500, fontSize: "0.82rem", margin: "0 0 1.1rem" }}>Adjust the referral rewards without a code deploy. Existing credited referrals keep their original amount and currency.</p>

      {/* Flat reward settings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.82rem", color: TEXT_COLORS.secondary }}>Reward Currency</label>
          <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
            style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box", backgroundColor: "white" }}>
            {CURRENCY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.82rem", color: TEXT_COLORS.secondary }}>Flat Referrer Reward ({form.currency})</label>
          <input type="number" value={form.referrerRewardAmount} onChange={e => setForm({ ...form, referrerRewardAmount: Number(e.target.value) })}
            style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.82rem", color: TEXT_COLORS.secondary }}>New Signup Discount ({form.currency})</label>
          <input type="number" value={form.referredDiscountAmount} onChange={e => setForm({ ...form, referredDiscountAmount: Number(e.target.value) })}
            style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: TEXT_COLORS.secondary, cursor: "pointer", paddingBottom: "0.6rem" }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
            Program active
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: TEXT_COLORS.secondary, cursor: "pointer", paddingBottom: "0.6rem" }}>
            <input type="checkbox" checked={form.milestonesEnabled} onChange={e => setForm({ ...form, milestonesEnabled: e.target.checked })} />
            Milestone tiers
          </label>
        </div>
      </div>

      {/* Milestone tiers editor */}
      {form.milestonesEnabled && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: C.primary, margin: 0 }}>Milestone Tiers</h3>
            <button onClick={addMilestone} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.75rem", backgroundColor: C.accent, color: "white", border: "none", borderRadius: "0.4rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
              <Plus size={14} /> Add Tier
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {form.milestones.map((m, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end", backgroundColor: C.gray50, padding: "0.75rem", borderRadius: "0.5rem", border: `1px solid ${C.border}` }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.3rem" }}>From referral #</label>
                  <input type="number" value={m.fromReferral} min={1} onChange={e => updateMilestone(i, "fromReferral", Number(e.target.value))}
                    style={{ width: "100%", padding: "0.45rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.85rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.3rem" }}>To referral # (blank=unlimited)</label>
                  <input type="number" value={m.toReferral ?? ""} min={1}
                    onChange={e => updateMilestone(i, "toReferral", e.target.value === "" ? null : Number(e.target.value))}
                    style={{ width: "100%", padding: "0.45rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.85rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: TEXT_COLORS.secondary, marginBottom: "0.3rem" }}>Reward ({form.currency})</label>
                  <input type="number" value={m.referrerRewardAmount} min={0} onChange={e => updateMilestone(i, "referrerRewardAmount", Number(e.target.value))}
                    style={{ width: "100%", padding: "0.45rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.85rem" }} />
                </div>
                <button onClick={() => removeMilestone(i)} style={{ padding: "0.5rem", backgroundColor: STATUS_COLORS.danger.bg, color: STATUS_COLORS.danger.color, border: "none", borderRadius: "0.4rem", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.1rem", background: STATUS_COLORS.success.color, color: C.surface, border: "none", borderRadius: "0.5rem", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
        <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditByCurrency, setCreditByCurrency] = useState<{ currency: string; total: number }[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "credited" | "reversed" | "fraud_hold">("all");
  const [fraudOnly, setFraudOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fraudTargetId, setFraudTargetId] = useState<string | null>(null);
  const [fraudReasonInput, setFraudReasonInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReferrals = async (p = page, status = filter, fraud = fraudOnly) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (status !== "all") params.set("status", status);
      if (fraud) params.set("fraud", "true");
      const res = await api.get(`/admin/referrals?${params}`);
      const d = res.data ?? {};
      setReferrals(Array.isArray(d.referrals) ? d.referrals : []);
      setCreditByCurrency(Array.isArray(d.creditByCurrency) ? d.creditByCurrency : []);
      setTotalPages(d.pages ?? 1);
      setTotal(d.total ?? 0);
    } catch (err) {
      console.error(err);
      showError("Failed to load referrals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReferrals(1, filter, fraudOnly); }, [filter, fraudOnly]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/admin/referrals/export", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `referrals-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError("Failed to export referrals.");
    } finally {
      setExporting(false);
    }
  };

  const handleFlagFraud = (id: string, fraudFlag: boolean) => {
    if (fraudFlag) {
      setFraudReasonInput("");
      setFraudTargetId(id);
      return;
    }
    void submitFraudFlag(id, false, "");
  };

  const submitFraudFlag = async (id: string, fraudFlag: boolean, fraudReason: string) => {
    setFraudTargetId(null);
    try {
      await api.patch(`/admin/referrals/${id}/fraud`, { fraudFlag, fraudReason });
      showSuccess(fraudFlag ? "Referral flagged as fraud" : "Fraud flag removed");
      fetchReferrals();
    } catch {
      showError("Failed to update fraud flag.");
    }
  };

  const statusColor = (status: Referral["status"]) => {
    if (status === "credited") return STATUS_COLORS.success;
    if (status === "reversed") return STATUS_COLORS.danger;
    if (status === "fraud_hold") return { bg: "#fef3c7", color: "#92400e" };
    return STATUS_COLORS.warning;
  };

  return (
    <div style={{ padding: "2rem" }}>
      {fraudTargetId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fraud-dialog-title"
          onClick={(e) => { if (e.target === e.currentTarget) setFraudTargetId(null); }}
          onKeyDown={(e) => { if (e.key === "Escape") setFraudTargetId(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", padding: "1rem" }}
        >
          <div style={{ backgroundColor: C.surface, borderRadius: "0.75rem", border: `1px solid ${C.border}`, padding: "1.5rem", width: "100%", maxWidth: 440 }}>
            <h2 id="fraud-dialog-title" style={{ fontSize: "1rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 0.75rem" }}>Flag referral as fraud</h2>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: TEXT_COLORS.secondary }}>
              Fraud reason
              <textarea autoFocus rows={3} maxLength={500} value={fraudReasonInput} onChange={(e) => setFraudReasonInput(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: `1px solid ${C.border}`, fontSize: "0.875rem", boxSizing: "border-box", resize: "vertical" }} />
            </label>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" onClick={() => setFraudTargetId(null)} style={{ padding: "0.5rem 1rem", minHeight: 44, borderRadius: "0.4rem", border: `1px solid ${C.border}`, background: C.surface, color: TEXT_COLORS.secondary, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button type="button" disabled={!fraudReasonInput.trim()} onClick={() => void submitFraudFlag(fraudTargetId, true, fraudReasonInput.trim())}
                style={{ padding: "0.5rem 1.1rem", minHeight: 44, borderRadius: "0.4rem", border: "none", background: STATUS_COLORS.danger.color, color: "#fff", fontWeight: 700, cursor: fraudReasonInput.trim() ? "pointer" : "not-allowed", opacity: fraudReasonInput.trim() ? 1 : 0.6 }}>Flag as fraud</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: C.primary, margin: 0 }}>Referral Program</h1>
          <p style={{ color: C.gray500, fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
            Total credit issued: <strong style={{ color: C.primary }}>{creditByCurrency.length ? creditByCurrency.map(item => `${item.currency} ${item.total.toLocaleString()}`).join(" · ") : "0"}</strong>
            {total > 0 && <> · <span>{total} referrals</span></>}
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1rem", backgroundColor: C.primary, color: "white", border: "none", borderRadius: "0.4rem", fontWeight: 700, fontSize: "0.82rem", cursor: exporting ? "not-allowed" : "pointer", opacity: exporting ? 0.7 : 1 }}>
          <Download size={15} /> {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <ReferralConfigPanel />

      {/* Filter bar */}
      <div role="tablist" aria-label="Filter referrals by status" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        {([
          { key: "all",        label: "All" },
          { key: "pending",    label: "⏳ Pending" },
          { key: "credited",   label: "✅ Credited" },
          { key: "reversed",   label: "↩ Reversed" },
          { key: "fraud_hold", label: "🚩 Fraud Hold" },
        ] as const).map(tab => (
          <button key={tab.key} role="tab" aria-selected={filter === tab.key} onClick={() => { setFilter(tab.key); setPage(1); }}
            style={{ padding: "0.5rem 1.25rem", borderRadius: "999px", cursor: "pointer", fontSize: "0.875rem", fontWeight: "600", border: filter === tab.key ? "none" : `1px solid ${C.border}`, backgroundColor: filter === tab.key ? C.primary : "white", color: filter === tab.key ? "white" : C.gray500 }}>
            {tab.label}
          </button>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: TEXT_COLORS.secondary, cursor: "pointer", marginLeft: "0.5rem" }}>
          <input type="checkbox" checked={fraudOnly} onChange={e => { setFraudOnly(e.target.checked); setPage(1); }} />
          <AlertTriangle size={14} color={STATUS_COLORS.warning.color} /> Fraud flagged only
        </label>
      </div>

      {loading ? (
        <div role="status" aria-label="Loading referrals" style={{ textAlign: "center", padding: "4rem" }}>
          <div aria-hidden="true" style={{ width: "36px", height: "36px", border: `3px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : referrals.length === 0 ? (
        <div style={{ backgroundColor: "white", borderRadius: "0.875rem", padding: "4rem", textAlign: "center", border: `1px solid ${C.border}` }}>
          <Gift size={40} color={C.gray500} style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: C.gray500 }}>No referrals in this category.</p>
        </div>
      ) : (
        <>
          <div style={{ backgroundColor: "white", borderRadius: "0.875rem", border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: C.gray50, borderBottom: `1px solid ${C.border}` }}>
                  {["Referrer", "Referred User", "Joined", "Credit", "Tier", "Status", "Fraud"].map(h => (
                    <th key={h} style={{ padding: "0.875rem 1.25rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map((r, i) => (
                  <tr key={r._id} style={{ borderBottom: i < referrals.length - 1 ? `1px solid ${C.border}` : "none", backgroundColor: r.fraudFlag ? "#fffbeb" : "white" }}>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <p style={{ fontWeight: 600, color: C.primary, fontSize: "0.875rem", margin: "0 0 2px" }}>{r.referrer?.name ?? "—"}</p>
                      <p style={{ color: C.gray500, fontSize: "0.75rem", margin: 0 }}>{r.referrer?.email ?? ""}</p>
                    </td>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <p style={{ fontWeight: 600, color: C.primary, fontSize: "0.875rem", margin: "0 0 2px" }}>{r.referred?.name ?? "—"}</p>
                      <p style={{ color: C.gray500, fontSize: "0.75rem", margin: 0 }}>{r.referred?.email ?? ""}</p>
                    </td>
                    <td style={{ padding: "1rem 1.25rem", color: C.gray500, fontSize: "0.875rem" }}>
                      {r.referred?.createdAt ? new Date(r.referred.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "1rem 1.25rem", fontWeight: 700, color: C.primary, fontSize: "0.875rem" }}>
                      {r.creditCurrency} {r.creditAmount}
                    </td>
                    <td style={{ padding: "1rem 1.25rem", color: C.gray500, fontSize: "0.82rem" }}>
                      {r.milestoneIndex ? `Tier ${r.milestoneIndex}` : "—"}
                    </td>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, backgroundColor: statusColor(r.status).bg, color: statusColor(r.status).color }}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <button onClick={() => handleFlagFraud(r._id, !r.fraudFlag)}
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem", fontWeight: 700, border: "none", borderRadius: "0.35rem", cursor: "pointer", backgroundColor: r.fraudFlag ? STATUS_COLORS.danger.bg : STATUS_COLORS.neutral.bg, color: r.fraudFlag ? STATUS_COLORS.danger.color : TEXT_COLORS.muted }}>
                        {r.fraudFlag ? "🚩 Unflag" : "Flag"}
                      </button>
                      {r.fraudReason && <p style={{ fontSize: "0.68rem", color: STATUS_COLORS.danger.color, margin: "2px 0 0" }}>{r.fraudReason}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
              <button onClick={() => { setPage(p => p - 1); fetchReferrals(page - 1); }} disabled={page <= 1}
                style={{ padding: "0.45rem 0.9rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.82rem", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1, backgroundColor: "white" }}>
                ← Prev
              </button>
              <span style={{ fontSize: "0.82rem", color: TEXT_COLORS.secondary }}>Page {page} of {totalPages}</span>
              <button onClick={() => { setPage(p => p + 1); fetchReferrals(page + 1); }} disabled={page >= totalPages}
                style={{ padding: "0.45rem 0.9rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.82rem", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1, backgroundColor: "white" }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
