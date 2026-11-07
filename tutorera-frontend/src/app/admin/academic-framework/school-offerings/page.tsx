"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import api from "@/lib/axios";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

type Item = { _id: string; boardName: string; boardCode: string; qualificationName: string; classLevel?: string; subjectDisplay: string; subject: string; aliases?: string[]; status: "active" | "inactive"; verificationSource?: string; verificationNote?: string; reviewReason?: string };

export default function AdminSchoolOfferings() {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/academic-framework/school-offerings");
      setItems(data.offerings || []);
    } catch {
      setMessage("Could not load school offerings.");
    }
  };

  useEffect(() => { void load(); }, []);

  const change = async (item: Item) => {
    if (reason.trim().length < 5) { setMessage("Enter a review reason of at least five characters."); return; }
    setBusy(true);
    try {
      await api.patch(`/admin/academic-framework/school-offerings/${encodeURIComponent(item._id)}`, { status: item.status === "active" ? "inactive" : "active", reason });
      setReason("");
      setMessage("Offering status updated.");
      await load();
    } catch {
      setMessage("Could not update this offering. Check its evidence and try again.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = items.filter(x =>
    `${x.boardName} ${x.qualificationName} ${x.classLevel || ""} ${x.subjectDisplay} ${x.aliases?.join(" ") || ""}`.toLowerCase().includes(query.toLowerCase())
  );

  const inp: React.CSSProperties = { marginTop:"0.25rem", width:"100%", borderRadius:"0.4rem", border:`1px solid ${UI_COLORS.border}`, padding:"0.5rem 0.6rem", fontSize:"0.875rem", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { display:"block", fontSize:"0.8rem", fontWeight:700, color:TEXT_COLORS.secondary };

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
        <span style={{ fontSize:"0.82rem", fontWeight:700, color:STATUS_COLORS.purple.color }}>School Offerings</span>
      </div>

      <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:TEXT_COLORS.body, margin:"0 0 0.25rem" }}>School Offerings</h1>
      <p style={{ color:TEXT_COLORS.muted, fontSize:"0.85rem", margin:"0 0 1.25rem" }}>
        Offering availability is separate from individual tutor eligibility approvals.
      </p>

      <div style={{ display:"grid", gap:"1rem", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", marginBottom:"1.25rem" }}>
        <label style={lbl}>
          Search board, qualification or subject
          <input value={query} onChange={e => setQuery(e.target.value)} style={inp} placeholder="e.g. O-Level, Mathematics…" />
        </label>
        <label style={lbl}>
          Reason for next status change
          <input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} style={inp} placeholder="At least 5 characters" />
        </label>
      </div>

      {message && (
        <p role="status" style={{ marginBottom:"1rem", padding:"0.6rem 0.75rem", borderRadius:"0.4rem", background:UI_COLORS.card, border:`1px solid ${UI_COLORS.border}`, fontSize:"0.85rem", color:TEXT_COLORS.secondary }}>
          {message}
        </p>
      )}

      <p style={{ fontSize:"0.8rem", color:TEXT_COLORS.muted, marginBottom:"1rem" }}>{filtered.length} of {items.length} offerings</p>

      <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:"0.75rem" }}>
        {filtered.map(x => (
          <li key={x._id} style={{ borderRadius:"0.75rem", border:`1px solid ${UI_COLORS.border}`, backgroundColor:UI_COLORS.surface, padding:"1rem 1.25rem" }}>
            <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"space-between", gap:"0.75rem" }}>
              <div>
                <h2 style={{ fontWeight:800, color:TEXT_COLORS.body, fontSize:"0.9rem", margin:"0 0 0.25rem" }}>{x.subjectDisplay}</h2>
                <p style={{ fontSize:"0.8rem", color:TEXT_COLORS.secondary, margin:"0 0 0.2rem" }}>{x.boardName} · {x.qualificationName}{x.classLevel ? ` · ${x.classLevel}` : ""}</p>
                <span style={{ padding:"0.15rem 0.5rem", borderRadius:"999px", fontSize:"0.72rem", fontWeight:700,
                  backgroundColor: x.status === "active" ? STATUS_COLORS.success.bg : STATUS_COLORS.danger.bg,
                  color: x.status === "active" ? STATUS_COLORS.success.color : STATUS_COLORS.danger.color,
                }}>
                  {x.status}
                </span>
                {x.reviewReason && <p style={{ fontSize:"0.75rem", color:TEXT_COLORS.muted, marginTop:"0.25rem" }}>Last review: {x.reviewReason}</p>}
                {x.verificationSource && (
                  <a href={x.verificationSource} target="_blank" rel="noreferrer" style={{ fontSize:"0.75rem", color:UI_COLORS.accent, display:"inline-block", marginTop:"0.25rem" }}>Official source ↗</a>
                )}
                {x.verificationNote && <p style={{ fontSize:"0.75rem", color:TEXT_COLORS.muted, marginTop:"0.2rem" }}>{x.verificationNote}</p>}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void change(x)}
                style={{ alignSelf:"flex-start", padding:"0.5rem 0.9rem", borderRadius:"0.4rem", border:`1px solid ${UI_COLORS.accent}`, background:"white", color:UI_COLORS.accent, fontWeight:700, fontSize:"0.82rem", cursor:"pointer", minHeight:44, opacity:busy?0.6:1 }}
              >
                {x.status === "active" ? "Deactivate" : "Activate"}{" "}
                <span style={{ position:"absolute", left:"-9999px" }}>{x.subjectDisplay}, {x.qualificationName}</span>
              </button>
            </div>
          </li>
        ))}
        {!filtered.length && (
          <li style={{ padding:"3rem", textAlign:"center", color:TEXT_COLORS.muted }}>No offerings found.</li>
        )}
      </ul>
    </div>
  );
}
