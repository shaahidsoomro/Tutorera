"use client";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, AlertCircle, XCircle, ArrowLeft } from "lucide-react";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import { displayAmount } from "@/lib/currency";

const C = UI_COLORS;
const PAYMENT_TRANSITIONS: Record<string, string[]> = {
  pending: ["received", "failed", "disputed"], received: ["confirmed", "failed", "disputed"],
  confirmed: ["partially_refunded", "refunded", "chargeback", "disputed"], failed: ["pending"],
  partially_refunded: ["refunded", "chargeback", "disputed"], disputed: ["confirmed", "refunded", "chargeback"],
  refunded: [], chargeback: [],
};

interface Booking {
  _id: string;
  student: { name: string; email: string; phone: string; };
  tutor: { name: string; email: string; phone: string; };
  amount: number;
  currency?: string;
  schedule: string;
  status: string;
  paymentStatus: string;
  payoutStatus: string;
  paymentNote: string;
  payoutNote: string;
  platformFee: number;
  tutorPayout: number;
  createdAt: string;
}

function PaymentsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"payments" | "payouts">("payments");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [updating, setUpdating] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [selectedStatus, setSelectedStatus] = useState<Record<string, string>>({});
  const canManagePayments = user?.adminRole === "super_admin" || user?.adminPermissions?.includes("*") || user?.adminPermissions?.includes("payment.manage");

  useEffect(() => {
    const s = searchParams.get("status");
    if (s) setStatusFilter(s);
  }, [searchParams]);

  useEffect(() => {
    api.get("/admin/bookings")
      .then(res => setBookings(res.data.bookings || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updatePayment = async (id: string, paymentStatus: string) => {
    setUpdating(id);
    try {
      await api.patch(`/admin/bookings/${id}/payment`, {
        paymentStatus,
        paymentNote: note[id] || "",
      });
      setBookings(prev => prev.map(b => b._id === id ? { ...b, paymentStatus } : b));
      setSelectedStatus(prev => { const next = { ...prev }; delete next[id]; return next; });
      showSuccess("Payment status updated.");
    } catch {
      showError("Update failed.");
    } finally {
      setUpdating(null);
    }
  };

  // Summary stats
  const formatTotals = (items: Booking[], amount: (booking: Booking) => number) => Object.entries(items.reduce((totals, booking) => {
    const currency = booking.currency || "USD";
    totals[currency] = (totals[currency] || 0) + amount(booking);
    return totals;
  }, {} as Record<string, number>)).map(([currency, value]) => displayAmount(value, currency)).join(" · ") || "—";
  const confirmedBookings = bookings.filter(b => b.paymentStatus === "confirmed");

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 700 }}>
          <ArrowLeft size={14} /> Control Tower
        </Link>
        <span style={{ color: UI_COLORS.border }}>/</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: STATUS_COLORS.purple.color }}>Finance</span>
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>Payment Management</h1>
        <p style={{ color: TEXT_COLORS.muted, fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
          Review recorded student payments. RapidPay checkout is available only for enabled market-and-currency combinations; payout settlement is managed separately.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: "Total Confirmed",  value: formatTotals(confirmedBookings, b => b.amount), icon: <CheckCircle size={20} color={STATUS_COLORS.success.color} />, bg: STATUS_COLORS.success.bg },
          { label: "Pending Payments", value: formatTotals(bookings.filter(b => b.paymentStatus === "pending"), b => b.amount), icon: <Clock size={20} color={STATUS_COLORS.warning.color} />, bg: STATUS_COLORS.warning.bg },
          { label: "Platform Revenue", value: formatTotals(confirmedBookings, b => b.platformFee || 0), icon: <AlertCircle size={20} color={C.accent} />, bg: UI_COLORS.accentLight },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: UI_COLORS.surface, borderRadius: '0.75rem', padding: '1.25rem', border: `1px solid ${UI_COLORS.border}`, display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: card.bg, borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {card.icon}
            </div>
            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: '800', color: C.primary }}>{card.value}</p>
              <p style={{ fontSize: '0.75rem', color: C.gray500 }}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fee info banner */}
      <div style={{ backgroundColor: STATUS_COLORS.success.bg, border: `1px solid ${STATUS_COLORS.success.border}`, borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: STATUS_COLORS.success.color }}>
        💡 <strong>Tutor fee: 20% plus 15% tax on that fee (23% effective tutor deduction).</strong> Students currently pay the agreed amount without a marketplace fee.
        Example: agreed PKR 1,000 → student pays PKR 1,000 → estimated tutor net PKR 770.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0', backgroundColor: UI_COLORS.surface, borderRadius: '0.75rem', padding: '0.3rem', border: `1px solid ${UI_COLORS.border}`, width: 'fit-content' }}>
          {(["payments", "payouts"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', textTransform: 'capitalize', backgroundColor: activeTab === tab ? C.accent : 'transparent', color: activeTab === tab ? 'white' : C.gray500 }}>
              {tab === "payments" ? "💳 Student Payments" : "💸 Tutor Payouts"}
            </button>
          ))}
        </div>

        {activeTab === "payments" && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {["all", "pending", "failed", "confirmed", "disputed", "refunded"].map(status => {
              const active = statusFilter === status;
              const count = status === "all" ? bookings.length : bookings.filter(b => b.paymentStatus === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: active ? 800 : 600,
                    border: active ? `1px solid ${UI_COLORS.accent}` : `1px solid ${UI_COLORS.border}`,
                    background: active ? UI_COLORS.accent : UI_COLORS.surface,
                    color: active ? UI_COLORS.surface : TEXT_COLORS.muted,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.gray500 }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💳</p>
          <p style={{ fontWeight: '600', color: C.primary }}>No bookings yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookings.filter(b => activeTab !== "payments" || statusFilter === "all" || b.paymentStatus === statusFilter).map(booking => {
            const platformFee = booking.platformFee || 0;
            const tutorPayout = booking.tutorPayout || 0;
            const curr = booking.currency || "USD";
            return (
              <div key={booking._id} style={{ backgroundColor: UI_COLORS.surface, borderRadius: '0.75rem', padding: '1.5rem', border: `1px solid ${UI_COLORS.border}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

                  {/* Person Info */}
                  <div>
                    {activeTab === "payments" ? (
                      <>
                        <p style={{ fontSize: '0.75rem', color: TEXT_COLORS.muted, marginBottom: '0.3rem' }}>Student</p>
                        <p style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem' }}>{booking.student?.name}</p>
                        <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{booking.student?.email}</p>
                        <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{booking.student?.phone}</p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: '0.75rem', color: TEXT_COLORS.muted, marginBottom: '0.3rem' }}>Tutor</p>
                        <p style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem' }}>{booking.tutor?.name}</p>
                        <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{booking.tutor?.email}</p>
                        <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{booking.tutor?.phone}</p>
                      </>
                    )}
                    <p style={{ color: TEXT_COLORS.muted, fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      Booked: {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Amount Breakdown */}
                  <div style={{ backgroundColor: C.gray50, borderRadius: '0.625rem', padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: TEXT_COLORS.muted, marginBottom: '0.5rem' }}>
                      {activeTab === "payments" ? "Amount to Receive from Student" : "Amount to Pay Tutor"}
                    </p>
                    <p style={{ fontSize: '1.3rem', fontWeight: '800', color: C.primary }}>
                      {curr} {activeTab === "payments"
                        ? booking.amount?.toLocaleString()
                        : tutorPayout.toLocaleString()}
                    </p>
                    {activeTab === "payments" ? (
                      <p style={{ fontSize: '0.75rem', color: C.gray500, marginTop: '0.25rem' }}>
                        Stored fee snapshot: {curr} {platformFee.toLocaleString()}
                      </p>
                    ) : (
                      <p style={{ fontSize: '0.75rem', color: C.gray500, marginTop: '0.25rem' }}>
                        Total booking: {curr} {booking.amount?.toLocaleString()} · Fee: {curr} {platformFee.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Status + Actions */}
                  <div>
                    <p style={{ fontSize: '0.75rem', color: TEXT_COLORS.muted, marginBottom: '0.5rem' }}>
                      {activeTab === "payments" ? "Payment Status" : "Payout Status"}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeTab === "payments" ? (
                        <>
                          <select
                            title="Payment status"
                            value={selectedStatus[booking._id] || booking.paymentStatus}
                            disabled={!canManagePayments}
                            onChange={e => {
                              const nextStatus = e.target.value;
                              const allowed = PAYMENT_TRANSITIONS[booking.paymentStatus] || [];
                              if (nextStatus !== booking.paymentStatus && !allowed.includes(nextStatus)) return;
                              setSelectedStatus(prev => ({ ...prev, [booking._id]: nextStatus }));
                            }}
                            style={{ padding: '0.5rem', border: `1px solid ${UI_COLORS.border}`, borderRadius: '0.4rem', fontSize: '0.8rem', outline: 'none', backgroundColor: UI_COLORS.surface }}>
                            <option value="pending" disabled={booking.paymentStatus !== "pending" && !(PAYMENT_TRANSITIONS[booking.paymentStatus] || []).includes("pending")}>Pending</option>
                            <option value="received" disabled={booking.paymentStatus !== "received" && !(PAYMENT_TRANSITIONS[booking.paymentStatus] || []).includes("received")}>Received (Unconfirmed)</option>
                            <option value="confirmed" disabled={booking.paymentStatus !== "confirmed" && !(PAYMENT_TRANSITIONS[booking.paymentStatus] || []).includes("confirmed")}>Confirmed ✅</option>
                            <option value="refunded" disabled={booking.paymentStatus !== "refunded" && !(PAYMENT_TRANSITIONS[booking.paymentStatus] || []).includes("refunded")}>Refunded</option>
                            {(PAYMENT_TRANSITIONS[booking.paymentStatus] || [])
                              .filter(status => !["pending", "received", "confirmed", "refunded"].includes(status))
                              .map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                          </select>
                          <input
                            value={note[booking._id] || ""}
                            disabled={!canManagePayments}
                            onChange={e => setNote(prev => ({ ...prev, [booking._id]: e.target.value }))}
                            placeholder="Required change reason (8+ characters)"
                            style={{ padding: '0.5rem', border: `1px solid ${UI_COLORS.border}`, borderRadius: '0.4rem', fontSize: '0.8rem', outline: 'none' }} />
                          <button
                            type="button"
                            onClick={() => updatePayment(booking._id, selectedStatus[booking._id] || booking.paymentStatus)}
                            disabled={updating === booking._id || !canManagePayments || !selectedStatus[booking._id] || (note[booking._id] || "").trim().length < 8}
                            style={{ padding: '0.5rem', backgroundColor: updating === booking._id ? UI_COLORS.accentBright : C.accent, color: UI_COLORS.surface, border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
                            {updating === booking._id ? "Saving..." : "Update Payment"}
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: booking.payoutStatus === 'paid' ? STATUS_COLORS.success.bg : STATUS_COLORS.warning.bg, color: booking.payoutStatus === 'paid' ? STATUS_COLORS.success.color : STATUS_COLORS.warning.color, width: 'fit-content' }}>
                            {booking.payoutStatus === 'paid' ? <CheckCircle size={13} /> : <Clock size={13} />}
                            {booking.payoutStatus === 'paid' ? 'Paid Out' : 'Payout Pending'}
                          </div>
                          {booking.payoutStatus !== 'paid' && booking.paymentStatus === 'confirmed' && (
                            <Link
                              href="/admin/payouts"
                              style={{ padding: '0.5rem', backgroundColor: STATUS_COLORS.success.color, color: UI_COLORS.surface, borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: '600', textAlign: 'center', textDecoration: 'none' }}>
                              Open payout operations
                            </Link>
                          )}
                          {booking.paymentStatus !== 'confirmed' && (
                            <p style={{ fontSize: '0.75rem', color: TEXT_COLORS.muted }}>⚠️ Confirm student payment first</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading Payments...</div>}>
      <PaymentsContent />
    </Suspense>
  );
}
