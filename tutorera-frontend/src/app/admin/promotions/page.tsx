"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Plus, Trash2, Edit2, X, Save, Tag, Users, ChevronDown, ChevronUp } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

const C = UI_COLORS;

interface PromoCode {
  _id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount?: number;
  minBookingAmount: number;
  maxRedemptions?: number;
  maxRedemptionsPerUser: number;
  redemptionCount: number;
  applicableRoles: ("student" | "parent")[];
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
}

interface Redemption {
  _id: string;
  user: { name: string; email: string; role: string };
  booking?: { amount: number; schedule: string; createdAt: string };
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  createdAt: string;
}

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: 10,
  maxDiscountAmount: "",
  minBookingAmount: "",
  maxRedemptions: "",
  maxRedemptionsPerUser: 1,
  applicableRoles: ["student", "parent"] as ("student" | "parent")[],
  validFrom: "",
  validUntil: "",
};

export default function PromotionsPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<Record<string, Redemption[]>>({});
  const [loadingRedemptions, setLoadingRedemptions] = useState<string | null>(null);

  const fetchPromoCodes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/promo-codes");
      setPromoCodes(res.data.promoCodes || []);
    } catch (err) {
      showError(err, "Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromoCodes(); }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (p: PromoCode) => {
    setForm({
      code: p.code,
      description: p.description || "",
      discountType: p.discountType,
      discountValue: p.discountValue,
      maxDiscountAmount: p.maxDiscountAmount?.toString() || "",
      minBookingAmount: p.minBookingAmount?.toString() || "",
      maxRedemptions: p.maxRedemptions?.toString() || "",
      maxRedemptionsPerUser: p.maxRedemptionsPerUser,
      applicableRoles: p.applicableRoles,
      validFrom: p.validFrom ? p.validFrom.slice(0, 10) : "",
      validUntil: p.validUntil ? p.validUntil.slice(0, 10) : "",
    });
    setEditingId(p._id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) {
      showError("A code is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        description: form.description,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
        minBookingAmount: form.minBookingAmount ? Number(form.minBookingAmount) : 0,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        maxRedemptionsPerUser: Number(form.maxRedemptionsPerUser) || 1,
        applicableRoles: form.applicableRoles,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
      };
      if (editingId) {
        await api.put(`/admin/promo-codes/${editingId}`, payload);
        showSuccess("Promo code updated");
      } else {
        await api.post("/admin/promo-codes", payload);
        showSuccess("Promo code created");
      }
      resetForm();
      fetchPromoCodes();
    } catch (err) {
      showError(err, "Failed to save promo code");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: PromoCode) => {
    try {
      await api.put(`/admin/promo-codes/${p._id}`, { isActive: !p.isActive });
      showSuccess(p.isActive ? "Promo code deactivated" : "Promo code activated");
      fetchPromoCodes();
    } catch (err) {
      showError(err, "Failed to update promo code");
    }
  };

  const handleDelete = async (p: PromoCode) => {
    try {
      await api.delete(`/admin/promo-codes/${p._id}`);
      showSuccess("Promo code deleted");
      fetchPromoCodes();
    } catch (err) {
      showError(err, "Failed to delete promo code");
    }
  };

  const toggleExpand = async (p: PromoCode) => {
    if (expandedId === p._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(p._id);
    if (!redemptions[p._id]) {
      setLoadingRedemptions(p._id);
      try {
        const res = await api.get(`/admin/promo-codes/${p._id}`);
        setRedemptions(prev => ({ ...prev, [p._id]: res.data.redemptions || [] }));
      } catch (err) {
        showError(err, "Failed to load redemption history");
      } finally {
        setLoadingRedemptions(null);
      }
    }
  };

  const statusBadge = (p: PromoCode) => {
    const now = new Date();
    const expired = p.validUntil && new Date(p.validUntil) < now;
    const exhausted = p.maxRedemptions !== undefined && p.redemptionCount >= p.maxRedemptions;
    if (!p.isActive) return { label: "Inactive", ...STATUS_COLORS.neutral };
    if (expired) return { label: "Expired", ...STATUS_COLORS.danger };
    if (exhausted) return { label: "Exhausted", ...STATUS_COLORS.warning };
    return { label: "Active", ...STATUS_COLORS.success };
  };

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: C.primary, margin: 0 }}>Promo Codes</h1>
          <p style={{ color: C.gray500, fontSize: "0.875rem", margin: "0.25rem 0 0" }}>Create and manage discount codes students and parents can redeem at checkout.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.1rem", background: C.accentGradient, color: C.surface, border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 700 }}
          >
            <Plus size={18} /> New Promo Code
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "0.875rem", padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: C.primary, margin: 0 }}>{editingId ? "Edit Promo Code" : "New Promo Code"}</h2>
            <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray500 }}><X size={20} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>Code {editingId && "(read-only)"}</label>
              <input
                type="text"
                placeholder="e.g. WELCOME20"
                value={form.code}
                disabled={!!editingId}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box", opacity: editingId ? 0.7 : 1 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>Discount Type</label>
              <select
                value={form.discountType}
                onChange={e => setForm({ ...form, discountType: e.target.value as "percentage" | "fixed" })}
                style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>
                Discount Value {form.discountType === "percentage" ? "(%)" : "(Rs.)"}
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={e => setForm({ ...form, discountValue: Number(e.target.value) })}
                style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }}
              />
            </div>
            {form.discountType === "percentage" && (
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>Max Discount Cap (Rs., optional)</label>
                <input
                  type="number"
                  placeholder="No cap"
                  value={form.maxDiscountAmount}
                  onChange={e => setForm({ ...form, maxDiscountAmount: e.target.value })}
                  style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }}
                />
              </div>
            )}
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>Min Booking Amount (Rs.)</label>
              <input
                type="number"
                placeholder="0"
                value={form.minBookingAmount}
                onChange={e => setForm({ ...form, minBookingAmount: e.target.value })}
                style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>Total Redemption Limit (optional)</label>
              <input
                type="number"
                placeholder="Unlimited"
                value={form.maxRedemptions}
                onChange={e => setForm({ ...form, maxRedemptions: e.target.value })}
                style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>Per-User Limit</label>
              <input
                type="number"
                value={form.maxRedemptionsPerUser}
                onChange={e => setForm({ ...form, maxRedemptionsPerUser: Number(e.target.value) })}
                style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>Valid From</label>
              <input
                type="date"
                value={form.validFrom}
                onChange={e => setForm({ ...form, validFrom: e.target.value })}
                style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>Valid Until (optional)</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={e => setForm({ ...form, validUntil: e.target.value })}
                style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>Applies To</label>
              <div style={{ display: "flex", gap: "1rem", paddingTop: "0.5rem" }}>
                {(["student", "parent"] as const).map(role => (
                  <label key={role} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: TEXT_COLORS.secondary, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.applicableRoles.includes(role)}
                      onChange={e => {
                        setForm({
                          ...form,
                          applicableRoles: e.target.checked
                            ? [...form.applicableRoles, role]
                            : form.applicableRoles.filter(r => r !== role),
                        });
                      }}
                    />
                    {role === "student" ? "Students" : "Parents"}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, fontSize: "0.85rem", color: TEXT_COLORS.secondary }}>Description</label>
            <textarea
              placeholder="Internal note describing this promotion"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              style={{ width: "100%", padding: "0.55rem 0.7rem", border: `1px solid ${C.border}`, borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button onClick={resetForm} style={{ padding: "0.6rem 1.1rem", background: "none", border: `1px solid ${C.border}`, borderRadius: "0.5rem", cursor: "pointer", fontWeight: 600, color: TEXT_COLORS.secondary }}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.1rem", background: STATUS_COLORS.success.color, color: C.surface, border: "none", borderRadius: "0.5rem", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, opacity: saving ? 0.7 : 1 }}
            >
              <Save size={16} /> {saving ? "Saving..." : editingId ? "Save Changes" : "Create Code"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <div style={{ width: "36px", height: "36px", border: `3px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : promoCodes.length === 0 ? (
        <div style={{ background: C.surface, borderRadius: "0.875rem", padding: "4rem", textAlign: "center", border: `1px solid ${C.border}` }}>
          <Tag size={40} color={C.border} style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: C.gray500 }}>No promo codes yet. Create one to get started.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {promoCodes.map(p => {
            const badge = statusBadge(p);
            const isExpanded = expandedId === p._id;
            return (
              <div key={p._id} style={{ background: C.surface, borderRadius: "0.875rem", border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "1.05rem", color: C.primary, letterSpacing: "0.03em" }}>{p.code}</span>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "0.15rem 0.55rem", borderRadius: "999px", background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.label}</span>
                    </div>
                    <p style={{ color: C.gray500, fontSize: "0.82rem", margin: "0 0 0.3rem" }}>{p.description || "No description"}</p>
                    <p style={{ color: TEXT_COLORS.secondary, fontSize: "0.82rem", margin: 0 }}>
                      {p.discountType === "percentage" ? `${p.discountValue}% off` : `Rs. ${p.discountValue} off`}
                      {p.maxDiscountAmount ? ` (max Rs. ${p.maxDiscountAmount})` : ""}
                      {p.minBookingAmount > 0 ? ` · min booking Rs. ${p.minBookingAmount}` : ""}
                      {" · "}{p.applicableRoles.join(" & ")}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 800, fontSize: "1.1rem", color: C.primary, margin: 0 }}>{p.redemptionCount}{p.maxRedemptions ? ` / ${p.maxRedemptions}` : ""}</p>
                      <p style={{ fontSize: "0.7rem", color: C.gray500, margin: 0 }}>redemptions</p>
                    </div>
                    <button onClick={() => toggleExpand(p)} title="View redemptions" style={{ padding: "0.5rem", background: C.accentLight, border: "none", borderRadius: "0.4rem", cursor: "pointer", color: C.accent, display: "flex" }}>
                      <Users size={16} />{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => startEdit(p)} title="Edit" style={{ padding: "0.5rem", background: C.accentLight, border: "none", borderRadius: "0.4rem", cursor: "pointer", color: C.accent }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleToggleActive(p)} style={{ padding: "0.5rem 0.9rem", background: p.isActive ? STATUS_COLORS.neutral.bg : STATUS_COLORS.success.bg, color: p.isActive ? STATUS_COLORS.neutral.color : STATUS_COLORS.success.color, border: "none", borderRadius: "0.4rem", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>
                      {p.isActive ? "Deactivate" : "Activate"}
                    </button>
                    {confirmDeleteId === p._id ? (
                      <div role="alert" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: STATUS_COLORS.danger.color }}>Delete?</span>
                        <button onClick={() => { setConfirmDeleteId(null); handleDelete(p); }} style={{ padding: "0.3rem 0.5rem", background: STATUS_COLORS.danger.color, color: "white", border: "none", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", minHeight: 32 }}>Yes</button>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "0.3rem 0.5rem", background: "white", color: "#64748b", border: `1px solid ${C.border}`, borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", minHeight: 32 }}>No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(p._id)} title="Delete" aria-label={`Delete promo code ${p.code}`} style={{ padding: "0.5rem", background: STATUS_COLORS.danger.bg, border: "none", borderRadius: "0.4rem", cursor: "pointer", color: STATUS_COLORS.danger.color }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: "1.25rem 1.5rem", background: C.gray50 }}>
                    <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: C.primary, marginBottom: "0.85rem" }}>Redemption Record</h3>
                    {loadingRedemptions === p._id ? (
                      <p style={{ color: C.gray500, fontSize: "0.85rem" }}>Loading...</p>
                    ) : !redemptions[p._id]?.length ? (
                      <p style={{ color: C.gray500, fontSize: "0.85rem" }}>No one has used this code yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {redemptions[p._id].map(r => (
                          <div key={r._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem", background: C.surface, borderRadius: "0.5rem", border: `1px solid ${C.border}`, flexWrap: "wrap", gap: "0.5rem" }}>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: "0.85rem", color: C.primary, margin: 0 }}>{r.user?.name || "Unknown"}</p>
                              <p style={{ fontSize: "0.75rem", color: C.gray500, margin: 0 }}>{r.user?.email} · {r.user?.role} · {new Date(r.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p style={{ fontWeight: 700, fontSize: "0.85rem", color: STATUS_COLORS.success.color, margin: 0 }}>-Rs. {r.discountAmount.toLocaleString()}</p>
                              <p style={{ fontSize: "0.75rem", color: C.gray500, margin: 0 }}>Rs. {r.originalAmount.toLocaleString()} → Rs. {r.finalAmount.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
