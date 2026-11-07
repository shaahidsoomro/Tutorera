"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, Layers3, ShieldCheck, AlertCircle, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import api from "@/lib/axios";
import { showError } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

type Overview = { categories: number; disciplines: number; subjects: number; directRules: number; conditionalRules: number; pendingReviews: number };
const cards = [
  { key: "categories",    label: "Subject categories",   icon: Layers3,      href: "/admin/academic-framework/categories",     copy: "Organise the catalogue without changing historic records." },
  { key: "disciplines",   label: "Academic disciplines", icon: GraduationCap, href: "/admin/academic-framework/disciplines",    copy: "Record verified education disciplines used in eligibility decisions." },
  { key: "subjects",      label: "Active subjects",      icon: BookOpen,      href: "/admin/academic-framework/subjects",       copy: "Subjects tutors and students can discover in the marketplace." },
  { key: "pendingReviews",label: "Eligibility reviews",  icon: ShieldCheck,   href: "/admin/academic-framework/tutor-approvals",copy: "Subject requests awaiting review or supporting evidence." },
] as const;

export default function AcademicFrameworkPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading]   = useState(true);
  const [seeding, setSeeding]   = useState(false);
  const [seedResult, setSeedResult] = useState<{ created: number; updated: number } | null>(null);
  const [seedError, setSeedError]   = useState<string | null>(null);

  const runSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    setSeedError(null);
    try {
      const { data } = await api.post("/admin/academic/categories/seed");
      setSeedResult(data.results);
      void load();
    } catch {
      setSeedError("Seed failed. Check your permissions or try again.");
    } finally {
      setSeeding(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/academic-framework/overview");
      setOverview(data.overview);
    } catch (error) {
      showError(error, "Could not load the academic framework");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div style={{ padding: "1.75rem 2rem" }}>

      {/* Page header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
            <ArrowLeft size={14} aria-hidden="true" /> Control Tower
          </Link>
          <span style={{ color: UI_COLORS.border }}>/</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: STATUS_COLORS.purple.color }}>Academic Governance</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>
              Academic Framework
            </h1>
            <p style={{ color: TEXT_COLORS.muted, fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
              A single source of truth for categories, subjects, education disciplines, and eligibility rules.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.9rem", minHeight: 44, backgroundColor: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.4rem", fontSize: "0.82rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", color: TEXT_COLORS.secondary }}
            aria-label="Refresh academic framework data"
          >
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div
          role="status"
          aria-label="Loading academic framework"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}
        >
          {[1, 2, 3, 4].map(i => (
            <div key={i} aria-hidden="true" style={{ height: 160, borderRadius: "0.75rem", backgroundColor: UI_COLORS.card, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        </div>
      ) : (
        <>
          <section
            aria-label="Academic framework summary"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}
          >
            {cards.map(({ key, label, icon: Icon, href, copy }) => (
              <Link
                key={key}
                href={href}
                style={{
                  display: "block", textDecoration: "none",
                  backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem",
                  border: `1px solid ${UI_COLORS.border}`, padding: "1.25rem",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  minHeight: 44,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = UI_COLORS.accent; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(3,41,178,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = UI_COLORS.border; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <Icon size={22} color={UI_COLORS.accent} aria-hidden="true" />
                <p style={{ fontSize: "2rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0.75rem 0 0.1rem" }}>
                  {overview?.[key] ?? 0}
                </p>
                <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: TEXT_COLORS.secondary, margin: "0 0 0.4rem" }}>{label}</h2>
                <p style={{ fontSize: "0.8rem", color: TEXT_COLORS.muted, margin: "0 0 0.75rem", lineHeight: 1.5 }}>{copy}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700, color: UI_COLORS.accent }}>
                  Manage <ArrowRight size={14} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </section>

          {/* Notice */}
          <section
            aria-labelledby="eligibility-note"
            style={{ backgroundColor: "#fffbeb", borderRadius: "0.75rem", border: "1px solid #fde68a", padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}
          >
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <AlertCircle size={18} color="#b45309" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h2 id="eligibility-note" style={{ fontSize: "0.9rem", fontWeight: 700, color: TEXT_COLORS.body, margin: "0 0 0.3rem" }}>
                  Teaching is never approved by a selected subject alone.
                </h2>
                <p style={{ fontSize: "0.82rem", color: TEXT_COLORS.secondary, margin: 0, lineHeight: 1.6 }}>
                  Direct rules allow teaching within a verified discipline. Conditional rules require supporting evidence and an administrator's decision. The older category and discipline-map screens remain available while their stored records are reconciled.
                </p>
              </div>
            </div>
          </section>

          {/* Seed recommended categories */}
          <div style={{ backgroundColor: UI_COLORS.card, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, padding: "1.1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: TEXT_COLORS.body, margin: "0 0 0.2rem" }}>Seed recommended categories</p>
              <p style={{ fontSize: "0.8rem", color: TEXT_COLORS.muted, margin: 0 }}>Upserts the 15 standard academic categories (Mathematics, Sciences, Languages, etc.). Safe to run multiple times — existing categories are updated, nothing is deleted.</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {seedResult && (
                <span role="status" style={{ fontSize: "0.82rem", fontWeight: 700, color: STATUS_COLORS.success.color }}>
                  ✓ {seedResult.created} created, {seedResult.updated} updated
                </span>
              )}
              {seedError && <span role="alert" style={{ fontSize: "0.82rem", color: STATUS_COLORS.danger.color }}>{seedError}</span>}
              <button
                onClick={() => void runSeed()}
                disabled={seeding}
                style={{ padding: "0.55rem 1.1rem", minHeight: 44, borderRadius: "0.5rem", border: "none", backgroundColor: UI_COLORS.accent, color: "white", fontWeight: 700, fontSize: "0.875rem", cursor: seeding ? "not-allowed" : "pointer", opacity: seeding ? 0.7 : 1 }}
              >
                {seeding ? "Seeding…" : "Run Seed"}
              </button>
            </div>
          </div>

          {/* Quick-access links */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link
              href="/admin/academic-framework/school-offerings"
              style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0.55rem 1.1rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, backgroundColor: UI_COLORS.surface, color: UI_COLORS.accent, fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}
            >
              Manage school offerings
            </Link>
            <Link
              href="/admin/academic-framework/import-export"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", minHeight: 44, padding: "0.55rem 1.1rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, backgroundColor: UI_COLORS.surface, color: UI_COLORS.accent, fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}
            >
              Manage code-based CSV imports and exports <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
