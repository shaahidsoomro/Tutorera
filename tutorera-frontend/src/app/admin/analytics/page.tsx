"use client";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { showError } from "@/lib/toast";
import { ArrowLeft } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const C = UI_COLORS;

interface Overview {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalBookings: number;
  financialByCurrency: Record<string, { revenueThisMonth: number; platformFeeThisMonth: number; pendingPayouts: number; missingAmounts: number }>;
  missingCurrencyRecords: number;
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
}

interface RecentPayment {
  _id: string;
  studentTotal?: number;
  currency?: string;
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
      backgroundColor: C.primary,
      borderRadius: '0.5rem',
      padding: '0.6rem 0.875rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    }}>
      <p style={{ color: C.gray500, fontSize: '0.75rem', margin: '0 0 0.2rem' }}>{label}</p>
      <p style={{ color: 'white', fontSize: '0.875rem', fontWeight: '700', margin: 0 }}>
        users : {payload[0].value}
      </p>
    </div>
  );
}

const bookingStatusConfig: {
  key: keyof BookingStatus; label: string; color: string; bg: string;
}[] = [
  { key: 'upcoming',  label: 'Upcoming',  color: C.accent, bg: C.accentLight },
  { key: 'ongoing',   label: 'Ongoing',   color: STATUS_COLORS.purple.color, bg: STATUS_COLORS.purple.bg },
  { key: 'completed', label: 'Completed', color: C.success, bg: STATUS_COLORS.success.bg },
  { key: 'cancelled', label: 'Cancelled', color: C.error, bg: STATUS_COLORS.danger.bg },
];

