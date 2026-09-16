"use client";

import { ActionRequired } from "@/types/tracking";
import Link from "next/link";
import s from "./tracking.module.css";

export function ActionRequiredPanel({ action, danger = false }: { action: ActionRequired; danger?: boolean }) {
  return (
    <div className={`${s.actionRequired} ${danger ? s.danger : ""}`} role="alert">
      <h3>⚠️ Action required: {action.title}</h3>
      <p>{action.body}</p>
      <Link href={action.cta.href} className={s.ctaButton}>{action.cta.label}</Link>
    </div>
  );
}
