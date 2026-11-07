"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Save } from "lucide-react";
import Link from "next/link";
import api from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

type Option = { _id: string; code: string; name: string };
type Rule = { _id: string; eligibilityType: "direct" | "conditional"; evidenceRequired: boolean; minimumDegreeLevel?: string; notes?: string; discipline: Option; subject: Option };

export default function TeachingEligibilityPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [disciplines, setDisciplines] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ disciplineId:"", subjectId:"", eligibilityType:"direct", minimumDegreeLevel:"", notes:"" });

  const load = async () => {
    setLoading(true);
    try {
      const [rulesResult, disciplineResult, subjectResult] = await Promise.all([
        api.get("/admin/academic-framework/eligibility-rules?status=active"),
        api.get("/admin/academic-framework/disciplines?status=active"),
        api.get("/admin/academic-framework/subjects?status=active"),
      ]);
      setRules(rulesResult.data.rules || []);
      setDisciplines(disciplineResult.data.disciplines || []);
      setSubjects(subjectResult.data.subjects || []);
    } catch (error) {
      showError(error, "Could not load teaching eligibility");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (!form.disciplineId || !form.subjectId) return showError("Choose both a discipline and a subject");
    setSaving(true);
    try {
      await api.post("/admin/academic-framework/eligibility-rules", form);
      showSuccess("Teaching eligibility rule created");
      setForm({ disciplineId:"", subjectId:"", eligibilityType:"direct", minimumDegreeLevel:"", notes:"" });
      await load();
    } catch (error) {
      showError(error, "Could not save teaching eligibility rule");
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = { marginTop:"0.25rem", width:"100%", borderRadius:"0.4rem", border:`1px solid ${UI_COLORS.border}`, padding:"0.5rem 0.6rem", fontSize:"0.875rem", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { fontSize:"0.8rem", fontWeight:700, color:TEXT_COLORS.secondary };

  return (
    <div style={{ padding:"1.75rem 2rem" }}>
      {/* Breadcrumb */}
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.4rem" }}>
        <Link href="/admin" style={{ color:TEXT_COLORS.muted, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"0.3rem", fontSize:"0.82rem", fontWeight:700 }}>
          <ArrowLeft size={14} /> Control Tower
        </Link>
        <span style={{ color:UI_COLORS.border }}>/</span>
        <Link href="/admin/academic-framework" style={{ color:TEXT_COLORS.muted, textDecoration:"none", fontSize:"0.82rem", fontWeight:700 }}>Academic Framework</Link>
        <span style={{ color:UI_COLORS.border }}>/</span>
        <span style={{ fontSize:"0.82rem", fontWeight:700, color:STATUS_COLORS.purple.color }}>Teaching Eligibility</span>
      </div>

      <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:TEXT_COLORS.body, margin:"0 0 0.25rem" }}>Teaching Eligibility</h1>
      <p style={{ color:TEXT_COLORS.muted, fontSize:"0.85rem", margin:"0 0 1.5rem" }}>
        A rule determines whether a verified qualification in a discipline can support a tutor&apos;s subject request. It never grants marketplace approval by itself.
      </p>

      {/* Create rule form */}
      <section style={{ marginBottom:"1.5rem", borderRadius:"0.75rem", border:`1px solid ${UI_COLORS.border}`, backgroundColor:UI_COLORS.surface, padding:"1.25rem" }}>
        <h2 style={{ fontWeight:800, color:TEXT_COLORS.body, margin:"0 0 1rem", fontSize:"1rem" }}>Create rule</h2>
        <div style={{ display:"grid", gap:"1rem", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))" }}>
          <label style={lbl}>
            Discipline
            <select value={form.disciplineId} onChange={e => setForm({ ...form, disciplineId: e.target.value })} style={inp} aria-label="Select discipline">
              <option value="">Select discipline</option>
              {disciplines.map(item => <option value={item._id} key={item._id}>{item.code} — {item.name}</option>)}
            </select>
          </label>
          <label style={lbl}>
            Teaching subject
            <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} style={inp} aria-label="Select subject">
              <option value="">Select subject</option>
              {subjects.map(item => <option value={item._id} key={item._id}>{item.code} — {item.name}</option>)}
            </select>
          </label>
          <label style={lbl}>
            Eligibility
            <select value={form.eligibilityType} onChange={e => setForm({ ...form, eligibilityType: e.target.value as "direct"|"conditional" })} style={inp}>
              <option value="direct">Direct</option>
              <option value="conditional">Conditional — evidence required</option>
            </select>
          </label>
          <label style={lbl}>
            Minimum degree level
            <input value={form.minimumDegreeLevel} onChange={e => setForm({ ...form, minimumDegreeLevel: e.target.value })} style={inp} placeholder="e.g. Bachelors" />
          </label>
        </div>
        <label style={{ ...lbl, display:"block", marginTop:"1rem" }}>
          Review guidance / notes
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inp, resize:"vertical" }} rows={2} placeholder="Explain why this rule exists or what evidence a reviewer needs." />
        </label>
        <button disabled={saving} onClick={() => void submit()} style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", marginTop:"1rem", padding:"0.55rem 1rem", borderRadius:"0.4rem", background:UI_COLORS.accent, color:"#fff", fontWeight:700, fontSize:"0.875rem", border:"none", cursor:"pointer", minHeight:44, opacity:saving?0.6:1 }}>
          <Plus size={15} aria-hidden="true" /> Create rule
        </button>
      </section>

      {/* Rules table */}
      <div style={{ borderRadius:"0.75rem", border:`1px solid ${UI_COLORS.border}`, backgroundColor:UI_COLORS.surface, overflowX:"auto" }}>
        {loading ? (
          <div role="status" aria-label="Loading eligibility rules" style={{ padding:"3rem", textAlign:"center", color:TEXT_COLORS.muted }}>Loading teaching eligibility rules…</div>
        ) : rules.length === 0 ? (
          <div style={{ padding:"3rem", textAlign:"center", color:TEXT_COLORS.muted }}>No active rules yet. Create a direct or conditional rule above.</div>
        ) : (
          <table style={{ width:"100%", minWidth:760, borderCollapse:"collapse", fontSize:"0.875rem", textAlign:"left" }}>
            <thead>
              <tr style={{ background:UI_COLORS.card, borderBottom:`1px solid ${UI_COLORS.border}` }}>
                {["Qualification Discipline","Teaching Subject","Rule","Minimum Degree","Review Guidance"].map(h => (
                  <th key={h} scope="col" style={{ padding:"0.75rem 1rem", fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:TEXT_COLORS.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule._id} style={{ borderTop:`1px solid ${UI_COLORS.border}` }}>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <span style={{ fontWeight:700, color:TEXT_COLORS.body }}>{rule.discipline?.code}</span>{" "}
                    <span style={{ color:TEXT_COLORS.muted }}>{rule.discipline?.name}</span>
                  </td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <span style={{ fontWeight:700, color:TEXT_COLORS.body }}>{rule.subject?.code}</span>{" "}
                    <span style={{ color:TEXT_COLORS.muted }}>{rule.subject?.name}</span>
                  </td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <span style={{
                      padding:"0.2rem 0.6rem", borderRadius:"999px", fontSize:"0.72rem", fontWeight:700,
                      backgroundColor: rule.eligibilityType === "direct" ? STATUS_COLORS.success.bg : STATUS_COLORS.warning.bg,
                      color: rule.eligibilityType === "direct" ? STATUS_COLORS.success.color : STATUS_COLORS.warning.color,
                    }}>
                      {rule.eligibilityType}{rule.evidenceRequired ? " · evidence" : ""}
                    </span>
                  </td>
                  <td style={{ padding:"0.875rem 1rem", color:TEXT_COLORS.muted }}>{rule.minimumDegreeLevel || "—"}</td>
                  <td style={{ padding:"0.875rem 1rem", color:TEXT_COLORS.muted }}>{rule.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
