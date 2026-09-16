"use client";

import { StatusHistoryEntry } from "@/types/tracking";
import s from "./tracking.module.css";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

export function StatusHistoryList({ history }: { history: StatusHistoryEntry[] }) {
  if (!history.length) {
    return <p className={s.empty}>No history entries yet.</p>;
  }
  return (
    <ul className={s.historyList}>
      {history.map(entry => (
        <li key={entry.id} className={s.historyItem}>
          <span className={s.historyDate}>{formatDate(entry.at)}</span>
          <p className={s.historyMessage}>{entry.message}</p>
        </li>
      ))}
    </ul>
  );
}
