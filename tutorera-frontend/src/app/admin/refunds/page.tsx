"use client";

import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/lib/toast";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type RefundState = "pending" | "approved" | "rejected" | "processed";
type RefundCase = {
  _id: string;
  amount: number;
  reason: string;
  details: string;
  status: RefundState;
  adminNote?: string;
  createdAt: string;
  student?: { name: string; email: string };
  tutor?: { name: string; email: string };
  booking?: { _id: string; studentTotal: number; currency?: string };
  settlementReference?: string;
  settlementMethod?: string;
  settlementEvidenceReference?: string;
  settlementInitiatedBy?: string;
  settlementVerifiedBy?: string;
  voidedSettlements?: Array<{ reference?: string; reason?: string; reviewedAt?: string; reviewedBy?: string }>;
  processedAt?: string;
};
const filters: Array<"all" | RefundState> = ["all", "pending", "approved", "processed", "rejected"];

type ModalKind = "review" | "record" | "verify" | "void";
type Modal = {
  kind: ModalKind;
  item: RefundCase;
  status?: "approved" | "rejected";
};

function getMessage(error: unknown): string {
  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || "Unable to update this refund. Check the latest status before trying again.";
}

const inp: React.CSSProperties = {
  display: "block", width: "100%", borderRadius: "0.5rem",
  border: `1px solid ${UI_COLORS.border}`, padding: "0.5rem 0.75rem",
  fontSize: "0.875rem", color: TEXT_COLORS.body, backgroundColor: UI_COLORS.surface,
  boxSizing: "border-box", marginTop: "0.3rem",
};
const lbl: React.CSSProperties = { display: "block", fontSize: "0.82rem", fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: "0.75rem" };

