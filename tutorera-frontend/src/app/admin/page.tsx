"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, CheckCircle, Clock, CreditCard,
  Download, FileSpreadsheet, FileText, RefreshCw, ShieldAlert,
  ShieldCheck, Sparkles, TrendingUp, Users, ArrowRight, BookOpen,
  HeartHandshake, ChevronRight, Zap, ExternalLink, Shield, Globe,
  Sliders, X, Check, Eye
} from "lucide-react";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

interface ControlTowerData {
  pulse: {
    activeRequests: number;
    successfulBookings: number;
    requestsAtRisk: number;
    zeroOfferRequests: number;
    expiringToday: number;
    verificationBacklog: number;
    failedPayments: number;
    openSafetyCases: number;
    disputedBookings: number;
  };
  urgentActions: {
    id: string;
    type: string;
    severity: "critical" | "high" | "medium";
    title: string;
    detail: string;
    link: string;
    actionLabel: string;
  }[];
  atRiskPreview: {
    request: {
      _id: string;
      subject: string;
      level: string;
      budget: number;
      currency?: string;
      city?: string;
      teachingMode: string;
      student: { name: string; city?: string };
    };
    riskReasons: string[];
    urgencyLevel: "critical" | "high" | "medium";
    urgencyScore: number;
    offersCount: number;
    hoursSinceCreated: number;
    hoursUntilExpiry: number;
    recommendedAction: "rematch" | "extend" | "suggest_online" | "escalate";
  }[];
}

interface PipelineSummary {
  tutors: { total: number; underReview: number; started: number; active: number };
  students: { total: number; readyToPost: number; profileStarted: number; activeRequesters: number };
  parents: { total: number; learnerLinked: number; profileStarted: number; registered: number };
}

interface QuickTutorItem {
  profileId: string;
  name: string;
  email: string;
  city?: string;
  subjects?: string[];
  canonicalStatus: string;
  submittedAt?: string;
}

