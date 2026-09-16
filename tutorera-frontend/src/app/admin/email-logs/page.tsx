"use client";

import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { showError } from "@/lib/toast";
import { useEffect,useMemo,useState } from "react";

type EmailStatus = "queued" | "sent" | "delivered" | "opened" | "bounced" | "failed";

interface EmailLog {
  _id: string;
  eventType: string;
  templateId: string;
  recipientEmail: string;
  subject: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  providerMessageId?: string;
  status: EmailStatus;
  queuedAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  failedAt?: string;
  bounceReason?: string;
  retryCount: number;
  createdAt: string;
  user?: { name?: string; role?: string };
}

interface PlannedEvent {
  event: string;
  recipient: string;
  trigger: string;
  exampleSubject: string;
  category: string;
}

const statuses: EmailStatus[] = ["queued", "sent", "delivered", "opened", "bounced", "failed"];

const colors: Record<EmailStatus, { bg: string; color: string; border: string }> = {
  queued: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  sent: { bg: UI_COLORS.accentLight, color: UI_COLORS.accent, border: "#bfdbfe" },
  delivered: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  opened: { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  bounced: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  failed: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

export default function AdminEmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [status, setStatus] = useState<EmailStatus | "all">("all");
  const [eventType, setEventType] = useState("all");
  const [recipient, setRecipient] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [plannedEvents, setPlannedEvents] = useState<PlannedEvent[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (status !== "all") params.set("status", status);
    if (eventType !== "all") params.set("eventType", eventType);
    if (recipient.trim()) params.set("recipient", recipient.trim());
    return params.toString();
  }, [page, status, eventType, recipient]);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/email-logs?${query}`)
      .then((res) => {
        setLogs(Array.isArray(res.data.logs) ? res.data.logs : []);
        setPages(res.data.pages || 1);
        setEventTypes(Array.isArray(res.data.filters?.eventTypes) ? res.data.filters.eventTypes : []);
        setPlannedEvents(Array.isArray(res.data.filters?.plannedEvents) ? res.data.filters.plannedEvents : []);
        setStatusCounts(res.data.filters?.statusCounts || {});
      })
      .catch((err) => showError(err, "Failed to load email logs"))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div style={{ padding: "2rem", color: UI_COLORS.primary }}>
      <div style={{ marginBottom: 24 }}>
        <p style={eyebrow}>Admin / Communications</p>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Transactional Email Logs</h1>
        <p style={{ margin: "8px 0 0", color: UI_COLORS.gray500 }}>Track queued, sent, delivered, opened, bounced, and failed emails across verification, booking, payment, recovery, and support events.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
        {statuses.map((item) => (
          <button key={item} onClick={() => { setStatus(item); setPage(1); }} style={{ ...statusCard(colors[item]), boxShadow: status === item ? UI_COLORS.shadowCardHover : "none" }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{statusCounts[item] || 0}</div>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: "capitalize" }}>{item}</div>
          </button>
        ))}
      </div>

      <div style={filterBar}>
        <select value={status} onChange={(e) => { setStatus(e.target.value as EmailStatus | "all"); setPage(1); }} style={fieldStyle}>
          <option value="all">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} style={fieldStyle}>
          <option value="all">All logged events</option>
          {eventTypes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input value={recipient} onChange={(e) => { setRecipient(e.target.value); setPage(1); }} placeholder="Search recipient email" style={{ ...fieldStyle, minWidth: 240 }} />
      </div>

      <section style={panel}>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={headRow}>
                <th style={th}>Status</th>
                <th style={th}>Event</th>
                <th style={th}>Recipient</th>
                <th style={th}>Subject</th>
                <th style={th}>Related</th>
                <th style={th}>Provider ID</th>
                <th style={th}>Queued</th>
                <th style={th}>Sent/Failed</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={td}>Loading email logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} style={td}>No email logs match these filters.</td></tr>
              ) : logs.map((log) => (
                <tr key={log._id} style={rowStyle}>
                  <td style={td}><StatusPill status={log.status} /></td>
                  <td style={td}><code style={codeStyle}>{log.eventType}</code><div style={muted}>{log.templateId}</div></td>
                  <td style={td}>{log.recipientEmail}<div style={muted}>{log.user?.name || "Unknown user"} {log.user?.role ? `/ ${log.user.role}` : ""}</div></td>
                  <td style={td}>{log.subject}</td>
                  <td style={td}>{log.relatedEntityType || "-"}<div style={muted}>{log.relatedEntityId || ""}</div></td>
                  <td style={td}>{log.providerMessageId ? <code style={codeStyle}>{log.providerMessageId}</code> : "-"}</td>
                  <td style={td}>{formatDate(log.queuedAt || log.createdAt)}</td>
                  <td style={td}>{formatDate(log.failedAt || log.sentAt)}{log.bounceReason ? <div style={{ ...muted, color: "#b91c1c" }}>{log.bounceReason}</div> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={pagerStyle}>Previous</button>
        <span style={{ color: UI_COLORS.gray500, fontSize: 13 }}>Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} style={pagerStyle}>Next</button>
      </div>

      <section style={{ ...panel, marginTop: 28 }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${UI_COLORS.border}` }}>
          <p style={eyebrow}>Event architecture</p>
          <h2 style={{ margin: 0, fontSize: 20 }}>Planned Email Event Map</h2>
          <p style={{ margin: "6px 0 0", color: UI_COLORS.gray500, fontSize: 13 }}>Canonical event names, recipients, triggers, and example subjects for the TUTORERA email system.</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={headRow}>
                <th style={th}>Category</th>
                <th style={th}>Event</th>
                <th style={th}>Recipient</th>
                <th style={th}>Trigger</th>
                <th style={th}>Example subject</th>
                <th style={th}>Log status</th>
              </tr>
            </thead>
            <tbody>
              {plannedEvents.map((item) => {
                const hasLogs = eventTypes.includes(item.event);
                return (
                  <tr key={item.event} style={rowStyle}>
                    <td style={td}>{item.category}</td>
                    <td style={td}><code style={codeStyle}>{item.event}</code></td>
                    <td style={td}>{item.recipient}</td>
                    <td style={td}>{item.trigger}</td>
                    <td style={td}>{item.exampleSubject}</td>
                    <td style={td}>{hasLogs ? <span style={loggedPill}>logged</span> : <span style={plannedPill}>planned</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: EmailStatus }) {
  const c = colors[status] || colors.queued;
  return <span style={{ display: "inline-flex", border: `1px solid ${c.border}`, background: c.bg, color: c.color, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800, textTransform: "capitalize" }}>{status}</span>;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}

const eyebrow: React.CSSProperties = { margin: "0 0 6px", color: UI_COLORS.accent, fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" };
const filterBar: React.CSSProperties = { background: "#fff", border: `1px solid ${UI_COLORS.border}`, borderRadius: 18, padding: 16, marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", boxShadow: UI_COLORS.shadowCard };
const panel: React.CSSProperties = { background: "#fff", border: `1px solid ${UI_COLORS.border}`, borderRadius: 18, overflow: "hidden", boxShadow: UI_COLORS.shadowCard };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: 1050 };
const headRow: React.CSSProperties = { background: UI_COLORS.card, color: UI_COLORS.gray600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" };
const fieldStyle: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 12, padding: "10px 12px", color: UI_COLORS.primary, background: "#fff", fontWeight: 700 };
const th: React.CSSProperties = { padding: 14, textAlign: "left", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: 14, color: "#0f172a", verticalAlign: "top", fontSize: 13 };
const rowStyle: React.CSSProperties = { borderTop: `1px solid ${UI_COLORS.border}` };
const muted: React.CSSProperties = { marginTop: 4, color: UI_COLORS.gray500, fontSize: 12 };
const codeStyle: React.CSSProperties = { background: "#f1f5f9", borderRadius: 6, padding: "2px 5px", color: UI_COLORS.primary };
const pagerStyle: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", color: UI_COLORS.primary, padding: "8px 12px", fontWeight: 800, cursor: "pointer" };
const plannedPill: React.CSSProperties = { display: "inline-flex", border: "1px solid #e2e8f0", background: "#f8fafc", color: UI_COLORS.gray600, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800 };
const loggedPill: React.CSSProperties = { display: "inline-flex", border: "1px solid #bfdbfe", background: UI_COLORS.accentLight, color: UI_COLORS.accent, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800 };
function statusCard(c: { bg: string; color: string; border: string }): React.CSSProperties {
  return { textAlign: "left", border: `1px solid ${c.border}`, background: c.bg, color: c.color, borderRadius: 14, padding: 14, cursor: "pointer", transition: "transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out)" };
}
