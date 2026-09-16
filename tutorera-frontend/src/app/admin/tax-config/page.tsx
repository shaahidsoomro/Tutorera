"use client";

import api from "@/lib/axios";
import { useEffect,useState } from "react";

interface TaxConfig {
  _id: string;
  countryCode: string;
  taxType: "VAT" | "GST" | "service_tax" | "DST" | "none";
  rate: number;
  name: string;
  registrationThresholdUSD?: number;
  tutorLiable: boolean;
  platformCollects: boolean;
  invoiceRequired: boolean;
  appliesOnlineServices: boolean;
  appliesHomeTuition: boolean;
  notes?: string;
  isActive: boolean;
  updatedAt: string;
}

const TAX_TYPE_COLORS: Record<string, string> = {
  VAT: "#3b82f6",
  GST: "#f59e0b",
  service_tax: "#10b981",
  DST: "#ef4444",
  none: "#6b7280",
};

const BLANK_CONFIG: Omit<TaxConfig, "_id" | "updatedAt"> = {
  countryCode: "",
  taxType: "none",
  rate: 0,
  name: "",
  registrationThresholdUSD: undefined,
  tutorLiable: false,
  platformCollects: true,
  invoiceRequired: false,
  appliesOnlineServices: true,
  appliesHomeTuition: true,
  notes: "",
  isActive: true,
};

export default function TaxConfigPage() {
  const [configs, setConfigs] = useState<TaxConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(BLANK_CONFIG);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/tax-config");
      setConfigs(res.data.configs || []);
    } catch {
      setError("Failed to load tax configurations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleEdit = (cfg: TaxConfig) => {
    setEditForm({ ...cfg });
    setIsNew(false);
    setEditOpen(true);
  };

  const handleNew = () => {
    setEditForm({ ...BLANK_CONFIG });
    setIsNew(true);
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await api.post("/admin/tax-config", editForm);
      } else {
        await api.put(`/admin/tax-config/${editForm._id}`, editForm);
      }
      setEditOpen(false);
      await fetchConfigs();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save tax config.");
    } finally {
      setSaving(false);
    }
  };

  const cellStyle: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" };
  const headCell: React.CSSProperties = { ...cellStyle, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em", fontSize: "0.72rem" };
  const chip = (label: string, color: string) => (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>{label}</span>
  );

  return (
    <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 12 }}>🌐 Tax Configuration</h2>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.875rem" }}>Manage VAT, GST, and service tax rates per country</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchConfigs} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f1f5f9", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>↻ Refresh</button>
          <button onClick={handleNew} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#6366f1", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>+ Add Country</button>
        </div>
      </div>

      {error && <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#fca5a5" }}>{error} <button onClick={() => setError(null)} style={{ float: "right", background: "none", border: "none", color: "#fca5a5", cursor: "pointer" }}>✕</button></div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#94a3b8" }}>Loading…</div>
      ) : (
        <div style={{ background: "#18181f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={headCell}>Country</th>
                <th style={headCell}>Tax Type</th>
                <th style={{ ...headCell, textAlign: "right" }}>Rate</th>
                <th style={headCell}>Display Name</th>
                <th style={{ ...headCell, textAlign: "center" }}>Pltfm Collects</th>
                <th style={{ ...headCell, textAlign: "center" }}>Invoice</th>
                <th style={{ ...headCell, textAlign: "center" }}>Online</th>
                <th style={{ ...headCell, textAlign: "center" }}>Home</th>
                <th style={{ ...headCell, textAlign: "center" }}>Active</th>
                <th style={{ ...headCell, textAlign: "center" }}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {configs.length === 0 ? (
                <tr><td colSpan={10} style={{ ...cellStyle, textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>No tax configurations found. Click &quot;Add Country&quot; to begin.</td></tr>
              ) : configs.map((cfg) => (
                <tr key={cfg._id} style={{ transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.05)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ ...cellStyle, fontWeight: 700 }}>{cfg.countryCode}</td>
                  <td style={cellStyle}>{chip(cfg.taxType, TAX_TYPE_COLORS[cfg.taxType] || "#6b7280")}</td>
                  <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700 }}>{cfg.rate}%</td>
                  <td style={cellStyle}>{cfg.name}</td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>{cfg.platformCollects ? "✅" : "—"}</td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>{cfg.invoiceRequired ? "✅" : "—"}</td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>{cfg.appliesOnlineServices ? "✅" : "—"}</td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>{cfg.appliesHomeTuition ? "✅" : "—"}</td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>{chip(cfg.isActive ? "Active" : "Inactive", cfg.isActive ? "#10b981" : "#6b7280")}</td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    <button onClick={() => handleEdit(cfg)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 8px", color: "#94a3b8", cursor: "pointer" }}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Modal */}
      {editOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#1e1e2a", borderRadius: 12, padding: 32, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ margin: "0 0 20px", fontWeight: 700 }}>{isNew ? "Add Tax Configuration" : `Edit Tax — ${editForm.countryCode}`}</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Country Code (ISO 3166-1)
                <input value={editForm.countryCode} onChange={(e) => setEditForm({ ...editForm, countryCode: e.target.value.toUpperCase() })} disabled={!isNew} maxLength={2} style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#0f0f13", color: "#f1f5f9", marginTop: 4, textTransform: "uppercase" }} />
              </label>

              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Tax Type
                <select value={editForm.taxType} onChange={(e) => setEditForm({ ...editForm, taxType: e.target.value })} style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#0f0f13", color: "#f1f5f9", marginTop: 4 }}>
                  <option value="none">None</option>
                  <option value="VAT">VAT</option>
                  <option value="GST">GST</option>
                  <option value="service_tax">Service Tax</option>
                  <option value="DST">Digital Service Tax</option>
                </select>
              </label>

              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Rate (%)
                <input type="number" value={editForm.rate} onChange={(e) => setEditForm({ ...editForm, rate: parseFloat(e.target.value) || 0 })} min={0} max={100} step={0.5} style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#0f0f13", color: "#f1f5f9", marginTop: 4 }} />
              </label>

              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Display Name
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="e.g. VAT (20%)" style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#0f0f13", color: "#f1f5f9", marginTop: 4 }} />
              </label>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {(["platformCollects", "tutorLiable", "invoiceRequired", "appliesOnlineServices", "appliesHomeTuition", "isActive"] as const).map((key) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "#f1f5f9", cursor: "pointer" }}>
                    <input type="checkbox" checked={editForm[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.checked })} />
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                  </label>
                ))}
              </div>

              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Notes
                <textarea rows={2} value={editForm.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#0f0f13", color: "#f1f5f9", marginTop: 4, resize: "vertical" }} />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
              <button onClick={() => setEditOpen(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f1f5f9", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !editForm.countryCode} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#6366f1", color: "white", cursor: "pointer", fontWeight: 600, opacity: saving || !editForm.countryCode ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
