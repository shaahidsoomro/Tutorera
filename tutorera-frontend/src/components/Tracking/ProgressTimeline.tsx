"use client";

import { TimelineCheckpoint } from "@/types/tracking";
import s from "./tracking.module.css";

export function ProgressTimeline({ items }: { items: TimelineCheckpoint[] }) {
  if (!items.length) {
    return <p className={s.empty}>No timeline entries yet.</p>;
  }
  return (
    <ul className={s.timeline}>
      {items.map(item => (
        <li key={item.key} className={`${s.timelineItem} ${s[item.status] || ""}`}>
          <p className={s.timelineLabel}>{item.label}</p>
          <p className={s.timelineDate}>
            {item.at ? new Date(item.at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : item.status === "skipped" ? "Not required" : "Pending"}
          </p>
        </li>
      ))}
    </ul>
  );
}
