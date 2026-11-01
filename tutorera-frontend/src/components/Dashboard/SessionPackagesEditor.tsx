"use client";
import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";

interface Pkg { sessions: number; totalPrice: number; label: string }

interface Props { tutorCurrency?: string; hourlyRate?: number }

export default function SessionPackagesEditor({ tutorCurrency, hourlyRate }: Props) {
  const currency = tutorCurrency || "PKR";
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/tutors/profile/me");
      setPackages((res.data.profile?.sessionPackages || []).map((p: Pkg) => ({ sessions: p.sessions, totalPrice: p.totalPrice, label: p.label || "" })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPackage = () => {
    if (packages.length >= 5) return;
    setPackages(prev => [...prev, { sessions: 5, totalPrice: hourlyRate ? hourlyRate * 4 : 0, label: "" }]);
  };

  const removePackage = (i: number) => setPackages(prev => prev.filter((_, idx) => idx !== i));

  const update = (i: number, field: keyof Pkg, value: string | number) => {
    setPackages(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };

  const save = async () => {
    for (const pkg of packages) {
      if (!pkg.sessions || pkg.sessions < 2 || !pkg.totalPrice || pkg.totalPrice <= 0) {
        showError("Each package needs at least 2 sessions and a positive total price.");
        return;
      }
    }
    setSaving(true);
    try {
      await axiosInstance.patch("/tutors/profile/packages", { sessionPackages: packages });
      showSuccess("Session packages saved.");
    } catch (err) {
      showError(err, "Failed to save packages.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>
        Offer multi-session bundles at a discounted rate. Students see these on your public profile. Up to 5 packages.
      </p>
      {packages.map((pkg, i) => {
        const perSession = pkg.sessions > 0 ? Math.round(pkg.totalPrice / pkg.sessions) : 0;
        const savePct = hourlyRate && perSession > 0 ? Math.round((1 - perSession / hourlyRate) * 100) : 0;
        return (
          <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.6rem", background: "#f8fafc", padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <input type="number" min={2} max={100} value={pkg.sessions}
              onChange={e => update(i, "sessions", parseInt(e.target.value) || 2)}
              style={{ width: 70, padding: "0.35rem 0.5rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.85rem" }}
              placeholder="Sessions" title="Number of sessions" />
            <input type="number" min={0} value={pkg.totalPrice}
              onChange={e => update(i, "totalPrice", parseFloat(e.target.value) || 0)}
              style={{ width: 110, padding: "0.35rem 0.5rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.85rem" }}
              placeholder={`Total (${currency})`} title="Total package price" />
            <input type="text" value={pkg.label} maxLength={60}
              onChange={e => update(i, "label", e.target.value)}
              style={{ flex: 1, minWidth: 100, padding: "0.35rem 0.5rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.85rem" }}
              placeholder="Label (e.g. Starter Pack)" />
            <span style={{ fontSize: "0.72rem", color: "#64748b", whiteSpace: "nowrap" }}>
              {currency} {perSession.toLocaleString()}/session{savePct > 0 ? ` · save ${savePct}%` : ""}
            </span>
            <button type="button" onClick={() => removePackage(i)}
              style={{ padding: "0.3rem 0.6rem", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer", fontWeight: 700 }}>
              ✕
            </button>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        {packages.length < 5 && (
          <button type="button" onClick={addPackage}
            style={{ padding: "0.45rem 0.9rem", background: "#eff6ff", color: "#0329b2", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
            + Add Package
          </button>
        )}
        <button type="button" onClick={save} disabled={saving}
          style={{ padding: "0.45rem 1rem", background: saving ? "#e5e7eb" : "#0329b2", color: saving ? "#9ca3af" : "#fff", border: "none", borderRadius: 6, fontSize: "0.85rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving…" : "Save Packages"}
        </button>
      </div>
    </div>
  );
}
