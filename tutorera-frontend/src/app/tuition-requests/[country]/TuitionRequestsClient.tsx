"use client";

import PlaceBidModal from "@/components/Dashboard/PlaceBidModal";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import api from "@/lib/axios";
import { timeAgo } from "@/lib/site";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  PlusCircle,
  Send,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useCallback,useEffect,useState } from "react";

interface RequestItem {
  _id: string;
  subject: string;
  level: string;
  description: string;
  budget: number;
  currency?: string;
  countryCode?: string;
  countryName?: string;
  pricingUnit?: "hour" | "session" | "month" | "course";
  allowCounterOffers: boolean;
  teachingMode: string;
  city?: string;
  schedule: string;
  createdAt: string;
  expiresAt?: string;
  offersCount?: number;
  student: {
    name?: string;
    displayTitle?: string;
    city?: string;
    countryCode?: string;
    countryName?: string;
  };
}

interface TuitionRequestsClientProps {
  countryCode: string;
  countryName: string;
  cityName?: string;
  subjectName?: string;
}

export default function TuitionRequestsClient({
  countryCode,
  countryName,
  cityName,
  subjectName,
}: TuitionRequestsClientProps) {
  const now = useCurrentTime();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [bidModalRequest, setBidModalRequest] = useState<RequestItem | null>(null);

  const fetchRequests = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(pageNum),
        limit: "12",
        country: countryCode,
      };
      if (cityName) params.city = cityName;
      if (subjectName) params.subject = subjectName;
      if (level) params.level = level;
      if (mode) params.teachingMode = mode;

      const res = await api.get(`/requests/public/preview?${new URLSearchParams(params).toString()}`);
      const reqList: RequestItem[] = res.data.requests || [];

      setRequests(reqList);
      setTotalCount(res.data.total ?? reqList.length);
      setTotalPages(Math.max(1, Math.ceil((res.data.total ?? reqList.length) / 12)));
    } catch (err) {
      console.error("Failed to fetch public requests:", err);
      setRequests([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [countryCode, cityName, subjectName, level, mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRequests(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [level, mode, fetchRequests]);

  useEffect(() => {
    fetchRequests(page);
  }, [page, fetchRequests]);

  const LEVELS = ["Primary", "Middle", "Matric", "Intermediate", "O-Level", "A-Level", "University", "Other"];

  const getPageDescription = () => {
    let desc = `Browse active tuition requests from students in ${countryName}`;
    if (cityName) desc = `Browse active tuition requests from students in ${cityName}, ${countryName}`;
    if (subjectName) desc += ` looking for ${subjectName} tutors`;
    desc += ". Post your requirement and receive offers from verified tutors.";
    return desc;
  };

  return (
    <div style={{ backgroundColor: "#f8faff", minHeight: "100vh" }}>
      {/* Hero Header */}
      <section style={{ background: "linear-gradient(135deg, #021550 0%, #0329b2 100%)", color: "white", padding: "3rem 1.5rem 2.5rem" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          {/* Breadcrumb */}
          <nav style={{ fontSize: "0.8rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link href="/tuition-requests" style={{ color: "#bfdbfe", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <ArrowLeft size={14} /> All Countries
            </Link>
            <span style={{ color: "#60a5fa" }}>/</span>
            <span style={{ color: "white" }}>{countryName}</span>
            {cityName && (
              <>
                <span style={{ color: "#60a5fa" }}>/</span>
                <span style={{ color: "white" }}>{cityName}</span>
              </>
            )}
            {subjectName && (
              <>
                <span style={{ color: "#60a5fa" }}>/</span>
                <span style={{ color: "white" }}>{subjectName}</span>
              </>
            )}
          </nav>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "rgba(255, 255, 255, 0.15)", padding: "0.3rem 0.85rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            <Sparkles size={14} color="#60a5fa" /> {countryName} Student Demand
          </div>

          <h1 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)", fontWeight: 900, marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
            {cityName
              ? `${cityName}, ${countryName} — Tuition Requests`
              : `${subjectName ? `${subjectName} Tutors in ` : ""}${countryName} — Student Tuition Requests`}
          </h1>

          <p style={{ color: "#bfdbfe", fontSize: "1rem", maxWidth: 700, margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
            {getPageDescription()}
          </p>

          <div style={{ display: "inline-flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link
              href="/post-tuition-request"
              style={{
                background: "#ffffff",
                color: "#0329b2",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                fontWeight: 800,
                fontSize: "0.9rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              }}
            >
              <PlusCircle size={16} />
              <span>Post My Tuition Request</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Filters */}
        <form
          role="search"
          aria-label="Filter tuition requests"
          onSubmit={(e) => e.preventDefault()}
          style={{
            background: "white",
            borderRadius: "1rem",
            padding: "1.25rem",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(2, 21, 80, 0.04)",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", alignItems: "center" }}>
            <div>
              <label htmlFor="level-filter" className="sr-only">Filter by level</label>
              <select
                id="level-filter"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                  background: "white",
                  color: level ? "#021550" : "#475569",
                }}
              >
                <option value="">All Levels</option>
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mode-filter" className="sr-only">Filter by mode</label>
              <select
                id="mode-filter"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                  background: "white",
                  color: mode ? "#021550" : "#475569",
                }}
              >
                <option value="">All Modes</option>
                <option value="online">Online</option>
                <option value="in-person">Home Tuition</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link
                href="/post-tuition-request"
                style={{
                  background: "#0329b2",
                  color: "white",
                  padding: "0.6rem 1rem",
                  borderRadius: "0.5rem",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  whiteSpace: "nowrap",
                }}
              >
                <PlusCircle size={14} /> Post Request
              </Link>
            </div>
          </div>
        </form>

        {/* Results count */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            color: "#334155",
            fontSize: "0.875rem",
          }}
        >
          <span>
            {loading ? "Loading..." : `Showing ${requests.length} of ${totalCount} active student requirements`}
            {cityName && ` in ${cityName}`}
            {subjectName && ` for ${subjectName}`}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            <ShieldCheck size={14} color="#10b981" /> Privacy Protected
          </span>
        </div>

        {/* Requests Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: "white", borderRadius: "1rem", padding: "1.5rem", border: "1px solid #e2e8f0", minHeight: "200px", animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div style={{ background: "white", borderRadius: "1rem", padding: "4rem 2rem", textAlign: "center", border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
              No Active Requests {cityName ? `in ${cityName}` : `in ${countryName}`}
              {subjectName ? ` for ${subjectName}` : ""}
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: 460, margin: "0 auto 1.5rem" }}>
              Be the first to post a tuition requirement in this area. Receive offers from verified tutors.
            </p>
            <Link
              href="/post-tuition-request"
              style={{
                background: "#0329b2",
                color: "white",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.6rem",
                fontWeight: 700,
                fontSize: "0.88rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <PlusCircle size={16} /> Post Tuition Request
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
            {requests.map((r) => (
              <article
                key={r._id}
                style={{
                  background: "white",
                  borderRadius: "1rem",
                  border: "1.5px solid #e2e8f0",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 8px rgba(2, 21, 80, 0.04)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#021550", margin: 0 }}>{r.subject}</h3>
                    <span style={{ fontSize: "1rem", fontWeight: 900, color: "#021550" }}>
                      {r.currency || "PKR"} {Number(r.budget || 0).toLocaleString()}
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>/{r.pricingUnit || "hr"}</span>
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0329b2", background: "#eef5ff", padding: "0.15rem 0.5rem", borderRadius: "999px" }}>{r.level}</span>
                    <span style={{ fontSize: "0.72rem", background: "#ecfdf5", color: "#059669", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                      ⚡ {r.offersCount || 0} Offers
                    </span>
                    {r.expiresAt && now > 0 && (
                      <span style={{ fontSize: "0.72rem", background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                        ⏱️ {Math.max(1, Math.floor((new Date(r.expiresAt).getTime() - now) / 86400000))}d left
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.75rem" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                      <MapPin size={12} /> {r.city || "Online"}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                      <BookOpen size={12} /> {r.teachingMode === "both" ? "Online/Home" : r.teachingMode}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                      <Clock size={12} /> {r.schedule}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {r.student?.displayTitle || `Student in ${r.city || "Online"}`} · {timeAgo(r.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBidModalRequest(r)}
                    style={{
                      background: "#0329b2",
                      color: "white",
                      border: "none",
                      padding: "0.5rem 0.85rem",
                      borderRadius: "0.4rem",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <Send size={12} /> Send Offer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginTop: "2rem" }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                background: "white",
                border: "1px solid #cbd5e1",
                padding: "0.5rem 0.85rem",
                borderRadius: "0.5rem",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                background: "white",
                border: "1px solid #cbd5e1",
                padding: "0.5rem 0.85rem",
                borderRadius: "0.5rem",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Place Bid Modal */}
      {bidModalRequest && (
        <PlaceBidModal
          request={bidModalRequest as any}
          onClose={() => setBidModalRequest(null)}
          onSuccess={() => {
            setBidModalRequest(null);
            fetchRequests(page);
          }}
        />
      )}
    </div>
  );
}
