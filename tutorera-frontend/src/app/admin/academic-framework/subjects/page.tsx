"use client";

import { useEffect, useState } from "react";
import { Archive, ArrowLeft, Pencil, Plus, Save, X } from "lucide-react";
import Link from "next/link";
import api from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

type Category = { _id: string; code: string; name: string };
type Subject = { _id: string; code?: string; name: string; description?: string; status?: string; displayOrder?: number; categoryRef?: Category; category?: string };
const empty = { code: "", name: "", categoryId: "", description: "", displayOrder: "0" };

export default function SubjectCataloguePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [subjectResult, categoryResult] = await Promise.all([
        api.get("/admin/academic-framework/subjects?status=active&limit=100"),
        api.get("/admin/academic-framework/categories?status=active&limit=100"),
      ]);
      setSubjects(subjectResult.data.subjects || []);
      setCategories(categoryResult.data.categories || []);
    } catch (error) {
      showError(error, "Could not load the subject catalogue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const reset = () => { setForm(empty); setEditing(null); setShowForm(false); };

  const submit = async () => {
    if (!form.name.trim() || !form.categoryId) return showError("Subject name and category are required");
    setSaving(true);
    const payload = { ...form, displayOrder: Number(form.displayOrder) || 0 };
    try {
      if (editing) {
        await api.patch(`/admin/academic-framework/subjects/${editing}`, payload);
        showSuccess("Subject updated");
      } else {
        await api.post("/admin/academic-framework/subjects", payload);
        showSuccess("Subject created");
      }
      reset();
      await load();
    } catch (error) {
      showError(error, "Could not save subject");
    } finally {
      setSaving(false);
    }
  };

  const edit = (subject: Subject) => {
    setEditing(subject._id);
    setForm({ code: subject.code || "", name: subject.name, categoryId: subject.categoryRef?._id || "", description: subject.description || "", displayOrder: String(subject.displayOrder || 0) });
    setShowForm(true);
  };

  const archive = async (subject: Subject) => {
    setArchiveConfirmId(null);
    try {
      await api.patch(`/admin/academic-framework/subjects/${subject._id}`, { status: "archived" });
      showSuccess("Subject archived");
      await load();
    } catch (error) {
      showError(error, "Could not archive subject");
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
        <span style={{ fontSize:"0.82rem", fontWeight:700, color:STATUS_COLORS.purple.color }}>Subjects</span>
      </div>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem", marginBottom:"1.5rem" }}>
        <div>
          <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:TEXT_COLORS.body, margin:0 }}>Subject Catalogue</h1>
          <p style={{ color:TEXT_COLORS.muted, fontSize:"0.85rem", margin:"0.2rem 0 0" }}>
            Subjects are what students request and tutors may ultimately be approved to teach. They are distinct from qualification disciplines.
          </p>
        </div>
        <button
          onClick={() => { reset(); setShowForm(true); }}
          style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.55rem 1rem", borderRadius:"0.4rem", background:UI_COLORS.accent, color:"#fff", fontWeight:700, fontSize:"0.875rem", border:"none", cursor:"pointer", minHeight:44 }}
        >
          <Plus size={16} aria-hidden="true" /> New subject
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <section style={{ marginBottom:"1.5rem", borderRadius:"0.75rem", border:`1px solid ${UI_COLORS.accentLight}`, background:UI_COLORS.accentLight, padding:"1.25rem" }}>
          <h2 style={{ fontWeight:800, color:TEXT_COLORS.body, margin:"0 0 1rem" }}>{editing ? "Edit subject" : "Create subject"}</h2>
          <div style={{ display:"grid", gap:"1rem", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))" }}>
            <label style={lbl}>
              Stable code
              <input value={form.code} disabled={Boolean(editing)} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="SUB-MATH" style={{ ...inp, background: editing ? UI_COLORS.card : undefined }} />
            </label>
            <label style={lbl}>
              Subject name
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
            </label>
            <label style={lbl}>
              Category
              <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} style={inp}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.code} — {c.name}</option>)}
              </select>
            </label>
            <label style={lbl}>
              Display order
              <input type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.value })} style={inp} />
            </label>
          </div>
          <label style={{ ...lbl, display:"block", marginTop:"1rem" }}>
            Description
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inp, resize:"vertical" }} />
          </label>
          <div style={{ display:"flex", gap:"0.75rem", marginTop:"1rem" }}>
            <button onClick={() => void submit()} disabled={saving} style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.55rem 1rem", borderRadius:"0.4rem", background:UI_COLORS.accent, color:"#fff", fontWeight:700, fontSize:"0.875rem", border:"none", cursor:"pointer", minHeight:44, opacity:saving?0.6:1 }}>
              <Save size={15} aria-hidden="true" /> Save subject
            </button>
            <button onClick={reset} style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.55rem 1rem", borderRadius:"0.4rem", background:"white", color:TEXT_COLORS.secondary, fontWeight:700, fontSize:"0.875rem", border:`1px solid ${UI_COLORS.border}`, cursor:"pointer", minHeight:44 }}>
              <X size={15} aria-hidden="true" /> Cancel
            </button>
          </div>
        </section>
      )}

      {/* Table */}
      <div style={{ borderRadius:"0.75rem", border:`1px solid ${UI_COLORS.border}`, backgroundColor:UI_COLORS.surface, overflowX:"auto" }}>
        {loading ? (
          <div role="status" aria-label="Loading subjects" style={{ padding:"3rem", textAlign:"center", color:TEXT_COLORS.muted }}>Loading subjects…</div>
        ) : subjects.length === 0 ? (
          <div style={{ padding:"3rem", textAlign:"center", color:TEXT_COLORS.muted }}>No active subjects yet. Create one or use the CSV import centre.</div>
        ) : (
          <table style={{ width:"100%", minWidth:760, borderCollapse:"collapse", fontSize:"0.875rem", textAlign:"left" }}>
            <thead>
              <tr style={{ background:UI_COLORS.card, borderBottom:`1px solid ${UI_COLORS.border}` }}>
                {["Code","Subject","Category","Order","Actions"].map(h => (
                  <th key={h} scope="col" style={{ padding:"0.75rem 1rem", fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:TEXT_COLORS.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map(subject => (
                <tr key={subject._id} style={{ borderTop:`1px solid ${UI_COLORS.border}` }}>
                  <td style={{ padding:"0.875rem 1rem", fontFamily:"monospace", fontSize:"0.78rem", fontWeight:800, color:UI_COLORS.accent }}>{subject.code || "Legacy"}</td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <p style={{ fontWeight:700, color:TEXT_COLORS.body, margin:0 }}>{subject.name}</p>
                    <p style={{ fontSize:"0.75rem", color:TEXT_COLORS.muted, margin:"0.2rem 0 0" }}>{subject.description || "No description"}</p>
                  </td>
                  <td style={{ padding:"0.875rem 1rem", color:TEXT_COLORS.secondary }}>
                    {subject.categoryRef ? `${subject.categoryRef.code} — ${subject.categoryRef.name}` : subject.category || "Uncategorised"}
                  </td>
                  <td style={{ padding:"0.875rem 1rem", color:TEXT_COLORS.muted }}>{subject.displayOrder || 0}</td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    {archiveConfirmId === subject._id ? (
                      <span role="alert" style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", flexWrap:"wrap" }}>
                        <span style={{ fontSize:"0.75rem", color:"#be123c", fontWeight:600 }}>Archive?</span>
                        <button onClick={() => void archive(subject)} style={{ padding:"0.3rem 0.6rem", borderRadius:4, border:"none", background:"#be123c", color:"white", fontWeight:700, fontSize:"0.75rem", cursor:"pointer", minHeight:36 }}>Yes</button>
                        <button onClick={() => setArchiveConfirmId(null)} style={{ padding:"0.3rem 0.6rem", borderRadius:4, border:`1px solid ${UI_COLORS.border}`, background:"white", color:TEXT_COLORS.muted, fontWeight:700, fontSize:"0.75rem", cursor:"pointer", minHeight:36 }}>Cancel</button>
                      </span>
                    ) : (
                      <div style={{ display:"flex", gap:"1rem" }}>
                        <button onClick={() => edit(subject)} style={{ display:"inline-flex", alignItems:"center", gap:"0.3rem", fontWeight:700, color:UI_COLORS.accent, background:"none", border:"none", cursor:"pointer", fontSize:"0.82rem", padding:0, minHeight:44 }}>
                          <Pencil size={14} aria-hidden="true" /> Edit
                        </button>
                        <button onClick={() => setArchiveConfirmId(subject._id)} style={{ display:"inline-flex", alignItems:"center", gap:"0.3rem", fontWeight:700, color:"#be123c", background:"none", border:"none", cursor:"pointer", fontSize:"0.82rem", padding:0, minHeight:44 }}>
                          <Archive size={14} aria-hidden="true" /> Archive
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
