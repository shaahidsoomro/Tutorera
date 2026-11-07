"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { UI_COLORS } from "@/lib/brand";

const C = UI_COLORS;

interface DisputedBooking {
  _id: string;
  paymentStatus: string;
  status: string;
  amount: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
  student?: { _id: string; name: string; email: string };
  tutor?: { _id: string; name: string; email: string };
  request?: { subject?: string };
  safetyCase?: {
    _id: string;
    caseId: string;
    status: string;
    resolvedAt?: string;
    actionTaken?: string;
  } | null;
}

interface ResolveState {
  bookingId: string;
  safetyCase?: DisputedBooking["safetyCase"];
}

function ResolveModal({ booking, onClose, onDone }: { booking: DisputedBooking; onClose: () => void; onDone: () => void }) {
  const [paymentAction, setPaymentAction] = useState<"refund" | "dismiss">("dismiss");
  const [actionTaken, setActionTaken] = useState("no_action");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasSafetyCase = !!booking.safetyCase && booking.safetyCase.status !== "resolved";

  const handleSubmit = async () => {
    if (!summary.trim() || summary.trim().length < 10) {
      showError("Please provide a resolution summary (min 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      if (hasSafetyCase) {
        await api.post(`/admin/safety/cases/${booking.safetyCase!._id}/resolve`, {
          actionTaken,
          resolutionSummary: summary.trim(),
          paymentAction,
        });
      } else {
        // No safety case — directly patch booking payment status
        const newStatus = paymentAction === "refund" ? "refunded" : "confirmed";
        await api.patch(`/admin/bookings/${booking._id}/payment`, { paymentStatus: newStatus });
      }
      showSuccess(paymentAction === "refund" ? "Refund approved — booking marked as refunded." : "Dispute dismissed — booking restored to confirmed.");
      onDone();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to resolve dispute.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="dispute-modal-title" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem", maxWidth: 520, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 id="dispute-modal-title" style={{ margin: 0, fontWeight: 800, color: C.primary, fontSize: "1rem" }}>⚖️ Resolve Dispute</h3>
          <button onClick={onClose} aria-label="Close dispute modal" style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#6b7280", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "0.875rem 1rem", marginBottom: "1.25rem", fontSize: "0.82rem", color: C.primary }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{booking.request?.subject || "Session"}</p>
          <p style={{ margin: "0 0 2px", color: "#64748b" }}>Student: {booking.student?.name} · Tutor: {booking.tutor?.name}</p>
          <p style={{ margin: 0, color: "#64748b" }}>Amount: {booking.currency || "PKR"} {(booking.amount || 0).toLocaleString()}</p>
          {booking.safetyCase && (
            <p style={{ margin: "4px 0 0", color: "#7c3aed", fontWeight: 600 }}>Case: {booking.safetyCase.caseId} ({booking.safetyCase.status})</p>
          )}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontWeight: 700, color: C.primary, fontSize: "0.85rem", marginBottom: "0.5rem" }}>Payment Decision</p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {(["dismiss", "refund"] as const).map((opt) => (
              <label key={opt} style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", border: `2px solid ${paymentAction === opt ? (opt === "refund" ? "#16a34a" : "#2563eb") : "#e5e7eb"}`, borderRadius: 10, cursor: "pointer", background: paymentAction === opt ? (opt === "refund" ? "#f0fdf4" : "#eff6ff") : "#fff" }}>
                <input type="radio" value={opt} checked={paymentAction === opt} onChange={() => setPaymentAction(opt)} style={{ accentColor: opt === "refund" ? "#16a34a" : "#2563eb" }} />
                <span style={{ fontWeight: 700, fontSize: "0.82rem", color: opt === "refund" ? "#16a34a" : "#2563eb" }}>
                  {opt === "refund" ? "✅ Approve Refund" : "❌ Dismiss — No Refund"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {hasSafetyCase && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: 700, color: C.primary, fontSize: "0.85rem", display: "block", marginBottom: "0.4rem" }}>Safety Action</label>
            <select value={actionTaken} onChange={e => setActionTaken(e.target.value)}
              style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: "0.85rem", color: C.primary }}>
              <option value="no_action">No Action</option>
              <option value="warning_issued">Warning Issued</option>
              <option value="account_suspended">Account Suspended</option>
              <option value="account_banned">Account Banned</option>
            </select>
          </div>
        )}

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontWeight: 700, color: C.primary, fontSize: "0.85rem", display: "block", marginBottom: "0.4rem" }}>Resolution Notes *</label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Explain the resolution decision for audit trail…"
            style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: "0.85rem", resize: "vertical", boxSizing: "border-box" }} />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "0.6rem 1.25rem", border: "1.5px solid #e5e7eb", borderRadius: 8, background: "#fff", color: C.primary, fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ padding: "0.6rem 1.25rem", border: "none", borderRadius: 8, background: submitting ? "#e5e7eb" : (paymentAction === "refund" ? "#16a34a" : "#2563eb"), color: submitting ? "#9ca3af" : "#fff", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontSize: "0.85rem" }}>
            {submitting ? "Resolving…" : "Confirm Resolution"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DisputesPage() {
  const [bookings, setBookings] = useState<DisputedBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"disputed" | "refunded">("disputed");
  const [resolving, setResolving] = useState<DisputedBooking | null>(null);

  const load = async (status: "disputed" | "refunded") => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/disputes?status=${status}&limit=50`);
      setBookings(res.data.bookings ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      showError("Failed to load disputed bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(tab); }, [tab]);

  const handleDone = () => { setResolving(null); load(tab); };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <AlertTriangle size={22} color="#dc2626" />
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: C.primary, margin: 0 }}>Disputed Bookings</h1>
        <button onClick={() => load(tab)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "0.4rem 0.875rem", cursor: "pointer", color: "#64748b", fontSize: "0.82rem" }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Review and resolve payment disputes raised by students or tutors.
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {(["disputed", "refunded"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "0.45rem 1.1rem", borderRadius: 8, border: `2px solid ${tab === t ? C.accent : "#e5e7eb"}`, background: tab === t ? "#eff6ff" : "#fff", color: tab === t ? C.accent : "#64748b", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", textTransform: "capitalize" }}>
            {t === "disputed" ? "⚠️ Open Disputes" : "✅ Resolved / Refunded"}
          </button>
        ))}
        <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: "0.8rem", color: "#64748b" }}>{total} total</span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <CheckCircle size={36} color="#16a34a" style={{ marginBottom: "0.75rem" }} />
          <p style={{ fontWeight: 700, color: C.primary, marginBottom: "0.25rem" }}>No {tab} bookings</p>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>All clear in this category.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1fr 1fr 1.2fr", padding: "0.6rem 1.25rem", background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
            {["Student", "Tutor", "Subject", "Amount", "Safety Case", "Action"].map(h => (
              <p key={h} style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</p>
            ))}
          </div>

          {bookings.map((b, idx) => (
            <div key={b._id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1fr 1fr 1.2fr", padding: "0.875rem 1.25rem", alignItems: "center", borderBottom: idx < bookings.length - 1 ? "1px solid #f3f4f6" : "none" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: C.primary, fontSize: "0.85rem" }}>{b.student?.name || "—"}</p>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.75rem" }}>{b.student?.email}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: C.primary, fontSize: "0.85rem" }}>{b.tutor?.name || "—"}</p>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.75rem" }}>{b.tutor?.email}</p>
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "999px", background: "#eff6ff", color: C.accent, width: "fit-content" }}>
                {b.request?.subject || "—"}
              </span>
              <p style={{ margin: 0, fontWeight: 700, color: C.primary, fontSize: "0.875rem" }}>
                {b.currency || "PKR"} {(b.amount || 0).toLocaleString()}
              </p>
              <div>
                {b.safetyCase ? (
                  <Link href={`/admin/safety-cases`} style={{ fontSize: "0.75rem", color: "#7c3aed", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    {b.safetyCase.caseId} <ExternalLink size={10} />
                  </Link>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>None</span>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {tab === "disputed" ? (
                  <button onClick={() => setResolving(b)}
                    style={{ padding: "0.35rem 0.875rem", background: C.accent, color: "#fff", border: "none", borderRadius: 7, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Resolve
                  </button>
                ) : (
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: b.paymentStatus === "refunded" ? "#16a34a" : "#2563eb", padding: "0.25rem 0.6rem", background: b.paymentStatus === "refunded" ? "#f0fdf4" : "#eff6ff", borderRadius: 6 }}>
                    {b.paymentStatus === "refunded" ? "Refunded" : "Confirmed"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {resolving && (
        <ResolveModal booking={resolving} onClose={() => setResolving(null)} onDone={handleDone} />
      )}
    </div>
  );
}
