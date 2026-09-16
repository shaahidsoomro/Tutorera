"use client";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { showError,showSuccess } from "@/lib/toast";
import { AlertCircle,CheckCircle,Clock } from "lucide-react";
import { useEffect,useState } from "react";

const C = UI_COLORS;

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

export default function PaymentsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"payments" | "payouts">("payments");
  const [updating, setUpdating] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const canManagePayments = user?.adminRole === "super_admin" || user?.adminRole === "finance" || user?.adminPermissions?.includes("*") || user?.adminPermissions?.includes("payment.manage");

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
      showSuccess("Payment status updated.");
    } catch {
      showError("Update failed.");
    } finally {
      setUpdating(null);
    }
  };

  // Summary stats
  const confirmedBookings = bookings.filter(b => b.paymentStatus === "confirmed");
  const totalReceived     = confirmedBookings.reduce((sum, b) => sum + b.amount, 0);
  const totalPending      = bookings.filter(b => b.paymentStatus === "pending").reduce((sum, b) => sum + b.amount, 0);
  const totalPlatformFees = confirmedBookings.reduce((sum, booking) => sum + (booking.platformFee || 0), 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '100%', overflowX: 'hidden' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Payment Management</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>
          Track student payments and tutor payouts. Payments are processed automatically via Rapid Gateway.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: "Total Confirmed",  value: `PKR ${totalReceived.toLocaleString()}`,     icon: <CheckCircle size={20} color="#16a34a" />, bg: '#f0fdf4' },
          { label: "Pending Payments", value: `PKR ${totalPending.toLocaleString()}`,       icon: <Clock size={20} color="#d97706" />,        bg: '#fffbeb' },
          { label: "Platform Revenue", value: `PKR ${totalPlatformFees.toLocaleString()}`,  icon: <AlertCircle size={20} color={C.accent} />, bg: '#EEF5FF' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.25rem', border: '1px solid #e5e7eb', display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#166534' }}>
        💡 <strong>Tutor fee: 20% plus 15% tax on that fee (23% effective tutor deduction).</strong> Students currently pay the agreed amount without a marketplace fee.
        Example: agreed PKR 1,000 → student pays PKR 1,000 → estimated tutor net PKR 770.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', backgroundColor: 'white', borderRadius: '0.75rem', padding: '0.3rem', marginBottom: '1.5rem', border: '1px solid #e5e7eb', width: 'fit-content' }}>
        {(["payments", "payouts"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', textTransform: 'capitalize', backgroundColor: activeTab === tab ? C.accent : 'transparent', color: activeTab === tab ? 'white' : C.gray500 }}>
            {tab === "payments" ? "💳 Student Payments" : "💸 Tutor Payouts"}
          </button>
        ))}
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
          {bookings.map(booking => {
            const platformFee = booking.platformFee || 0;
            const tutorPayout = booking.tutorPayout || 0;
            const curr = booking.currency || "PKR";
            return (
              <div key={booking._id} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

                  {/* Person Info */}
                  <div>
                    {activeTab === "payments" ? (
                      <>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.3rem' }}>Student</p>
                        <p style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem' }}>{booking.student?.name}</p>
                        <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{booking.student?.email}</p>
                        <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{booking.student?.phone}</p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.3rem' }}>Tutor</p>
                        <p style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem' }}>{booking.tutor?.name}</p>
                        <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{booking.tutor?.email}</p>
                        <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{booking.tutor?.phone}</p>
                      </>
                    )}
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      Booked: {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Amount Breakdown */}
                  <div style={{ backgroundColor: C.gray50, borderRadius: '0.625rem', padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
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
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                      {activeTab === "payments" ? "Payment Status" : "Payout Status"}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeTab === "payments" ? (
                        <>
                          <select
                            title="Payment status"
                            value={booking.paymentStatus}
                            disabled={!canManagePayments}
                            onChange={e => setBookings(prev => prev.map(b => b._id === booking._id ? { ...b, paymentStatus: e.target.value } : b))}
                            style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.4rem', fontSize: '0.8rem', outline: 'none', backgroundColor: 'white' }}>
                            <option value="pending">Pending</option>
                            <option value="received">Received (Unconfirmed)</option>
                            <option value="confirmed">Confirmed ✅</option>
                            <option value="refunded">Refunded</option>
                          </select>
                          <input
                            value={note[booking._id] || ""}
                            disabled={!canManagePayments}
                            onChange={e => setNote(prev => ({ ...prev, [booking._id]: e.target.value }))}
                            placeholder="Required change reason (8+ characters)"
                            style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.4rem', fontSize: '0.8rem', outline: 'none' }} />
                          <button
                            type="button"
                            onClick={() => updatePayment(booking._id, booking.paymentStatus)}
                            disabled={updating === booking._id || !canManagePayments || (note[booking._id] || "").trim().length < 8}
                            style={{ padding: '0.5rem', backgroundColor: updating === booking._id ? '#93c5fd' : C.accent, color: 'white', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
                            {updating === booking._id ? "Saving..." : "Update Payment"}
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: booking.payoutStatus === 'paid' ? '#f0fdf4' : '#fffbeb', color: booking.payoutStatus === 'paid' ? '#16a34a' : '#d97706', width: 'fit-content' }}>
                            {booking.payoutStatus === 'paid' ? <CheckCircle size={13} /> : <Clock size={13} />}
                            {booking.payoutStatus === 'paid' ? 'Paid Out' : 'Payout Pending'}
                          </div>
                          {booking.payoutStatus !== 'paid' && booking.paymentStatus === 'confirmed' && (
                            <button
                              onClick={async () => {
                                setUpdating(booking._id);
                                try {
                                  await api.patch(`/admin/bookings/${booking._id}/payment`, {
                                    payoutStatus: 'paid',
                                    payoutNote: `Paid ${curr} ${tutorPayout.toLocaleString()} to tutor on ${new Date().toLocaleDateString()}`,
                                  });
                                  setBookings(prev => prev.map(b => b._id === booking._id ? { ...b, payoutStatus: 'paid' } : b));
                                  showSuccess("Payout status updated.");
                                } catch {
                                  showError("Failed to update payout status.");
                                } finally {
                                  setUpdating(null);
                                }
                              }}
                              disabled={updating === booking._id}
                              style={{ padding: '0.5rem', backgroundColor: updating === booking._id ? '#86efac' : '#16a34a', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: updating === booking._id ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
                              {updating === booking._id ? "Saving..." : "Mark as Paid Out"}
                            </button>
                          )}
                          {booking.paymentStatus !== 'confirmed' && (
                            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>⚠️ Confirm student payment first</p>
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