export default function AnalyticsPage() {
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/analytics")
      .then(res => setData(res.data))
      .catch(err => { console.error(err); showError("Failed to load analytics."); })
      .finally(() => setLoading(false));
  }, []);

  const ov = data?.overview;
  const financialTotals = (key: "revenueThisMonth" | "platformFeeThisMonth" | "pendingPayouts") => {
    const entries = Object.entries(ov?.financialByCurrency || {});
    return entries.length ? entries.map(([currency, values]) => `${currency} ${values[key].toLocaleString(undefined, { maximumFractionDigits: 2 })}`).join(" · ") : "No recorded amounts";
  };

  // Map signupTrend to "Week 1" ... "Week 8" labels matching Quizzera
  const chartData = (data?.signupTrend ?? []).map((d, i) => ({
    name:  `Week ${i + 1}`,
    users: d.count,
  }));

  if (loading) {
    return (
      <div style={{ padding: '1.75rem 2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>Analytics</h1>
          <p style={{ color: TEXT_COLORS.muted, fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Platform-wide metrics and growth.</p>
        </div>
        <div role="status" aria-label="Loading analytics" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div aria-hidden="true" style={{ width: 36, height: 36, border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.75rem 2rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 700 }}>
            <ArrowLeft size={14} /> Control Tower
          </Link>
          <span style={{ color: C.border }}>/</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.accent }}>Analytics</span>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>Analytics</h1>
        <p style={{ color: TEXT_COLORS.muted, fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Platform-wide metrics and growth.</p>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Users',         value: ov?.totalUsers,           sub: `+${ov?.newUsersThisMonth ?? 0} this month`,  color: C.accent, bg: C.accentLight, border: STATUS_COLORS.info.border },
          { label: 'New This Week',        value: ov?.newUsersThisWeek,     sub: 'registered users',                           color: C.success, bg: STATUS_COLORS.success.bg, border: STATUS_COLORS.success.border },
          { label: 'Total Bookings',       value: ov?.totalBookings,        sub: 'all time',                                   color: C.purple, bg: STATUS_COLORS.purple.bg, border: STATUS_COLORS.purple.border },
          { label: 'Confirmed Booking Totals', value: financialTotals('revenueThisMonth'), sub: 'bookings created this month, by currency', color: STATUS_COLORS.warning.color, bg: STATUS_COLORS.warning.bg, border: STATUS_COLORS.warning.border },
          { label: 'Platform Fees', value: financialTotals('platformFeeThisMonth'), sub: 'confirmed bookings created this month', color: C.accent, bg: C.accentLight, border: STATUS_COLORS.info.border },
          { label: 'Pending Payouts',      value: financialTotals('pendingPayouts'), sub: 'stored payouts by currency', color: C.error, bg: STATUS_COLORS.danger.bg, border: STATUS_COLORS.danger.border },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', border: `1px solid ${C.border}`, borderTop: `3px solid ${card.color}` }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: card.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{card.label}</p>
            <p style={{ fontSize: '1.35rem', fontWeight: '800', color: C.primary, marginBottom: '0.2rem' }}>{card.value ?? 0}</p>
            <p style={{ fontSize: '0.72rem', color: C.gray500 }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {((ov?.missingCurrencyRecords || 0) > 0 || Object.values(ov?.financialByCurrency || {}).some(value => value.missingAmounts > 0)) && (
        <p role="status" style={{ color: TEXT_COLORS.body, margin: '0 0 1.5rem' }}>Some financial entries have missing currency or amounts. Totals include only recorded values and require reconciliation.</p>
      )}

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }} className="analytics-chart-row">

        {/* Signup Trend â€” recharts AreaChart */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: `1px solid ${C.border}` }}>
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
                  <stop offset="5%"  stopColor={C.accent} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: C.gray500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: C.gray500 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: C.accent, strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke={C.accent}
                strokeWidth={2.5}
                fill="url(#signupGradient)"
                dot={false}
                activeDot={{ r: 5, fill: C.accent, strokeWidth: 2, stroke: 'white' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* â”€â”€ Booking Status Breakdown â”€â”€ */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: `1px solid ${C.border}`, marginBottom: '1.5rem' }}>
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
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '0.1rem' }}>Top Tutors</h3>
              <p style={{ color: C.gray500, fontSize: '0.78rem' }}>By number of bookings</p>
            </div>
            <Link href="/admin/bookings" style={{ fontSize: '0.75rem', color: C.accent, fontWeight: '600', textDecoration: 'none' }}>View all â†’</Link>
          </div>
          {(data?.topTutors ?? []).length === 0 ? (
            <p style={{ color: C.gray500, fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No bookings yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {(data?.topTutors ?? []).map((tutor, i) => (
                <div key={`${tutor.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: i === 0 ? C.gold : i === 1 ? C.gray500 : i === 2 ? STATUS_COLORS.warning.color : C.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: i < 3 ? 'white' : C.gray500, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tutor.name}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: C.accent, backgroundColor: C.accentLight, padding: '0.2rem 0.6rem', borderRadius: '999px', flexShrink: 0 }}>
                    {tutor.count} {tutor.count === 1 ? 'booking' : 'bookings'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '0.1rem' }}>Recent Payments</h3>
              <p style={{ color: C.gray500, fontSize: '0.78rem' }}>Latest confirmed bookings</p>
            </div>
            <Link href="/admin/payments" style={{ fontSize: '0.75rem', color: C.accent, fontWeight: '600', textDecoration: 'none' }}>View all â†’</Link>
          </div>
          {(data?.recentPayments ?? []).length === 0 ? (
            <p style={{ color: C.gray500, fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No confirmed payments yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(data?.recentPayments ?? []).map((payment, idx) => (
                <div key={payment._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: idx < (data?.recentPayments.length ?? 0) - 1 ? `1px solid ${C.border}` : 'none', gap: '0.5rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: '600', color: C.primary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {payment.student?.name} â†’ {payment.tutor?.name}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: C.gray500, margin: 0 }}>
                      {new Date(payment.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: '800', color: C.success, flexShrink: 0 }}>
                    {typeof payment.studentTotal === 'number' ? `${payment.currency || 'Currency unavailable'} ${payment.studentTotal.toLocaleString()}` : 'Amount unavailable'}
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

