"use client";
import CommissionCalculator from "@/components/Dashboard/CommissionCalculator";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import PayoutReportDownload from "@/components/Finance/PayoutReportDownload";
import PayoutTimeline from "@/components/Finance/PayoutTimeline";
import { useAuth } from "@/context/AuthContext";
import { useAppGuard } from "@/hooks/useAppGuard";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { Calculator } from "lucide-react";
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface MonthlyPoint {
  month: string;
  earnings?: number;
  sessions: number;
  spent?: number;
}

interface SubjectItem {
  subject: string;
  count: number;
}

interface RecentSession {
  _id: string;
  studentName?: string;
  tutorName?: string;
  subject: string;
  amount: number;
  tutorPayout?: number;
  createdAt: string;
}

interface TutorData {
  role: "tutor";
  stats: {
    totalEarnings: number;
    sessionsCount: number;
    hoursTaught: number;
    subjectsCount: number;
    onHoldAmount: number;
    onHoldCount: number;
  };
  monthlyData: MonthlyPoint[];
  subjectBreakdown: SubjectItem[];
  recentSessions: RecentSession[];
  tutorRetentionStats?: {
    totalStudentsWorkedWith: number;
    repeatStudentCount: number;
    rebookRate: number;
  };
}

interface StudentData {
  role: "student";
  stats: {
    sessionsCount: number;
    hoursLearned: number;
    subjectsCount: number;
    tutorsCount: number;
    totalSpent: number;
  };
  monthlyData: MonthlyPoint[];
  subjectBreakdown: SubjectItem[];
  tutorsWorkedWith: { name: string; sessions: number }[];
  recentSessions: RecentSession[];
  retentionStats?: {
    totalRelationships: number;
    repeatRelationships: number;
    retentionRate: number;
  };
}

