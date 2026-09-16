"use client";

import { useCurrentTime } from "@/hooks/useCurrentTime";
import api from "@/lib/axios";
import { timeAgo } from "@/lib/site";
import { ArrowRight,BookOpen,ChevronLeft,ChevronRight,Clock,MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect,useMemo,useState } from "react";
import s from "./TopRequestsSection.module.css";

interface RequestPreview {
  _id: string;
  subject: string;
  level: string;
  pricingUnit?: "hour" | "session" | "month" | "course";
  budget?: number;
  currency?: string;
  offersCount?: number;
  teachingMode: string;
  city?: string;
  schedule: string;
  createdAt: string;
  expiresAt?: string;
  student?: { name?: string; city?: string; avatar?: string };
  sessionDurationMinutes?: number;
  sessionsPerWeek?: number;
}

const LIMIT = 12;

function initials(name?: string): string {
  if (!name) return "S";
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "S";
}

export default function TopRequestsSection() {
  const now = useCurrentTime();
  const [requests, setRequests] = useState<RequestPreview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  useEffect(() => {
    setLoading(true);
    setErrored(false);
    api
      .get(`/requests/public/preview?limit=${LIMIT}&page=${page}`)
      .then((res) => {
        setRequests(res.data.requests || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => {
        setErrored(true);
        setRequests([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const loadingSkeletons = Array.from({ length: 6 });

  return (
    <section className={s.root} aria-labelledby="requests-title">
      <div className={s.container}>
        <header className={s.head}>
          <p className={s.eyebrow}>Live student demand</p>
          <h2 id="requests-title">Students Looking for Tutors Right Now</h2>
          <p className={s.subtitle}>
            Browse active tuition requests published through TUTORERA to see how offers and matching work, or post your own requirement.
          </p>
        </header>

        {loading && (
          <div className={s.grid}>
            {loadingSkeletons.map((_, index) => (
              <div key={`skeleton-${index}`} className={s.skeleton} style={{ animationDelay: `${index * 45}ms` }} aria-hidden="true" />
            ))}
          </div>
        )}

        {!loading && errored && <p className={s.message}>Couldn&apos;t load requests right now. Please try again later.</p>}

        {!loading && !errored && requests.length === 0 ? (
          <div className={s.empty}>
            <p>Be among the first students to post. Tell us what you need and let eligible matching tutors respond.</p>
            <Link className={s.primaryCta} href="/post-tuition-request">Post My Tuition Request</Link>
          </div>
        ) : (
          !loading && !errored && (
            <div className={s.grid}>
              {requests.map((request, index) => {
                const hasBudget = Number.isFinite(Number(request.budget)) && Number(request.budget) > 0;
                const offerCount = typeof request.offersCount === "number" && request.offersCount >= 0 ? request.offersCount : null;
                const studentFirstName = request.student?.name?.trim()?.split(" ")[0];
                const location = request.city || request.student?.city;

                return (
                  <article key={request._id} className={s.card} style={{ animationDelay: `${index * 75}ms` }}>
                    <header className={s.cardHead}>
                      <h3>{request.subject}</h3>
                      {hasBudget && (
                        <span className={s.price}>
                          {request.currency || "PKR"} {Number(request.budget).toLocaleString()}/{request.pricingUnit || "hour"}
                        </span>
                      )}
                    </header>

                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <span className={s.levelBadge}>{request.level}</span>
                      {offerCount !== null && (
                        <span style={{ fontSize: "0.72rem", background: "#ecfdf5", color: "#059669", padding: "0.2rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                          {offerCount} Offer{offerCount === 1 ? "" : "s"}
                        </span>
                      )}
                      {request.expiresAt && now > 0 && new Date(request.expiresAt).getTime() > now && (
                        <span style={{ fontSize: "0.72rem", background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", padding: "0.2rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                          {Math.max(1, Math.ceil((new Date(request.expiresAt).getTime() - now) / 86400000))}d left
                        </span>
                      )}
                    </div>

                    <ul className={s.metaRow}>
                      <li><BookOpen size={13} aria-hidden="true" /> {request.teachingMode}</li>
                      {request.city && <li><MapPin size={13} aria-hidden="true" /> {request.city}</li>}
                      <li><Clock size={13} aria-hidden="true" /> {request.schedule}</li>
                      {request.sessionDurationMinutes && request.sessionsPerWeek && (
                        <li><Clock size={13} aria-hidden="true" /> {request.sessionsPerWeek}x/wk · {request.sessionDurationMinutes} min</li>
                      )}
                    </ul>

                    <footer className={s.cardFooter}>
                      <span className={s.avatar} aria-hidden="true">{initials(request.student?.name)}</span>
                      <span className={s.studentName}>
                        {studentFirstName ? `${studentFirstName}${location ? ` in ${location}` : ""}` : location ? `Student in ${location}` : "Student"}
                      </span>
                      <span className={s.posted}>Posted {timeAgo(request.createdAt)}</span>
                    </footer>
                  </article>
                );
              })}
            </div>
          )
        )}

        {!loading && !errored && total > 0 && totalPages > 1 && (
          <nav className={s.pagination} aria-label="Requests pages">
            <button type="button" className={s.pageBtn} onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label="Previous page">
              <ChevronLeft size={16} />
            </button>
            <span className={s.pageInfo}>Page {page} of {totalPages}</span>
            <button type="button" className={s.pageBtn} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} aria-label="Next page">
              <ChevronRight size={16} />
            </button>
          </nav>
        )}

        {!loading && !errored && (
          <div className={s.browseAll}>
            <Link className={s.textLink} href="/browse-requests">Browse all tuition requests <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        )}
      </div>
    </section>
  );
}
