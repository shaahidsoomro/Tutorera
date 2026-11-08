"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, RefreshCw, CheckCircle, Database, Server, Clock, Cpu, HardDrive, ShieldCheck } from "lucide-react";
import api from "@/lib/axios";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

// Matches the backend getSystemHealth payload exactly
// (see tutorera-backend/src/controllers/adminControlTower.controller.ts).
// The earlier shape was `{name, interval, status}` only — which both
// claimed a field the backend never sent (`interval`) and dropped the
// actionable lease fields the UI should surface (`holderId`, timestamps,
// `lastError`).
type JobStatus = "running" | "healthy" | "error" | "idle";

interface JobLeaseInfo {
  name: string;
  holderId: string | null;
  status: JobStatus | string;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  leaseExpiresAt: string | null;
  lastError: string | null;
  isLeaseActive: boolean;
  consecutiveFailures: number;
  totalRuns: number;
  totalFailures: number;
  lastDurationMs: number | null;
  lastSucceededAt: string | null;
}

interface RecentJobFailure {
  jobName: string;
  startedAt: string;
  durationMs: number;
  error: string | null;
}

interface HealthData {
  nativeQueue?: {
    observedAt: string; limit: number;
    pending: { id: string; name: string; attempts: number; nextAttempt: number }[];
    failed: { id: string; name: string; attempts: number; nextAttempt: number }[];
    pendingTruncated: boolean; failedTruncated: boolean;
  } | null;
  scheduler?: { engine: string; enabled: boolean; mode: string; queueVisibility: string };
  api: string;
  database: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  jobs: JobLeaseInfo[];
  degradedJobs: string[];
  recentJobFailures: RecentJobFailure[];
}