export default function AdminControlTowerPage() {
  const [data, setData] = useState<ControlTowerData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineSummary>({
    tutors: { total: 0, underReview: 0, started: 0, active: 0 },
    students: { total: 0, readyToPost: 0, profileStarted: 0, activeRequesters: 0 },
    parents: { total: 0, learnerLinked: 0, profileStarted: 0, registered: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // 30s default
  const [atRiskTab, setAtRiskTab] = useState<"all" | "zero_offers" | "expiring">("all");

  // Quick Verification Modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingTutors, setPendingTutors] = useState<QuickTutorItem[]>([]);
  const [loadingTutors, setLoadingTutors] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchPulse = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [pulseRes, tutorsPipe, studentsPipe, parentsPipe] = await Promise.allSettled([
        api.get("/admin/control-tower/pulse"),
        api.get("/admin/onboarding/tutors?limit=1"),
        api.get("/admin/onboarding/students?limit=1"),
        api.get("/admin/onboarding/parents?limit=1"),
      ]);

      if (pulseRes.status === "fulfilled" && pulseRes.value.data) {
        setData(pulseRes.value.data);
      }

      const newPipe: PipelineSummary = {
        tutors: { total: 0, underReview: 0, started: 0, active: 0 },
        students: { total: 0, readyToPost: 0, profileStarted: 0, activeRequesters: 0 },
        parents: { total: 0, learnerLinked: 0, profileStarted: 0, registered: 0 },
      };

      if (tutorsPipe.status === "fulfilled" && tutorsPipe.value.data) {
        const s = tutorsPipe.value.data.summary || {};
        newPipe.tutors = {
          total: tutorsPipe.value.data.total || 0,
          underReview: s.UNDER_REVIEW || 0,
          started: s.APPLICATION_STARTED || 0,
          active: s.APPROVED_FOR_MARKETPLACE || 0,
        };
      }

      if (studentsPipe.status === "fulfilled" && studentsPipe.value.data) {
        const s = studentsPipe.value.data.summary || {};
        newPipe.students = {
          total: studentsPipe.value.data.total || 0,
          readyToPost: s.READY_TO_POST || 0,
          profileStarted: s.PROFILE_STARTED || 0,
          activeRequesters: s.ACTIVE_REQUESTER || 0,
        };
      }

      if (parentsPipe.status === "fulfilled" && parentsPipe.value.data) {
        const s = parentsPipe.value.data.summary || {};
        newPipe.parents = {
          total: parentsPipe.value.data.total || 0,
          learnerLinked: s.LEARNER_LINKED || 0,
          profileStarted: s.PROFILE_STARTED || 0,
          registered: s.REGISTERED || 0,
        };
      }

      setPipeline(newPipe);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load control tower pulse:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    fetchPulse();
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchPulse(true);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchPulse, autoRefreshInterval]);

  const handleRescueAction = async (requestId: string, action: string) => {
    setActionLoading(`${requestId}-${action}`);
    try {
      const res = await api.post(`/admin/at-risk/requests/${requestId}/action`, { action });
      showSuccess(res.data?.message || `Action ${action} executed.`);
      fetchPulse(true);
    } catch {
      showError("Failed to execute rescue action.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadReport = async (period: "weekly" | "monthly", format: "excel" | "pdf") => {
    const key = `${period}-${format}`;
    setDownloading(key);
    try {
      const response = await api.get("/admin/reports", {
        params: { period, format },
        responseType: "blob",
      });
      const ext = format === "excel" ? "xlsx" : "pdf";
      const filename = `tutorera-${period}-report.${ext}`;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess(`Downloaded ${filename}`);
    } catch {
      showError("Failed to generate report.");
    } finally {
      setDownloading(null);
    }
  };

  const openQuickVerification = async () => {
    setShowVerificationModal(true);
    setLoadingTutors(true);
    try {
      const res = await api.get("/tracking/admin/applications?status=UNDER_REVIEW&limit=8");
      if (res.data?.applications) {
        setPendingTutors(
          res.data.applications.map((app: any) => ({
            profileId: app.profileId || app._id,
            name: app.name || "Tutor",
            email: app.email,
            city: app.city,
            subjects: app.subjects || [],
            canonicalStatus: app.canonicalStatus || "UNDER_REVIEW",
            submittedAt: app.lastUpdatedAt || app.createdAt,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch pending tutors:", err);
    } finally {
      setLoadingTutors(false);
    }
  };

  const pulse = data?.pulse;

  const pulseCards = [
    {
      title: "Active Demand",
      value: pulse?.activeRequests ?? 0,
      label: "Requests Seeking Tutors",
      icon: <BookOpen size={20} color={UI_COLORS.accent} />,
      bg: STATUS_COLORS.info.bg,
      border: STATUS_COLORS.info.border,
      link: "/admin/marketplace",
    },
    {
      title: "Bookings",
      value: pulse?.successfulBookings ?? 0,
      label: "Confirmed Sessions",
      icon: <CheckCircle size={20} color={STATUS_COLORS.success.color} />,
      bg: STATUS_COLORS.success.bg,
      border: STATUS_COLORS.success.border,
      link: "/admin/bookings",
    },
    {
      title: "Requests At Risk",
      value: pulse?.requestsAtRisk ?? 0,
      label: "Need Liquidity Rescue",
      icon: <AlertTriangle size={20} color={STATUS_COLORS.warning.color} />,
      bg: STATUS_COLORS.warning.bg,
      border: STATUS_COLORS.warning.border,
      link: "/admin/at-risk-requests",
      highlight: (pulse?.requestsAtRisk ?? 0) > 0,
    },
    {
      title: "Zero-Offer Requests",
      value: pulse?.zeroOfferRequests ?? 0,
      label: "0 Offers > 24 Hours",
      icon: <TrendingUp size={20} color={STATUS_COLORS.danger.color} />,
      bg: STATUS_COLORS.danger.bg,
      border: STATUS_COLORS.danger.border,
      link: "/admin/at-risk-requests?filter=zero_offers",
      highlight: (pulse?.zeroOfferRequests ?? 0) > 0,
    },
    {
      title: "Verification Backlog",
      value: pulse?.verificationBacklog ?? 0,
      label: "Pending > 48h SLA",
      icon: <ShieldCheck size={20} color={STATUS_COLORS.purple.color} />,
      bg: STATUS_COLORS.purple.bg,
      border: STATUS_COLORS.purple.border,
      link: "/admin/applications?status=UNDER_REVIEW",
      highlight: (pulse?.verificationBacklog ?? 0) > 0,
    },
    {
      title: "Failed Payments",
      value: pulse?.failedPayments ?? 0,
      label: "Checkout Stalls",
      icon: <CreditCard size={20} color={STATUS_COLORS.danger.color} />,
      bg: STATUS_COLORS.danger.bg,
      border: STATUS_COLORS.danger.border,
      link: "/admin/payments?status=failed",
      highlight: (pulse?.failedPayments ?? 0) > 0,
    },
    {
      title: "Safety Incidents",
      value: pulse?.openSafetyCases ?? 0,
      label: "Under Investigation",
      icon: <ShieldAlert size={20} color={STATUS_COLORS.purple.color} />,
      bg: STATUS_COLORS.purple.bg,
      border: STATUS_COLORS.purple.border,
      link: "/admin/safety-cases?status=open",
      highlight: (pulse?.openSafetyCases ?? 0) > 0,
    },
    {
      title: "Disputed Bookings",
      value: pulse?.disputedBookings ?? 0,
      label: "Awaiting Resolution",
      icon: <AlertTriangle size={20} color={STATUS_COLORS.warning?.color ?? "#d97706"} />,
      bg: STATUS_COLORS.warning?.bg ?? "#fffbeb",
      border: STATUS_COLORS.warning?.border ?? "#fde68a",
      link: "/admin/disputes",
      highlight: (pulse?.disputedBookings ?? 0) > 0,
    },
  ];

  // Filter at-risk preview based on tab
  const filteredAtRisk = (data?.atRiskPreview || []).filter((item) => {
    if (atRiskTab === "zero_offers") return item.offersCount === 0;
    if (atRiskTab === "expiring") return item.hoursUntilExpiry <= 24;
    return true;
  });

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1440px", margin: "0 auto" }}>
      {/* Top Header & Live Ops Control Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.75rem",
          flexWrap: "wrap",
          gap: "1.25rem",
          padding: "1.25rem 1.5rem",
          background: `linear-gradient(135deg, ${UI_COLORS.primary}, ${UI_COLORS.accent})`,
          borderRadius: "1rem",
          color: UI_COLORS.surface,
          boxShadow: "0 10px 25px -5px rgba(2,21,80,0.25)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.35rem" }}>
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: STATUS_COLORS.success.color,
                boxShadow: `0 0 10px ${STATUS_COLORS.success.color}`,
                animation: "pulse 2s infinite",
              }}
            />
            <span style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: UI_COLORS.accentBright }}>
              LIVE CONTROL TOWER · GLOBAL OPS
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
            Marketplace Command Center
          </h1>
          <p style={{ color: UI_COLORS.accentBright, fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
            Autonomous liquidity balancing, verification SLA management, and real-time transaction oversight.
          </p>
        </div>

        {/* Live Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Refresh Interval Selector */}
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.2rem 0.4rem" }}>
            <span style={{ fontSize: "0.72rem", color: STATUS_COLORS.info.border, padding: "0 0.4rem", fontWeight: 700 }}>Interval:</span>
            {[
              { val: 0, label: "Off" },
              { val: 15, label: "15s" },
              { val: 30, label: "30s" },
              { val: 60, label: "60s" },
            ].map((option) => (
              <button
                key={option.val}
                onClick={() => setAutoRefreshInterval(option.val)}
                style={{
                  border: "none",
                  background: autoRefreshInterval === option.val ? UI_COLORS.surface : "transparent",
                  color: autoRefreshInterval === option.val ? UI_COLORS.primary : UI_COLORS.surface,
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  padding: "0.25rem 0.55rem",
                  borderRadius: "0.35rem",
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchPulse(false)}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.55rem 0.95rem",
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "0.5rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: UI_COLORS.surface,
              cursor: "pointer",
              backdropFilter: "blur(4px)",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* 7 Operational Pulse Cards */}
      <section style={{ marginBottom: "2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem" }}>
          {pulseCards.map((c) => (
            <Link key={c.title} href={c.link} style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: UI_COLORS.surface,
                  borderRadius: "0.75rem",
                  padding: "1.1rem",
                  border: `1px solid ${c.highlight ? STATUS_COLORS.danger.border : UI_COLORS.border}`,
                  boxShadow: c.highlight ? "0 4px 12px rgba(239, 68, 68, 0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: TEXT_COLORS.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {c.title}
                  </span>
                  <div style={{ width: "32px", height: "32px", borderRadius: "0.5rem", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.icon}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: c.highlight ? STATUS_COLORS.danger.color : TEXT_COLORS.body, lineHeight: 1 }}>
                    {loading ? "…" : c.value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted, marginTop: "0.35rem", fontWeight: 600 }}>
                    {c.label}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Requires Action Now - Triage Command Table */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🚨</span>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>
              Requires Action Now
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={openQuickVerification}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "0.4rem",
                border: `1px solid ${UI_COLORS.border}`,
                background: STATUS_COLORS.purple.bg,
                color: STATUS_COLORS.purple.color,
                fontSize: "0.78rem",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <ShieldCheck size={14} /> Quick Triage Modal
            </button>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: TEXT_COLORS.muted }}>
              {data?.urgentActions?.length ?? 0} items awaiting resolution
            </span>
          </div>
        </div>

        <div style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          {loading ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: TEXT_COLORS.muted }}>
              <RefreshCw size={20} className="spin" style={{ margin: "0 auto 0.5rem" }} />
              Scanning operational queues…
            </div>
          ) : !data?.urgentActions || data.urgentActions.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: STATUS_COLORS.success.color, fontWeight: 700 }}>
              ✓ All operational queues healthy. No immediate triage actions required!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.urgentActions.map((action, idx) => (
                <div
                  key={action.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 1.25rem",
                    borderBottom: idx < data.urgentActions.length - 1 ? `1px solid ${UI_COLORS.card}` : "none",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.55rem",
                        borderRadius: "999px",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        backgroundColor:
                          action.severity === "critical"
                            ? STATUS_COLORS.danger.bg
                            : action.severity === "high"
                            ? STATUS_COLORS.warning.bg
                            : STATUS_COLORS.warning.bg,
                        color:
                          action.severity === "critical"
                            ? STATUS_COLORS.danger.color
                            : action.severity === "high"
                            ? STATUS_COLORS.warning.color
                            : STATUS_COLORS.warning.color,
                      }}
                    >
                      {action.severity}
                    </span>
                    <div>
                      <strong style={{ fontSize: "0.92rem", color: TEXT_COLORS.body, display: "block" }}>
                        {action.title}
                      </strong>
                      <span style={{ fontSize: "0.8rem", color: TEXT_COLORS.muted }}>{action.detail}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {action.id === "verification_backlog" && (
                      <button
                        onClick={openQuickVerification}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          backgroundColor: STATUS_COLORS.neutral.bg,
                          color: TEXT_COLORS.secondary,
                          border: `1px solid ${UI_COLORS.border}`,
                          padding: "0.45rem 0.85rem",
                          borderRadius: "0.4rem",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Eye size={13} /> Quick Preview
                      </button>
                    )}
                    <Link
                      href={action.link}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        backgroundColor: UI_COLORS.accent,
                        color: "white",
                        padding: "0.45rem 0.95rem",
                        borderRadius: "0.4rem",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        textDecoration: "none",
                        boxShadow: "0 1px 4px rgba(3,41,178,0.25)",
                      }}
                    >
                      {action.actionLabel} <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* NEW SECTION: Onboarding Pipelines & User Readiness Overview */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>
              Onboarding Pipelines & User Readiness
            </h2>
            <p style={{ color: TEXT_COLORS.muted, fontSize: "0.78rem", margin: "0.2rem 0 0" }}>
              Track supply and demand activation across tutors, student learners, and parent guardians.
            </p>
          </div>
          <Link
            href="/admin/onboarding"
            style={{ fontSize: "0.82rem", fontWeight: 700, color: UI_COLORS.accent, textDecoration: "none" }}
          >
            Manage Pipelines →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {/* Tutors Pipeline Card */}
          <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.75rem", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ padding: "0.35rem", borderRadius: "0.4rem", background: STATUS_COLORS.info.bg, color: UI_COLORS.accent }}><BookOpen size={16} /></span>
                <strong style={{ fontSize: "0.95rem", color: TEXT_COLORS.body }}>Tutor Pipeline</strong>
              </div>
              <Link href="/admin/onboarding?tab=tutors" style={{ fontSize: "0.75rem", fontWeight: 700, color: UI_COLORS.accent, textDecoration: "none" }}>
                Inspect ({pipeline.tutors.total}) →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
              <div style={{ background: STATUS_COLORS.neutral.bg, borderRadius: "0.5rem", padding: "0.6rem 0.4rem" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: TEXT_COLORS.body }}>{pipeline.tutors.started}</div>
                <div style={{ fontSize: "0.68rem", color: TEXT_COLORS.muted, fontWeight: 700 }}>Started</div>
              </div>
              <div style={{ background: STATUS_COLORS.warning.bg, borderRadius: "0.5rem", padding: "0.6rem 0.4rem", border: `1px solid ${STATUS_COLORS.warning.border}` }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: STATUS_COLORS.warning.color }}>{pipeline.tutors.underReview}</div>
                <div style={{ fontSize: "0.68rem", color: STATUS_COLORS.warning.color, fontWeight: 700 }}>Under Review</div>
              </div>
              <div style={{ background: STATUS_COLORS.success.bg, borderRadius: "0.5rem", padding: "0.6rem 0.4rem", border: `1px solid ${STATUS_COLORS.success.border}` }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: STATUS_COLORS.success.color }}>{pipeline.tutors.active}</div>
                <div style={{ fontSize: "0.68rem", color: STATUS_COLORS.success.color, fontWeight: 700 }}>Market Active</div>
              </div>
            </div>
          </div>

          {/* Students Pipeline Card */}
          <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.75rem", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ padding: "0.35rem", borderRadius: "0.4rem", background: STATUS_COLORS.success.bg, color: STATUS_COLORS.success.color }}><Users size={16} /></span>
                <strong style={{ fontSize: "0.95rem", color: TEXT_COLORS.body }}>Student Pipeline</strong>
              </div>
              <Link href="/admin/onboarding?tab=students" style={{ fontSize: "0.75rem", fontWeight: 700, color: UI_COLORS.accent, textDecoration: "none" }}>
                Inspect ({pipeline.students.total}) →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
              <div style={{ background: STATUS_COLORS.neutral.bg, borderRadius: "0.5rem", padding: "0.6rem 0.4rem" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: TEXT_COLORS.body }}>{pipeline.students.profileStarted}</div>
                <div style={{ fontSize: "0.68rem", color: TEXT_COLORS.muted, fontWeight: 700 }}>Profile Started</div>
              </div>
              <div style={{ background: STATUS_COLORS.info.bg, borderRadius: "0.5rem", padding: "0.6rem 0.4rem", border: `1px solid ${STATUS_COLORS.info.border}` }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: UI_COLORS.accent }}>{pipeline.students.readyToPost}</div>
                <div style={{ fontSize: "0.68rem", color: STATUS_COLORS.info.color, fontWeight: 700 }}>Ready to Post</div>
              </div>
              <div style={{ background: STATUS_COLORS.success.bg, borderRadius: "0.5rem", padding: "0.6rem 0.4rem", border: `1px solid ${STATUS_COLORS.success.border}` }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: STATUS_COLORS.success.color }}>{pipeline.students.activeRequesters}</div>
                <div style={{ fontSize: "0.68rem", color: STATUS_COLORS.success.color, fontWeight: 700 }}>Active Requesters</div>
              </div>
            </div>
          </div>

          {/* Parents Pipeline Card */}
          <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.75rem", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ padding: "0.35rem", borderRadius: "0.4rem", background: STATUS_COLORS.purple.bg, color: UI_COLORS.magenta }}><HeartHandshake size={16} /></span>
                <strong style={{ fontSize: "0.95rem", color: TEXT_COLORS.body }}>Parent & Guardian Pipeline</strong>
              </div>
              <Link href="/admin/parents" style={{ fontSize: "0.75rem", fontWeight: 700, color: UI_COLORS.accent, textDecoration: "none" }}>
                Directory ({pipeline.parents.total}) →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
              <div style={{ background: STATUS_COLORS.neutral.bg, borderRadius: "0.5rem", padding: "0.6rem 0.4rem" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: TEXT_COLORS.body }}>{pipeline.parents.registered}</div>
                <div style={{ fontSize: "0.68rem", color: TEXT_COLORS.muted, fontWeight: 700 }}>Registered</div>
              </div>
              <div style={{ background: STATUS_COLORS.warning.bg, borderRadius: "0.5rem", padding: "0.6rem 0.4rem", border: `1px solid ${STATUS_COLORS.warning.border}` }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: STATUS_COLORS.warning.color }}>{pipeline.parents.profileStarted}</div>
                <div style={{ fontSize: "0.68rem", color: STATUS_COLORS.warning.color, fontWeight: 700 }}>Profile Started</div>
              </div>
              <div style={{ background: STATUS_COLORS.success.bg, borderRadius: "0.5rem", padding: "0.6rem 0.4rem", border: `1px solid ${STATUS_COLORS.success.border}` }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: STATUS_COLORS.success.color }}>{pipeline.parents.learnerLinked}</div>
                <div style={{ fontSize: "0.68rem", color: STATUS_COLORS.success.color, fontWeight: 700 }}>Learner Linked</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top At-Risk Student Requests with Filter Tabs */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>
              Top At-Risk Student Requests
            </h2>
            <p style={{ color: TEXT_COLORS.muted, fontSize: "0.78rem", margin: "0.2rem 0 0" }}>
              Requests stalling due to zero offers, low liquidity, or fast-approaching expiry.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.25rem", background: STATUS_COLORS.neutral.bg, padding: "0.2rem", borderRadius: "0.5rem" }}>
              {[
                { id: "all", label: "All At-Risk" },
                { id: "zero_offers", label: "Zero Offers" },
                { id: "expiring", label: "Expiring Soon" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAtRiskTab(tab.id as any)}
                  style={{
                    padding: "0.3rem 0.65rem",
                    borderRadius: "0.35rem",
                    border: "none",
                    background: atRiskTab === tab.id ? UI_COLORS.surface : "transparent",
                    color: atRiskTab === tab.id ? UI_COLORS.primary : TEXT_COLORS.muted,
                    fontSize: "0.74rem",
                    fontWeight: atRiskTab === tab.id ? 800 : 600,
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link
              href="/admin/at-risk-requests"
              style={{ fontSize: "0.82rem", fontWeight: 700, color: UI_COLORS.accent, textDecoration: "none", marginLeft: "0.5rem" }}
            >
              View Full Queue ({data?.pulse?.requestsAtRisk ?? 0}) →
            </Link>
          </div>
        </div>

        <div style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          {filteredAtRisk.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: TEXT_COLORS.muted }}>
              No requests currently categorized as at-risk in this view.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredAtRisk.map((item, idx) => (
                <div
                  key={item.request._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 1.25rem",
                    borderBottom: idx < filteredAtRisk.length - 1 ? `1px solid ${UI_COLORS.card}` : "none",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <strong style={{ fontSize: "0.95rem", color: TEXT_COLORS.body }}>
                        {item.request.subject}
                      </strong>
                      <span style={{ fontSize: "0.72rem", background: STATUS_COLORS.neutral.bg, color: TEXT_COLORS.secondary, padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                        {item.request.level}
                      </span>
                      <span style={{ fontSize: "0.72rem", background: STATUS_COLORS.danger.bg, color: STATUS_COLORS.danger.color, padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 800 }}>
                        Urgency: {item.urgencyScore}%
                      </span>
                    </div>

                    <div style={{ fontSize: "0.78rem", color: TEXT_COLORS.muted, display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      <span>Student: <strong>{item.request.student?.name || "Student"}</strong> ({item.request.city || "Online"})</span>
                      <span>Budget: <strong>{item.request.currency || "USD"} {item.request.budget?.toLocaleString()}</strong></span>
                      <span>Offers: <strong>{item.offersCount}</strong></span>
                      <span>Expires in: <strong>{item.hoursUntilExpiry}h</strong></span>
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.45rem", flexWrap: "wrap" }}>
                      {item.riskReasons.map((r) => (
                        <span key={r} style={{ fontSize: "0.7rem", background: STATUS_COLORS.danger.bg, color: STATUS_COLORS.danger.color, border: `1px solid ${UI_COLORS.border}`, padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                          ⚠️ {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 1-Click Rescue Trigger Buttons */}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      onClick={() => handleRescueAction(item.request._id, "rematch")}
                      disabled={actionLoading === `${item.request._id}-rematch`}
                      style={{
                        padding: "0.4rem 0.75rem",
                        backgroundColor: STATUS_COLORS.success.bg,
                        color: STATUS_COLORS.success.color,
                        border: `1px solid ${UI_COLORS.border}`,
                        borderRadius: "0.4rem",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ⚡ Rematch
                    </button>
                    <button
                      onClick={() => handleRescueAction(item.request._id, "extend")}
                      disabled={actionLoading === `${item.request._id}-extend`}
                      style={{
                        padding: "0.4rem 0.75rem",
                        backgroundColor: STATUS_COLORS.info.bg,
                        color: STATUS_COLORS.info.color,
                        border: `1px solid ${UI_COLORS.border}`,
                        borderRadius: "0.4rem",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + 7d Expiry
                    </button>
                    <button
                      onClick={() => handleRescueAction(item.request._id, "suggest_online")}
                      disabled={actionLoading === `${item.request._id}-suggest_online`}
                      style={{
                        padding: "0.4rem 0.75rem",
                        backgroundColor: STATUS_COLORS.warning.bg,
                        color: STATUS_COLORS.warning.color,
                        border: `1px solid ${UI_COLORS.border}`,
                        borderRadius: "0.4rem",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Suggest Online
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Operational Command Hub Shortcuts */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 0.9rem" }}>
          Operations & Control Hub Shortcuts
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {[
            { title: "Smart Matching Engine", desc: "Configure weights & inspect affinity scores", link: "/admin/matching", icon: <Sparkles size={18} color={UI_COLORS.accent} />, bg: STATUS_COLORS.info.bg },
            { title: "Financial Reconciliation", desc: "Audit gateway fees, refunds & platform margins", link: "/admin/reconciliation", icon: <CreditCard size={18} color={STATUS_COLORS.success.color} />, bg: STATUS_COLORS.success.bg },
            { title: "Refunds & Claims Desk", desc: "Dispute resolution and money-back requests", link: "/admin/refund-requests", icon: <ShieldAlert size={18} color={STATUS_COLORS.danger.color} />, bg: STATUS_COLORS.danger.bg },
            { title: "Disputed Bookings", desc: "Review and resolve payment disputes from students", link: "/admin/disputes", icon: <ShieldAlert size={18} color={STATUS_COLORS.warning?.color ?? "#d97706"} />, bg: STATUS_COLORS.warning?.bg ?? "#fffbeb" },
            { title: "Global Markets & Tax", desc: "Country rules, currency, and tax configurations", link: "/admin/markets", icon: <Globe size={18} color={STATUS_COLORS.purple.color} />, bg: STATUS_COLORS.purple.bg },
          ].map((item) => (
            <Link key={item.title} href={item.link} style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: UI_COLORS.surface,
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: "0.75rem",
                  padding: "1.1rem",
                  display: "flex",
                  gap: "0.85rem",
                  alignItems: "flex-start",
                  transition: "all 150ms ease",
                }}
              >
                <div style={{ width: "36px", height: "36px", borderRadius: "0.5rem", background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 800, color: TEXT_COLORS.body }}>{item.title}</h4>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: TEXT_COLORS.muted }}>{item.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Reports & Exports Section */}
      <section style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", padding: "1.25rem", border: `1px solid ${UI_COLORS.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>
              Export Operating Reports
            </h3>
            <p style={{ color: TEXT_COLORS.muted, fontSize: "0.78rem", margin: "0.2rem 0 0" }}>
              Generate comprehensive Excel and PDF summaries for finance, bookings, and compliance.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => handleDownloadReport("weekly", "excel")}
              disabled={downloading === "weekly-excel"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.8rem",
                borderRadius: "0.4rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                backgroundColor: STATUS_COLORS.success.bg,
                color: UI_COLORS.success,
                border: `1px solid ${UI_COLORS.border}`,
                cursor: "pointer",
              }}
            >
              <FileSpreadsheet size={15} /> Weekly Excel
            </button>
            <button
              onClick={() => handleDownloadReport("weekly", "pdf")}
              disabled={downloading === "weekly-pdf"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.8rem",
                borderRadius: "0.4rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                backgroundColor: STATUS_COLORS.danger.bg,
                color: STATUS_COLORS.danger.color,
                border: `1px solid ${UI_COLORS.border}`,
                cursor: "pointer",
              }}
            >
              <FileText size={15} /> Weekly PDF
            </button>
            <button
              onClick={() => handleDownloadReport("monthly", "excel")}
              disabled={downloading === "monthly-excel"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.8rem",
                borderRadius: "0.4rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                backgroundColor: STATUS_COLORS.success.bg,
                color: UI_COLORS.success,
                border: `1px solid ${UI_COLORS.border}`,
                cursor: "pointer",
              }}
            >
              <FileSpreadsheet size={15} /> Monthly Excel
            </button>
          </div>
        </div>
      </section>

      {/* Quick Verification Backlog Modal */}
      {showVerificationModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: UI_COLORS.surface,
              borderRadius: "0.85rem",
              width: "100%",
              maxWidth: "680px",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: TEXT_COLORS.body }}>
                  Tutor Verification SLA Backlog
                </h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: TEXT_COLORS.muted }}>
                  Pending applications awaiting identity and document sign-off.
                </p>
              </div>
              <button
                onClick={() => setShowVerificationModal(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: TEXT_COLORS.muted, padding: "0.25rem" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.25rem" }}>
              {loadingTutors ? (
                <div style={{ padding: "3rem", textAlign: "center", color: TEXT_COLORS.muted }}>
                  <RefreshCw size={24} className="spin" style={{ margin: "0 auto 0.75rem" }} />
                  Loading verification backlog…
                </div>
              ) : pendingTutors.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: STATUS_COLORS.success.color }}>
                  <CheckCircle size={32} style={{ margin: "0 auto 0.5rem" }} />
                  <p style={{ fontWeight: 700, margin: 0 }}>Verification queue is clear!</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {pendingTutors.map((tutor) => (
                    <div
                      key={tutor.profileId}
                      style={{
                        background: STATUS_COLORS.neutral.bg,
                        border: `1px solid ${UI_COLORS.border}`,
                        borderRadius: "0.6rem",
                        padding: "0.85rem 1rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: TEXT_COLORS.body, fontSize: "0.9rem" }}>{tutor.name}</div>
                        <div style={{ fontSize: "0.75rem", color: TEXT_COLORS.muted }}>{tutor.email} · {tutor.city || "Pakistan"}</div>
                        <div style={{ fontSize: "0.72rem", color: STATUS_COLORS.warning.color, fontWeight: 700, marginTop: "0.2rem" }}>
                          Status: UNDER REVIEW
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <Link
                          href={`/admin/applications/${tutor.profileId}`}
                          onClick={() => setShowVerificationModal(false)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.4rem 0.8rem",
                            borderRadius: "0.4rem",
                            background: UI_COLORS.accent,
                            color: UI_COLORS.surface,
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          Open Dossier <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: `1px solid ${UI_COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link
                href="/admin/applications?status=UNDER_REVIEW"
                onClick={() => setShowVerificationModal(false)}
                style={{ fontSize: "0.8rem", fontWeight: 700, color: UI_COLORS.accent, textDecoration: "none" }}
              >
                View all in Applications Directory →
              </Link>
              <button
                onClick={() => setShowVerificationModal(false)}
                style={{
                  padding: "0.45rem 0.9rem",
                  borderRadius: "0.4rem",
                  border: `1px solid ${UI_COLORS.border}`,
                  background: UI_COLORS.surface,
                  color: TEXT_COLORS.muted,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.15);
          }
        }
      `}</style>
    </div>
  );
}
