"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";

export interface TrustEvidenceProfile {
  averageRating?: number;
  totalReviews?: number;
  experience?: number;
  degreeVerificationStatus?: string;
  cnicVerificationStatus?: string;
  demoVideoStatus?: string;
  policeVerificationStatus?: string;
  badges?: {
    identityVerified?: boolean;
    credentialsVerified?: boolean;
    videoVerified?: boolean;
    experiencedTutor?: boolean;
    topPerformer?: boolean;
  };
}

function EvidenceRow({ label, description, verified }: { label: string; description: string; verified: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0" }}>
      <span aria-hidden="true" style={{ color: verified ? "#059669" : "#94a3b8", fontSize: 13, lineHeight: 1.4 }}>
        {verified ? "✓" : "○"}
      </span>
      <span>
        <strong style={{ display: "block", color: verified ? "#065f46" : "#64748b", fontSize: 12 }}>{label}</strong>
        <span style={{ display: "block", color: "#94a3b8", fontSize: 11, lineHeight: 1.35 }}>{verified ? description : "Not verified or not available for this tutor."}</span>
      </span>
    </div>
  );
}

export default function TrustEvidencePanel({ profile }: { profile?: TrustEvidenceProfile }) {
  const [expanded, setExpanded] = useState(false);
  if (!profile) return null;

  const identityVerified = profile.badges?.identityVerified || profile.cnicVerificationStatus === "approved";
  const credentialsVerified = profile.badges?.credentialsVerified || profile.degreeVerificationStatus === "approved";
  const videoVerified = profile.badges?.videoVerified || profile.demoVideoStatus === "approved";
  const policeCleared = profile.policeVerificationStatus === "approved";
  const reviewCount = profile.totalReviews ?? 0;
  const rating = profile.averageRating ?? 0;
  const verifiedCount = [identityVerified, credentialsVerified, videoVerified, policeCleared].filter(Boolean).length;

  return (
    <div style={{ marginTop: 10, border: "1px solid #dbeafe", borderRadius: 9, background: "#f8faff" }}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", border: 0, background: "transparent", color: "#0329b2", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800 }}>
          <ShieldCheck size={14} />
          {verifiedCount > 0 ? `${verifiedCount} trust checks available` : "Review tutor trust evidence"}
        </span>
        <ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }} />
      </button>
      {expanded && (
        <div style={{ borderTop: "1px solid #dbeafe", padding: "4px 10px 9px" }}>
          <EvidenceRow label="Identity" description="Identity document reviewed by TUTORERA." verified={Boolean(identityVerified)} />
          <EvidenceRow label="Qualifications" description="Education credentials reviewed by TUTORERA." verified={Boolean(credentialsVerified)} />
          <EvidenceRow label="Intro video" description="Video introduction approved for profile display." verified={Boolean(videoVerified)} />
          <EvidenceRow label="Safety screening" description="Police/background document cleared where required by market policy." verified={policeCleared} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 5, paddingTop: 7, borderTop: "1px solid #e2e8f0", color: "#475569", fontSize: 11 }}>
            <span>★ <strong>{rating > 0 ? rating.toFixed(1) : "New"}</strong>{reviewCount > 0 ? ` (${reviewCount} review${reviewCount === 1 ? "" : "s"})` : ""}</span>
            <span><strong>{profile.experience ?? 0}</strong> years experience</span>
          </div>
        </div>
      )}
    </div>
  );
}
