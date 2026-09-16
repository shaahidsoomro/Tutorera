"use client";

import type { RequestFilters,TuitionRequest } from "@/lib/tuition-requests";
import { formatBudget,getTimeRemaining } from "@/lib/tuition-requests";
import { CITIES,LEVELS,SUBJECTS } from "@/lib/tutor-directory";
import { BookOpen,ChevronLeft,ChevronRight,Clock,Filter,MapPin,Search,X } from "lucide-react";
import Link from "next/link";
import { useCallback,useState } from "react";

const TEACHING_MODES = [
  { value: "all", label: "All Modes" },
  { value: "online", label: "Online Only" },
  { value: "in_person", label: "In-Person Only" },
];

const CURRENCIES = [
  { value: "", label: "All Countries" },
  { value: "PK", label: "Pakistan" },
  { value: "AE", label: "UAE" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "GB", label: "UK" },
];

interface Props {
  initialRequests: TuitionRequest[];
  initialPagination: { total: number; page: number; pages: number };
  initialFilters: RequestFilters;
}

export default function TuitionRequestsExplorer({ initialRequests, initialPagination, initialFilters }: Props) {
  const [requests, setRequests] = useState<TuitionRequest[]>(initialRequests);
  const [pagination, setPagination] = useState(initialPagination);
  const [filters, setFilters] = useState<RequestFilters>(initialFilters);
  const [loading, setLoading] = useState(false);

  const fetchFiltered = useCallback(async (newFilters: RequestFilters, page = "1") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "12", page });
      if (newFilters.subject) params.set("subject", newFilters.subject);
      if (newFilters.level) params.set("level", newFilters.level);
      if (newFilters.city) params.set("city", newFilters.city);
      if (newFilters.country) params.set("country", newFilters.country);
      if (newFilters.teachingMode && newFilters.teachingMode !== "all") params.set("teachingMode", newFilters.teachingMode);

      const res = await fetch(`/api/v1/requests?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequests(data.requests ?? []);
      setPagination({ total: data.total ?? 0, page: data.page ?? 1, pages: data.pages ?? 1 });
      setFilters(newFilters);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = (key: keyof RequestFilters, value: string) => {
    const newFilters = { ...filters, [key]: value, page: undefined };
    fetchFiltered(newFilters, "1");
  };

  const handlePage = (page: string) => {
    fetchFiltered(filters, page);
  };

  const clearFilters = () => {
    fetchFiltered({}, "1");
    setFilters({});
  };

  const hasActiveFilters = filters.subject || filters.level || filters.city || filters.country || (filters.teachingMode && filters.teachingMode !== "all");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #021550 0%, #0329B2 100%)", color: "white", padding: "2.5rem 1rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Find Tuition Requests</h1>
        <p style={{ opacity: 0.85, fontSize: "1rem" }}>
          Browse open tuition requests from students — submit your offer and start teaching.
        </p>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* Filter bar */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "1.5rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", minWidth: "160px", flex: 1 }}>
            <Search size={16} />
            <select
              value={filters.subject || ""}
              onChange={(e) => handleFilterChange("subject", e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: "0.875rem", color: "#334155", width: "100%", outline: "none", cursor: "pointer" }}
            >
              <option value="">All Subjects</option>
              {Object.entries(SUBJECTS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", minWidth: "140px", flex: 1 }}>
            <BookOpen size={16} />
            <select
              value={filters.level || ""}
              onChange={(e) => handleFilterChange("level", e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: "0.875rem", color: "#334155", width: "100%", outline: "none", cursor: "pointer" }}
            >
              <option value="">All Levels</option>
              {Object.entries(LEVELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", minWidth: "140px", flex: 1 }}>
            <MapPin size={16} />
            <select
              value={filters.city || ""}
              onChange={(e) => handleFilterChange("city", e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: "0.875rem", color: "#334155", width: "100%", outline: "none", cursor: "pointer" }}
            >
              <option value="">All Cities</option>
              {Object.entries(CITIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", minWidth: "130px", flex: 1 }}>
            <Filter size={16} />
            <select
              value={filters.country || ""}
              onChange={(e) => handleFilterChange("country", e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: "0.875rem", color: "#334155", width: "100%", outline: "none", cursor: "pointer" }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", minWidth: "140px", flex: 1 }}>
            <select
              value={filters.teachingMode || "all"}
              onChange={(e) => handleFilterChange("teachingMode", e.target.value)}
              style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "white", fontSize: "0.875rem", color: "#334155", padding: "0.4rem 0.6rem", width: "100%", outline: "none", cursor: "pointer" }}
            >
              {TEACHING_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontSize: "0.8rem", cursor: "pointer" }}
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* Results count */}
        <div style={{ marginBottom: "1rem", color: "#64748b", fontSize: "0.875rem" }}>
          {pagination.total > 0
            ? `Showing ${requests.length} of ${pagination.total.toLocaleString()} open requests`
            : `${pagination.total.toLocaleString()} open requests found`}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>Loading requests...</div>
          </div>
        )}

        {/* Request grid */}
        {!loading && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1rem",
          }}>
            {requests.map((req) => (
              <RequestCard key={req._id} request={req} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && requests.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "white", borderRadius: "16px" }}>
            <BookOpen size={48} color="#cbd5e1" style={{ marginBottom: "1rem" }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem" }}>
              No open requests found
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              {hasActiveFilters
                ? "Try adjusting your filters to see more requests."
                : "Check back soon — new requests are posted daily."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "2rem", alignItems: "center" }}>
            <button
              onClick={() => handlePage(String(pagination.page - 1))}
              disabled={pagination.page <= 1}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: pagination.page <= 1 ? "not-allowed" : "pointer",
                color: pagination.page <= 1 ? "#cbd5e1" : "#334155",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => handlePage(String(page))}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: page === pagination.page ? "#0329B2" : "white",
                    color: page === pagination.page ? "white" : "#334155",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: page === pagination.page ? 700 : 400,
                  }}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => handlePage(String(pagination.page + 1))}
              disabled={pagination.page >= pagination.pages}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: pagination.page >= pagination.pages ? "not-allowed" : "pointer",
                color: pagination.page >= pagination.pages ? "#cbd5e1" : "#334155",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({ request: req }: { request: TuitionRequest }) {
  const location = req.city ? `${req.city}, ${req.countryName || req.countryCode}` : (req.countryName || req.countryCode || "Worldwide");
  const modeLabel = req.teachingMode === "online" ? "Online" : req.teachingMode === "in-person" ? "In-Person" : "Online & In-Person";
  const modeColor = req.teachingMode === "online" ? "#0329B2" : req.teachingMode === "in-person" ? "#059669" : "#7c3aed";
  const budget = formatBudget(req.budget, req.currency || "PKR", req.pricingUnit);

  return (
    <Link
      href={`/dashboard`}
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "1.25rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow 0.15s, transform 0.15s",
        border: "1px solid #f1f5f9",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
    >
      {/* Subject + Level */}
      <div>
        <span style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#0329B2",
          background: "#EEF5FF",
          padding: "0.15rem 0.5rem",
          borderRadius: "999px",
        }}>
          {req.subject}
        </span>
        <span style={{ marginLeft: "0.4rem", fontSize: "0.8rem", color: "#64748b" }}>{req.level}</span>
      </div>

      {/* Description */}
      <p style={{ fontSize: "0.875rem", color: "#334155", lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {req.description || `Looking for a ${req.subject} tutor for ${req.level} level.`}
      </p>

      {/* Budget */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1rem", fontWeight: 800, color: "#021550" }}>{budget}</span>
        {req.maximumBudget && req.maximumBudget > req.budget && (
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>up to {formatBudget(req.maximumBudget, req.currency || "PKR", req.pricingUnit)}</span>
        )}
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "#64748b" }}>
          <MapPin size={12} /> {location}
        </span>
        <span style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          padding: "0.1rem 0.4rem",
          borderRadius: "4px",
          background: `${modeColor}15`,
          color: modeColor,
        }}>
          {modeLabel}
        </span>
        {req.expiresAt && (
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "#d97706" }}>
            <Clock size={12} /> {getTimeRemaining(req.expiresAt)}
          </span>
        )}
      </div>

      {/* Schedule */}
      {req.schedule && (
        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
          {req.schedule}
        </div>
      )}
    </Link>
  );
}
