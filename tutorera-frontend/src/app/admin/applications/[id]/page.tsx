"use client";

import s from "@/components/Tracking/tracking.module.css";
import api from "@/lib/axios";
import { formatDateLong } from "@/lib/site";
import { showError,showSuccess } from "@/lib/toast";
import { use,useEffect,useState } from "react";

type Params = Promise<{ id: string }>;

interface ApplicationDetail {
  applicationId: string;
  tutorUserId: string;
  tutorName: string;
  tutorEmail: string;
  isActive: boolean;
  profile: {
    _id: string;
    fullName: string;
    phone: string;
    city: string;
    gender: string;
    dateOfBirth: string;
    bio: string;
    subjects: string[];
    levels: string[];
    hourlyRate: number;
    teachingMode: string;
    education: { degree: string; institution: string; year: number; degreeDoc: string }[];
    cnicFront: string;
    cnicBack: string;
    videoIntro: string;
    policeCertificate: string;
    verificationStatus: string;
    rejectionReason: string;
    onboardingComplete: boolean;
    cnicVerificationStatus: string;
    cnicRejectionReason: string;
    degreeVerificationStatus: string;
    degreeRejectionReason: string;
    demoVideoStatus: string;
    demoVideoRejectionReason: string;
    policeVerificationStatus: string;
    policeRejectionReason: string;
    marketplaceEligible: boolean;
    homeTuitionEligible: boolean;
    suspendedAt: string | null;
    reVerificationRequired: boolean;
    createdAt: string;
  };
  history: { id: string; at: string; event: string; message: string; actor: string; actorRole: string }[];
}

