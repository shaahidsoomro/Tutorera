"use client";

import api from "@/lib/axios";
import { ArrowLeft,RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback,useEffect,useState } from "react";

interface ReconciliationSummary {
  totalGMV: number;
  totalTutorNet: number;
  totalPlatformGross: number;
  totalEstimatedGatewayFees: number;
  netPlatformSettlement: number;
  ledger?: Record<string, { count: number; grossAmount: number; platformNet: number; tutorPayable: number }>;
}

interface LedgerItem {
  _id: string;
  createdAt: string;
  provider: string;
  eventType: string;
  status: string;
  providerTransactionId: string;
  grossAmount: number;
  currency: string;
  platformNet: number;
  tutorPayable: number;
  settlementStatus: string;
  student?: { name: string; email: string };
  tutor?: { name: string; email: string };
}

interface BookingReconciledItem {
  _id: string;
  createdAt: string;
  student?: { name: string; email: string };
  tutor?: { name: string; email: string };
  request?: { subject: string; level: string };
  studentTotal: number;
  subtotal: number;
  studentFee: number;
  tutorFee: number;
  estimatedGatewayFee: number;
  expectedSettlement: number;
  paymentStatus: string;
  payoutStatus: string;
  settlementDiscrepancy: boolean;
}

export default function ReconciliationPage() {
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [bookings, setBookings] = useState<BookingReconciledItem[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/finance/reconciliation${filter !== "all" ? `?status=${filter}` : ""}`);
      setSummary(res.data.summary);
      setBookings(res.data.bookings || []);
      setLedger(res.data.ledger || []);
    } catch (err) {
      console.error("Failed to load reconciliation:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#059669" }}>Finance Operations</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            Settlement & Financial Reconciliation
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
            Audit Gross Marketplace Value, platform commission, gateway deductions, and expected settlements.
          </p>
        </div>

        <button
          onClick={fetchData}
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
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Ledger
        </button>
      </div>

      {summary?.ledger && (
        <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1rem", border: "1px solid #dbe5ff", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 900, color: "#0f172a", margin: "0 0 0.75rem" }}>Payment Provider Ledger Summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            {Object.entries(summary.ledger).map(([status, row]) => (
              <div key={status} style={{ background: "#f8faff", border: "1px solid #e2e8f0", borderRadius: "0.65rem", padding: "0.8rem" }}>
                <span style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase" }}>{status}</span>
                <strong style={{ display: "block", color: "#021550", fontSize: "1.2rem", marginTop: "0.15rem" }}>{row.count}</strong>
                <span style={{ color: "#475569", fontSize: "0.75rem" }}>Gross PKR {Math.round(row.grossAmount || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Metrics Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1.1rem", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Gross Marketplace Value</span>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#0f172a", marginTop: "0.2rem" }}>
            PKR {(summary?.totalGMV ?? 0).toLocaleString()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>Total Student Volume</span>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1.1rem", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Tutor Net Payouts</span>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#0f172a", marginTop: "0.2rem" }}>
            PKR {(summary?.totalTutorNet ?? 0).toLocaleString()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Payable to Service Providers</span>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1.1rem", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Platform Gross Fee</span>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#0329b2", marginTop: "0.2rem" }}>
            PKR {(summary?.totalPlatformGross ?? 0).toLocaleString()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Student + Tutor Commissions</span>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1.1rem", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Est. Gateway Fees</span>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#d97706", marginTop: "0.2rem" }}>
            PKR {(summary?.totalEstimatedGatewayFees ?? 0).toLocaleString()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>2.9% + PKR 30 Processing</span>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1.1rem", border: "1px solid #a7f3d0", background: "#ecfdf5" }}>
          <span style={{ fontSize: "0.72rem", color: "#065f46", fontWeight: 800, textTransform: "uppercase" }}>Net Platform Settlement</span>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#059669", marginTop: "0.2rem" }}>
            PKR {(summary?.netPlatformSettlement ?? 0).toLocaleString()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#047857", fontWeight: 600 }}>Net Take Home Revenue</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {[
          { id: "all", label: "All Records" },
          { id: "confirmed", label: "Confirmed" },
          { id: "received", label: "Received" },
          { id: "pending", label: "Pending" },
          { id: "failed", label: "Failed" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
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

      {/* Reconciliation Table */}
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading Financial Ledger…</div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>No booking records found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: "0.8rem 1.2rem", fontWeight: 800 }}>Booking / Date</th>
                <th style={{ padding: "0.8rem 1rem", fontWeight: 800 }}>Student & Tutor</th>
                <th style={{ padding: "0.8rem 1rem", fontWeight: 800 }}>Gross Total</th>
                <th style={{ padding: "0.8rem 1rem", fontWeight: 800 }}>Tutor Net</th>
                <th style={{ padding: "0.8rem 1rem", fontWeight: 800 }}>Platform Fee</th>
                <th style={{ padding: "0.8rem 1rem", fontWeight: 800 }}>Est. Gateway Fee</th>
                <th style={{ padding: "0.8rem 1rem", fontWeight: 800 }}>Expected Settlement</th>
                <th style={{ padding: "0.8rem 1.2rem", fontWeight: 800 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.9rem 1.2rem", color: "#0f172a" }}>
                    <strong style={{ display: "block" }}>{b.request?.subject || "Tuition Session"}</strong>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      {new Date(b.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td style={{ padding: "0.9rem 1rem", color: "#334155" }}>
                    <div>Student: <strong>{b.student?.name || "Student"}</strong></div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Tutor: {b.tutor?.name || "Tutor"}</div>
                  </td>
                  <td style={{ padding: "0.9rem 1rem", fontWeight: 800, color: "#0f172a" }}>
                    PKR {(b.studentTotal || b.subtotal || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.9rem 1rem", fontWeight: 700, color: "#059669" }}>
                    PKR {((b.subtotal || 0) - (b.tutorFee || 0)).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.9rem 1rem", fontWeight: 700, color: "#0329b2" }}>
                    PKR {((b.studentFee || 0) + (b.tutorFee || 0)).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.9rem 1rem", color: "#d97706" }}>
                    PKR {b.estimatedGatewayFee.toLocaleString()}
                  </td>
                  <td style={{ padding: "0.9rem 1rem", fontWeight: 800, color: "#0f172a" }}>
                    PKR {b.expectedSettlement.toLocaleString()}
                  </td>
                  <td style={{ padding: "0.9rem 1.2rem" }}>
                    <span
                      style={{
                        padding: "0.15rem 0.45rem",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        backgroundColor:
                          b.paymentStatus === "confirmed" || b.paymentStatus === "received"
                            ? "#ecfdf5"
                            : b.paymentStatus === "failed"
                            ? "#fef2f2"
                            : "#fffbeb",
                        color:
                          b.paymentStatus === "confirmed" || b.paymentStatus === "received"
                            ? "#059669"
                            : b.paymentStatus === "failed"
                            ? "#dc2626"
                            : "#d97706",
                      }}
                    >
                      {b.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <section style={{ marginTop: "1.5rem", backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>Recent Payment Ledger Events</h2>
          <p style={{ color: "#64748b", fontSize: "0.78rem", margin: "0.25rem 0 0" }}>Provider transaction events recorded for checkout, payment success, and payment failure.</p>
        </div>
        {ledger.length === 0 ? (
          <div style={{ padding: "1.5rem", color: "#64748b", fontSize: "0.85rem" }}>No provider ledger events recorded yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", color: "#64748b", textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Event</th>
                <th style={{ padding: "0.75rem 1rem" }}>Provider Ref</th>
                <th style={{ padding: "0.75rem 1rem" }}>Gross</th>
                <th style={{ padding: "0.75rem 1rem" }}>Tutor Payable</th>
                <th style={{ padding: "0.75rem 1rem" }}>Settlement</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={row._id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <strong style={{ display: "block", color: "#0f172a" }}>{row.eventType}</strong>
                    <span style={{ color: "#64748b" }}>{new Date(row.createdAt).toLocaleString()}</span>
                  </td>
                  <td style={{ padding: "0.8rem 1rem", color: "#334155" }}>{row.providerTransactionId}</td>
                  <td style={{ padding: "0.8rem 1rem", fontWeight: 800 }}>{row.currency} {Math.round(row.grossAmount || 0).toLocaleString()}</td>
                  <td style={{ padding: "0.8rem 1rem", color: "#059669", fontWeight: 700 }}>PKR {Math.round(row.tutorPayable || 0).toLocaleString()}</td>
                  <td style={{ padding: "0.8rem 1rem" }}>{row.status} / {row.settlementStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
