"use client";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { useEffect,useState } from "react";

const C = UI_COLORS;

type Transaction = {
  _id: string;
  type: string;
  typeLabel: string;
  status: string;
  amount: number;
  currency: string;
  refundAmount: number;
  createdAt: string;
  booking: {
    id: string;
    subject: string;
    schedule: string;
    teachingMode: string;
    bookingStatus: string;
    sessionCount: number;
    tutorName: string;
  } | null;
  providerTransactionId: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    api.get(`/payments/history?${params}`)
      .then((res) => {
        setTransactions(res.data.transactions || []);
        setPagination(res.data.pagination || { total: 0, page: 1, pages: 1 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const statusColors: Record<string, { bg: string; color: string }> = {
    succeeded: { bg: "#f0fdf4", color: "#16a34a" },
    refunded: { bg: "#fef9c3", color: "#a16207" },
    failed: { bg: "#fef2f2", color: "#dc2626" },
    pending: { bg: "#eff6ff", color: "#1d4ed8" },
    processing: { bg: "#f5f3ff", color: "#7c3aed" },
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: C.primary, marginBottom: "0.25rem" }}>
            Transaction History
          </h1>
          <p style={{ color: C.gray500, fontSize: "0.875rem" }}>
            Complete payment history including refunds.
          </p>
        </div>

        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.8rem", color: C.gray500 }}>Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "0.4rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", color: C.primary }}
          >
            <option value="">All transactions</option>
            <option value="succeeded">Successful</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: C.gray500 }}>
            {pagination.total} transaction{pagination.total !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}><p style={{ color: C.gray500 }}>Loading...</p></div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", background: "white", borderRadius: "0.875rem", border: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: 700, color: C.primary, marginBottom: "0.5rem" }}>No transactions yet</p>
            <p style={{ color: C.gray500, fontSize: "0.875rem" }}>Your payment history will appear here once you make a booking.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {transactions.map((tx) => {
              const sc = statusColors[tx.status] || { bg: "#f9fafb", color: "#374151" };
              return (
                <div key={tx._id} style={{ background: "white", borderRadius: "0.875rem", border: "1px solid #e5e7eb", padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <p style={{ fontWeight: 700, color: C.primary, fontSize: "0.9rem", margin: 0 }}>
                        {tx.typeLabel}
                      </p>
                      {tx.booking && (
                        <p style={{ color: C.gray500, fontSize: "0.8rem", margin: "0.2rem 0 0" }}>
                          {tx.booking.subject} · {tx.booking.tutorName}
                        </p>
                      )}
                      <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
                        {formatDate(tx.createdAt)}
                        {tx.booking && (
                          <> · {tx.booking.teachingMode === "online" ? "🌐 Online" : tx.booking.teachingMode === "in-person" ? "🏠 In-person" : "🔄 Both"}</>
                        )}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 800, fontSize: "1rem", margin: 0, color: C.primary }}>
                        {tx.status === "refunded" ? "-" : ""}PKR {tx.amount.toLocaleString()}
                      </p>
                      {tx.refundAmount > 0 && tx.status === "refunded" && (
                        <p style={{ color: "#a16207", fontSize: "0.75rem", margin: "0.1rem 0 0" }}>
                          Refund: PKR {tx.refundAmount.toLocaleString()}
                        </p>
                      )}
                      <span style={{ display: "inline-block", marginTop: "0.3rem", padding: "0.2rem 0.6rem", borderRadius: "999px", background: sc.bg, color: sc.color, fontSize: "0.7rem", fontWeight: 700, textTransform: "capitalize" }}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
