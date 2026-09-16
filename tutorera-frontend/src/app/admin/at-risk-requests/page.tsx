"use client";

import api from "@/lib/axios";
import { showError,showSuccess } from "@/lib/toast";
import {
  ArrowLeft,
  CheckCircle,
  RefreshCw,
  Search
} from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

interface AtRiskItem {
  request: {
    _id: string;
    subject: string;
    level: string;
    budget: number;
    currency?: string;
    city?: string;
    teachingMode: string;
    createdAt: string;
    expiresAt?: string;
    student: { _id?: string; name: string; email?: string; phone?: string; city?: string };
  };
  riskReasons: string[];
  urgencyLevel: "critical" | "high" | "medium";
  urgencyScore: number;
  offersCount: number;
  hoursSinceCreated: number;
  hoursUntilExpiry: number;
  recommendedAction: "rematch" | "extend" | "suggest_online" | "escalate";
}

export default function AtRiskRequestsPage() {
  const [items, setItems] = useState<AtRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "zero_offers" | "expiring" | "low_liquidity">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/at-risk/requests");
      setItems(res.data.items || []);
    } catch (err) {
      console.error("Failed to load at-risk requests:", err);
      showError("Failed to fetch at-risk requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAction = async (requestId: string, action: string) => {
    setActionLoading(`${requestId}-${action}`);
    try {
      const res = await api.post(`/admin/at-risk/requests/${requestId}/action`, { action });
      showSuccess(res.data.message || "Rescue action executed.");
      fetchItems();
    } catch {
      showError("Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = items.filter((item) => {
    if (filter === "zero_offers" && item.offersCount > 0) return false;
    if (filter === "expiring" && item.hoursUntilExpiry > 24) return false;
    if (filter === "low_liquidity" && item.offersCount > 1) return false;

    if (!search) return true;
    const term = search.toLowerCase();
    const req = item.request;
    return (
      req.subject.toLowerCase().includes(term) ||
      req.student?.name?.toLowerCase().includes(term) ||
      req.city?.toLowerCase().includes(term)
    );
  });

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
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#d97706" }}>Student Demand</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            At-Risk Student Request Queue
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
            Intelligent liquidity detection to prevent valid student demand from silently failing.
          </p>
        </div>

        <button
          onClick={fetchItems}
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
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Queue
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1rem", border: "1px solid #e2e8f0", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All At-Risk (${items.length})` },
            { id: "zero_offers", label: "0 Offers > 24h" },
            { id: "expiring", label: "Expiring < 24h" },
            { id: "low_liquidity", label: "Low Liquidity (≤1 Offer)" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "999px",
                fontSize: "0.78rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                backgroundColor: filter === f.id ? "#0f172a" : "#f1f5f9",
                color: filter === f.id ? "white" : "#475569",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", minWidth: "240px" }}>
          <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search subject, student, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem 0.45rem 2.2rem",
              borderRadius: "0.4rem",
              border: "1px solid #cbd5e1",
              fontSize: "0.82rem",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Requests Table / Cards */}
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading At-Risk Queue…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#059669" }}>
            <CheckCircle size={36} style={{ margin: "0 auto 0.75rem" }} />
            <strong style={{ display: "block", fontSize: "1rem" }}>No requests matching current filter!</strong>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Marketplace liquidity is currently stable across this segment.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((item, idx) => (
              <div
                key={item.request._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.2rem 1.4rem",
                  borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
                  flexWrap: "wrap",
                  gap: "1.25rem",
                }}
              >
                {/* Left info */}
                <div style={{ flex: 1, minWidth: "280px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      {item.request.subject}
                    </h3>
                    <span style={{ fontSize: "0.72rem", background: "#eef2ff", color: "#4338ca", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                      {item.request.level}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        fontWeight: 800,
                        backgroundColor:
                          item.urgencyLevel === "critical"
                            ? "#fee2e2"
                            : item.urgencyLevel === "high"
                            ? "#ffedd5"
                            : "#fef9c3",
                        color:
                          item.urgencyLevel === "critical"
                            ? "#991b1b"
                            : item.urgencyLevel === "high"
                            ? "#9a3412"
                            : "#854d0e",
                      }}
                    >
                      Urgency Score: {item.urgencyScore}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                    <span>Student: <strong style={{ color: "#1e293b" }}>{item.request.student?.name}</strong></span>
                    <span>City: <strong style={{ color: "#1e293b" }}>{item.request.city || "Online"}</strong></span>
                    <span>Mode: <strong style={{ color: "#1e293b" }}>{item.request.teachingMode}</strong></span>
                    <span>Rate: <strong style={{ color: "#1e293b" }}>{item.request.currency || "PKR"} {item.request.budget?.toLocaleString()}</strong></span>
                    <span>Offers: <strong style={{ color: item.offersCount === 0 ? "#dc2626" : "#059669" }}>{item.offersCount}</strong></span>
                    <span>Active: <strong>{item.hoursSinceCreated}h</strong></span>
                    <span>Expires in: <strong style={{ color: item.hoursUntilExpiry <= 24 ? "#dc2626" : "#1e293b" }}>{item.hoursUntilExpiry}h</strong></span>
                  </div>

                  {/* Badges */}
                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    {item.riskReasons.map((r) => (
                      <span
                        key={r}
                        style={{
                          fontSize: "0.7rem",
                          background: "#fff1f2",
                          color: "#b91c1c",
                          border: "1px solid #fecdd3",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          fontWeight: 600,
                        }}
                      >
                        ⚠️ {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right Action buttons */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleAction(item.request._id, "rematch")}
                    disabled={actionLoading === `${item.request._id}-rematch`}
                    title="Notify top matched & secondary tier tutors"
                    style={{
                      padding: "0.45rem 0.85rem",
                      backgroundColor: "#ecfdf5",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
                      borderRadius: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ⚡ Rematch Pool
                  </button>
                  <button
                    onClick={() => handleAction(item.request._id, "extend")}
                    disabled={actionLoading === `${item.request._id}-extend`}
                    title="Add 7 days to request expiry"
                    style={{
                      padding: "0.45rem 0.85rem",
                      backgroundColor: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      borderRadius: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + 7d Expiry
                  </button>
                  <button
                    onClick={() => handleAction(item.request._id, "suggest_online")}
                    disabled={actionLoading === `${item.request._id}-suggest_online`}
                    title="Proactively recommend online tuition conversion"
                    style={{
                      padding: "0.45rem 0.85rem",
                      backgroundColor: "#fffbeb",
                      color: "#b45309",
                      border: "1px solid #fde68a",
                      borderRadius: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    💡 Propose Online
                  </button>
                  <button
                    onClick={() => handleAction(item.request._id, "escalate")}
                    disabled={actionLoading === `${item.request._id}-escalate`}
                    title="Escalate to human concierge team"
                    style={{
                      padding: "0.45rem 0.85rem",
                      backgroundColor: "#fef2f2",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      borderRadius: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🚨 Escalate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
