"use client";

import { ChecklistItem } from "@/types/tracking";
import s from "./tracking.module.css";

const ICONS: Record<string, string> = {
  done: "✓",
  rejected: "✕",
  pending: "•",
  not_required: "—",
};

const STATUS_LABELS: Record<string, string> = {
  done: "Completed",
  rejected: "Needs attention",
  pending: "Under review",
  not_required: "Not required",
};

export function VerificationChecklist({ items }: { items: ChecklistItem[] }) {
  if (!items.length) {
    return <p className={s.empty}>No checklist items yet.</p>;
  }
  return (
    <div className={s.checklist}>
      {items.map(item => (
        <div key={item.key} className={`${s.checklistItem} ${s[item.status]}`}>
          <div className={s.checklistIcon} aria-hidden>{ICONS[item.status] || "•"}</div>
          <div style={{ flex: 1 }}>
            <p className={s.checklistLabel}>
              {item.label} {item.required && <span style={{ color: "#ef4444" }}>*</span>}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{STATUS_LABELS[item.status]}</p>
            {item.note && <p className={s.checklistNote}>{item.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
