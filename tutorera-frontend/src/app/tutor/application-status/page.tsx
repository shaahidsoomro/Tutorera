"use client";

import { ActionRequiredPanel } from "@/components/Tracking/ActionRequiredPanel";
import { DemoVideoCard } from "@/components/Tracking/DemoVideoCard";
import { HomeTuitionStatusCard } from "@/components/Tracking/HomeTuitionStatusCard";
import { MarketplaceStatusCard } from "@/components/Tracking/MarketplaceStatusCard";
import { ProgressTimeline } from "@/components/Tracking/ProgressTimeline";
import { StatusHero } from "@/components/Tracking/StatusHero";
import { StatusHistoryList } from "@/components/Tracking/StatusHistoryList";
import s from "@/components/Tracking/tracking.module.css";
import { TrackingUrlBlock } from "@/components/Tracking/TrackingUrlBlock";
import { VerificationChecklist } from "@/components/Tracking/VerificationChecklist";
import { VerifiedBadgeCard } from "@/components/Tracking/VerifiedBadgeCard";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { AuthenticatedTrackingPayload } from "@/types/tracking";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

export default function TutorApplicationStatusPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payload, setPayload] = useState<AuthenticatedTrackingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "tutor") {
      router.replace("/dashboard");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/tracking/application-status");
        if (!cancelled) setPayload(res.data.payload);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Unable to load your application status right now.");
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className={s.trackingPage}>
        <div className={s.trackingContainer}>
          <div className={s.spinner} />
          <p className={s.empty}>Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.trackingPage}>
        <div className={s.trackingContainer}>
          <div className={s.card}>
            <h1 className={s.trackingTitle}>Application status</h1>
            <p style={{ color: "#b91c1c" }}>{error}</p>
            <Link href="/dashboard" className={s.ctaButton}>Back to dashboard</Link>
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
        </div>
      </div>
    );
  }

  const showActionRequired = payload.actionRequired && (payload.canonicalStatus === "ACTION_REQUIRED" || payload.canonicalStatus === "RE_VERIFICATION_REQUIRED");

  return (
    <div className={s.trackingPage}>
      <div className={s.trackingContainer}>
        <div className={s.trackingHeader}>
          <p className={s.trackingEyebrow}>Tutor account</p>
          <h1 className={s.trackingTitle}>Track Your Tutor Application</h1>
          <p className={s.trackingSubtitle}>
            Live status of your tutor verification, marketplace activation, and home tuition eligibility. The page updates automatically whenever our team reviews your application.
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

        {/* Rejection alert — shown when any component is rejected */}
        {payload.verificationComponents && (
          (() => {
            const vc = payload.verificationComponents;
            const rejectedItems = [
              vc.cnic.status === "rejected" && "CNIC",
              vc.degree.status === "rejected" && "Degree document",
              vc.demoVideo.status === "rejected" && "Demo video",
              vc.police.status === "rejected" && "Police certificate",
            ].filter(Boolean) as string[];
            if (rejectedItems.length === 0) return null;
            return (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 8,
              }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#991b1b", fontSize: 15 }}>
                    <AlertTriangle aria-hidden="true" size={17} style={{ verticalAlign: "text-bottom", marginRight: 6 }} /> Action Required — {rejectedItems.length} document{rejectedItems.length !== 1 ? "s" : ""} rejected
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#7f1d1d" }}>
                    {rejectedItems.join(", ")} — please re-upload corrected files.
                  </p>
                </div>
                <Link
                  href="/tutor/resubmit-docs"
                  style={{
                    display: "inline-block",
                    padding: "10px 20px",
                    background: "#dc2626",
                    color: "#fff",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Re-upload Documents →
                </Link>
              </div>
            );
          })()
        )}

        {showActionRequired && payload.actionRequired && (
          <ActionRequiredPanel action={payload.actionRequired} danger={payload.canonicalStatus === "RE_VERIFICATION_REQUIRED"} />
        )}

        <div className={s.grid} style={{ marginBottom: 16 }}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <p className={s.cardTitle}>Verification progress</p>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#021550" }}>{payload.progress.percent}%</span>
            </div>
            <div className={s.progressBar}><div style={{ width: `${payload.progress.percent}%` }} /></div>
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#64748b" }}>
              {payload.progress.completed} of {payload.progress.total} verification weight complete. Some items (e.g. demo video, CNIC) require admin review.
            </p>
          </div>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <p className={s.cardTitle}>Application details</p>
            </div>
            <div className={s.metaRow}><span className={s.metaLabel}>Application ID</span><span className={s.metaValue}>{payload.applicationId}</span></div>
            <div className={s.metaRow}><span className={s.metaLabel}>Tutor name</span><span className={s.metaValue}>{payload.tutorName}</span></div>
            <div className={s.metaRow}><span className={s.metaLabel}>Submitted on</span><span className={s.metaValue}>{payload.submittedAt ? new Date(payload.submittedAt).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span></div>
            <div className={s.metaRow}><span className={s.metaLabel}>Last updated</span><span className={s.metaValue}>{new Date(payload.lastUpdatedAt).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</span></div>
            <div className={s.metaRow}><span className={s.metaLabel}>Re-verification</span><span className={s.metaValue}>{payload.reVerificationRequired ? "Required" : "Not required"}</span></div>
            {payload.suspended && <div className={s.metaRow}><span className={s.metaLabel}>Suspended</span><span className={s.metaValue} style={{ color: "#b91c1c" }}>{payload.suspendedReason || "Yes"}</span></div>}
          </div>
        </div>

        <div className={`${s.grid} ${s.two}`} style={{ marginBottom: 16 }}>
          <MarketplaceStatusCard eligibility={payload.marketplaceEligibility} />
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

        <div className={`${s.grid} ${s.two}`} style={{ marginBottom: 16 }}>
          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 12 }}>Demo video</p>
            <DemoVideoCard
              status={payload.demoVideo.status}
              publicProfileVisible={payload.demoVideo.publicProfileVisible}
              rejectionReason={payload.demoVideo.rejectionReason}
            />
          </div>
          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 12 }}>Verified badge</p>
            <VerifiedBadgeCard verified={payload.verifiedBadge} />
          </div>
        </div>

        <div className={s.card} style={{ marginBottom: 16 }}>
          <p className={s.cardTitle} style={{ marginBottom: 12 }}>Public tracking link</p>
          <TrackingUrlBlock applicationId={payload.applicationId} token={payload.trackingToken} />
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <p className={s.cardTitle}>Application history</p>
          </div>
          <StatusHistoryList history={payload.history} />
        </div>
      </div>
    </div>
  );
}
