"use client";

import s from "@/components/Tracking/tracking.module.css";
import api from "@/lib/axios";
import { showError } from "@/lib/toast";
import { AdminApplicationRow,CanonicalStatus } from "@/types/tracking";
import Link from "next/link";
import { useEffect,useState } from "react";

const STATUS_LABELS: Record<CanonicalStatus, string> = {
  APPLICATION_STARTED: "Application started",
  DOCUMENTS_REQUIRED: "Documents required",
  APPLICATION_SUBMITTED: "Application submitted",
  UNDER_REVIEW: "Under review",
  ACTION_REQUIRED: "Action required",
  VERIFICATION_IN_PROGRESS: "Verification in progress",
  APPROVED_FOR_MARKETPLACE: "Marketplace active",
  HOME_TUITION_VERIFICATION_REQUIRED: "Home tuition pending",
  HOME_TUITION_ELIGIBLE: "Home tuition eligible",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  RE_VERIFICATION_REQUIRED: "Re-verification",
};

const ALL_STATUSES: CanonicalStatus[] = [
  "APPLICATION_STARTED", "DOCUMENTS_REQUIRED", "APPLICATION_SUBMITTED", "UNDER_REVIEW",
  "ACTION_REQUIRED", "VERIFICATION_IN_PROGRESS", "APPROVED_FOR_MARKETPLACE",
  "HOME_TUITION_VERIFICATION_REQUIRED", "HOME_TUITION_ELIGIBLE", "REJECTED", "SUSPENDED", "RE_VERIFICATION_REQUIRED",
];

function statusPillVariant(status: CanonicalStatus): string {
  if (status === "REJECTED" || status === "SUSPENDED") return s.danger || "";
  if (status === "ACTION_REQUIRED" || status === "RE_VERIFICATION_REQUIRED") return s.warn || "";
  if (status === "APPROVED_FOR_MARKETPLACE" || status === "HOME_TUITION_ELIGIBLE") return s.success || "";
  return "";
}

export default function AdminApplicationsPage() {
  const [rows, setRows] = useState<AdminApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    status: "all",
    marketplace: "all",
    homeTuition: "all",
    search: "",
  });
  const [page, setPage] = useState(1);

  const fetchRows = async (pageToLoad = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.marketplace !== "all") params.set("marketplace", filters.marketplace);
      if (filters.homeTuition !== "all") params.set("homeTuition", filters.homeTuition);
      if (filters.search.trim()) params.set("search", filters.search.trim());
      params.set("page", String(pageToLoad));
      const res = await api.get(`/tracking/admin/applications?${params.toString()}`);
      setRows(res.data.applications);
      setPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (err) {
      showError(err, "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.marketplace, filters.homeTuition]);

  useEffect(() => {
    fetchRows(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0329B2", margin: "0 0 6px" }}>Admin</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#021550", margin: "0 0 6px" }}>Tutor Applications</h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Review verification, manage eligibility, and act on every tutor application.</p>
        </div>

        <div className={s.card} style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569" }}>
              Status
              <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                <option value="all">All</option>
                {ALL_STATUSES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569" }}>
              Marketplace
              <select value={filters.marketplace} onChange={e => setFilters(f => ({ ...f, marketplace: e.target.value }))} style={inputStyle}>
                <option value="all">All</option>
                <option value="eligible">Eligible</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569" }}>
              Home tuition
              <select value={filters.homeTuition} onChange={e => setFilters(f => ({ ...f, homeTuition: e.target.value }))} style={inputStyle}>
                <option value="all">All</option>
                <option value="eligible">Eligible</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569" }}>
              Search (name or Application ID)
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder="e.g. TUT-2026-000184"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" onClick={() => fetchRows(1)} style={btnPrimaryStyle}>Search</button>
              </div>
            </label>
          </div>
        </div>

        {loading ? (
          <div className={s.spinner} />
        ) : rows.length === 0 ? (
          <div className={s.card}>
            <p className={s.empty}>No applications match your filters.</p>
          </div>
        ) : (
          <div className={s.card} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={thStyle}>Application ID</th>
                    <th style={thStyle}>Tutor</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Submitted</th>
                    <th style={thStyle}>Last updated</th>
                    <th style={thStyle}>Progress</th>
                    <th style={thStyle}>Marketplace</th>
                    <th style={thStyle}>Home tuition</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#021550" }}>{row.applicationId || "—"}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: "#1f2937" }}>{row.tutorName || "—"}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{row.tutorEmail}</div>
                      </td>
                      <td style={tdStyle}>
                        <span className={`${s.statusPill} ${statusPillVariant(row.canonicalStatus)}`} style={{ background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe" }}>
                          {STATUS_LABELS[row.canonicalStatus]}
                        </span>
                      </td>
                      <td style={tdStyle}>{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "—"}</td>
                      <td style={tdStyle}>{row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "—"}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 60, height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${row.progress}%`, height: "100%", background: "linear-gradient(90deg, #0329B2, #7C1BEA)" }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{row.progress}%</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: row.marketplaceEligible ? "#16a34a" : "#94a3b8", fontWeight: 700, fontSize: 12 }}>
                          {row.marketplaceEligible ? "Eligible" : "Pending"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: row.homeTuitionEligible ? "#16a34a" : row.homeTuitionRequired ? "#d97706" : "#94a3b8", fontWeight: 700, fontSize: 12 }}>
                          {row.homeTuitionEligible ? "Eligible" : row.homeTuitionRequired ? "Pending" : "N/A"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <Link href={`/admin/applications/${row._id}`} style={{ ...btnPrimaryStyle, textDecoration: "none" }}>Review</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Total {pagination.total} applications</p>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" disabled={pagination.page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={btnSecondaryStyle}>Prev</button>
                <span style={{ fontSize: 12, alignSelf: "center" }}>Page {pagination.page} of {pagination.pages}</span>
                <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setPage(p => p + 1)} style={btnSecondaryStyle}>Next</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 14,
  background: "#fff",
  color: "#0f172a",
  fontWeight: 500,
};
const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 14px", fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" };
const tdStyle: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#1f2937", verticalAlign: "middle" };
const btnPrimaryStyle: React.CSSProperties = { background: "#021550", color: "#fff", border: "none", borderRadius: 999, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnSecondaryStyle: React.CSSProperties = { background: "#fff", color: "#021550", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
