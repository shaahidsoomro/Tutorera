"use client";

import { ComponentStatus } from "@/types/tracking";
import s from "./tracking.module.css";

export function DemoVideoCard({ status, publicProfileVisible, rejectionReason }: { status: ComponentStatus; publicProfileVisible: boolean; rejectionReason: string | null }) {
  let label = "Not submitted";
  let variant: "done" | "pending" | "rejected" = "pending";
  if (status === "approved") { label = "Approved"; variant = "done"; }
  else if (status === "rejected") { label = "Rejected"; variant = "rejected"; }
  else if (status === "pending") { label = "Under review"; variant = "pending"; }
  return (
    <div className={`${s.checklistItem} ${s[variant]}`}>
      <div className={s.checklistIcon} aria-hidden>{variant === "done" ? "✓" : variant === "rejected" ? "✕" : "•"}</div>
      <div style={{ flex: 1 }}>
        <p className={s.checklistLabel}>Demo video</p>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{label} · Public profile: {publicProfileVisible ? "Visible" : "Hidden until approval"}</p>
        {rejectionReason && <p className={s.checklistNote}>{rejectionReason}</p>}
      </div>
    </div>
  );
}
