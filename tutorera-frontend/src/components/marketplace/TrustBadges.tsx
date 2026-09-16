"use client";
import { Award,BookOpen,ShieldCheck,Users } from "lucide-react";
import { useEffect,useState } from "react";

interface Stats {
  totalTutors: number;
  verifiedTutors: number;
  verifiedPercent: number;
  policeVerified: number;
  totalBookings: number;
  completedSessions: number;
  totalStudents: number;
}

interface TrustBadgeItem {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
  bg: string;
}

function usePublicStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/stats")
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.success) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { stats, loading };
}

function StatCounter({ value, loading }: { value: number; loading: boolean }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (loading || !value) { setDisplayed(value); return; }
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(current));
      }
    }, 30);
    return () => clearInterval(timer);
  }, [value, loading]);

  if (loading) return <span>—</span>;
  return <>{displayed.toLocaleString()}</>;
}

export default function TrustBadges() {
  const { stats, loading } = usePublicStats();

  const badges: TrustBadgeItem[] = [
    {
      icon: ShieldCheck,
      value: stats?.verifiedPercent ?? 0,
      label: "% Tutors Verified",
      color: "#16a34a",
      bg: "#f0fdf4",
    },
    {
      icon: Users,
      value: stats?.verifiedTutors ?? 0,
      label: "Verified Tutors",
      color: "#0329B2",
      bg: "#EEF5FF",
    },
    {
      icon: Award,
      value: stats?.policeVerified ?? 0,
      label: "Police Checks Done",
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
    {
      icon: BookOpen,
      value: stats?.completedSessions ?? 0,
      label: "Sessions Completed",
      color: "#d97706",
      bg: "#fffbeb",
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: "1rem",
    }}>
      {badges.map(badge => {
        const Icon = badge.icon;
        return (
          <div key={badge.label} style={{
            display: "flex",
            alignItems: "center",
            gap: "0.875rem",
            background: "white",
            borderRadius: 12,
            padding: "1rem 1.25rem",
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 8px rgba(2,21,80,0.04)",
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: badge.bg,
              color: badge.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon size={18} />
            </div>
            <div>
              <p style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 800,
                color: badge.color,
                lineHeight: 1,
              }}>
                <StatCounter value={typeof badge.value === "number" ? badge.value : 0} loading={loading} />
                {badge.label.includes("%") ? "%" : "+"}
              </p>
              <p style={{
                margin: "2px 0 0",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                {badge.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
