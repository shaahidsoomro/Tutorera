"use client";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useAppGuard } from "@/hooks/useAppGuard";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { BookOpen, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

const C = UI_COLORS;

type BookingStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

interface Booking {
  _id: string;
  subject: string;
  studentName?: string;
  tutorName?: string;
  status: BookingStatus;
  amount: number;
  currency?: string;
  createdAt: string;
  scheduledAt?: string;
}

const STATUS_STYLES: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  upcoming:  { bg: "#EEF5FF", color: "#0329b2", label: "Upcoming" },
  ongoing:   { bg: "#f0fdf4", color: "#16a34a", label: "Ongoing" },
  completed: { bg: "#f5f3ff", color: "#7c3aed", label: "Completed" },
  cancelled: { bg: "#fff1f2", color: "#be123c", label: "Cancelled" },
};

const TABS: { key: "all" | BookingStatus; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "upcoming",  label: "Upcoming" },
  { key: "ongoing",   label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function BookingsPage() {
  useAppGuard();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | BookingStatus>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  useEffect(() => {
    api.get("/bookings")
      .then(res => setBookings(res.data.bookings ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === "all" ? bookings : bookings.filter(b => b.status === tab);

  async function bookAgain(id: string) {
    setBusy(id);
    try {
      await api.post(`/bookings/${id}/book-again`);
      setMessage({ id, text: "Booking request sent! Check your requests.", ok: true });
    } catch {
      setMessage({ id, text: "Could not re-book. Please try again.", ok: false });
    } finally { setBusy(null); }
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    setBusy(id);
    try {
      const res = await api.patch(`/bookings/${id}/status`, { status: "cancelled" });
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: "cancelled" } : b));
      setMessage({ id, text: res.data.message ?? "Booking cancelled.", ok: true });
    } catch {
      setMessage({ id, text: "Could not cancel. Please try again.", ok: false });
    } finally { setBusy(null); }
  }

  async function submitRefund(id: string) {
    if (!refundReason.trim()) return;
    setBusy(id);
    try {
      await api.post(`/bookings/${id}/refund-request`, { reason: refundReason });
      setRefundId(null);
      setRefundReason("");
      setMessage({ id, text: "Refund request submitted. Our team will review it shortly.", ok: true });
    } catch {
      setMessage({ id, text: "Could not submit refund request. Please try again.", ok: false });
    } finally { setBusy(null); }
  }

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: C.primary, margin: "0 0 1.75rem" }}>My Bookings</h1>

        {/* Tabs */}
        <div role="tablist" aria-label="Filter bookings by status" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {TABS.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "0.45rem 1rem", borderRadius: 999, border: "1.5px solid",
                borderColor: tab === t.key ? C.accent : "#dce5f4",
                background: tab === t.key ? C.accent : "white",
                color: tab === t.key ? "white" : C.primary,
                fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                minHeight: 44,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div role="status" aria-label="Loading bookings" style={{ textAlign: "center", padding: "4rem", color: "#888" }}>Loading bookings…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", background: "white", borderRadius: "1rem", border: "1px solid #dce5f4" }}>
            <BookOpen size={40} color="#bcc8e4" style={{ marginBottom: "1rem" }} />
            <p style={{ color: "#425575", fontSize: "1rem", fontWeight: 600 }}>No {tab === "all" ? "" : tab} bookings found.</p>
            <p style={{ color: "#8899bb", fontSize: "0.875rem", marginTop: "0.4rem" }}>Post a tuition request to get started.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filtered.map(b => {
              const st = STATUS_STYLES[b.status] ?? STATUS_STYLES.upcoming;
              const isBusy = busy === b._id;
              const msg = message?.id === b._id ? message : null;
              return (
                <div key={b._id} style={{ background: "white", border: "1px solid #dce5f4", borderRadius: "1rem", padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                        <span style={{ padding: "0.2rem 0.7rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                        <span style={{ fontWeight: 800, fontSize: "1rem", color: C.primary }}>{b.subject}</span>
                      </div>
                      {b.studentName && <p style={{ margin: "0 0 2px", fontSize: "0.85rem", color: "#425575" }}>Student: <strong>{b.studentName}</strong></p>}
                      {b.tutorName   && <p style={{ margin: "0 0 2px", fontSize: "0.85rem", color: "#425575" }}>Tutor: <strong>{b.tutorName}</strong></p>}
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#8899bb" }}>
                        Booked {new Date(b.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                        {b.scheduledAt && ` · Session ${new Date(b.scheduledAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}`}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 800, fontSize: "1.1rem", color: C.primary, margin: "0 0 0.75rem" }}>
                        {b.currency ?? "PKR"} {b.amount?.toLocaleString() ?? "—"}
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {b.status === "completed" && (
                          <>
                            <button
                              onClick={() => bookAgain(b._id)}
                              disabled={isBusy}
                              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", borderRadius: 8, border: `1.5px solid ${C.accent}`, background: "white", color: C.accent, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", minHeight: 44 }}
                            >
                              <RefreshCw size={14} /> {isBusy ? "…" : "Book Again"}
                            </button>
                            {refundId !== b._id && (
                              <button
                                onClick={() => { setRefundId(b._id); setRefundReason(""); }}
                                style={{ padding: "0.45rem 0.9rem", borderRadius: 8, border: "1.5px solid #be123c", background: "white", color: "#be123c", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", minHeight: 44 }}
                              >
                                Request Refund
                              </button>
                            )}
                          </>
                        )}
                        {(b.status === "upcoming" || b.status === "ongoing") && (
                          <button
                            onClick={() => cancelBooking(b._id)}
                            disabled={isBusy}
                            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", borderRadius: 8, border: "1.5px solid #be123c", background: "white", color: "#be123c", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", minHeight: 44 }}
                          >
                            <XCircle size={14} /> {isBusy ? "…" : "Cancel"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Refund form */}
                  {refundId === b._id && (
                    <div style={{ marginTop: "1rem", padding: "1rem", background: "#fff1f2", borderRadius: "0.75rem", border: "1px solid #fecdd3" }}>
                      <label htmlFor={`refund-reason-${b._id}`} style={{ display: "block", fontWeight: 700, color: "#be123c", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Refund request reason</label>
                      <textarea
                        id={`refund-reason-${b._id}`}
                        value={refundReason}
                        onChange={e => setRefundReason(e.target.value)}
                        placeholder="Please describe why you are requesting a refund…"
                        rows={3}
                        style={{ width: "100%", borderRadius: "0.5rem", border: "1px solid #fecdd3", padding: "0.6rem", fontSize: "0.875rem", resize: "vertical", boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                        <button
                          onClick={() => submitRefund(b._id)}
                          disabled={isBusy || !refundReason.trim()}
                          style={{ padding: "0.55rem 1.25rem", borderRadius: 8, background: "#be123c", color: "white", fontWeight: 700, fontSize: "0.85rem", border: "none", cursor: "pointer", minHeight: 44 }}
                        >
                          {isBusy ? "Submitting…" : "Submit Request"}
                        </button>
                        <button
                          onClick={() => setRefundId(null)}
                          style={{ padding: "0.55rem 1rem", borderRadius: 8, background: "white", color: "#425575", border: "1px solid #dce5f4", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", minHeight: 44 }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline feedback */}
                  {msg && (
                    <p role="status" style={{ marginTop: "0.75rem", padding: "0.5rem 0.875rem", borderRadius: "0.5rem", fontSize: "0.825rem", fontWeight: 600, background: msg.ok ? "#f0fdf4" : "#fff1f2", color: msg.ok ? "#16a34a" : "#be123c", border: `1px solid ${msg.ok ? "#bbf7d0" : "#fecdd3"}` }}>
                      {msg.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
