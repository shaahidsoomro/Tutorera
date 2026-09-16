"use client";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { useCallback,useEffect,useState } from "react";

const C = UI_COLORS;

interface AuditLog {
  _id: string;
  action: string;
  actor: string;
  actorId?: string;
  entity: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface LogsResponse {
  total: number;
  page: number;
  pages: number;
  logs: AuditLog[];
  filters: { actions: string[]; entities: string[] };
}

// ── Action colour coding ──────────────────────────────────────────────────────
function getActionStyle(action: string): { bg: string; color: string } {
  if (action.includes("approved") || action.includes("activated") || action.includes("confirmed") || action.includes("completed") || action.includes("paid") || action.includes("credited")) {
    return { bg: '#f0fdf4', color: '#16a34a' };
  }
  if (action.includes("rejected") || action.includes("deactivated") || action.includes("cancelled") || action.includes("refunded")) {
    return { bg: '#fef2f2', color: '#ef4444' };
  }
  if (action.includes("registered") || action.includes("created") || action.includes("placed")) {
    return { bg: '#EEF5FF', color: '#0329B2' };
  }
  if (action.includes("updated")) {
    return { bg: '#fdf4ff', color: '#9333ea' };
  }
  return { bg: '#f3f4f6', color: '#6b7280' };
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

// ── CSV export helper ─────────────────────────────────────────────────────────
function exportCSV(logs: AuditLog[]) {
  const headers = ["Action", "Actor", "Entity", "Target", "Target ID", "Timestamp"];
  const rows = logs.map(l => [
    l.action,
    l.actor,
    l.entity,
    l.targetName || "—",
    l.targetId   || "—",
    new Date(l.createdAt).toLocaleString("en-PK"),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `tutorera-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AuditLogsPage() {
  const [data, setData]           = useState<LogsResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [page, setPage]           = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (entityFilter !== "all") params.set("entity", entityFilter);
      const res = await api.get(`/admin/audit-logs?${params}`);
      setData(res.data);
    } catch {
      console.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [actionFilter, entityFilter]);

  const logs    = data?.logs ?? [];
  const total   = data?.total ?? 0;
  const pages   = data?.pages ?? 1;
  const actions  = ["all", ...(data?.filters.actions  ?? [])].sort();
  const entities = ["all", ...(data?.filters.entities ?? [])].sort();

  return (
    <div style={{ padding: '2rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: '700', color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
          Compliance Trail
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary, marginBottom: '0.25rem' }}>Audit Logs</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>
          Immutable record of all admin and system actions with searchable event history.
        </p>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: "Total Events",      value: total.toLocaleString(),  icon: "📋", color: C.accent  },
          { label: "Action Filter",     value: actionFilter === "all" ? "All" : formatAction(actionFilter), icon: "🔍", color: '#7c3aed' },
          { label: "Entity Filter",     value: entityFilter === "all" ? "All" : entityFilter, icon: "🏷️", color: '#d97706' },
          { label: "Latest Batch",      value: loading ? "Loading" : logs.length > 0 ? "Loaded" : "Empty", icon: "⏱️", color: '#16a34a' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.1rem 1.25rem', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, backgroundColor: C.gray50, borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', color: C.gray500, marginBottom: '0.2rem' }}>{s.label}</p>
              <p style={{ fontSize: '1rem', fontWeight: '800', color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Export */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          title="Actions"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          style={{ padding: '0.55rem 1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.8rem', color: C.primary, backgroundColor: 'white', outline: 'none', cursor: 'pointer' }}>
          {actions.map(a => (
            <option key={a} value={a}>{a === "all" ? "All Actions" : formatAction(a)}</option>
          ))}
        </select>

        <select
          title="Entities"
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          style={{ padding: '0.55rem 1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.8rem', color: C.primary, backgroundColor: 'white', outline: 'none', cursor: 'pointer' }}>
          {entities.map(e => (
            <option key={e} value={e}>{e === "all" ? "All Entities" : e}</option>
          ))}
        </select>

        <button
          onClick={() => { setActionFilter("all"); setEntityFilter("all"); setPage(1); }}
          style={{ padding: '0.55rem 1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.8rem', color: C.gray500, backgroundColor: 'white', cursor: 'pointer', fontWeight: '600' }}>
          Reset
        </button>

        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => exportCSV(logs)}
            disabled={logs.length === 0}
            style={{ padding: '0.55rem 1.25rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.8rem', color: C.primary, backgroundColor: 'white', cursor: logs.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: logs.length === 0 ? 0.5 : 1 }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Event Stream Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem' }}>Event Stream</h3>
          <span style={{ fontSize: '0.75rem', color: C.gray500 }}>
            {loading ? "Loading..." : `Showing ${logs.length} of ${total} events`}
          </span>
        </div>

        {/* Desktop Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1.2fr', padding: '0.75rem 1.5rem', backgroundColor: C.gray50, borderBottom: '1px solid #e5e7eb' }} className="audit-desktop-header">
          {["Action", "Actor", "Entity", "Target", "Timestamp"].map(h => (
            <p key={h} style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{h}</p>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ width: '32px', height: '32px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: C.gray500 }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</p>
            <p style={{ fontWeight: '600', color: C.primary }}>No audit logs yet</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Logs will appear here as admin and system actions occur.
            </p>
          </div>
        ) : (
          logs.map((log, idx) => {
            const style = getActionStyle(log.action);
            return (
              <div key={log._id} style={{ borderBottom: idx < logs.length - 1 ? '1px solid #f3f4f6' : 'none' }}>

                {/* Desktop Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1.2fr', padding: '0.875rem 1.5rem', alignItems: 'center' }} className="audit-desktop-row">

                  {/* Action badge */}
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', padding: '0.25rem 0.75rem', borderRadius: '999px', backgroundColor: style.bg, color: style.color, width: 'fit-content', whiteSpace: 'nowrap' }}>
                    {formatAction(log.action)}
                  </span>

                  {/* Actor */}
                  <div>
                    <p style={{ fontSize: '0.82rem', fontWeight: '600', color: C.primary, margin: 0 }}>{log.actor}</p>
                    {log.actorId && <p style={{ fontSize: '0.7rem', color: C.gray500, margin: 0, fontFamily: 'monospace' }}>{log.actorId.slice(-8)}</p>}
                  </div>

                  {/* Entity */}
                  <span style={{ fontSize: '0.78rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '0.35rem', backgroundColor: '#f3f4f6', color: C.primary, width: 'fit-content' }}>
                    {log.entity}
                  </span>

                  {/* Target */}
                  <div>
                    <p style={{ fontSize: '0.82rem', color: C.primary, margin: 0, fontWeight: '500' }}>
                      {log.targetName || "—"}
                    </p>
                    {log.targetId && (
                      <p style={{ fontSize: '0.7rem', color: C.gray500, margin: 0, fontFamily: 'monospace' }}>
                        {log.targetId.slice(-12)}
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0.15rem 0 0', fontFamily: 'monospace' }}>
                        {Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div>
                    <p style={{ fontSize: '0.8rem', color: C.gray500, margin: 0 }}>{timeAgo(log.createdAt)}</p>
                    <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>
                      {new Date(log.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>

                {/* Mobile Card */}
                <div style={{ padding: '1rem 1.25rem' }} className="audit-mobile-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: style.bg, color: style.color }}>
                      {formatAction(log.action)}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: C.gray500, margin: 0 }}>{timeAgo(log.createdAt)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: C.gray500, margin: 0 }}>Actor</p>
                      <p style={{ fontSize: '0.8rem', fontWeight: '600', color: C.primary, margin: 0 }}>{log.actor}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: C.gray500, margin: 0 }}>Entity</p>
                      <p style={{ fontSize: '0.8rem', fontWeight: '600', color: C.primary, margin: 0 }}>{log.entity}</p>
                    </div>
                    {log.targetName && (
                      <div>
                        <p style={{ fontSize: '0.7rem', color: C.gray500, margin: 0 }}>Target</p>
                        <p style={{ fontSize: '0.8rem', fontWeight: '600', color: C.primary, margin: 0 }}>{log.targetName}</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: page === 1 ? C.gray500 : C.primary, backgroundColor: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
            ← Prev
          </button>
          <span style={{ fontSize: '0.875rem', color: C.gray500, padding: '0 0.5rem' }}>
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '600', color: page === pages ? C.gray500 : C.primary, backgroundColor: 'white', cursor: page === pages ? 'not-allowed' : 'pointer', opacity: page === pages ? 0.5 : 1 }}>
            Next →
          </button>
        </div>
      )}

      <style>{`
        @media (min-width: 769px) { .audit-mobile-card { display: none !important; } }
        @media (max-width: 768px) {
          .audit-desktop-header { display: none !important; }
          .audit-desktop-row    { display: none !important; }
          .audit-mobile-card    { display: block !important; }
        }
      `}</style>
    </div>
  );
}
