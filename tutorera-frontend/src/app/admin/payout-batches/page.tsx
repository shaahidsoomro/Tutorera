"use client";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { showError, showSuccess } from "@/lib/toast";
import { useCallback, useEffect, useState } from "react";

const C = UI_COLORS;

type PayoutState = "pending" | "requested" | "initiated" | "completed" | "failed" | "cancelled";
type Filter = "all" | PayoutState;
type Action = "initiate" | "complete" | "fail";

interface Payout {
  _id: string;
  transferRef: string;
  tutor?: { _id: string; name: string; email: string };
  bookings: string[];
  currency: string;
  totalAmount: number;
  state: PayoutState;
  requestedAt: string;
  initiatedBy?: { _id: string; name: string };
  settlementReference?: string;
  evidenceRef?: string;
  actionedBy?: { name: string };
  adminNote?: string;
}

interface Queue {
  awaitingApproval: number;
  awaitingIndependentVerification: number;
  approvedRefundsAwaitingSettlement: number;
  paymentExceptionsAwaitingReconciliation: number;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "requested", label: "Awaiting transfer" },
  { key: "initiated", label: "Awaiting second reviewer" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

const STATE_STYLE: Record<PayoutState, { bg: string; color: string; label: string }> = {
  pending: { bg: "#fef3c7", color: "#d97706", label: "Pending" },
  requested: { bg: "#EEF5FF", color: "#0329B2", label: "Awaiting transfer" },
  initiated: { bg: "#fdf4ff", color: "#9333ea", label: "Awaiting second reviewer" },
  completed: { bg: "#f0fdf4", color: "#16a34a", label: "Completed" },
  failed: { bg: "#fef2f2", color: "#ef4444", label: "Failed" },
  cancelled: { bg: "#f1f5f9", color: "#64748b", label: "Cancelled" },
};

const money = (amount: number, currency: string) => `${currency} ${amount.toLocaleString()}`;

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", borderRadius: 8, border: `1px solid ${C.border}`,
  fontSize: 14, boxSizing: "border-box",
};

