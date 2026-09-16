"use client";

import { EligibilityInfo } from "@/types/tracking";
import s from "./tracking.module.css";

export function MarketplaceStatusCard({ eligibility, title = "MARKETPLACE STATUS" }: { eligibility: EligibilityInfo; title?: string }) {
  const variant = eligibility.eligible ? "eligible" : "blocked";
  return (
    <div className={`${s.eligibilityCard} ${s[variant]}`}>
      <div className={s.eligibilityHeader}>
        <p className={s.eligibilityTitle}>{title}</p>
        <span className={s.eligibilityStatus}>{eligibility.eligible ? "Active" : eligibility.since ? "Paused" : "Pending"}</span>
      </div>
      <p className={s.eligibilityMessage}>
        {eligibility.eligible
          ? "Your tutor profile is active on the TUTORERA® marketplace. You may now receive tutoring opportunities and submit offers."
          : (eligibility.reasonIfBlocked || "Complete the required verification steps to unlock the marketplace.")}
      </p>
      {eligibility.since && (
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Since {new Date(eligibility.since).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</p>
      )}
    </div>
  );
}
