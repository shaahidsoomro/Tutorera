"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import api from "@/lib/axios";
import { STATUS_COLORS, TEXT_COLORS, UI_COLORS } from "@/lib/brand";

type Issue = { _id: string; type: string; severity: "high" | "critical"; entityType: string; entityId: string; relation?: string; countryCode?: string; details: Record<string, unknown>; status: "open" | "reviewing" | "resolved" | "ignored"; detectedAt: string; resolutionNote?: string };

const label = (value: string) => value.replaceAll("_", " ");

export default function DataIntegrityPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const result = await api.get("/admin/integrity/issues", { params: status === "all" ? {} : { status } });
      setIssues(result.data?.issues || []);
    } catch (err: any) { setError(err?.response?.data?.message || "Could not load integrity issues."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [status]);

  const update = async (issue: Issue, next: "reviewing" | "resolved" | "ignored", resolutionNote?: string) => {
    setBusy(issue._id); setError("");
    try {
      await api.patch(`/admin/integrity/issues/${issue._id}`, { status: next, ...(resolutionNote ? { resolutionNote } : {}) });
      setSelected(null); setNote(""); await load();
    } catch (err: any) { setError(err?.response?.data?.message || "Could not update this integrity issue."); }
    finally { setBusy(null); }
  };

  return <main style={{ padding: "1.75rem 2rem", maxWidth: 1280, margin: "0 auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
      <div>
        <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: "none", fontSize: 13, display: "inline-flex", gap: 5, alignItems: "center" }}><ArrowLeft size={14} /> Control Tower</Link>
        <h1 style={{ color: TEXT_COLORS.body, margin: "10px 0 4px", fontSize: 26 }}>Data integrity</h1>
        <p style={{ margin: 0, color: TEXT_COLORS.muted }}>Reconcile broken relationships and incomplete lifecycle evidence. Never infer financial or identity data.</p>
      </div>
      <button onClick={() => void load()} disabled={loading} style={{ border: `1px solid ${UI_COLORS.border}`, background: UI_COLORS.surface, color: TEXT_COLORS.body, borderRadius: 8, padding: "9px 12px", fontWeight: 700, display: "inline-flex", gap: 7, alignItems: "center" }}><RefreshCw size={15} /> Refresh</button>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {["open", "reviewing", "resolved", "ignored", "all"].map((item) => <button key={item} onClick={() => setStatus(item)} aria-pressed={status === item} style={{ border: `1px solid ${status === item ? UI_COLORS.accentBright : UI_COLORS.border}`, background: status === item ? UI_COLORS.accentLight : UI_COLORS.surface, color: TEXT_COLORS.body, borderRadius: 999, padding: "7px 11px", textTransform: "capitalize", fontWeight: 700 }}>{item}</button>)}
    </div>
    {error && <p role="alert" style={{ color: STATUS_COLORS.danger.color, background: STATUS_COLORS.danger.bg, padding: 12, borderRadius: 8 }}>{error}</p>}
    {loading ? <p role="status" style={{ color: TEXT_COLORS.muted }}>Loading integrity issues…</p> : issues.length === 0 ? <section style={{ padding: 36, textAlign: "center", border: `1px solid ${UI_COLORS.border}`, borderRadius: 12, color: TEXT_COLORS.muted }}><CheckCircle2 size={26} aria-hidden="true" /> <p>No matching integrity issues.</p></section> : <div style={{ display: "grid", gap: 12 }}>{issues.map((issue) => <article key={issue._id} style={{ border: `1px solid ${issue.severity === "critical" ? STATUS_COLORS.danger.border : UI_COLORS.border}`, borderRadius: 12, padding: 16, background: UI_COLORS.surface }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><ShieldAlert size={18} color={issue.severity === "critical" ? STATUS_COLORS.danger.color : STATUS_COLORS.warning.color} /><strong style={{ color: TEXT_COLORS.body, textTransform: "capitalize" }}>{label(issue.type)}</strong><span style={{ color: TEXT_COLORS.muted, textTransform: "uppercase", fontSize: 12, fontWeight: 800 }}>{issue.severity}</span></div><p style={{ margin: "8px 0 0", color: TEXT_COLORS.muted }}>{issue.entityType} · {issue.entityId}{issue.relation ? ` · missing ${issue.relation}` : ""}{issue.countryCode ? ` · ${issue.countryCode}` : ""}</p></div><div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>{issue.status === "open" && <button disabled={busy === issue._id} onClick={() => void update(issue, "reviewing")} style={{ border: 0, background: UI_COLORS.accentBright, color: "white", borderRadius: 8, padding: "8px 10px", fontWeight: 700 }}>Start review</button>}{["open", "reviewing"].includes(issue.status) && <button disabled={busy === issue._id} onClick={() => { setSelected(issue); setNote(""); }} style={{ border: `1px solid ${UI_COLORS.border}`, background: "white", color: TEXT_COLORS.body, borderRadius: 8, padding: "8px 10px", fontWeight: 700 }}>Resolve</button>}</div></div>
    </article>)}</div>}
    {selected && <div role="dialog" aria-modal="true" aria-labelledby="resolution-title" style={{ position: "fixed", inset: 0, background: "rgba(2,21,80,.45)", display: "grid", placeItems: "center", padding: 20, zIndex: 70 }}><div style={{ width: "min(560px, 100%)", background: "white", borderRadius: 14, padding: 22 }}><h2 id="resolution-title" style={{ marginTop: 0, color: TEXT_COLORS.body }}>Record resolution</h2><p style={{ color: TEXT_COLORS.muted }}>State the verified source or correction. This does not modify the affected booking, user, or payment automatically.</p><label style={{ display: "grid", gap: 7, fontWeight: 700, color: TEXT_COLORS.body }}>Resolution note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={1000} style={{ border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, padding: 10, font: "inherit" }} /></label><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}><button onClick={() => setSelected(null)} style={{ border: `1px solid ${UI_COLORS.border}`, background: "white", borderRadius: 8, padding: "9px 12px" }}>Cancel</button><button disabled={!note.trim() || busy === selected._id} onClick={() => void update(selected, "resolved", note.trim())} style={{ border: 0, background: STATUS_COLORS.success.color, color: "white", borderRadius: 8, padding: "9px 12px", fontWeight: 800 }}>Mark resolved</button></div></div></div>}
  </main>;
}
