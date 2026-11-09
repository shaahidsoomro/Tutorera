import { UI_COLORS } from "@/lib/brand";
import { Award, TrendingUp } from "lucide-react";

const C = UI_COLORS;

interface ProfileScoreBadgeProps {
  score: number;
  maxScore?: number;
  showDetails?: boolean;
  compact?: boolean;
}

export function ProfileScoreBadge({
  score,
  maxScore = 100,
  showDetails = true,
  compact = false,
}: ProfileScoreBadgeProps) {
  const scorePercent = Math.round((score / maxScore) * 100);

  let level: "beginner" | "intermediate" | "advanced" | "expert" = "beginner";
  let label = "Building";
  let color = "#f59e0b";

  if (scorePercent >= 75) {
    level = "expert";
    label = "Expert";
    color = "#10b981";
  } else if (scorePercent >= 50) {
    level = "advanced";
    label = "Advanced";
    color = "#3b82f6";
  } else if (scorePercent >= 25) {
    level = "intermediate";
    label = "Intermediate";
    color = "#8b5cf6";
  }

  if (compact) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          backgroundColor: `${color}20`,
          border: `1px solid ${color}40`,
          borderRadius: "0.5rem",
          padding: "0.4rem 0.75rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          color,
        }}
      >
        <Award size={14} />
        {label}
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        border: `1px solid ${C.gray200}`,
        borderRadius: "0.75rem",
        padding: "1rem",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
          }}
        >
          <Award size={28} color={color} />
        </div>
        <div>
          <p style={{ fontSize: "0.875rem", color: C.gray500, margin: "0 0 0.25rem" }}>
            Profile Score
          </p>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: C.primary, margin: 0 }}>
            {score}/{maxScore}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "0.75rem" }}>
        <div
          style={{
            height: "6px",
            backgroundColor: "#e5e7eb",
            borderRadius: "3px",
            overflow: "hidden",
            marginBottom: "0.4rem",
          }}
        >
          <div
            style={{
              height: "100%",
              backgroundColor: color,
              width: `${scorePercent}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <p style={{ fontSize: "0.75rem", color: C.gray500, margin: 0 }}>
          {scorePercent}% - {label}
        </p>
      </div>

      {showDetails && (
        <div
          style={{
            backgroundColor: `${color}10`,
            border: `1px solid ${color}30`,
            borderRadius: "0.5rem",
            padding: "0.75rem",
            fontSize: "0.8rem",
            color: C.gray600,
            lineHeight: 1.5,
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
          }}
        >
          <TrendingUp size={16} style={{ flexShrink: 0, marginTop: "0.125rem", color }} />
          <div>
            <strong style={{ color: C.primary }}>What affects your score:</strong>
            <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem" }}>
              <li>Profile completeness</li>
              <li>Student ratings & reviews</li>
              <li>Response time & reliability</li>
              <li>Subject expertise verification</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
