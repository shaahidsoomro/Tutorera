"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { RefreshCw, Users, BookOpen, ArrowRight, Search, HeartHandshake, ArrowLeft } from "lucide-react";
import api from "@/lib/axios";
import { showError } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

type StudentRow = { userId: string; name: string; email: string; countryCode?: string; city?: string; phase: string; onboardingComplete: boolean; requestCount: number; lastRequestAt?: string; lastUpdatedAt: string };
type ParentRow = { userId: string; name: string; email: string; countryCode?: string; city?: string; phase: string; linkedLearners: number; approvalRequiredForBookings: boolean; lastUpdatedAt: string };

const studentLabels: Record<string, string> = { REGISTERED: "Registered", PROFILE_STARTED: "Profile started", READY_TO_POST: "Ready to post", ACTIVE_REQUESTER: "Active requester" };
const parentLabels: Record<string, string> = { REGISTERED: "Registered", PROFILE_STARTED: "Profile started", LEARNER_LINKED: "Learner linked" };
const date = (value?: string) => value ? new Date(value).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" }) : "—";

function AdminOnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = (searchParams.get("tab") as "students" | "parents") || "students";
  const initialPhase = searchParams.get("phase") || "";
  const initialSearch = searchParams.get("search") || "";

  const [tab, setTab] = useState<"students" | "parents">(
    initialTab === "parents" ? "parents" : "students"
  );
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState(initialPhase);
  const [search, setSearch] = useState(initialSearch);
  const [countryCode, setCountryCode] = useState("");
  const [summary, setSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && (urlTab === "students" || urlTab === "parents")) {
      setTab(urlTab as "students" | "parents");
    }
  }, [searchParams]);

  const handleTabChange = (newTab: "students" | "parents") => {
    setTab(newTab);
    setPhase("");
    setSearch("");
    router.replace(`/admin/onboarding?tab=${newTab}`);
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (phase) params.set("phase", phase);
      if (search.trim()) params.set("search", search.trim());
      if (countryCode.trim()) params.set("countryCode", countryCode.trim().toUpperCase());
      const endpoint = `/admin/onboarding/${tab}?${params.toString()}`;
      const response = await api.get(endpoint);
      setSummary(response.data.summary || {});
      if (tab === "students") setStudents(response.data.rows || []);
      else setParents(response.data.rows || []);
    } catch (error) {
      showError(error, "Unable to load onboarding operations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabStyle = (active: boolean): React.CSSProperties => ({
    border: 0,
    borderBottom: active ? `3px solid ${UI_COLORS.accent}` : "3px solid transparent",
    background: "transparent",
    color: active ? UI_COLORS.primary : UI_COLORS.gray500,
    fontWeight: 800,
    padding: "12px 18px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.88rem",
    transition: "all 150ms ease",
  });

  return (
    <main style={{ padding: "1.75rem 2rem", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Link href="/admin" style={{ color: UI_COLORS.gray500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: UI_COLORS.border }}>/</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: UI_COLORS.accent }}>Onboarding Pipelines</span>
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: TEXT_COLORS.body, margin: 0 }}>
            Application & Readiness Pipelines
          </h1>
          <p style={{ color: UI_COLORS.gray500, fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
            Monitor and expedite onboarding progression across Students and Parents/Guardians.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading} style={button}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <section style={card}>
        <div role="tablist" aria-label="Onboarding pipeline view" style={{ borderBottom: `1px solid ${UI_COLORS.border}`, display: "flex", flexWrap: "wrap", background: STATUS_COLORS.neutral.bg }}>
          <button type="button" role="tab" aria-selected={tab === "students"} onClick={() => handleTabChange("students")} style={tabStyle(tab === "students")}>
            <Users size={17} aria-hidden="true" /> Student Onboarding
          </button>
          <button type="button" role="tab" aria-selected={tab === "parents"} onClick={() => handleTabChange("parents")} style={tabStyle(tab === "parents")}>
            <HeartHandshake size={17} aria-hidden="true" /> Parent & Guardian Onboarding
          </button>
        </div>

        <div style={{ padding: 16, borderBottom: `1px solid ${UI_COLORS.border}`, background: UI_COLORS.accentLight }}>
          {/* Phase Filter Chips */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
            {Object.entries(summary).map(([key, count]) => (
              <button
                type="button"
                key={key}
                aria-pressed={phase === key}
                onClick={() => setPhase(phase === key ? "" : key)}
                style={{
                  textAlign: "left",
                  border: phase === key ? `2px solid ${UI_COLORS.accent}` : `1px solid ${UI_COLORS.border}`,
                  background: phase === key ? UI_COLORS.accentLight : UI_COLORS.surface,
                  padding: "10px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
              >
                <span style={{ display: "block", color: UI_COLORS.gray600, fontSize: 11, fontWeight: 800 }}>
                  {(tab === "students" ? studentLabels : parentLabels)[key] || key}
                </span>
                <strong style={{ fontSize: 20, color: UI_COLORS.primary }}>{count}</strong>
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              load();
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <label style={{ flex: "1 1 280px", display: "flex", alignItems: "center", gap: 8, background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: 9, padding: "0 10px" }}>
              <Search size={15} color={UI_COLORS.gray500} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, city, or application ID"
                style={{ border: 0, outline: 0, width: "100%", padding: 10, fontSize: 13 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: 9, padding: "0 10px", color: UI_COLORS.gray600, fontSize: 12, fontWeight: 700 }}>
              Market
              <input
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value.toUpperCase().slice(0, 2))}
                placeholder="PK"
                aria-label="Filter by two-letter country code"
                style={{ width: 38, border: 0, outline: 0, padding: 10, fontWeight: 800, textTransform: "uppercase" }}
              />
            </label>
            <button type="submit" style={button}>
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <p style={empty}>Loading application pipeline records…</p>
        ) : tab === "students" ? (
          <StudentTable rows={students} />
        ) : (
          <ParentTable rows={parents} />
        )}
      </section>
    </main>
  );
}

export default function AdminOnboardingPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading Onboarding Pipeline...</div>}>
      <AdminOnboardingContent />
    </Suspense>
  );
}