type EarningsData = TutorData | StudentData;

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, isTutor }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value as number | undefined;
  return (
    <div style={{ backgroundColor: '#021550', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
      <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0 0 0.2rem' }}>{label}</p>
      <p style={{ color: 'white', fontSize: '0.875rem', fontWeight: '700', margin: 0 }}>
        {isTutor ? `Rs. ${(value || 0).toLocaleString()}` : `${value} session${value !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}

// ── Subject bar ───────────────────────────────────────────────────────────────
function SubjectBar({ subject, count, max, color }: { subject: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: '600', color: C.primary }}>{subject}</span>
        <span style={{ fontSize: '0.78rem', color: C.gray500 }}>{count} session{count !== 1 ? "s" : ""}</span>
      </div>
      <div style={{ height: '7px', backgroundColor: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '999px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ isTutor }: { isTutor: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isTutor ? '💰' : '📚'}</p>
      <p style={{ fontWeight: '700', color: C.primary, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
        {isTutor ? "No earnings yet" : "No sessions yet"}
      </p>
      <p style={{ color: C.gray500, fontSize: '0.875rem', maxWidth: '360px', margin: '0 auto' }}>
        {isTutor
          ? "Your earnings will appear here once you complete your first session with a student."
          : "Your learning progress will appear here once you complete your first session with a tutor."}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EarningsPage() {
  const { user }         = useAuth();
  const [data, setData]  = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const guardStatus = useAppGuard();

  useEffect(() => {
    api.get("/earnings")
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (guardStatus !== "ok" || !user) return null;

  const isTutor    = user.role === "tutor";
  const tutorData  = isTutor ? data as TutorData   : null;
  const studentData = !isTutor ? data as StudentData : null;

  const hasActivity = isTutor
    ? (tutorData?.stats.sessionsCount ?? 0) > 0
    : (studentData?.stats.sessionsCount ?? 0) > 0;

  const maxSubject = data ? Math.max(...(data.subjectBreakdown.map(s => s.count)), 1) : 1;

  // Stat cards
  const statCards = isTutor ? [
    { label: "Total Earnings",   value: `Rs. ${(tutorData?.stats.totalEarnings ?? 0).toLocaleString()}`, color: '#16a34a', bg: '#f0fdf4', icon: '💰' },
    { label: "Sessions Completed", value: tutorData?.stats.sessionsCount ?? 0,                              color: C.accent,  bg: '#EEF5FF', icon: '✅' },
    { label: "Hours Taught",     value: `${tutorData?.stats.hoursTaught ?? 0} hrs`,                         color: '#7c3aed', bg: '#f5f3ff', icon: '⏱️' },
    { label: "Subjects Taught",  value: tutorData?.stats.subjectsCount ?? 0,                                 color: '#d97706', bg: '#fffbeb', icon: '📖' },
    { label: "Rebook Rate",      value: `${tutorData?.tutorRetentionStats?.rebookRate ?? 0}%`,                color: '#c81b7f', bg: '#fdf2f8', icon: '🔄' },
    { label: "Repeat Students",  value: tutorData?.tutorRetentionStats?.repeatStudentCount ?? 0,             color: '#7c3aed', bg: '#f5f3ff', icon: '👥' },
  ] : [
    { label: "Sessions Completed", value: studentData?.stats.sessionsCount ?? 0,                            color: C.accent,  bg: '#EEF5FF', icon: '✅' },
    { label: "Hours Learned",     value: `${studentData?.stats.hoursLearned ?? 0} hrs`,                    color: '#7c3aed', bg: '#f5f3ff', icon: '⏱️' },
    { label: "Subjects Learned",  value: studentData?.stats.subjectsCount ?? 0,                            color: '#d97706', bg: '#fffbeb', icon: '📖' },
    { label: "Tutors Worked With", value: studentData?.stats.tutorsCount ?? 0,                              color: '#16a34a', bg: '#f0fdf4', icon: '👨‍🏫' },
    { label: "Retention Rate",     value: `${studentData?.retentionStats?.retentionRate ?? 0}%`,              color: '#c81b7f', bg: '#fdf2f8', icon: '🔄' },
    { label: "Repeat Tutors",     value: studentData?.retentionStats?.repeatRelationships ?? 0,               color: '#7c3aed', bg: '#f5f3ff', icon: '🌟' },
  ];

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '900px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: C.primary, marginBottom: '0.4rem' }}>
              {isTutor ? "Earnings & Progress" : "Learning Progress"}
            </h1>
            <p style={{ color: C.gray500, fontSize: '0.875rem' }}>
              {isTutor
                ? "Track your earnings, sessions, and subjects taught over time."
                : "Track your sessions, subjects learned, and tutors you've worked with."}
            </p>
          </div>
          {isTutor && (
            <div className="earnings-header-actions" style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
              <button onClick={() => setShowCalculator(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: showCalculator ? C.accent : "white", color: showCalculator ? "white" : C.primary, padding: "0.65rem 1.25rem", borderRadius: "0.5rem", border: `1.5px solid ${showCalculator ? C.accent : "#e5e7eb"}`, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                <Calculator size={16} /> {showCalculator ? "Hide Calculator" : "Rate Calculator"}
              </button>
              <PayoutReportDownload endpoint="/earnings/report/pdf" label="Download payout PDF" />
            </div>
          )}
        </div>

        {isTutor && <PayoutTimeline />}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : !hasActivity ? (
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
            <EmptyState isTutor={isTutor} />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {statCards.map(card => (
                <div key={card.label} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.25rem', border: '1px solid #e5e7eb', borderTop: `3px solid ${card.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{card.icon}</span>
                    <p style={{ fontSize: '0.72rem', fontWeight: '700', color: card.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {card.label}
                    </p>
                  </div>
                  <p style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Payment On Hold Card — tutor only */}
            {isTutor && (tutorData?.stats.onHoldCount ?? 0) > 0 && (
              <div style={{
                backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.875rem',
                padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>⏳</span>
                  <div>
                    <p style={{ fontWeight: '700', color: '#92400e', fontSize: '0.95rem', margin: '0 0 0.2rem' }}>
                      Rs. {(tutorData?.stats.onHoldAmount ?? 0).toLocaleString()} On Hold
                    </p>
                    <p style={{ color: '#92400e', fontSize: '0.8rem', margin: 0, opacity: 0.85 }}>
                      From {tutorData?.stats.onHoldCount} completed session{tutorData?.stats.onHoldCount !== 1 ? "s" : ""} — payment confirmed, payout pending
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#d97706', backgroundColor: 'white', padding: '0.35rem 0.85rem', borderRadius: '999px', border: '1px solid #fde68a' }}>
                  Pending Release
                </span>
              </div>
            )}

            {/* Commission Calculator — tutor only, toggleable */}
            {isTutor && showCalculator && (
              <div style={{ marginBottom: '1.5rem' }}>
                <CommissionCalculator />
              </div>
            )}

            {/* Chart + Subjects row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }} className="earnings-chart-row">

              {/* Monthly chart */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  {isTutor ? "Monthly Earnings" : "Monthly Sessions"}
                </h3>
                <p style={{ color: C.gray500, fontSize: '0.78rem', marginBottom: '1.25rem' }}>Last 6 months</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data?.monthlyData ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={isTutor ? '#16a34a' : C.accent} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={isTutor ? '#16a34a' : C.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      content={(props) => <ChartTooltip {...props} isTutor={isTutor} />}
                      cursor={{ stroke: isTutor ? '#16a34a' : C.accent, strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey={isTutor ? "earnings" : "sessions"}
                      stroke={isTutor ? '#16a34a' : C.accent}
                      strokeWidth={2.5}
                      fill="url(#earningsGradient)"
                      dot={false}
                      activeDot={{ r: 5, fill: isTutor ? '#16a34a' : C.accent, strokeWidth: 2, stroke: 'white' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Subjects breakdown */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  {isTutor ? "Subjects Taught" : "Subjects Learned"}
                </h3>
                <p style={{ color: C.gray500, fontSize: '0.78rem', marginBottom: '1.25rem' }}>
                  By session count
                </p>
                {(data?.subjectBreakdown ?? []).length === 0 ? (
                  <p style={{ color: C.gray500, fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No subjects yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {(data?.subjectBreakdown ?? []).slice(0, 6).map(s => (
                      <SubjectBar
                        key={s.subject}
                        subject={s.subject}
                        count={s.count}
                        max={maxSubject}
                        color={isTutor ? '#16a34a' : C.accent}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tutor-specific: Recent Sessions */}
            {isTutor && (
              <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '1.25rem' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', margin: 0 }}>Recent Sessions</h3>
                </div>
                {/* Desktop header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', padding: '0.6rem 1.5rem', backgroundColor: C.gray50, borderBottom: '1px solid #e5e7eb' }} className="earnings-table-header">
                  {["Student", "Subject", "Session Amount", "Your Earnings"].map(h => (
                    <p key={h} style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{h}</p>
                  ))}
                </div>
                {(tutorData?.recentSessions ?? []).map((s, idx) => (
                  <div key={s._id}>
                    {/* Desktop row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', padding: '0.875rem 1.5rem', alignItems: 'center', borderBottom: idx < (tutorData?.recentSessions.length ?? 0) - 1 ? '1px solid #f3f4f6' : 'none' }} className="earnings-table-row">
                      <p style={{ fontWeight: '600', color: C.primary, fontSize: '0.875rem', margin: 0 }}>{s.studentName}</p>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: '#EEF5FF', color: C.accent, width: 'fit-content' }}>{s.subject}</span>
                      <p style={{ fontSize: '0.875rem', color: C.gray500, margin: 0 }}>Rs. {(s.amount || 0).toLocaleString()}</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#16a34a', margin: 0 }}>Rs. {(s.tutorPayout || 0).toLocaleString()}</p>
                    </div>
                    {/* Mobile card */}
                    <div style={{ padding: '0.875rem 1.25rem', borderBottom: idx < (tutorData?.recentSessions.length ?? 0) - 1 ? '1px solid #f3f4f6' : 'none' }} className="earnings-mobile-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: '600', color: C.primary, fontSize: '0.875rem', margin: 0 }}>{s.studentName}</p>
                          <p style={{ fontSize: '0.78rem', color: C.gray500, margin: '0.2rem 0 0' }}>{s.subject}</p>
                        </div>
                        <p style={{ fontWeight: '700', color: '#16a34a', margin: 0 }}>Rs. {(s.tutorPayout || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Student-specific: Tutors worked with + Recent Sessions */}
            {!isTutor && (
              <>
                {/* Tutors worked with */}
                {(studentData?.tutorsWorkedWith ?? []).length > 0 && (
                  <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '1.25rem' }}>Tutors Worked With</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(studentData?.tutorsWorkedWith ?? []).map((t, i) => (
                        <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '0.875rem', flexShrink: 0 }}>
                            {t.name.charAt(0)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: '600', color: C.primary, fontSize: '0.875rem', margin: 0 }}>{t.name}</p>
                            <p style={{ fontSize: '0.75rem', color: C.gray500, margin: 0 }}>{t.sessions} session{t.sessions !== 1 ? "s" : ""} completed</p>
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: C.accent, backgroundColor: '#EEF5FF', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                            #{i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Sessions */}
                <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', margin: 0 }}>Recent Sessions</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', padding: '0.6rem 1.5rem', backgroundColor: C.gray50, borderBottom: '1px solid #e5e7eb' }} className="earnings-table-header">
                    {["Tutor", "Subject", "Amount Paid"].map(h => (
                      <p key={h} style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{h}</p>
                    ))}
                  </div>
                  {(studentData?.recentSessions ?? []).map((s, idx) => (
                    <div key={s._id}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', padding: '0.875rem 1.5rem', alignItems: 'center', borderBottom: idx < (studentData?.recentSessions.length ?? 0) - 1 ? '1px solid #f3f4f6' : 'none' }} className="earnings-table-row">
                        <p style={{ fontWeight: '600', color: C.primary, fontSize: '0.875rem', margin: 0 }}>{s.tutorName}</p>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: '#EEF5FF', color: C.accent, width: 'fit-content' }}>{s.subject}</span>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary, margin: 0 }}>Rs. {(s.amount || 0).toLocaleString()}</p>
                      </div>
                      <div style={{ padding: '0.875rem 1.25rem', borderBottom: idx < (studentData?.recentSessions.length ?? 0) - 1 ? '1px solid #f3f4f6' : 'none' }} className="earnings-mobile-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontWeight: '600', color: C.primary, fontSize: '0.875rem', margin: 0 }}>{s.tutorName}</p>
                            <p style={{ fontSize: '0.78rem', color: C.gray500, margin: '0.2rem 0 0' }}>{s.subject}</p>
                          </div>
                          <p style={{ fontWeight: '600', color: C.primary, margin: 0 }}>Rs. {(s.amount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .earnings-header-actions { width: 100%; min-width: 0; flex-direction: column; flex-shrink: 1 !important; }
          .earnings-header-actions > button { width: 100%; justify-content: center; }
          .earnings-chart-row    { grid-template-columns: 1fr !important; }
          .earnings-table-header { display: none !important; }
          .earnings-table-row    { display: none !important; }
          .earnings-mobile-card  { display: block !important; }
        }
        @media (min-width: 769px) {
          .earnings-mobile-card  { display: none !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
