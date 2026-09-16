"use client";

import { HomeTuitionStatusCard } from "@/components/Tracking/HomeTuitionStatusCard";
import { MarketplaceStatusCard } from "@/components/Tracking/MarketplaceStatusCard";
import { ProgressTimeline } from "@/components/Tracking/ProgressTimeline";
import { StatusHero } from "@/components/Tracking/StatusHero";
import { StatusHistoryList } from "@/components/Tracking/StatusHistoryList";
import s from "@/components/Tracking/tracking.module.css";
import { VerificationChecklist } from "@/components/Tracking/VerificationChecklist";
import { PublicTrackingPayload } from "@/types/tracking";
import { use,useEffect,useState } from "react";

type Params = Promise<{ token: string }>;

export default function PublicTrackPage({ params }: { params: Params }) {
  const { token } = use(params);
  const [payload, setPayload] = useState<PublicTrackingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://tutorera-backend.onrender.com/api/v1";
        const res = await fetch(`${apiBase}/track/tutor/${token}`);
        if (!res.ok) {
          if (!cancelled) setError("Tracking link not found. Please check the URL and try again.");
          return;
        }
        const data = await res.json();
        if (!cancelled) setPayload(data.payload);
      } catch {
        if (!cancelled) setError("Unable to load tracking information right now. Please try again later.");
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (payload) {
      document.title = `${payload.applicationId} — Application status | TUTORERA®`;
      const desc = `Live status for tutor application ${payload.applicationId}. Current status: ${payload.canonicalStatusLabel}.`;
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = desc;
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = `https://tutorera.ac.pk/track/tutor/${token}`;
    }
  }, [payload, token]);

  if (error) {
    return (
      <div className={s.trackingPage}>
        <div className={s.trackingContainer}>
          <div className={s.card}>
            <h1 className={s.trackingTitle}>Tracking link not found</h1>
            <p style={{ color: "#64748b" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className={s.trackingPage}>
        <div className={s.trackingContainer}>
          <div className={s.spinner} />
          <p className={s.empty}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.trackingPage}>
      <div className={s.trackingContainer}>
        <div className={s.trackingHeader}>
          <p className={s.trackingEyebrow}>Public tracking</p>
          <h1 className={s.trackingTitle}>Track Your Tutor Application</h1>
          <p className={s.trackingSubtitle}>
            Live status of a TUTORERA® tutor application. No personal or document data is shown — only verification progress, marketplace eligibility, and history.
          </p>
        </div>

        <StatusHero
          applicationId={payload.applicationId}
          tutorName={payload.tutorName}
          canonicalStatus={payload.canonicalStatus}
          canonicalStatusLabel={payload.canonicalStatusLabel}
          lastUpdatedAt={payload.lastUpdatedAt}
          submittedAt={payload.submittedAt}
        />

        <div className={s.grid} style={{ marginBottom: 16 }}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <p className={s.cardTitle}>Verification progress</p>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#021550" }}>{payload.progress.percent}%</span>
            </div>
            <div className={s.progressBar}><div style={{ width: `${payload.progress.percent}%` }} /></div>
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#64748b" }}>
              {payload.progress.completed} of {payload.progress.total} verification weight complete.
            </p>
          </div>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <p className={s.cardTitle}>Application details</p>
            </div>
            <div className={s.metaRow}><span className={s.metaLabel}>Application ID</span><span className={s.metaValue}>{payload.applicationId}</span></div>
            <div className={s.metaRow}><span className={s.metaLabel}>Submitted on</span><span className={s.metaValue}>{payload.submittedAt ? new Date(payload.submittedAt).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span></div>
            <div className={s.metaRow}><span className={s.metaLabel}>Last updated</span><span className={s.metaValue}>{new Date(payload.lastUpdatedAt).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</span></div>
          </div>
        </div>

        <div className={`${s.grid} ${s.two}`} style={{ marginBottom: 16 }}>
          <MarketplaceStatusCard eligibility={payload.marketplaceEligibility} title="MARKETPLACE STATUS" />
          <HomeTuitionStatusCard eligibility={payload.homeTuitionEligibility} required={payload.homeTuitionRequired} />
        </div>

        <div className={`${s.grid} ${s.two}`} style={{ marginBottom: 16 }}>
          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 12 }}>Verification checklist</p>
            <VerificationChecklist items={payload.verificationChecklist} />
          </div>
          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 12 }}>Application progress</p>
            <ProgressTimeline items={payload.timeline} />
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <p className={s.cardTitle}>Application history</p>
          </div>
          <StatusHistoryList history={payload.history} />
        </div>

        <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, marginTop: 24 }}>
          This is a public tracking page. Sensitive tutor information (CNIC, document URLs, contact details, admin notes) is never shown.
        </p>
      </div>
    </div>
  );
}
