"use client";

import api from "@/lib/axios";
import { showError,showSuccess } from "@/lib/toast";
import {
  AlertTriangle,
  ArrowRight,BookOpen,
  CheckCircle,
  CreditCard,
  FileSpreadsheet,FileText,RefreshCw,ShieldAlert,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

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

export default function AdminControlTowerPage() {
  const [data, setData] = useState<ControlTowerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchPulse = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/control-tower/pulse");
      setData(res.data);
    } catch (err) {
      console.error("Failed to load control tower data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
  }, []);

  const handleRescueAction = async (requestId: string, action: string) => {
    setActionLoading(`${requestId}-${action}`);
    try {
      const res = await api.post(`/admin/at-risk/requests/${requestId}/action`, { action });
      showSuccess(res.data.message || "Rescue action executed successfully.");
      fetchPulse();
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

  const pulse = data?.pulse;

  const pulseCards = [
    {
      title: "Active Demand",
      value: pulse?.activeRequests ?? 0,
      label: "Requests Seeking Tutors",
      icon: <BookOpen size={20} color="#0329b2" />,
      bg: "#eff6ff",
      border: "#bfdbfe",
      link: "/admin/marketplace",
    },
    {
      title: "Bookings",
      value: pulse?.successfulBookings ?? 0,
      label: "Confirmed Sessions",
      icon: <CheckCircle size={20} color="#059669" />,
      bg: "#ecfdf5",
      border: "#a7f3d0",
      link: "/admin/bookings",
    },
    {
      title: "Requests At Risk",
      value: pulse?.requestsAtRisk ?? 0,
      label: "Need Liquidity Rescue",
      icon: <AlertTriangle size={20} color="#d97706" />,
      bg: "#fffbeb",
      border: "#fde68a",
      link: "/admin/at-risk-requests",
      highlight: (pulse?.requestsAtRisk ?? 0) > 0,
    },
    {
      title: "Zero-Offer Requests",
      value: pulse?.zeroOfferRequests ?? 0,
      label: "0 Offers > 24 Hours",
      icon: <TrendingUp size={20} color="#dc2626" />,
      bg: "#fef2f2",
      border: "#fecaca",
      link: "/admin/at-risk-requests",
      highlight: (pulse?.zeroOfferRequests ?? 0) > 0,
    },
    {
      title: "Verification Backlog",
      value: pulse?.verificationBacklog ?? 0,
      label: "Pending > 48h SLA",
      icon: <ShieldCheck size={20} color="#4f46e5" />,
      bg: "#eef2ff",
      border: "#c7d2fe",
      link: "/admin/applications?status=UNDER_REVIEW",
    },
    {
      title: "Failed Payments",
      value: pulse?.failedPayments ?? 0,
      label: "Checkout Stalls",
      icon: <CreditCard size={20} color="#e11d48" />,
      bg: "#fff1f2",
      border: "#fecdd3",
      link: "/admin/payments?status=failed",
      highlight: (pulse?.failedPayments ?? 0) > 0,
    },
    {
      title: "Safety Incidents",
      value: pulse?.openSafetyCases ?? 0,
      label: "Under Investigation",
      icon: <ShieldAlert size={20} color="#7c3aed" />,
      bg: "#f5f3ff",
      border: "#ddd6fe",
      link: "/admin/safety-cases",
      highlight: (pulse?.openSafetyCases ?? 0) > 0,
    },
  ];

  return (
    <div style={{ padding: "1.75rem 2rem" }}>
      {/* Top Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
              Marketplace Control Tower
            </h1>
          </div>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
            Real-time operational demand, liquidity monitoring, tutor verification, and financial governance.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={fetchPulse}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 0.95rem",
              backgroundColor: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "0.5rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Operational Pulse Grid */}
      <section style={{ marginBottom: "2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem" }}>
          {pulseCards.map((c) => (
            <Link key={c.title} href={c.link} style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "0.75rem",
                  padding: "1.1rem",
                  border: `1px solid ${c.highlight ? "#fca5a5" : "#e2e8f0"}`,
                  boxShadow: c.highlight ? "0 4px 12px rgba(239, 68, 68, 0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {c.title}
                  </span>
                  <div style={{ width: "32px", height: "32px", borderRadius: "0.5rem", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.icon}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: c.highlight ? "#dc2626" : "#0f172a", lineHeight: 1 }}>
                    {loading ? "…" : c.value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.35rem", fontWeight: 600 }}>
                    {c.label}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Requires Action Now - Operational Triage Table */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🚨</span>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Requires Action Now
            </h2>
          </div>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>
            {data?.urgentActions?.length ?? 0} items awaiting operational resolution
          </span>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>Scanning operational queues…</div>
          ) : !data?.urgentActions || data.urgentActions.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#059669", fontWeight: 700 }}>
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
                    borderBottom: idx < data.urgentActions.length - 1 ? "1px solid #f1f5f9" : "none",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        backgroundColor:
                          action.severity === "critical"
                            ? "#fee2e2"
                            : action.severity === "high"
                            ? "#ffedd5"
                            : "#fef9c3",
                        color:
                          action.severity === "critical"
                            ? "#991b1b"
                            : action.severity === "high"
                            ? "#9a3412"
                            : "#854d0e",
                      }}
                    >
                      {action.severity}
                    </span>
                    <div>
                      <strong style={{ fontSize: "0.92rem", color: "#0f172a", display: "block" }}>
                        {action.title}
                      </strong>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{action.detail}</span>
                    </div>
                  </div>

                  <Link
                    href={action.link}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      backgroundColor: "#0329b2",
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
              ))}
            </div>
          )}
        </div>
      </section>

      {/* At-Risk Student Demand Live Stream */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Top At-Risk Student Requests
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.78rem", margin: "0.2rem 0 0" }}>
              High-urgency requests stalling due to zero offers, low liquidity, or fast-approaching expiry.
            </p>
          </div>
          <Link
            href="/admin/at-risk-requests"
            style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0329b2", textDecoration: "none" }}
          >
            View Full Queue ({data?.pulse?.requestsAtRisk ?? 0}) →
          </Link>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {!data?.atRiskPreview || data.atRiskPreview.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
              No requests currently categorized as at-risk.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.atRiskPreview.map((item, idx) => (
                <div
                  key={item.request._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 1.25rem",
                    borderBottom: idx < data.atRiskPreview.length - 1 ? "1px solid #f1f5f9" : "none",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>
                        {item.request.subject}
                      </strong>
                      <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#334155", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                        {item.request.level}
                      </span>
                      <span style={{ fontSize: "0.72rem", background: "#fee2e2", color: "#991b1b", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 800 }}>
                        Urgency: {item.urgencyScore}%
                      </span>
                    </div>

                    <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      <span>Student: <strong>{item.request.student?.name || "Student"}</strong> ({item.request.city || "Online"})</span>
                      <span>Budget: <strong>{item.request.currency || "PKR"} {item.request.budget?.toLocaleString()}</strong></span>
                      <span>Offers: <strong>{item.offersCount}</strong></span>
                      <span>Expires in: <strong>{item.hoursUntilExpiry}h</strong></span>
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.45rem", flexWrap: "wrap" }}>
                      {item.riskReasons.map((r) => (
                        <span key={r} style={{ fontSize: "0.7rem", background: "#fff1f2", color: "#b91c1c", border: "1px solid #fecdd3", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
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
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        border: "1px solid #a7f3d0",
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
                        backgroundColor: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
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
                        backgroundColor: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fde68a",
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

      {/* Reports & Exports Section */}
      <section style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1.25rem", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Export Operating Reports
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.78rem", margin: "0.2rem 0 0" }}>
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
                backgroundColor: "#f0fdf4",
                color: "#16a34a",
                border: "1px solid #bbf7d0",
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
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
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
                backgroundColor: "#f0fdf4",
                color: "#16a34a",
                border: "1px solid #bbf7d0",
                cursor: "pointer",
              }}
            >
              <FileSpreadsheet size={15} /> Monthly Excel
            </button>
          </div>
        </div>
      </section>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