export default function AdminApplicationDetailPage({ params }: { params: Params }) {
  const { id } = use(params);
  const [data, setData] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<string>("");
  const [busyKey, setBusyKey] = useState<string>("");

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tracking/admin/applications/${id}`);
      setData(res.data.application);
    } catch {
      setError("Failed to load application");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = async (
    endpoint: string,
    status: string,
    label: string
  ) => {
    setBusyKey(`${endpoint}-${status}`);
    try {
      await api.patch(`/tracking/admin/applications/${id}/${endpoint}`, {
        status,
        reason: reasonFor || undefined,
      });
      showSuccess(`${label} ${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "updated"}`);
      setReasonFor("");
      await fetchDetail();
    } catch (err) {
      showError(err, `Failed to ${label.toLowerCase()}`);
    } finally {
      setBusyKey("");
    }
  };

  const handleToggleEligibility = async (kind: "marketplace" | "home-tuition", eligible: boolean) => {
    setBusyKey(`${kind}-${eligible}`);
    try {
      await api.patch(`/tracking/admin/applications/${id}/${kind}`, { eligible, reason: reasonFor || undefined });
      showSuccess(`${kind === "marketplace" ? "Marketplace" : "Home tuition"} ${eligible ? "enabled" : "disabled"}`);
      setReasonFor("");
      await fetchDetail();
    } catch (err) {
      showError(err, "Failed to update eligibility");
    } finally {
      setBusyKey("");
    }
  };

  const handleSuspend = async (suspended: boolean) => {
    setBusyKey(`suspend-${suspended}`);
    try {
      await api.patch(`/tracking/admin/applications/${id}/suspended`, { suspended, reason: reasonFor || undefined });
      showSuccess(suspended ? "Profile suspended" : "Profile re-instated");
      setReasonFor("");
      await fetchDetail();
    } catch (err) {
      showError(err, "Failed to update suspension");
    } finally {
      setBusyKey("");
    }
  };

  const handleReverification = async (required: boolean) => {
    setBusyKey(`reverify-${required}`);
    try {
      await api.patch(`/tracking/admin/applications/${id}/reverification`, { required, reason: reasonFor || undefined });
      showSuccess(required ? "Re-verification requested" : "Re-verification cleared");
      setReasonFor("");
      await fetchDetail();
    } catch (err) {
      showError(err, "Failed to update re-verification");
    } finally {
      setBusyKey("");
    }
  };

  const handleViewDocument = async (field: string) => {
    try {
      const res = await api.get(`/admin/tutors/${id}/document/${field}`);
      window.open(res.data.url, "_blank");
    } catch {
      showError("Failed to load document");
    }
  };

  if (loading) {
    return <div className={s.trackingPage}><div className={s.trackingContainer}><div className={s.spinner} /></div></div>;
  }
  if (error || !data) {
    return (
      <div className={s.trackingPage}>
        <div className={s.trackingContainer}>
          <div className={s.card}>
            <h1>Application not found</h1>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const p = data.profile;
  const isPoliceRequired = p.teachingMode === "in-person" || p.teachingMode === "both";

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0329B2", margin: "0 0 6px" }}>Admin · Applications</p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#021550", margin: "0 0 4px" }}>{data.tutorName}</h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 16px" }}>
          {data.applicationId} · {data.tutorEmail} · Submitted {formatDateLong(p.createdAt)}
        </p>

        <div className={`${s.grid} ${s.two}`} style={{ marginBottom: 16 }}>
          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 12 }}>CNIC verification</p>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 8px" }}>Current: <strong>{p.cnicVerificationStatus}</strong></p>
            {p.cnicRejectionReason && <p style={{ fontSize: 12, color: "#b91c1c", margin: "0 0 8px" }}>Last reason: {p.cnicRejectionReason}</p>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => handleViewDocument("cnicFront")} style={btnSecondaryStyle}>View front</button>
              <button onClick={() => handleViewDocument("cnicBack")} style={btnSecondaryStyle}>View back</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <button disabled={busyKey === "cnic-approved"} onClick={() => handleAction("cnic", "approved", "CNIC")} style={btnSuccessStyle}>Approve</button>
              <button disabled={busyKey === "cnic-rejected"} onClick={() => handleAction("cnic", "rejected", "CNIC")} style={btnDangerStyle}>Reject</button>
              <button disabled={busyKey === "cnic-pending"} onClick={() => handleAction("cnic", "pending", "CNIC")} style={btnSecondaryStyle}>Mark pending</button>
            </div>
          </div>

          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 12 }}>Educational documents</p>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 8px" }}>Current: <strong>{p.degreeVerificationStatus}</strong></p>
            {p.degreeRejectionReason && <p style={{ fontSize: 12, color: "#b91c1c", margin: "0 0 8px" }}>Last reason: {p.degreeRejectionReason}</p>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => handleViewDocument("degreeDoc")} style={btnSecondaryStyle}>View document</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <button disabled={busyKey === "degree-approved"} onClick={() => handleAction("degree", "approved", "Degree")} style={btnSuccessStyle}>Approve</button>
              <button disabled={busyKey === "degree-rejected"} onClick={() => handleAction("degree", "rejected", "Degree")} style={btnDangerStyle}>Reject</button>
              <button disabled={busyKey === "degree-pending"} onClick={() => handleAction("degree", "pending", "Degree")} style={btnSecondaryStyle}>Mark pending</button>
            </div>
          </div>

          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 12 }}>Demo video</p>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 8px" }}>Current: <strong>{p.demoVideoStatus}</strong></p>
            {p.demoVideoRejectionReason && <p style={{ fontSize: 12, color: "#b91c1c", margin: "0 0 8px" }}>Last reason: {p.demoVideoRejectionReason}</p>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <a href={p.videoIntro} target="_blank" rel="noreferrer" style={btnSecondaryStyle}>Open video URL</a>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <button disabled={busyKey === "demo-video-approved"} onClick={() => handleAction("demo-video", "approved", "Demo video")} style={btnSuccessStyle}>Approve</button>
              <button disabled={busyKey === "demo-video-rejected"} onClick={() => handleAction("demo-video", "rejected", "Demo video")} style={btnDangerStyle}>Reject</button>
              <button disabled={busyKey === "demo-video-pending"} onClick={() => handleAction("demo-video", "pending", "Demo video")} style={btnSecondaryStyle}>Mark pending</button>
            </div>
          </div>

          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 12 }}>Police verification {isPoliceRequired ? "" : "(not required)"}</p>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 8px" }}>Current: <strong>{p.policeVerificationStatus}</strong></p>
            {p.policeRejectionReason && <p style={{ fontSize: 12, color: "#b91c1c", margin: "0 0 8px" }}>Last reason: {p.policeRejectionReason}</p>}
            {isPoliceRequired && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => handleViewDocument("policeCertificate")} style={btnSecondaryStyle}>View certificate</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <button disabled={busyKey === "police-approved"} onClick={() => handleAction("police", "approved", "Police")} style={btnSuccessStyle}>Approve</button>
              <button disabled={busyKey === "police-rejected"} onClick={() => handleAction("police", "rejected", "Police")} style={btnDangerStyle}>Reject</button>
              <button disabled={busyKey === "police-pending"} onClick={() => handleAction("police", "pending", "Police")} style={btnSecondaryStyle}>Mark pending</button>
            </div>
          </div>
        </div>

        <div className={s.card} style={{ marginBottom: 16 }}>
          <p className={s.cardTitle} style={{ marginBottom: 12 }}>Reason (optional for approve, required for reject)</p>
          <textarea
            value={reasonFor}
            onChange={e => setReasonFor(e.target.value)}
            placeholder="Visible to the tutor in the rejection email and tracking page."
            style={{ width: "100%", minHeight: 70, padding: 10, border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}
          />
        </div>

        <div className={`${s.grid} ${s.three}`} style={{ marginBottom: 16 }}>
          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 8 }}>Marketplace eligibility</p>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px" }}>Currently <strong>{p.marketplaceEligible ? "enabled" : "disabled"}</strong></p>
            <div style={{ display: "flex", gap: 6 }}>
              <button disabled={busyKey === "marketplace-true"} onClick={() => handleToggleEligibility("marketplace", true)} style={btnSuccessStyle}>Enable</button>
              <button disabled={busyKey === "marketplace-false"} onClick={() => handleToggleEligibility("marketplace", false)} style={btnSecondaryStyle}>Disable</button>
            </div>
          </div>
          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 8 }}>Home tuition eligibility</p>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px" }}>Currently <strong>{p.homeTuitionEligible ? "enabled" : "disabled"}</strong></p>
            <div style={{ display: "flex", gap: 6 }}>
              <button disabled={busyKey === "home-tuition-true"} onClick={() => handleToggleEligibility("home-tuition", true)} style={btnSuccessStyle}>Enable</button>
              <button disabled={busyKey === "home-tuition-false"} onClick={() => handleToggleEligibility("home-tuition", false)} style={btnSecondaryStyle}>Disable</button>
            </div>
          </div>
          <div className={s.card}>
            <p className={s.cardTitle} style={{ marginBottom: 8 }}>Lifecycle controls</p>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px" }}>
              Suspended: <strong>{p.suspendedAt ? "Yes" : "No"}</strong> · Re-verification: <strong>{p.reVerificationRequired ? "Required" : "No"}</strong>
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button disabled={busyKey === "suspend-true"} onClick={() => handleSuspend(true)} style={btnDangerStyle}>Suspend</button>
              <button disabled={busyKey === "suspend-false"} onClick={() => handleSuspend(false)} style={btnSecondaryStyle}>Reinstate</button>
              <button disabled={busyKey === "reverify-true"} onClick={() => handleReverification(true)} style={btnSecondaryStyle}>Require re-verify</button>
              <button disabled={busyKey === "reverify-false"} onClick={() => handleReverification(false)} style={btnSecondaryStyle}>Clear</button>
            </div>
          </div>
        </div>

        <div className={s.card}>
          <p className={s.cardTitle} style={{ marginBottom: 12 }}>Application history</p>
          {data.history.length === 0 ? (
            <p className={s.empty}>No history entries yet.</p>
          ) : (
            <ul className={s.historyList}>
              {data.history.map(h => (
                <li key={h.id} className={s.historyItem}>
                  <span className={s.historyDate}>{formatDateLong(h.at)}</span>
                  <p className={s.historyMessage}><strong>{h.event}</strong> — {h.message} <span style={{ color: "#94a3b8" }}>({h.actor})</span></p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const btnSecondaryStyle: React.CSSProperties = { background: "#fff", color: "#021550", border: "1px solid #cbd5e1", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" };
const btnSuccessStyle: React.CSSProperties = { background: "#16a34a", color: "#fff", border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnDangerStyle: React.CSSProperties = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
