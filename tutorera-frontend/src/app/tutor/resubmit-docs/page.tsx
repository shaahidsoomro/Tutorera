"use client";

import { DocumentResubmitPanel } from "@/components/Tracking/DocumentResubmitPanel";
import s from "@/components/Tracking/tracking.module.css";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { AuthenticatedTrackingPayload } from "@/types/tracking";
import { ArrowLeft,Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback,useEffect,useState } from "react";

export default function TutorResubmitDocsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payload, setPayload] = useState<AuthenticatedTrackingPayload | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayload = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get("/tracking/application-status");
      setPayload(res.data.payload);
      setFetchError(null);
    } catch (err: any) {
      setFetchError(err?.response?.data?.message || "Unable to load your application status.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "tutor") { router.replace("/dashboard"); return; }
    fetchPayload();
  }, [user, loading, router, fetchPayload]);

  if (loading || (!payload && !fetchError)) {
    return (
      <div className={s.trackingPage}>
        <div className={s.trackingContainer}>
          <div className={s.spinner} />
          <p className={s.empty}>Loading your document status…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={s.trackingPage}>
        <div className={s.trackingContainer}>
          <div className={s.card}>
            <p style={{ color: "#b91c1c", marginBottom: 16 }}>{fetchError}</p>
            <Link href="/tutor/application-status" className={s.ctaButton}>Back to application status</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.trackingPage}>
      <div className={s.trackingContainer}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/tutor/application-status" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", textDecoration: "none" }}>
            <ArrowLeft aria-hidden="true" size={15} /> Back to application status
          </Link>
        </div>

        {/* Page header */}
        <div className={s.trackingHeader}>
          <p className={s.trackingEyebrow}>Tutor account</p>
          <h1 className={s.trackingTitle}>Document Resubmission</h1>
          <p className={s.trackingSubtitle}>
            Upload corrected verification documents below. Once submitted, our team will review within 24–48 hours
            and your application status will update automatically.
          </p>
        </div>

        {/* Status overview */}
        {payload && (
          <div className={s.grid} style={{ marginBottom: 16 }}>
            <div className={s.card}>
              <div className={s.cardHeader}>
                <p className={s.cardTitle}>Current status</p>
                {refreshing && <span style={{ fontSize: 12, color: "#94a3b8" }}>Refreshing…</span>}
              </div>
              <div className={s.metaRow}>
                <span className={s.metaLabel}>Application ID</span>
                <span className={s.metaValue}>{payload.applicationId}</span>
              </div>
              <div className={s.metaRow}>
                <span className={s.metaLabel}>Overall status</span>
                <span className={s.metaValue}>{payload.canonicalStatusLabel}</span>
              </div>
              <div className={s.metaRow}>
                <span className={s.metaLabel}>Re-verification required</span>
                <span className={s.metaValue} style={{ color: payload.reVerificationRequired ? "#b91c1c" : "#16a34a" }}>
                  {payload.reVerificationRequired ? "Yes — action required" : "No"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Resubmit panel */}
        {payload?.verificationComponents && (
          <DocumentResubmitPanel
            components={payload.verificationComponents}
            policeRequired={payload.homeTuitionRequired}
            onResubmitted={() => {
              // Re-fetch status after successful resubmission
              setTimeout(() => fetchPayload(), 1000);
            }}
          />
        )}

        {/* Help section */}
        <div className={s.card} style={{ marginTop: 16 }}>
          <div className={s.cardHeader}>
            <p className={s.cardTitle}>Need help?</p>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>
            If you&apos;re unsure what to upload or have questions about the verification process, our support team is ready to assist.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a
              href="mailto:support@tutorera.ac.pk"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
            >
              <Mail aria-hidden="true" size={15} /> Email support
            </a>
            <Link
              href="/tutor/application-status"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", textDecoration: "none" }}
            >
              <ArrowLeft aria-hidden="true" size={15} /> View full application status
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
