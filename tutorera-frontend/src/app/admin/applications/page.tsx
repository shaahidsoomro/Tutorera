"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { AdminApplicationRow, CanonicalStatus } from "@/types/tracking";
import { CANONICAL_STATUSES, CANONICAL_STATUS_LABELS } from "@/contracts/tracking.contract";
import { showError } from "@/lib/toast";
import s from "@/components/Tracking/tracking.module.css";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

const STATUS_LABELS = CANONICAL_STATUS_LABELS;

const ALL_STATUSES: CanonicalStatus[] = [...CANONICAL_STATUSES];

/** Carries the current filters + page into the detail page's URL so it can
 * rebuild the same filtered queue and offer Prev/Next navigation between
 * applications without the admin bouncing back to this list each time. */
function queueQueryString(filters: { status: string; marketplace: string; homeTuition: string; search: string }, page: number): string {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.marketplace !== "all") params.set("marketplace", filters.marketplace);
  if (filters.homeTuition !== "all") params.set("homeTuition", filters.homeTuition);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  params.set("page", String(page));
  return params.toString();
}

function statusPillVariant(status: CanonicalStatus): string {
  if (status === "REJECTED" || status === "SUSPENDED") return s.danger || "";
  if (status === "ACTION_REQUIRED" || status === "RE_VERIFICATION_REQUIRED") return s.warn || "";
  if (status === "APPROVED_FOR_MARKETPLACE" || status === "HOME_TUITION_ELIGIBLE") return s.success || "";
  return "";
}

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  const initialSearch = searchParams.get("search") || "";

  const [rows, setRows] = useState<AdminApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState({
    status: initialStatus,
    marketplace: "all",
    homeTuition: "all",
    search: initialSearch,
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
      setSummary(res.data.summary || {});
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
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: UI_COLORS.accent, margin: "0 0 6px" }}>Admin</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: TEXT_COLORS.primary, margin: "0 0 6px" }}>Tutor Applications</h1>
          <p style={{ color: TEXT_COLORS.muted, fontSize: 14, margin: 0 }}>Review verification, manage eligibility, and act on every tutor application.</p>
        </div>

        {/* Phase Filter Chips */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          {Object.entries(summary).map(([key, count]) => (
            <button
              type="button"
              key={key}
              aria-pressed={filters.status === key}
              onClick={() => {
                setFilters(f => ({ ...f, status: f.status === key ? "all" : key }));
                setPage(1);
              }}
              style={{
                textAlign: "left",
                border: filters.status === key ? `2px solid ${UI_COLORS.accentBright}` : `1px solid ${UI_COLORS.border}`,
                background: filters.status === key ? UI_COLORS.accentLight : UI_COLORS.surface,
                padding: "10px 12px",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 120ms ease",
              }}
            >
              <span style={{ display: "block", color: TEXT_COLORS.muted, fontSize: 11, fontWeight: 800 }}>
                {STATUS_LABELS[key as CanonicalStatus] || key}
              </span>
              <strong style={{ fontSize: 20, color: TEXT_COLORS.primary }}>{count}</strong>
            </button>
          ))}
        </div>

        <div className={s.card} style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: TEXT_COLORS.secondary }}>
              Status
              <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                <option value="all">All</option>
                {ALL_STATUSES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: TEXT_COLORS.secondary }}>
              Marketplace
              <select value={filters.marketplace} onChange={e => setFilters(f => ({ ...f, marketplace: e.target.value }))} style={inputStyle}>
                <option value="all">All</option>
                <option value="eligible">Eligible</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: TEXT_COLORS.secondary }}>
              Home tuition
              <select value={filters.homeTuition} onChange={e => setFilters(f => ({ ...f, homeTuition: e.target.value }))} style={inputStyle}>
                <option value="all">All</option>
                <option value="eligible">Eligible</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: TEXT_COLORS.secondary }}>
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
                  <tr style={{ background: STATUS_COLORS.neutral.bg, borderBottom: `1px solid ${UI_COLORS.border}` }}>
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
                    <tr key={row._id} style={{ borderBottom: `1px solid ${STATUS_COLORS.neutral.bg}` }}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: TEXT_COLORS.primary }}>{row.applicationId || "—"}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: TEXT_COLORS.body }}>{row.tutorName || "—"}</div>
                        <div style={{ fontSize: 12, color: TEXT_COLORS.muted }}>{row.tutorEmail}</div>
                      </td>
                      <td style={tdStyle}>
                        <span className={`${s.statusPill} ${statusPillVariant(row.canonicalStatus)}`} style={{ background: STATUS_COLORS.info.bg, color: STATUS_COLORS.purple.color, border: `1px solid ${STATUS_COLORS.info.border}` }}>
                          {STATUS_LABELS[row.canonicalStatus]}
                        </span>
                      </td>
                      <td style={tdStyle}>{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "—"}</td>
                      <td style={tdStyle}>{row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "—"}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 60, height: 6, background: STATUS_COLORS.neutral.bg, borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${row.progress}%`, height: "100%", background: UI_COLORS.accentGradient }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{row.progress}%</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: row.marketplaceEligible ? UI_COLORS.success : TEXT_COLORS.muted, fontWeight: 700, fontSize: 12 }}>
                          {row.marketplaceEligible ? "Eligible" : "Pending"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: row.homeTuitionEligible ? UI_COLORS.success : row.homeTuitionRequired ? STATUS_COLORS.warning.color : TEXT_COLORS.muted, fontWeight: 700, fontSize: 12 }}>
                          {row.homeTuitionEligible ? "Eligible" : row.homeTuitionRequired ? "Pending" : "N/A"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <Link
                          href={`/admin/applications/${row._id}?${queueQueryString(filters, page)}`}
                          style={{ ...btnPrimaryStyle, textDecoration: "none" }}
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: TEXT_COLORS.muted }}>Total {pagination.total} applications</p>
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

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading Applications...</div>}>
      <ApplicationsContent />
    </Suspense>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: `1px solid ${UI_COLORS.border}`,
  borderRadius: 8,
  fontSize: 14,
  background: UI_COLORS.surface,
  color: TEXT_COLORS.body,
  fontWeight: 500,
};
const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 14px", fontSize: 11, fontWeight: 800, color: TEXT_COLORS.secondary, textTransform: "uppercase", letterSpacing: "0.08em" };
const tdStyle: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: TEXT_COLORS.body, verticalAlign: "middle" };
const btnPrimaryStyle: React.CSSProperties = { background: TEXT_COLORS.primary, color: UI_COLORS.surface, border: "none", borderRadius: 999, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnSecondaryStyle: React.CSSProperties = { background: UI_COLORS.surface, color: TEXT_COLORS.primary, border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
