"use client";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { TOTAL_FEE_PERCENT } from "@/lib/site";
import { showError } from "@/lib/toast";
import { useEffect,useState } from "react";

const C = UI_COLORS;

interface Booking {
  _id: string;
  student: { name: string; email: string; phone: string; };
  tutor: { name: string; email: string; phone: string; };
  amount: number;
  platformFee: number;
  tutorPayout: number;
  schedule: string;
  teachingMode: string;
  status: string;
  paymentStatus: string;
  payoutStatus: string;
  createdAt: string;
}

const PLATFORM_FEE_PERCENT = TOTAL_FEE_PERCENT;

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    const url = filter === "all" ? "/admin/bookings" : `/admin/bookings?status=${filter}`;
    api.get(url)
      .then(res => setBookings(res.data.bookings))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const calculateFees = (amount: number) => {
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT / 100);
    const tutorPayout = amount - platformFee;
    return { platformFee, tutorPayout };
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    upcoming: { bg: '#EEF5FF', color: '#0329B2' },
    ongoing: { bg: '#fffbeb', color: '#d97706' },
    completed: { bg: '#f0fdf4', color: '#16a34a' },
    cancelled: { bg: '#fef2f2', color: '#ef4444' },
  };

  const paymentColors: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fffbeb', color: '#d97706' },
    received: { bg: '#EEF5FF', color: '#0329B2' },
    confirmed: { bg: '#f0fdf4', color: '#16a34a' },
    refunded: { bg: '#fef2f2', color: '#ef4444' },
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
  setUpdatingStatus(bookingId);
  try {
    await api.patch(`/admin/bookings/${bookingId}/status`, { status: newStatus });
    setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
  } catch {
    showError("Failed to update status.");
  } finally {
    setUpdatingStatus(null);
  }
};

  return (
    <div style={{ padding: '2rem', maxWidth: '100%', overflowX: 'hidden' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Bookings</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>Manage all platform bookings and sessions.</p>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {["all", "upcoming", "ongoing", "completed", "cancelled"].map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: filter === tab ? 'none' : '1px solid #e5e7eb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', textTransform: 'capitalize', backgroundColor: filter === tab ? C.primary : 'white', color: filter === tab ? 'white' : C.gray500 }}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <p style={{ color: C.gray500 }}>No bookings found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookings.map(booking => {
            const { platformFee, tutorPayout } = calculateFees(booking.amount);
            return (
              <div key={booking._id} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'start' }}>

                  {/* Student + Tutor */}
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>Student → Tutor</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: C.primary }}>{booking.student?.name}</p>
                    <p style={{ fontSize: '0.8rem', color: C.gray500 }}>{booking.student?.email}</p>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0' }}>↓</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: C.primary }}>{booking.tutor?.name}</p>
                    <p style={{ fontSize: '0.8rem', color: C.gray500 }}>{booking.tutor?.email}</p>
                  </div>

                  {/* Financials */}
                  <div style={{ backgroundColor: C.gray50, borderRadius: '0.5rem', padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>Financials</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', color: C.gray500 }}>Total Amount</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: C.primary }}>Rs. {booking.amount?.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', color: C.gray500 }}>Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#d97706' }}>Rs. {platformFee.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '0.35rem' }}>
                        <span style={{ fontSize: '0.8rem', color: C.gray500 }}>Tutor Payout</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#16a34a' }}>Rs. {tutorPayout.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>Status</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.3rem' }}>Booking</p>
                        <select
                          title="status"
                          value={booking.status}
                          onChange={e => handleStatusChange(booking._id, e.target.value)}
                          disabled={updatingStatus === booking._id}
                          style={{
                            padding: '0.35rem 0.6rem',
                            borderRadius: '0.4rem',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: updatingStatus === booking._id ? 'not-allowed' : 'pointer',
                            backgroundColor: statusColors[booking.status]?.bg,
                            color: statusColors[booking.status]?.color,
                            textTransform: 'capitalize',
                            outline: 'none',
                          }}>
                          <option value="upcoming">Upcoming</option>
                          <option value="ongoing">Ongoing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.2rem' }}>Payment</p>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: paymentColors[booking.paymentStatus]?.bg, color: paymentColors[booking.paymentStatus]?.color, textTransform: 'capitalize' }}>
                          {booking.paymentStatus}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
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
