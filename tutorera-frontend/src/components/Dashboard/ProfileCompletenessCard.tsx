"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";

const C = UI_COLORS;

interface CheckItem {
  key: string;
  label: string;
  done: boolean;
  points: number;
  cta?: string;
}

interface ProfileScore {
  score: number;
  earnedPoints: number;
  totalPoints: number;
  items: CheckItem[];
}

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = circ * (score / 100);
  const color = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  return (
    <svg width={72} height={72} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={36} cy={36} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x={36} y={36} textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: "36px 36px", fontSize: 15, fontWeight: 800, fill: color }}>
        {score}%
      </text>
    </svg>
  );
}

export default function ProfileCompletenessCard() {
  const [data, setData] = useState<ProfileScore | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/tutors/profile/score")
      .then(res => { if (res.data?.score !== undefined) setData(res.data); })
      .catch(() => {});
  }, []);

  if (!data || data.score === 100) return null;

  const missing = data.items.filter(i => !i.done);
  const color = data.score >= 80 ? "#16a34a" : data.score >= 50 ? "#d97706" : "#dc2626";
  const bg = data.score >= 80 ? "#f0fdf4" : data.score >= 50 ? "#fffbeb" : "#fef2f2";
  const border = data.score >= 80 ? "#bbf7d0" : data.score >= 50 ? "#fde68a" : "#fecaca";

  return (
    <div style={{ backgroundColor: bg, border: `1.5px solid ${border}`, borderRadius: "0.875rem", padding: "1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <ScoreRing score={data.score} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, color: C.primary, fontSize: "0.95rem", margin: "0 0 0.2rem" }}>
            Profile {data.score >= 80 ? "Looking Strong" : data.score >= 50 ? "Needs Attention" : "Incomplete"}
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: 0 }}>
            {missing.length > 0
              ? `${missing.length} item${missing.length > 1 ? "s" : ""} missing — complete your profile to increase booking rates.`
              : "Your profile is complete!"}
          </p>
        </div>
        {missing.length > 0 && (
          <button onClick={() => setOpen(v => !v)}
            style={{ padding: "0.45rem 1rem", backgroundColor: "white", border: `1.5px solid ${border}`, borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.8rem", color: C.primary, cursor: "pointer", flexShrink: 0 }}>
            {open ? "Hide" : "See checklist"}
          </button>
        )}
      </div>

      {open && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {data.items.map(item => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.75rem", backgroundColor: "white", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>{item.done ? "✅" : "⭕"}</span>
              <span style={{ flex: 1, fontSize: "0.85rem", color: item.done ? "#6b7280" : C.primary, fontWeight: item.done ? 400 : 600, textDecoration: item.done ? "line-through" : "none" }}>
                {item.label}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600, minWidth: 40, textAlign: "right" }}>+{item.points}pts</span>
              {!item.done && item.cta && (
                <Link href={item.cta}
                  style={{ fontSize: "0.75rem", color: color, fontWeight: 700, textDecoration: "none", padding: "0.25rem 0.6rem", border: `1px solid ${border}`, borderRadius: "0.35rem", whiteSpace: "nowrap" }}>
                  Fix →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