function StudentTable({ rows }: { rows: StudentRow[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={table}>
        <thead>
          <tr>
            {["Student", "Phase", "Profile", "Requests", "Location", "Updated", "Actions"].map((x) => (
              <th key={x} style={th}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.userId}>
                <td style={td}>
                  <strong>{row.name}</strong>
                  <small style={small}>{row.email}</small>
                </td>
                <td style={td}>
                  <Pill value={studentLabels[row.phase] || row.phase} />
                </td>
                <td style={td}>{row.onboardingComplete ? "Complete" : "In progress"}</td>
                <td style={td}>
                  {row.requestCount}{row.lastRequestAt ? ` · last ${date(row.lastRequestAt)}` : ""}
                </td>
                <td style={td}>
                  {row.city || "—"}{row.countryCode ? `, ${row.countryCode}` : ""}
                </td>
                <td style={td}>{date(row.lastUpdatedAt)}</td>
                <td style={td}>
                  <Link href={`/admin/students?search=${encodeURIComponent(row.email || row.name)}`} style={link}>
                    Open student <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td style={empty} colSpan={7}>No student onboarding records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ParentTable({ rows }: { rows: ParentRow[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={table}>
        <thead>
          <tr>
            {["Parent / guardian", "Phase", "Learners", "Booking approval", "Location", "Updated", "Actions"].map((x) => (
              <th key={x} style={th}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.userId}>
                <td style={td}>
                  <strong>{row.name}</strong>
                  <small style={small}>{row.email}</small>
                </td>
                <td style={td}>
                  <Pill value={parentLabels[row.phase] || row.phase} />
                </td>
                <td style={td}>{row.linkedLearners}</td>
                <td style={td}>{row.approvalRequiredForBookings ? "Required" : "Optional"}</td>
                <td style={td}>
                  {row.city || "—"}{row.countryCode ? `, ${row.countryCode}` : ""}
                </td>
                <td style={td}>{date(row.lastUpdatedAt)}</td>
                <td style={td}>
                  <Link href={`/admin/parents?search=${encodeURIComponent(row.email || row.name)}`} style={link}>
                    Open parent <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td style={empty} colSpan={7}>No parent onboarding records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Pill({ value }: { value: string }) {
  return (
    <span style={{ display: "inline-block", borderRadius: 999, padding: "4px 10px", background: UI_COLORS.accentLight, color: UI_COLORS.accent, fontSize: 12, fontWeight: 800 }}>
      {value}
    </span>
  );
}

const card: React.CSSProperties = { background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 24px rgba(2,21,80,.05)" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: 920 };
const th: React.CSSProperties = { textAlign: "left", color: UI_COLORS.gray600, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", padding: "13px 16px", background: UI_COLORS.card, borderBottom: `1px solid ${UI_COLORS.border}` };
const td: React.CSSProperties = { padding: "14px 16px", color: TEXT_COLORS.secondary, fontSize: 13, borderBottom: `1px solid ${UI_COLORS.border}`, verticalAlign: "middle" };
const small: React.CSSProperties = { display: "block", color: UI_COLORS.gray500, marginTop: 3, fontSize: 12 };
const empty: React.CSSProperties = { padding: 32, textAlign: "center", color: UI_COLORS.gray500 };
const button: React.CSSProperties = { alignSelf: "center", display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${UI_COLORS.border}`, background: UI_COLORS.surface, color: UI_COLORS.primary, padding: "10px 14px", borderRadius: 10, fontWeight: 800, cursor: "pointer" };
const link: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, color: UI_COLORS.accent, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" };
