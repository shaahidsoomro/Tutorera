"use client";

import { EligibilityInfo } from "@/types/tracking";
import s from "./tracking.module.css";

export function HomeTuitionStatusCard({ eligibility, required }: { eligibility: EligibilityInfo; required: boolean }) {
  if (!required) {
    return (
      <div className={`${s.eligibilityCard} ${s.pending}`}>
        <div className={s.eligibilityHeader}>
          <p className={s.eligibilityTitle}>HOME / IN-PERSON TUITION</p>
          <span className={s.eligibilityStatus}>Not required (Online Tutor)</span>
        </div>
        <p className={s.eligibilityMessage}>
          Your teaching mode is <strong>Online Only</strong>. <strong>No Police Verification is required</strong> for online tuition. To offer in-person Home Tuition, you must submit an official Police Verification Report.
        </p>
      </div>
    );
  }
  const variant = eligibility.eligible ? "eligible" : "blocked";
  const label = eligibility.eligible ? "Eligible" : eligibility.since ? "Paused" : "Police Report Required";
  return (
    <div className={`${s.eligibilityCard} ${s[variant]}`}>
      <div className={s.eligibilityHeader}>
        <p className={s.eligibilityTitle}>HOME / IN-PERSON TUITION</p>
        <span className={s.eligibilityStatus}>{label}</span>
      </div>
      <p className={s.eligibilityMessage}>
        {eligibility.eligible
          ? "🛡️ Verified Police Character Certificate approved. You are authorized to accept and conduct Home Tuition."
          : (eligibility.reasonIfBlocked || "⚠️ Mandatory Police Verification Report required before you can accept Home Tuition requests.")}
      </p>
      {eligibility.since && (
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Since {new Date(eligibility.since).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</p>
      )}
    </div>
  );
}
