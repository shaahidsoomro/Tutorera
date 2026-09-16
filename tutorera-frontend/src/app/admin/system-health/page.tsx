"use client";

import api from "@/lib/axios";
import { Activity,ArrowLeft,CheckCircle,Clock,Cpu,Database,HardDrive,RefreshCw,Server,ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

interface HealthData {
  api: string;
  database: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  jobs: Array<{
    name: string;
    interval: string;
    status: string;
  }>;
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
            <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>System Governance</span>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ color: "#0f172a", fontSize: "0.85rem", fontWeight: 600 }}>System Health</span>
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Activity size={26} color="#059669" /> System Health & Worker Telemetry
          </h1>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Real-time infrastructure pulse, MongoDB cluster connectivity, memory consumption, and background worker queues.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: "#475569", cursor: "pointer" }}>
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
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "7px",
              color: "#334155",
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
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
            <Server size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>API Gateway</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#059669", display: "inline-block" }} />
              OPERATIONAL
            </div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>HTTP/2 • Express 5.0</div>
          </div>
        </div>

        {/* Database */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e40af" }}>
            <Database size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>MongoDB Cluster</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: health?.database === "connected" ? "#059669" : "#dc2626", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: health?.database === "connected" ? "#059669" : "#dc2626", display: "inline-block" }} />
              {health?.database === "connected" ? "CONNECTED" : "DISCONNECTED"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Mongoose Replica Set</div>
          </div>
        </div>

        {/* Uptime */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#b45309" }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Process Uptime</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
              {health?.uptimeFormatted || "0h 0m"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{health?.uptimeSeconds.toLocaleString()} seconds active</div>
          </div>
        </div>

        {/* Memory RSS */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#7e22ce" }}>
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Resident Memory (RSS)</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
              {health?.memory.rssMb || 0} MB
            </div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Heap: {health?.memory.heapUsedMb} / {health?.memory.heapTotalMb} MB</div>
          </div>
        </div>
      </div>

      {/* Memory Utilization Bar */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
            <HardDrive size={16} color="#0329b2" /> V8 Heap Memory Allocation
          </div>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: heapPercentage > 80 ? "#dc2626" : "#059669" }}>
            {heapPercentage}% Utilized ({health?.memory.heapUsedMb} MB of {health?.memory.heapTotalMb} MB)
          </span>
        </div>
        <div style={{ width: "100%", height: "10px", background: "#f1f5f9", borderRadius: "5px", overflow: "hidden" }}>
          <div
            style={{
              width: `${heapPercentage}%`,
              height: "100%",
              background: heapPercentage > 80 ? "#dc2626" : heapPercentage > 60 ? "#d97706" : "#059669",
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.4rem" }}>
          <span>0 MB</span>
          <span>Last telemetry poll: {lastChecked || "Just now"}</span>
          <span>{health?.memory.heapTotalMb || 0} MB Allocated</span>
        </div>
      </div>

      {/* Background Lifecycle & Worker Jobs Table */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "1.1rem 1.25rem", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldCheck size={18} color="#059669" />
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Scheduled Autonomous Marketplace Engines
            </h2>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Cron routines maintaining demand freshness, liquidity rescue, and notification sweeps</span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Worker Subsystem</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Responsibility</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Polling Frequency</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Health Signal</th>
              </tr>
            </thead>
            <tbody>
              {health?.jobs.map((job) => {
                let description = "Autonomous backend routine";
                if (job.name === "request_lifecycle_worker") description = "Transition 7-day expired requests to archival state; preserve historical offers";
                if (job.name === "day_5_liquidity_escalation") description = "Flag zero-offer requests on Day 5 and dispatch proactive tutor push notifications";
                if (job.name === "24h_expiry_warning_worker") description = "Alert students 24 hours prior to tuition request automatic expiration";
                if (job.name === "offer_24h_expiry_cleaner") description = "Cancel pending tutor proposals exceeding the 24-hour response window";

                return (
                  <tr key={job.name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#0f172a", fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {job.name}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", maxWidth: "340px", fontSize: "0.8rem" }}>
                      {description}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                      Every {job.interval}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ background: "#ecfdf5", color: "#059669", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, border: "1px solid #a7f3d0" }}>
                        RUNNING
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <span style={{ color: "#059669", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.78rem", fontWeight: 600 }}>
                        <CheckCircle size={14} /> Normal
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
