"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Filter } from "lucide-react";
import api from "@/lib/axios";
import { showError } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

type Approval = { profileId: string; tutorName: string; tutorEmail: string; subject: string; levels: string[]; status: string; eligibilityType: string; evidenceRequired: boolean; requestedAt?: string };

const statusStyle = (s: string): React.CSSProperties => {
  if (s === "approved") return { backgroundColor: STATUS_COLORS.success.bg, color: STATUS_COLORS.success.color };
  if (s === "rejected" || s === "revoked") return { backgroundColor: STATUS_COLORS.danger.bg, color: STATUS_COLORS.danger.color };
  if (s === "needs_evidence") return { backgroundColor: STATUS_COLORS.warning.bg, color: STATUS_COLORS.warning.color };
  return { backgroundColor: STATUS_COLORS.neutral.bg, color: STATUS_COLORS.neutral.color };
};

export default function TutorApprovalsPage() {
  const [status, setStatus] = useState("pending,needs_evidence");
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/academic-framework/tutor-approvals?status=${encodeURIComponent(status)}`)
      .then(({ data }) => setItems(data.approvals || []))
      .catch(error => showError(error, "Could not load tutor subject approvals"))
      .finally(() => setLoading(false));
  }, [status]);

  const inp: React.CSSProperties = { marginTop:"0.25rem", borderRadius:"0.4rem", border:`1px solid ${UI_COLORS.border}`, padding:"0.4rem 0.6rem", fontSize:"0.875rem" };

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
        <span style={{ fontSize:"0.82rem", fontWeight:700, color:STATUS_COLORS.purple.color }}>Tutor Approvals</span>
      </div>

      <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:TEXT_COLORS.body, margin:"0 0 0.25rem" }}>Tutor Subject Approvals</h1>
      <p style={{ color:TEXT_COLORS.muted, fontSize:"0.85rem", margin:"0 0 1.25rem" }}>
        Review pending teaching requests. Final actions stay on the tutor application, where document evidence and the full audit history are visible.
      </p>

      <label style={{ display:"inline-flex", alignItems:"center", gap:"0.5rem", fontSize:"0.875rem", fontWeight:700, color:TEXT_COLORS.secondary, marginBottom:"1rem" }}>
        <Filter size={15} aria-hidden="true" /> Status
        <select value={status} onChange={e => setStatus(e.target.value)} style={inp} aria-label="Filter by status">
          <option value="pending,needs_evidence">Needs review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All statuses</option>
        </select>
      </label>

      <div style={{ borderRadius:"0.75rem", border:`1px solid ${UI_COLORS.border}`, backgroundColor:UI_COLORS.surface, overflowX:"auto" }}>
        {loading ? (
          <div role="status" aria-label="Loading tutor approvals" style={{ padding:"3rem", textAlign:"center", color:TEXT_COLORS.muted }}>Loading review queue…</div>
        ) : items.length === 0 ? (
          <div style={{ padding:"3rem", textAlign:"center", color:TEXT_COLORS.muted }}>No tutor subject requests match this filter.</div>
        ) : (
          <table style={{ width:"100%", minWidth:780, borderCollapse:"collapse", fontSize:"0.875rem", textAlign:"left" }}>
            <thead>
              <tr style={{ background:UI_COLORS.card, borderBottom:`1px solid ${UI_COLORS.border}` }}>
                {["Tutor","Requested Subject","Eligibility","Status","Requested","Review"].map(h => (
                  <th key={h} scope="col" style={{ padding:"0.75rem 1rem", fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:TEXT_COLORS.muted }}>
                    {h === "Review" ? <span className="sr-only">Review</span> : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={`${item.profileId}-${item.subject}-${i}`} style={{ borderTop:`1px solid ${UI_COLORS.border}` }}>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <p style={{ fontWeight:700, color:TEXT_COLORS.body, margin:0 }}>{item.tutorName}</p>
                    <p style={{ fontSize:"0.78rem", color:TEXT_COLORS.muted, margin:"0.2rem 0 0" }}>{item.tutorEmail}</p>
                  </td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <p style={{ fontWeight:600, color:TEXT_COLORS.body, margin:0 }}>{item.subject}</p>
                    {item.levels.length > 0 && <p style={{ fontSize:"0.75rem", color:TEXT_COLORS.muted, margin:"0.2rem 0 0" }}>{item.levels.join(", ")}</p>}
                  </td>
                  <td style={{ padding:"0.875rem 1rem", color:TEXT_COLORS.secondary, textTransform:"capitalize" }}>
                    {item.eligibilityType.replace("_", " ")}
                    {item.evidenceRequired && <p style={{ fontSize:"0.75rem", color:"#c2410c", margin:"0.2rem 0 0" }}>Evidence required</p>}
                  </td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <span style={{ padding:"0.2rem 0.6rem", borderRadius:"999px", fontSize:"0.72rem", fontWeight:700, ...statusStyle(item.status) }}>
                      {item.status.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ padding:"0.875rem 1rem", color:TEXT_COLORS.muted }}>
                    {item.requestedAt ? new Date(item.requestedAt).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <Link href={`/admin/applications/${item.profileId}`} style={{ display:"inline-flex", alignItems:"center", gap:"0.3rem", fontWeight:700, color:UI_COLORS.accent, fontSize:"0.82rem", textDecoration:"none" }}>
                      Review <ExternalLink size={14} aria-hidden="true" />
                    </Link>
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
