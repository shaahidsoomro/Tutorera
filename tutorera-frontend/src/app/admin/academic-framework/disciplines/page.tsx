"use client";

import { useEffect, useState } from "react";
import { Archive, ArrowLeft, Pencil, Plus, Save, X } from "lucide-react";
import Link from "next/link";
import api from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

type Discipline = { _id: string; code: string; name: string; description?: string; status: string };
const empty = { code: "", name: "", description: "" };

export default function AcademicDisciplinesPage() {
  const [items, setItems] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/academic-framework/disciplines?status=active&limit=100");
      setItems(data.disciplines || []);
    } catch (error) {
      showError(error, "Could not load academic disciplines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const reset = () => { setForm(empty); setEditing(null); setOpen(false); };

  const save = async () => {
    if (!form.name.trim()) return showError("Discipline name is required");
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/academic-framework/disciplines/${editing}`, form);
        showSuccess("Discipline updated");
      } else {
        await api.post("/admin/academic-framework/disciplines", form);
        showSuccess("Discipline created");
      }
      reset();
      await load();
    } catch (error) {
      showError(error, "Could not save discipline");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (item: Discipline) => {
    setArchiveConfirmId(null);
    try {
      await api.patch(`/admin/academic-framework/disciplines/${item._id}`, { status: "archived" });
      showSuccess("Discipline archived");
      await load();
    } catch (error) {
      showError(error, "Could not archive discipline");
    }
  };

  const inp: React.CSSProperties = { marginTop:"0.25rem", width:"100%", borderRadius:"0.4rem", border:`1px solid ${UI_COLORS.border}`, padding:"0.5rem 0.6rem", fontSize:"0.875rem" };
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
        <span style={{ fontSize:"0.82rem", fontWeight:700, color:STATUS_COLORS.purple.color }}>Disciplines</span>
      </div>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem", marginBottom:"1.5rem" }}>
        <div>
          <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:TEXT_COLORS.body, margin:0 }}>Academic Disciplines</h1>
          <p style={{ color:TEXT_COLORS.muted, fontSize:"0.85rem", margin:"0.2rem 0 0" }}>
            A discipline describes a tutor&apos;s verified qualification field. It is never itself a tutoring subject or a marketplace authorisation.
          </p>
        </div>
        <button
          onClick={() => { reset(); setOpen(true); }}
          style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.55rem 1rem", borderRadius:"0.4rem", background:UI_COLORS.accent, color:"#fff", fontWeight:700, fontSize:"0.875rem", border:"none", cursor:"pointer", minHeight:44 }}
        >
          <Plus size={16} aria-hidden="true" /> New discipline
        </button>
      </div>

      {/* Create / Edit form */}
      {open && (
        <section style={{ marginBottom:"1.5rem", borderRadius:"0.75rem", border:`1px solid ${UI_COLORS.accentLight}`, background:UI_COLORS.accentLight, padding:"1.25rem" }}>
          <h2 style={{ fontWeight:800, color:TEXT_COLORS.body, margin:"0 0 1rem" }}>{editing ? "Edit discipline" : "Create discipline"}</h2>
          <div style={{ display:"grid", gap:"1rem", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))" }}>
            <label style={lbl}>
              Stable code
              <input disabled={Boolean(editing)} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="DISC-CS" style={{ ...inp, background: editing ? UI_COLORS.card : undefined }} />
            </label>
            <label style={lbl}>
              Name
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
            </label>
          </div>
          <label style={{ ...lbl, display:"block", marginTop:"1rem" }}>
            Description
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inp, resize:"vertical" }} />
          </label>
          <div style={{ display:"flex", gap:"0.75rem", marginTop:"1rem" }}>
            <button disabled={saving} onClick={() => void save()} style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.55rem 1rem", borderRadius:"0.4rem", background:UI_COLORS.accent, color:"#fff", fontWeight:700, fontSize:"0.875rem", border:"none", cursor:"pointer", minHeight:44, opacity:saving?0.6:1 }}>
              <Save size={15} aria-hidden="true" /> Save
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
          <div role="status" aria-label="Loading disciplines" style={{ padding:"3rem", textAlign:"center", color:TEXT_COLORS.muted }}>Loading disciplines…</div>
        ) : items.length === 0 ? (
          <div style={{ padding:"3rem", textAlign:"center", color:TEXT_COLORS.muted }}>No active academic disciplines yet.</div>
        ) : (
          <table style={{ width:"100%", minWidth:650, borderCollapse:"collapse", fontSize:"0.875rem", textAlign:"left" }}>
            <thead>
              <tr style={{ background:UI_COLORS.card, borderBottom:`1px solid ${UI_COLORS.border}` }}>
                <th scope="col" style={{ padding:"0.75rem 1rem", fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:TEXT_COLORS.muted }}>Code</th>
                <th scope="col" style={{ padding:"0.75rem 1rem", fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:TEXT_COLORS.muted }}>Discipline</th>
                <th scope="col" style={{ padding:"0.75rem 1rem", fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:TEXT_COLORS.muted }}>Description</th>
                <th scope="col" style={{ padding:"0.75rem 1rem", fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:TEXT_COLORS.muted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id} style={{ borderTop:`1px solid ${UI_COLORS.border}` }}>
                  <td style={{ padding:"0.875rem 1rem", fontFamily:"monospace", fontSize:"0.78rem", fontWeight:800, color:UI_COLORS.accent }}>{item.code}</td>
                  <td style={{ padding:"0.875rem 1rem", fontWeight:700, color:TEXT_COLORS.body }}>{item.name}</td>
                  <td style={{ padding:"0.875rem 1rem", color:TEXT_COLORS.muted }}>{item.description || "—"}</td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    {archiveConfirmId === item._id ? (
                      <span role="alert" style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", flexWrap:"wrap" }}>
                        <span style={{ fontSize:"0.75rem", color:"#be123c", fontWeight:600 }}>Archive?</span>
                        <button onClick={() => void archive(item)} style={{ padding:"0.3rem 0.6rem", borderRadius:4, border:"none", background:"#be123c", color:"white", fontWeight:700, fontSize:"0.75rem", cursor:"pointer", minHeight:36 }}>Yes</button>
                        <button onClick={() => setArchiveConfirmId(null)} style={{ padding:"0.3rem 0.6rem", borderRadius:4, border:`1px solid ${UI_COLORS.border}`, background:"white", color:TEXT_COLORS.muted, fontWeight:700, fontSize:"0.75rem", cursor:"pointer", minHeight:36 }}>Cancel</button>
                      </span>
                    ) : (
                      <div style={{ display:"flex", gap:"1rem" }}>
                        <button onClick={() => { setEditing(item._id); setForm({ code:item.code, name:item.name, description:item.description||"" }); setOpen(true); }} style={{ display:"inline-flex", alignItems:"center", gap:"0.3rem", fontWeight:700, color:UI_COLORS.accent, background:"none", border:"none", cursor:"pointer", fontSize:"0.82rem", padding:0, minHeight:44 }}>
                          <Pencil size={14} aria-hidden="true" /> Edit
                        </button>
                        <button onClick={() => setArchiveConfirmId(item._id)} style={{ display:"inline-flex", alignItems:"center", gap:"0.3rem", fontWeight:700, color:"#be123c", background:"none", border:"none", cursor:"pointer", fontSize:"0.82rem", padding:0, minHeight:44 }}>
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
