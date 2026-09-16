"use client";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import Link from "next/link";
import { useEffect,useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,YAxis,
} from "recharts";

const C = UI_COLORS;

interface Overview {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalBookings: number;
  revenueThisMonth: number;
  platformFeeThisMonth: number;
  pendingPayouts: number;
}

interface SignupPoint {
  week: string;
  label: string;
  count: number;
}

interface BookingStatus {
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
}

interface TopTutor {
  name: string;
  count: number;
  revenue: number;
}

interface RecentPayment {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  student: { name: string };
  tutor: { name: string };
}

interface AnalyticsData {
  overview: Overview;
  signupTrend: SignupPoint[];
  bookingStatusBreakdown: BookingStatus;
  topTutors: TopTutor[];
  recentPayments: RecentPayment[];
}

// Custom tooltip matching Quizzera dark style
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: '#021550',
      borderRadius: '0.5rem',
      padding: '0.6rem 0.875rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    }}>
      <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0 0 0.2rem' }}>{label}</p>
      <p style={{ color: 'white', fontSize: '0.875rem', fontWeight: '700', margin: 0 }}>
        users : {payload[0].value}
      </p>
    </div>
  );
}

const bookingStatusConfig: {
  key: keyof BookingStatus; label: string; color: string; bg: string;
}[] = [
  { key: 'upcoming',  label: 'Upcoming',  color: '#0329B2', bg: '#EEF5FF' },
  { key: 'ongoing',   label: 'Ongoing',   color: '#9333ea', bg: '#fdf4ff' },
  { key: 'completed', label: 'Completed', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444', bg: '#fef2f2' },
];

export default function AnalyticsPage() {
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/analytics")
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const ov = data?.overview;

  // Map signupTrend to "Week 1" ... "Week 8" labels matching Quizzera
  const chartData = (data?.signupTrend ?? []).map((d, i) => ({
    name:  `Week ${i + 1}`,
    users: d.count,
  }));

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Analytics</h1>
          <p style={{ color: C.gray500, fontSize: '0.875rem' }}>Platform-wide metrics and growth.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Analytics</h1>
          <p style={{ color: C.gray500, fontSize: '0.875rem' }}>Platform-wide metrics and growth.</p>
        </div>
        <Link href="/admin" style={{ padding: '0.6rem 1.25rem', backgroundColor: C.gray50, color: C.primary, border: '1px solid #e5e7eb', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: '600', fontSize: '0.8rem' }}>
          ← Dashboard
        </Link>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Users',         value: ov?.totalUsers,           sub: `+${ov?.newUsersThisMonth ?? 0} this month`,  color: '#0329B2', bg: '#EEF5FF', border: '#bfdbfe' },
          { label: 'New This Week',        value: ov?.newUsersThisWeek,     sub: 'registered users',                           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Total Bookings',       value: ov?.totalBookings,        sub: 'all time',                                   color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
          { label: 'Revenue This Month',   value: `Rs. ${(ov?.revenueThisMonth ?? 0).toLocaleString()}`,  sub: 'confirmed payments', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { label: 'Platform Fee MTD',     value: `Rs. ${(ov?.platformFeeThisMonth ?? 0).toLocaleString()}`, sub: '20% + 3% GST',  color: '#0329B2', bg: '#EEF5FF', border: '#bfdbfe' },
          { label: 'Pending Payouts',      value: `Rs. ${(ov?.pendingPayouts ?? 0).toLocaleString()}`,    sub: 'owed to tutors',      color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.25rem', border: '1px solid #e5e7eb', borderTop: `3px solid ${card.color}` }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: card.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{card.label}</p>
            <p style={{ fontSize: '1.35rem', fontWeight: '800', color: C.primary, marginBottom: '0.2rem' }}>{card.value ?? 0}</p>
            <p style={{ fontSize: '0.72rem', color: C.gray500 }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }} className="analytics-chart-row">

        {/* Signup Trend — recharts AreaChart */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
            User Signup Trend
          </h3>
          <p style={{ color: C.gray500, fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            Weekly registrations (last 8 weeks)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0329B2" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0329B2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: '#0329B2', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#0329B2"
                strokeWidth={2.5}
                fill="url(#signupGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#0329B2', strokeWidth: 2, stroke: 'white' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── Booking Status Breakdown ── */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
          Booking Status Breakdown
        </h3>
        <p style={{ color: C.gray500, fontSize: '0.8rem', marginBottom: '1.25rem' }}>All-time booking counts by status</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
          {bookingStatusConfig.map(s => {
            const count = data?.bookingStatusBreakdown[s.key] ?? 0;
            const total = Object.values(data?.bookingStatusBreakdown ?? {}).reduce((a, b) => a + b, 0) || 1;
            const pct   = Math.round((count / total) * 100);
            return (
              <div key={s.key} style={{ backgroundColor: s.bg, borderRadius: '0.75rem', padding: '1.1rem', textAlign: 'center', border: `1px solid ${s.color}22` }}>
                <p style={{ fontSize: '1.6rem', fontWeight: '800', color: s.color, marginBottom: '0.2rem' }}>{count}</p>
                <p style={{ fontSize: '0.78rem', fontWeight: '600', color: s.color, textTransform: 'capitalize', marginBottom: '0.25rem' }}>{s.label}</p>
                <p style={{ fontSize: '0.7rem', color: C.gray500 }}>{pct}% of total</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="analytics-bottom-row">

        {/* Top Tutors */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '0.1rem' }}>Top Tutors</h3>
              <p style={{ color: C.gray500, fontSize: '0.78rem' }}>By number of bookings</p>
            </div>
            <Link href="/admin/bookings" style={{ fontSize: '0.75rem', color: C.accent, fontWeight: '600', textDecoration: 'none' }}>View all →</Link>
          </div>
          {(data?.topTutors ?? []).length === 0 ? (
            <p style={{ color: C.gray500, fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No bookings yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {(data?.topTutors ?? []).map((tutor, i) => (
                <div key={`${tutor.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#d97706' : C.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: i < 3 ? 'white' : C.gray500, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tutor.name}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: C.gray500, margin: 0 }}>
                      Rs. {tutor.revenue.toLocaleString()} earned
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: C.accent, backgroundColor: '#EEF5FF', padding: '0.2rem 0.6rem', borderRadius: '999px', flexShrink: 0 }}>
                    {tutor.count} {tutor.count === 1 ? 'booking' : 'bookings'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '0.1rem' }}>Recent Payments</h3>
              <p style={{ color: C.gray500, fontSize: '0.78rem' }}>Latest confirmed bookings</p>
            </div>
            <Link href="/admin/payments" style={{ fontSize: '0.75rem', color: C.accent, fontWeight: '600', textDecoration: 'none' }}>View all →</Link>
          </div>
          {(data?.recentPayments ?? []).length === 0 ? (
            <p style={{ color: C.gray500, fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No confirmed payments yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(data?.recentPayments ?? []).map((payment, idx) => (
                <div key={payment._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: idx < (data?.recentPayments.length ?? 0) - 1 ? '1px solid #f3f4f6' : 'none', gap: '0.5rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: '600', color: C.primary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {payment.student?.name} → {payment.tutor?.name}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: C.gray500, margin: 0 }}>
                      {new Date(payment.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: '800', color: '#16a34a', flexShrink: 0 }}>
                    Rs. {(payment.amount || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .analytics-chart-row  { grid-template-columns: 1fr !important; }
          .analytics-bottom-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