export default function RefundReviewPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | RefundState>("pending");
  const [items, setItems] = useState<RefundCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const closeModal = useCallback(() => setModal(null), []);
  const modalRef = useFocusTrap(Boolean(modal), closeModal);

  // Review modal fields
  const [reviewNote, setReviewNote] = useState("");
  // Record transfer modal fields
  const [recordMethod, setRecordMethod] = useState("");
  const [recordRef, setRecordRef] = useState("");
  const [recordEvidence, setRecordEvidence] = useState("");
  // Verify modal fields
  const [verifyRef, setVerifyRef] = useState("");
  const [verifyEvidence, setVerifyEvidence] = useState("");
  const [verifyNote, setVerifyNote] = useState("");

  const adminRole = user?.adminRole || "";
  const grants = user?.adminPermissions || [];
  const canApprove = adminRole === "super_admin" || adminRole === "trust_and_safety" || grants.includes("claims.manage") || grants.includes("*");
  const canSettle = adminRole === "super_admin" || adminRole === "finance" || grants.includes("payment.refund") || grants.includes("*");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/refund-requests", { params: filter === "all" ? {} : { status: filter } });
      setItems(res.data.refundRequests || []);
    } catch (err) {
      showError(getMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  function openModal(kind: ModalKind, item: RefundCase, status?: "approved" | "rejected") {
    setModal({ kind, item, status });
    setReviewNote(""); setRecordMethod(""); setRecordRef(""); setRecordEvidence("");
    setVerifyRef(""); setVerifyEvidence(""); setVerifyNote("");
  }

  const submitReview = async () => {
    if (!modal || busy) return;
    if (reviewNote.trim().length < 8) return;
    setBusy(modal.item._id);
    try {
      await api.patch(`/admin/refund-requests/${modal.item._id}`, { status: modal.status, adminNote: reviewNote.trim() });
      setModal(null);
      showSuccess(modal.status === "approved" ? "Approved for external settlement; no refund has yet been paid." : "Refund rejected.");
      await load();
    } catch (err) { showError(getMessage(err)); } finally { setBusy(null); }
  };

  const submitRecord = async () => {
    if (!modal || busy) return;
    if (!recordMethod.trim() || recordRef.trim().length < 8 || recordEvidence.trim().length < 8) return;
    setBusy(modal.item._id);
    try {
      await api.post(`/admin/refund-requests/${modal.item._id}/external-transfer`, {
        settlementMethod: recordMethod.trim(), settlementReference: recordRef.trim(), evidenceReference: recordEvidence.trim(),
      });
      setModal(null);
      showSuccess("External refund evidence recorded. A different finance officer must verify settlement.");
      await load();
    } catch (err) { showError(getMessage(err)); } finally { setBusy(null); }
  };

  const submitVerify = async () => {
    if (!modal || busy) return;
    if (verifyRef.trim().length < 8 || verifyEvidence.trim().length < 8 || verifyNote.trim().length < 12) return;
    setBusy(modal.item._id);
    try {
      await api.post(`/admin/refund-requests/${modal.item._id}/external-verify`, {
        settlementReference: verifyRef.trim(), verificationEvidence: verifyEvidence.trim(), note: verifyNote.trim(),
      });
      setModal(null);
      showSuccess("Externally executed refund independently reconciled.");
      await load();
    } catch (err) { showError(getMessage(err)); } finally { setBusy(null); }
  };

  const submitVoid = async () => {
    if (!modal || busy || verifyRef.trim().length < 8 || verifyEvidence.trim().length < 8 || verifyNote.trim().length < 12) return;
    setBusy(modal.item._id);
    try {
      await api.post(`/admin/refund-requests/${modal.item._id}/external-evidence/void`, {
        settlementReference: verifyRef.trim(), reviewEvidence: verifyEvidence.trim(), reason: verifyNote.trim(),
      });
      setModal(null);
      showSuccess("Evidence submission voided. The payout remains held for finance review.");
      await load();
    } catch (err) { showError(getMessage(err)); } finally { setBusy(null); }
  };

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: 1280, margin: "0 auto" }}>

      {/* Modal */}
      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modal.kind === "review" ? "Review refund" : modal.kind === "record" ? "Record external transfer" : modal.kind === "void" ? "Review incorrect transfer evidence" : "Verify external settlement"}
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", padding: "1rem" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div ref={modalRef} style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, padding: "1.5rem", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            {busy && <p role="status">Saving. Please wait.</p>}
            {modal.kind === "review" && (
              <>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 0.3rem" }}>
                  {modal.status === "approved" ? "Approve refund" : "Reject refund"}
                </h2>
                <p style={{ fontSize: "0.82rem", color: TEXT_COLORS.muted, margin: "0 0 1rem" }}>
                  {modal.item.student?.name} — {modal.item.reason.replaceAll("_", " ")}
                </p>
                <label style={lbl}>
                  Decision note (minimum 8 characters)
                  <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3} maxLength={500}
                    style={{ ...inp, resize: "vertical" }}
                    placeholder={modal.status === "approved" ? "Explain the approved refund decision…" : "Reason for rejection…"} />
                </label>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button type="button" onClick={() => setModal(null)} style={{ padding: "0.5rem 1rem", minHeight: 44, borderRadius: "0.4rem", border: `1px solid ${UI_COLORS.border}`, background: UI_COLORS.card, color: TEXT_COLORS.secondary, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                  <button type="button" disabled={!!busy || reviewNote.trim().length < 8} onClick={() => void submitReview()}
                    style={{ padding: "0.5rem 1.1rem", minHeight: 44, borderRadius: "0.4rem", border: "none", backgroundColor: modal.status === "approved" ? STATUS_COLORS.success.color : STATUS_COLORS.danger.color, color: "white", fontWeight: 700, cursor: reviewNote.trim().length < 8 ? "not-allowed" : "pointer", opacity: reviewNote.trim().length < 8 ? 0.6 : 1 }}>
                    {modal.status === "approved" ? "Approve" : "Reject"}
                  </button>
                </div>
              </>
            )}

            {modal.kind === "record" && (
              <>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 0.3rem" }}>Record external transfer</h2>
                <p style={{ fontSize: "0.82rem", color: STATUS_COLORS.warning?.color ?? "#b45309", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "0.4rem", padding: "0.5rem 0.75rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
                  Confirm: funds have actually been transferred outside TUTORERA, with independent documentary evidence.
                </p>
                <label style={lbl}>External transfer method<input value={recordMethod} onChange={e => setRecordMethod(e.target.value)} style={inp} placeholder="bank, wallet, original payment provider…" /></label>
                <label style={lbl}>Unique external refund reference (≥8 chars)<input value={recordRef} onChange={e => setRecordRef(e.target.value)} style={inp} placeholder="Transaction reference…" /></label>
                <label style={lbl}>Bank/provider receipt or statement reference (≥8 chars)<input value={recordEvidence} onChange={e => setRecordEvidence(e.target.value)} style={inp} placeholder="Receipt or statement reference…" /></label>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button type="button" onClick={() => setModal(null)} style={{ padding: "0.5rem 1rem", minHeight: 44, borderRadius: "0.4rem", border: `1px solid ${UI_COLORS.border}`, background: UI_COLORS.card, color: TEXT_COLORS.secondary, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                  <button type="button"
                    disabled={!!busy || !recordMethod.trim() || recordRef.trim().length < 8 || recordEvidence.trim().length < 8}
                    onClick={() => void submitRecord()}
                    style={{ padding: "0.5rem 1.1rem", minHeight: 44, borderRadius: "0.4rem", border: "none", backgroundColor: UI_COLORS.accent, color: "white", fontWeight: 700, cursor: "pointer" }}>
                    Record transfer
                  </button>
                </div>
              </>
            )}

            {modal.kind === "verify" && (
              <>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 0.3rem" }}>Verify external settlement</h2>
                <p style={{ fontSize: "0.82rem", color: STATUS_COLORS.warning?.color ?? "#b45309", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "0.4rem", padding: "0.5rem 0.75rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
                  Confirm: you independently checked the bank/provider statement — not just the recorded receipt.
                </p>
                <label style={lbl}>Re-enter original external refund reference<input value={verifyRef} onChange={e => setVerifyRef(e.target.value)} style={inp} placeholder="Original transaction reference…" /></label>
                <label style={lbl}>Independent statement reference (≥8 chars)<input value={verifyEvidence} onChange={e => setVerifyEvidence(e.target.value)} style={inp} placeholder="Independent evidence reference…" /></label>
                <label style={lbl}>How you verified the settlement (≥12 chars)<textarea value={verifyNote} onChange={e => setVerifyNote(e.target.value)} rows={3} maxLength={500} style={{ ...inp, resize: "vertical" }} placeholder="Explain the independent verification…" /></label>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button type="button" onClick={() => setModal(null)} style={{ padding: "0.5rem 1rem", minHeight: 44, borderRadius: "0.4rem", border: `1px solid ${UI_COLORS.border}`, background: UI_COLORS.card, color: TEXT_COLORS.secondary, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                  <button type="button"
                    disabled={!!busy || verifyRef.trim().length < 8 || verifyEvidence.trim().length < 8 || verifyNote.trim().length < 12}
                    onClick={() => void submitVerify()}
                    style={{ padding: "0.5rem 1.1rem", minHeight: 44, borderRadius: "0.4rem", border: "none", backgroundColor: STATUS_COLORS.success.color, color: "white", fontWeight: 700, cursor: "pointer" }}>
                    Confirm verification
                  </button>
                </div>
              </>
            )}
            {modal.kind === "void" && (
              <>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 0.5rem" }}>Review incorrect transfer evidence</h2>
                <p style={{ color: TEXT_COLORS.secondary, lineHeight: 1.5 }}>A different finance reviewer must independently check the evidence. Voiding this submission does not reverse a transfer or release the payout hold.</p>
                <label style={lbl}>Original transfer reference<input value={verifyRef} onChange={e => setVerifyRef(e.target.value)} style={inp} /></label>
                <label style={lbl}>Independent evidence reference<input value={verifyEvidence} onChange={e => setVerifyEvidence(e.target.value)} style={inp} /></label>
                <label style={lbl}>Why this submission is incorrect (12–300 characters)<textarea value={verifyNote} onChange={e => setVerifyNote(e.target.value)} rows={3} maxLength={300} style={inp} /></label>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setModal(null)} style={{ padding: "0.5rem 1rem", minHeight: 44 }}>Cancel</button>
                  <button type="button" disabled={busy === modal.item._id || verifyRef.trim().length < 8 || verifyEvidence.trim().length < 8 || verifyNote.trim().length < 12} onClick={() => void submitVoid()} style={{ padding: "0.5rem 1rem", minHeight: 44 }}>Void submission</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
            <ArrowLeft size={14} aria-hidden="true" /> Control Tower
          </Link>
          <span style={{ color: UI_COLORS.border }}>/</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: STATUS_COLORS.danger.color }}>Refunds</span>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>Refund review and external settlement</h1>
        <p style={{ color: TEXT_COLORS.muted, fontSize: "0.85rem", margin: "0.2rem 0 0", maxWidth: 850 }}>
          Trust & Safety reviews eligibility; Finance records an externally executed transfer and a different reviewer confirms its settlement. TUTORERA does not automatically send refunds through Rapid Gateway.
        </p>
      </div>

      {/* Filter tabs */}
      <nav aria-label="Refund status" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {filters.map(status => (
          <button key={status} type="button" onClick={() => setFilter(status)}
            aria-pressed={filter === status}
            style={{ padding: "0.5rem 0.85rem", minHeight: 44, borderRadius: "0.4rem", border: `1px solid ${UI_COLORS.border}`, cursor: "pointer", fontWeight: 700, textTransform: "capitalize",
              color: filter === status ? "#fff" : TEXT_COLORS.body,
              background: filter === status ? UI_COLORS.accent : UI_COLORS.surface }}>
            {status}
          </button>
        ))}
        <button type="button" onClick={() => void load()} disabled={loading}
          style={{ padding: "0.5rem 0.85rem", minHeight: 44, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.4rem", cursor: "pointer", background: UI_COLORS.card, color: TEXT_COLORS.secondary, fontWeight: 700 }}>
          Refresh
        </button>
      </nav>

      {loading ? (
        <p role="status" style={{ color: TEXT_COLORS.muted }}>Loading refund requests…</p>
      ) : items.length === 0 ? (
        <p style={{ color: TEXT_COLORS.muted }}>No refund requests match this filter.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {items.map(item => (
            <section key={item._id} style={{ backgroundColor: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.75rem", padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "flex-start", gap: "0.65rem", marginBottom: "0.5rem" }}>
                <div>
                  <div style={{ color: UI_COLORS.accent, fontWeight: 800, fontSize: "0.9rem" }}>{item.student?.name || "Student"} — {item.reason.replaceAll("_", " ")}</div>
                  <div style={{ color: TEXT_COLORS.muted, fontSize: "0.8rem", overflowWrap: "anywhere" }}>REF-{item._id} · Booking {item.booking?._id || "not found"}</div>
                  <div style={{ color: TEXT_COLORS.secondary, fontSize: "0.85rem" }}>Tutor: {item.tutor?.name || "—"} · {new Date(item.createdAt).toLocaleDateString("en-PK")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ display: "block", color: TEXT_COLORS.body }}>{item.booking?.currency || "PKR"} {item.amount.toLocaleString()}</strong>
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase",
                    color: item.status === "processed" ? STATUS_COLORS.success.color : item.status === "rejected" ? STATUS_COLORS.danger.color : STATUS_COLORS.warning?.color ?? "#b45309" }}>
                    {item.status === "approved" ? "Approved — not settled" : item.status}
                  </span>
                </div>
              </div>
              {item.details && <p style={{ fontSize: "0.83rem", color: TEXT_COLORS.secondary, margin: "0 0 0.3rem" }}>{item.details}</p>}
              {item.adminNote && <p style={{ fontSize: "0.82rem", color: TEXT_COLORS.secondary, margin: "0 0 0.3rem" }}><strong>Decision:</strong> {item.adminNote}</p>}
              {item.settlementReference && <p style={{ fontSize: "0.82rem", color: TEXT_COLORS.secondary, overflowWrap: "anywhere", margin: "0 0 0.5rem" }}><strong>External reference:</strong> {item.settlementReference} · {item.settlementMethod || "—"}</p>}
              {item.voidedSettlements && item.voidedSettlements.length > 0 && <div style={{ color: TEXT_COLORS.secondary, fontSize: "0.82rem", marginBottom: "0.5rem" }}><strong>Voided evidence history</strong>{item.voidedSettlements.map((entry, index) => <p key={`${entry.reference || "reference"}-${index}`} style={{ overflowWrap: "anywhere", margin: "0.25rem 0" }}>{entry.reference || "Reference unavailable"}: {entry.reason || "Reason unavailable"}{entry.reviewedAt ? ` · ${new Date(entry.reviewedAt).toLocaleString()}` : ""}{entry.reviewedBy ? ` · Reviewer ${entry.reviewedBy}` : ""}</p>)}</div>}
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {item.status === "pending" && canApprove && (
                  <>
                    <button disabled={busy === item._id} onClick={() => openModal("review", item, "approved")}
                      style={{ padding: "0.5rem 0.9rem", minHeight: 44, backgroundColor: STATUS_COLORS.success.color, color: "white", border: 0, borderRadius: "0.45rem", cursor: "pointer", fontWeight: 700 }}>
                      Approve
                    </button>
                    <button disabled={busy === item._id} onClick={() => openModal("review", item, "rejected")}
                      style={{ padding: "0.5rem 0.9rem", minHeight: 44, backgroundColor: STATUS_COLORS.danger.color, color: "white", border: 0, borderRadius: "0.45rem", cursor: "pointer", fontWeight: 700 }}>
                      Reject
                    </button>
                  </>
                )}
                {item.status === "approved" && canSettle && !item.settlementReference && (
                  <button disabled={busy === item._id} onClick={() => openModal("record", item)}
                    style={{ padding: "0.5rem 0.9rem", minHeight: 44, backgroundColor: UI_COLORS.accent, color: "#fff", border: 0, borderRadius: "0.45rem", cursor: "pointer", fontWeight: 700 }}>
                    Record external transfer
                  </button>
                )}
                {item.status === "approved" && canSettle && item.settlementReference && (
                  <><button disabled={busy === item._id} onClick={() => openModal("verify", item)}
                    style={{ padding: "0.5rem 0.9rem", minHeight: 44, backgroundColor: STATUS_COLORS.success.color, color: "#fff", border: 0, borderRadius: "0.45rem", cursor: "pointer", fontWeight: 700 }}>
                    Independently verify settlement
                  </button><button type="button" disabled={busy === item._id} onClick={() => openModal("void", item)} style={{ padding: "0.5rem 0.9rem", minHeight: 44, background: UI_COLORS.surface, color: TEXT_COLORS.body, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.45rem", fontWeight: 700 }}>Review incorrect evidence</button></>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
