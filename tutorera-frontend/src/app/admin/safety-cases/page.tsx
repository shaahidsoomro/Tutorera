"use client";

import api from "@/lib/axios";
import { showError,showSuccess } from "@/lib/toast";
import {
  ArrowLeft,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useCallback,useEffect,useState } from "react";

interface SafetyCaseItem {
  _id: string;
  caseId: string;
  reporter?: { name: string; email: string; avatar?: string };
  reportedUser: { _id: string; name: string; email: string; role: string };
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "under_investigation" | "action_taken" | "resolved" | "dismissed";
  evidence: { type: string; url?: string; note?: string; submittedAt: string }[];
  actionTaken?: string;
  resolutionSummary?: string;
  createdAt: string;
}

export default function SafetyCasesPage() {
  const [cases, setCases] = useState<SafetyCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCase, setSelectedCase] = useState<SafetyCaseItem | null>(null);
  const [resolutionAction, setResolutionAction] = useState("warning_issued");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/safety/cases${filterStatus !== "all" ? `?status=${filterStatus}` : ""}`);
      setCases(res.data.cases || []);
    } catch (err) {
      console.error("Failed to load safety cases:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleResolveCase = async () => {
    if (!selectedCase) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/safety/cases/${selectedCase._id}/resolve`, {
        actionTaken: resolutionAction,
        resolutionSummary,
      });
      showSuccess(`Safety case ${selectedCase.caseId} resolved.`);
      setSelectedCase(null);
      setResolutionSummary("");
      fetchCases();
    } catch {
      showError("Failed to resolve safety case.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "1.75rem 2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#7c3aed" }}>Trust & Safety</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            Trust & Safety Case Management
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
            Investigate incidents, anti-circumvention flags, conduct complaints, and protect students & tutors.
          </p>
        </div>

        <button
          onClick={fetchCases}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 0.9rem",
            backgroundColor: "white",
            border: "1px solid #cbd5e1",
            borderRadius: "0.4rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Cases
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem" }}>
        {[
          { id: "all", label: `All Cases (${cases.length})` },
          { id: "open", label: "Open" },
          { id: "under_investigation", label: "Under Investigation" },
          { id: "resolved", label: "Resolved" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterStatus(f.id)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              backgroundColor: filterStatus === f.id ? "#0f172a" : "#f1f5f9",
              color: filterStatus === f.id ? "white" : "#475569",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cases List */}
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading Trust & Safety Cases…</div>
        ) : cases.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#059669" }}>
            <CheckCircle size={36} style={{ margin: "0 auto 0.75rem" }} />
            <strong style={{ display: "block", fontSize: "1rem" }}>No active safety incidents in this view!</strong>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Marketplace conduct is clean and monitored.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {cases.map((c, idx) => (
              <div
                key={c._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.2rem 1.4rem",
                  borderBottom: idx < cases.length - 1 ? "1px solid #f1f5f9" : "none",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 800, color: "#0329b2" }}>
                      {c.caseId}
                    </span>
                    <span
                      style={{
                        padding: "0.15rem 0.45rem",
                        borderRadius: "999px",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        backgroundColor:
                          c.severity === "critical"
                            ? "#fee2e2"
                            : c.severity === "high"
                            ? "#ffedd5"
                            : "#f1f5f9",
                        color:
                          c.severity === "critical"
                            ? "#991b1b"
                            : c.severity === "high"
                            ? "#9a3412"
                            : "#475569",
                      }}
                    >
                      {c.severity}
                    </span>
                    <span style={{ fontSize: "0.74rem", background: "#f5f3ff", color: "#6d28d9", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                      {c.category.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                    <span>Reported User: <strong style={{ color: "#0f172a" }}>{c.reportedUser?.name}</strong> ({c.reportedUser?.role})</span>
                    <span>Reporter: <strong>{c.reporter?.name || "System Automated Flag"}</strong></span>
                    <span>Created: <strong>{new Date(c.createdAt).toLocaleDateString()}</strong></span>
                    <span>Status: <strong style={{ textTransform: "capitalize", color: c.status === "resolved" ? "#059669" : "#d97706" }}>{c.status.replace(/_/g, " ")}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => setSelectedCase(c)}
                    style={{
                      padding: "0.45rem 0.85rem",
                      backgroundColor: "#0f172a",
                      color: "white",
                      border: "none",
                      borderRadius: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {c.status === "resolved" ? "View Details" : "Investigate & Resolve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Case Resolution Modal */}
      {selectedCase && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1.5rem", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
              Case #{selectedCase.caseId} Investigation
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.82rem", margin: "0 0 1rem" }}>
              Reported User: <strong>{selectedCase.reportedUser?.name}</strong> ({selectedCase.reportedUser?.email})
            </p>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                Enforcement Action
              </label>
              <select
                value={resolutionAction}
                onChange={(e) => setResolutionAction(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "0.4rem", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              >
                <option value="warning_issued">Issue Formal Caution / Warning</option>
                <option value="account_suspended">Suspend Account</option>
                <option value="account_banned">Permanent Ban</option>
                <option value="refund_processed">Approve Student Refund</option>
                <option value="none">Dismiss / No Action Required</option>
              </select>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" }}>
                Investigation Findings & Resolution Summary
              </label>
              <textarea
                rows={4}
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                placeholder="Document officer findings, user response, and resolution rationale..."
                style={{ width: "100%", padding: "0.5rem", borderRadius: "0.4rem", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                onClick={() => setSelectedCase(null)}
                style={{ padding: "0.5rem 1rem", backgroundColor: "#f1f5f9", border: "none", borderRadius: "0.4rem", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleResolveCase}
                disabled={submitting || !resolutionSummary.trim()}
                style={{ padding: "0.5rem 1.25rem", backgroundColor: "#0329b2", color: "white", border: "none", borderRadius: "0.4rem", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
              >
                {submitting ? "Saving…" : "Confirm Resolution"}
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
      `}</style>
    </div>
  );
}