const JOB_DESCRIPTIONS: Record<string, string> = {
  "email-outbox-delivery": "Deliver queued transactional emails",
  "offer-expiry-processing": "Expire offers and send expiry notifications",
  "request-lifecycle-processing": "Process request expiry and lifecycle transitions",
  "abandoned-journey-recovery": "Send eligible unfinished-application and request reminders",
  "pending-payout-processing": "Process eligible pending tutor payouts",
  "exchange-rate-refresh": "Refresh informational exchange rates",
  "agreement-reminder-delivery": "Remind tutors about unsigned agreements",
  "missing-document-reminder-delivery": "Remind tutors about missing verification information",
  request_lifecycle_worker: "Transition 7-day expired requests to archival state; preserve historical offers",
  day_5_liquidity_escalation: "Flag zero-offer requests on Day 5 and dispatch proactive tutor push notifications",
  "24h_expiry_warning_worker": "Alert students 24 hours prior to tuition request automatic expiration",
  offer_24h_expiry_cleaner: "Cancel pending tutor proposals exceeding the 24-hour response window",
  tutor_payout_processing: "Process tutor payouts for completed, cleared bookings",
  abandoned_journey_recovery: "Nudge students who left a tuition request wizard partway",
  exchange_rate_refresh: "Refresh FX reference rates for multi-currency settlement",
  agreement_signer_reminder: "Remind tutors pending acceptance of the current tutor agreement",
  missing_documents_reminder: "Remind tutors with incomplete verification documents",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "scheduled";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/system/health");
      setHealth(res.data.health);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to load system health:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const heapPercentage = health
    ? Math.min(100, Math.round((health.memory.heapUsedMb / health.memory.heapTotalMb) * 100))
    : 0;

  return (
    <div style={{ padding: "1.75rem 2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Link href="/admin" style={{ color: UI_COLORS.gray500, textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: UI_COLORS.border }}>/</span>
            <span style={{ color: UI_COLORS.gray500, fontSize: "0.85rem" }}>System Governance</span>
            <span style={{ color: UI_COLORS.border }}>/</span>
            <span style={{ color: TEXT_COLORS.body, fontSize: "0.85rem", fontWeight: 600 }}>System Health</span>
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: TEXT_COLORS.body, margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Activity size={26} color={STATUS_COLORS.success.color} /> System Health & Worker Telemetry
          </h1>
          <p style={{ color: UI_COLORS.gray500, margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Real-time infrastructure pulse, MongoDB cluster connectivity, memory consumption, and background worker queues.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: TEXT_COLORS.muted, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (15s)
          </label>

          <button
            onClick={fetchHealth}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 0.95rem",
              background: UI_COLORS.surface,
              border: `1px solid ${UI_COLORS.border}`,
              borderRadius: "7px",
              color: TEXT_COLORS.secondary,
              fontSize: "0.83rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Core Vitals Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {/* API Gateway */}
        <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: STATUS_COLORS.success.bg, display: "flex", alignItems: "center", justifyContent: "center", color: STATUS_COLORS.success.color }}>
            <Server size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: UI_COLORS.gray500, fontWeight: 600, textTransform: "uppercase" }}>API Gateway</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: STATUS_COLORS.success.color, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: STATUS_COLORS.success.color, display: "inline-block" }} />
              OPERATIONAL
            </div>
            <div style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted }}>HTTP/2 • Express 5.0</div>
          </div>
        </div>

        {/* Database */}
        <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: STATUS_COLORS.info.bg, display: "flex", alignItems: "center", justifyContent: "center", color: STATUS_COLORS.info.color }}>
            <Database size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: UI_COLORS.gray500, fontWeight: 600, textTransform: "uppercase" }}>MongoDB Cluster</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: health?.database === "connected" ? STATUS_COLORS.success.color : STATUS_COLORS.danger.color, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: health?.database === "connected" ? STATUS_COLORS.success.color : STATUS_COLORS.danger.color, display: "inline-block" }} />
              {health?.database === "connected" ? "CONNECTED" : "DISCONNECTED"}
            </div>
            <div style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted }}>Mongoose Replica Set</div>
          </div>
        </div>

        {/* Uptime */}
        <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: STATUS_COLORS.warning.bg, display: "flex", alignItems: "center", justifyContent: "center", color: STATUS_COLORS.warning.color }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: UI_COLORS.gray500, fontWeight: 600, textTransform: "uppercase" }}>Process Uptime</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: TEXT_COLORS.body }}>
              {health?.uptimeFormatted || "0h 0m"}
            </div>
            <div style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted }}>{health?.uptimeSeconds.toLocaleString()} seconds active</div>
          </div>
        </div>

        {/* Memory RSS */}
        <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: STATUS_COLORS.purple.bg, display: "flex", alignItems: "center", justifyContent: "center", color: STATUS_COLORS.purple.color }}>
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: UI_COLORS.gray500, fontWeight: 600, textTransform: "uppercase" }}>Resident Memory (RSS)</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: TEXT_COLORS.body }}>
              {health?.memory.rssMb || 0} MB
            </div>
            <div style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted }}>Heap: {health?.memory.heapUsedMb} / {health?.memory.heapTotalMb} MB</div>
          </div>
        </div>
      </div>

      {/* Memory Utilization Bar */}
      <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", padding: "1.25rem", marginBottom: "1.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", fontWeight: 700, color: TEXT_COLORS.body }}>
            <HardDrive size={16} color={UI_COLORS.accent} /> V8 Heap Memory Allocation
          </div>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: heapPercentage > 80 ? STATUS_COLORS.danger.color : STATUS_COLORS.success.color }}>
            {heapPercentage}% Utilized ({health?.memory.heapUsedMb} MB of {health?.memory.heapTotalMb} MB)
          </span>
        </div>
        <div style={{ width: "100%", height: "10px", background: UI_COLORS.card, borderRadius: "5px", overflow: "hidden" }}>
          <div
            style={{
              width: `${heapPercentage}%`,
              height: "100%",
              background: heapPercentage > 80 ? STATUS_COLORS.danger.color : heapPercentage > 60 ? STATUS_COLORS.warning.color : STATUS_COLORS.success.color,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: TEXT_COLORS.muted, marginTop: "0.4rem" }}>
          <span>0 MB</span>
          <span>Last telemetry poll: {lastChecked || "Just now"}</span>
          <span>{health?.memory.heapTotalMb || 0} MB Allocated</span>
        </div>
      </div>

      {/* Background Lifecycle & Worker Jobs Table */}
      <div style={{ background: UI_COLORS.surface, border: `1px solid ${UI_COLORS.border}`, borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "1.1rem 1.25rem", borderBottom: `1px solid ${UI_COLORS.card}`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldCheck size={18} color={STATUS_COLORS.success.color} />
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: TEXT_COLORS.body, margin: 0 }}>
              Scheduled Autonomous Marketplace Engines
            </h2>
            <span style={{ fontSize: "0.78rem", color: UI_COLORS.gray500 }}>Cron routines maintaining demand freshness, liquidity rescue, and notification sweeps</span>
          </div>
        </div>

        <p style={{ padding: "0 1.25rem", color: TEXT_COLORS.muted }}>
          {health?.scheduler
            ? `Scheduler: ${health.scheduler.engine}; dispatch ${health.scheduler.enabled ? "enabled" : "disabled"}.`
            : "Scheduler configuration has not been reported by this backend."}
          {["not-reported", "unavailable"].includes(health?.scheduler?.queueVisibility || "") && " Cloudflare queue inspection is unavailable; the table below shows MongoDB run history only."}
        </p>

        {health?.nativeQueue && (
          <section aria-label="Cloudflare dispatch queue" style={{ padding: "0 1.25rem 1rem" }}>
            <h3>Cloudflare dispatch queue</h3>
            <p>
              Pending: {health.nativeQueue.pending.length}{health.nativeQueue.pendingTruncated ? "+" : ""}.
              {" "}Held after failure: {health.nativeQueue.failed.length}{health.nativeQueue.failedTruncated ? "+" : ""}.
              {" "}Observed <time dateTime={health.nativeQueue.observedAt}>{new Date(health.nativeQueue.observedAt).toLocaleString()}</time>.
            </p>
            {(health.nativeQueue.pendingTruncated || health.nativeQueue.failedTruncated) && <p>Showing the first {health.nativeQueue.limit} entries per state; these are not total queue counts.</p>}
            <ul>
              {health.nativeQueue.pending.map((job) => <li key={`pending-${job.id}`}>
                {job.name}: pending, {job.attempts} failed attempts; eligible for retry {new Date(job.nextAttempt).toLocaleString()}.
              </li>)}
              {health.nativeQueue.failed.map((job) => <li key={`failed-${job.id}`}>
                {job.name}: held after {job.attempts} failed attempts. Requires operator review; automatic retries stopped.
              </li>)}
            </ul>
            {!health.nativeQueue.pending.length && !health.nativeQueue.failed.length && <p>No pending or held jobs.</p>}
          </section>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: UI_COLORS.card, borderBottom: `1px solid ${UI_COLORS.border}`, color: TEXT_COLORS.muted }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Worker Subsystem</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Responsibility</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Last run</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Health Signal</th>
              </tr>
            </thead>
            <tbody>
              {(!health?.jobs || health.jobs.length === 0) && (
                <tr><td colSpan={5} style={{ padding: "1.5rem 1rem", color: TEXT_COLORS.muted, textAlign: "center" }}>No scheduled jobs have reported yet.</td></tr>
              )}
              {health?.jobs.map((job) => {
                const description = JOB_DESCRIPTIONS[job.name] || "Autonomous backend routine";

                // Status badge comes from the backend's canonical computation
                // (running / healthy / error / idle), not from a hardcoded
                // "RUNNING" string. This was the bug — admins previously
                // saw all-green regardless of lease state.
                const statusKey = (job.status || "idle").toLowerCase();
                const statusTone =
                  statusKey === "error" ? STATUS_COLORS.danger :
                  statusKey === "running" ? STATUS_COLORS.info :
                  statusKey === "healthy" ? STATUS_COLORS.success :
                  STATUS_COLORS.warning; // idle

                const lastRunLabel =
                  job.lastCompletedAt ? formatRelative(job.lastCompletedAt) :
                  job.lastStartedAt ? `started ${formatRelative(job.lastStartedAt)}` :
                  "never";

                return (
                  <tr key={job.name} style={{ borderBottom: `1px solid ${UI_COLORS.card}` }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: TEXT_COLORS.body, fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {job.name}
                      {job.holderId && (
                        <div style={{ fontSize: "0.68rem", color: TEXT_COLORS.muted, fontWeight: 400, marginTop: 2 }}>
                          holder: <span style={{ fontFamily: "monospace" }}>{job.holderId}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: UI_COLORS.gray500, maxWidth: "340px", fontSize: "0.8rem" }}>
                      {description}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: TEXT_COLORS.muted, fontSize: "0.8rem" }}>
                      {lastRunLabel}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ background: statusTone.bg, color: statusTone.color, padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, border: `1px solid ${statusTone.border}`, textTransform: "uppercase" }}>
                        {statusKey}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      {job.lastError ? (
                        <span title={job.lastError} style={{ color: STATUS_COLORS.danger.color, display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.78rem", fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          ⚠ {job.lastError}
                        </span>
                      ) : statusKey === "running" ? (
                        <span style={{ color: STATUS_COLORS.info.color, display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.78rem", fontWeight: 600 }}>
                          <Activity size={14} /> In progress
                        </span>
                      ) : statusKey === "healthy" ? (
                        <span style={{ color: STATUS_COLORS.success.color, display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.78rem", fontWeight: 600 }}>
                          <CheckCircle size={14} /> Normal
                        </span>
                      ) : (
                        <span style={{ color: TEXT_COLORS.muted, fontSize: "0.78rem" }}>awaiting first run</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ padding: "0.75rem 1rem", borderTop: `1px solid ${UI_COLORS.card}`, color: TEXT_COLORS.muted, fontSize: "0.75rem", display: "flex", flexWrap: "wrap", gap: "1.25rem" }}>
            {health?.jobs.map((job) => (
              <span key={`counters-${job.name}`}>
                {job.name}: {job.consecutiveFailures} consecutive failure{job.consecutiveFailures === 1 ? "" : "s"} · {job.totalRuns - job.totalFailures}/{job.totalRuns} runs ok
                {job.lastDurationMs !== null && <> · {job.lastDurationMs} ms</>}
              </span>
            ))}
          </div>
        </div>

        {health?.degradedJobs?.length ? (
          <div role="alert" style={{ background: STATUS_COLORS.danger.bg, border: `1px solid ${STATUS_COLORS.danger.border}`, color: STATUS_COLORS.danger.color, borderRadius: "0.75rem", padding: "1rem 1.25rem", marginTop: "1.25rem", fontWeight: 600 }}>
            Failing on consecutive runs: {health.degradedJobs.join(", ")}. No run has succeeded since the last failure. Check scheduler state and the dispatch queue before retrying; Cloudflare jobs stop automatic retries after three failures.
          </div>
        ) : null}

        {health?.recentJobFailures?.length ? (
          <div style={{ marginTop: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: TEXT_COLORS.body, margin: "0 0 0.75rem" }}>Recent job failures</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {health.recentJobFailures.map((failure, index) => (
                <li key={`${failure.jobName}-${failure.startedAt}-${index}`} style={{ background: UI_COLORS.card, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.5rem", padding: "0.6rem 0.85rem", fontSize: "0.78rem" }}>
                  <strong style={{ fontFamily: "monospace", color: TEXT_COLORS.body }}>{failure.jobName}</strong>
                  <span style={{ color: TEXT_COLORS.muted }}> · {formatRelative(failure.startedAt)} · {failure.durationMs} ms</span>
                  {failure.error && <div style={{ color: STATUS_COLORS.danger.color, marginTop: 4, wordBreak: "break-word" }}>{failure.error}</div>}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