export default function PayoutBatchesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Payout[]>([]);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [filter, setFilter] = useState<Filter>("requested");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialog, setDialog] = useState<{ action: Action; payout: Payout } | null>(null);
  const [fields, setFields] = useState({ settlementReference: "", evidenceRef: "", adminNote: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === "all" ? "" : `?state=${filter}`;
      const [list, q] = await Promise.all([
        api.get(`/admin/tutor-payouts${params}`),
        api.get("/admin/tutor-payouts/queue"),
      ]);
      setItems(list.data.items || []);
      setQueue(q.data.result || null);
    } catch (error) {
      showError(error, "Could not load payout batches");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const createRequests = async () => {
    if (!window.confirm("Create payout requests for every eligible completed lesson? Tutors below the currency minimum are skipped.")) return;
    setCreating(true);
    try {
      const { data } = await api.post("/admin/tutor-payouts/scan?apply=true");
      const r = data.result;
      showSuccess(`${r.requested} payout request(s) created, ${r.skippedBelowThreshold} below the minimum.`);
      if (r.failed) showError(new Error(r.errors?.[0] || "Some payouts failed"), "Some payouts failed");
      await load();
    } catch (error) {
      showError(error, "Could not create payout requests");
    } finally {
      setCreating(false);
    }
  };

  const open = (action: Action, payout: Payout) => {
    setFields({ settlementReference: "", evidenceRef: "", adminNote: "" });
    setDialog({ action, payout });
  };

  const submit = async () => {
    if (!dialog) return;
    const { action, payout } = dialog;
    const body =
      action === "initiate" ? { settlementReference: fields.settlementReference }
      : action === "complete" ? { settlementReference: fields.settlementReference, evidenceRef: fields.evidenceRef, adminNote: fields.adminNote || undefined }
      : { adminNote: fields.adminNote };
    setSubmitting(true);
    try {
      await api.post(`/admin/tutor-payouts/${encodeURIComponent(payout.transferRef)}/${action}`, body);
      showSuccess(action === "initiate" ? "Transfer recorded. A second reviewer must now confirm it." : action === "complete" ? "Payout confirmed and marked paid." : "Payout marked failed.");
      setDialog(null);
      await load();
    } catch (error) {
      showError(error, "That action could not be completed");
    } finally {
      setSubmitting(false);
    }
  };

  const isInitiator = (p: Payout) => Boolean(user?._id && p.initiatedBy?._id === user._id);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: C.accent, margin: 0 }}>Payout Batches</h1>
          <p style={{ color: C.gray600, margin: "6px 0 0", maxWidth: 640, fontSize: 14 }}>
            A payout is settled by two different finance reviewers. The first records the external transfer and its reference;
            a second confirms it with the same reference and written evidence.
          </p>
        </div>
        <button
          onClick={createRequests}
          disabled={creating}
          style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "0.65rem 1.1rem", fontWeight: 600, cursor: creating ? "wait" : "pointer" }}
        >
          {creating ? "Creating…" : "Create payout requests"}
        </button>
      </div>

      {queue && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            ["Awaiting approval", queue.awaitingApproval],
            ["Awaiting verification", queue.awaitingIndependentVerification],
            ["Refunds to settle", queue.approvedRefundsAwaitingSettlement],
            ["Payment exceptions", queue.paymentExceptionsAwaitingReconciliation],
          ].map(([label, n]) => (
            <div key={label as string} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.8rem 1rem" }}>
              <div style={{ fontSize: 12, color: C.gray500 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{n as number}</div>
            </div>
          ))}
        </div>
      )}

      <div role="tablist" aria-label="Payout state" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "0.4rem 0.9rem", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600,
              border: `1px solid ${filter === f.key ? C.accent : C.border}`,
              background: filter === f.key ? C.accent : C.surface, color: filter === f.key ? "#fff" : C.gray600,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 820 }}>
          <thead>
            <tr style={{ background: C.gray50, textAlign: "left", color: C.gray600 }}>
              {["Transfer", "Tutor", "Amount", "Lessons", "State", "Recorded transfer", "Actions"].map((h) => (
                <th key={h} style={{ padding: "0.7rem 0.9rem", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: C.gray500 }}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: C.gray500 }}>No payouts in this state.</td></tr>
            ) : items.map((p) => {
              const st = STATE_STYLE[p.state];
              const canAct = p.state === "requested" || p.state === "initiated" || p.state === "pending";
              return (
                <tr key={p._id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "0.7rem 0.9rem", fontFamily: "monospace", fontSize: 12 }}>{p.transferRef}</td>
                  <td style={{ padding: "0.7rem 0.9rem" }}>
                    <div style={{ fontWeight: 600 }}>{p.tutor?.name || "—"}</div>
                    <div style={{ fontSize: 12, color: C.gray500 }}>{p.tutor?.email}</div>
                  </td>
                  <td style={{ padding: "0.7rem 0.9rem", fontWeight: 600 }}>{money(p.totalAmount, p.currency)}</td>
                  <td style={{ padding: "0.7rem 0.9rem" }}>{p.bookings.length}</td>
                  <td style={{ padding: "0.7rem 0.9rem" }}>
                    <span style={{ background: st.bg, color: st.color, borderRadius: 999, padding: "0.2rem 0.65rem", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{st.label}</span>
                  </td>
                  <td style={{ padding: "0.7rem 0.9rem", fontSize: 13 }}>
                    {p.settlementReference ? (
                      <>
                        <div style={{ fontFamily: "monospace" }}>{p.settlementReference}</div>
                        <div style={{ color: C.gray500 }}>by {p.initiatedBy?.name || "—"}</div>
                      </>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "0.7rem 0.9rem" }}>
                    {!canAct ? (
                      <span style={{ color: C.gray500, fontSize: 13 }}>
                        {p.state === "completed" ? `Confirmed by ${p.actionedBy?.name || "—"}` : p.adminNote || "—"}
                      </span>
                    ) : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {p.state === "requested" && (
                          <button onClick={() => open("initiate", p)} style={btn(C.accent)}>Record transfer</button>
                        )}
                        {p.state === "initiated" && (
                          <button
                            onClick={() => open("complete", p)}
                            disabled={isInitiator(p)}
                            title={isInitiator(p) ? "You recorded this transfer, so a different reviewer must confirm it." : undefined}
                            style={{ ...btn("#16a34a"), opacity: isInitiator(p) ? 0.45 : 1, cursor: isInitiator(p) ? "not-allowed" : "pointer" }}
                          >
                            Confirm payment
                          </button>
                        )}
                        <button onClick={() => open("fail", p)} style={btn("#ef4444")}>Mark failed</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={dialog.action === "initiate" ? "Record transfer" : dialog.action === "complete" ? "Confirm payment" : "Mark payout failed"}
          style={{ position: "fixed", inset: 0, background: "rgba(2,21,80,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}
          onClick={() => !submitting && setDialog(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: 14, padding: "1.5rem", width: "100%", maxWidth: 460 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, color: C.primary }}>
              {dialog.action === "initiate" ? "Record the external transfer" : dialog.action === "complete" ? "Confirm the payment" : "Mark payout failed"}
            </h2>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: C.gray600 }}>
              {dialog.payout.transferRef} · {money(dialog.payout.totalAmount, dialog.payout.currency)} · {dialog.payout.tutor?.name}
            </p>

            {dialog.action !== "fail" && (
              <label style={{ display: "block", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                Settlement reference (bank / provider transaction id)
                <input
                  value={fields.settlementReference}
                  onChange={(e) => setFields({ ...fields, settlementReference: e.target.value })}
                  placeholder={dialog.action === "complete" ? `Must match ${dialog.payout.settlementReference ?? "the recorded reference"}` : "At least 8 characters"}
                  style={{ ...inputStyle, marginTop: 4 }}
                />
              </label>
            )}
            {dialog.action === "complete" && (
              <label style={{ display: "block", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                Evidence (statement line or receipt you checked yourself)
                <input
                  value={fields.evidenceRef}
                  onChange={(e) => setFields({ ...fields, evidenceRef: e.target.value })}
                  placeholder="At least 8 characters"
                  style={{ ...inputStyle, marginTop: 4 }}
                />
              </label>
            )}
            {dialog.action !== "initiate" && (
              <label style={{ display: "block", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                {dialog.action === "fail" ? "Reason (required)" : "Note (optional)"}
                <textarea
                  value={fields.adminNote}
                  onChange={(e) => setFields({ ...fields, adminNote: e.target.value })}
                  rows={3}
                  style={{ ...inputStyle, marginTop: 4, resize: "vertical" }}
                />
              </label>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button onClick={() => setDialog(null)} disabled={submitting} style={{ ...btn(C.gray500), background: "transparent", color: C.gray600, border: `1px solid ${C.border}` }}>Cancel</button>
              <button onClick={submit} disabled={submitting} style={btn(dialog.action === "fail" ? "#ef4444" : C.accent)}>
                {submitting ? "Saving…" : dialog.action === "initiate" ? "Record transfer" : dialog.action === "complete" ? "Confirm payment" : "Mark failed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btn(background: string): React.CSSProperties {
  return { background, color: "#fff", border: "none", borderRadius: 8, padding: "0.45rem 0.85rem", fontSize: 13, fontWeight: 600, cursor: "pointer" };
}
