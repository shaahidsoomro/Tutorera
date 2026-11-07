"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ArrowLeft, Pencil, Plus, Save, X } from "lucide-react";
import api from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

type Category = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  status: string;
  subjectCount?: number;
};

const empty = { code: "", name: "", description: "", displayOrder: "0" };

export default function SubjectCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter === "all" ? "limit=200" : `status=${statusFilter}&limit=200`;
      const { data } = await api.get(`/admin/academic-framework/categories?${params}`);
      setItems(data.categories || []);
    } catch (error) {
      showError(error, "Could not load subject categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [statusFilter]);

  const reset = () => { setForm(empty); setEditing(null); setOpen(false); };

  const save = async () => {
    if (!form.name.trim()) return showError("Category name is required");
    setSaving(true);
    const payload = { ...form, displayOrder: Number(form.displayOrder) || 0 };
    try {
      if (editing) {
        await api.patch(`/admin/academic-framework/categories/${editing}`, payload);
        showSuccess("Category updated");
      } else {
        await api.post("/admin/academic-framework/categories", payload);
        showSuccess("Category created");
      }
      reset();
      await load();
    } catch (error) {
      showError(error, "Could not save category");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.patch(`/admin/academic-framework/categories/${id}`, { status: "archived" });
      showSuccess("Category archived");
      await load();
    } catch (error) {
      showError(error, "Could not archive category");
    }
  };

  const filtered = items.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle = {
    marginTop: "0.25rem", width: "100%", borderRadius: "0.4rem",
    border: `1px solid ${UI_COLORS.border}`, padding: "0.5rem 0.6rem",
    fontSize: "0.875rem", fontWeight: 400, boxSizing: "border-box" as const,
  };

  return (
    <div style={{ padding: "1.75rem 2rem" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
        <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
          <ArrowLeft size={14} aria-hidden="true" /> Control Tower
        </Link>
        <span style={{ color: UI_COLORS.border }}>/</span>
        <Link href="/admin/academic-framework" style={{ color: TEXT_COLORS.muted, textDecoration: "none", fontSize: "0.82rem", fontWeight: 700 }}>Academic Framework</Link>
        <span style={{ color: UI_COLORS.border }}>/</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: STATUS_COLORS.purple.color }}>Subject Categories</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>Subject Categories</h1>
          <p style={{ color: TEXT_COLORS.muted, fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
            Categories organise the public subject catalogue. They do not determine teaching eligibility.
          </p>
        </div>
        <button
          onClick={() => { reset(); setOpen(true); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1rem", borderRadius: "0.5rem", background: UI_COLORS.accent, color: UI_COLORS.surface, fontWeight: 700, fontSize: "0.875rem", border: "none", cursor: "pointer", minHeight: 44 }}
        >
          <Plus size={16} aria-hidden="true" /> New category
        </button>
      </div>

      {/* Create / Edit form */}
      {open && (
        <div style={{ marginBottom: "1.5rem", padding: "1.25rem", borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.accentLight}`, background: UI_COLORS.accentLight }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 1rem" }}>
            {editing ? "Edit category" : "Create category"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT_COLORS.secondary }}>
              Stable code
              <input
                disabled={Boolean(editing)}
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="CAT-STEM"
                style={{ ...inputStyle, background: editing ? UI_COLORS.card : UI_COLORS.surface }}
                aria-label="Category code"
              />
            </label>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT_COLORS.secondary }}>
              Name
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
                aria-label="Category name"
              />
            </label>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT_COLORS.secondary }}>
              Display order
              <input
                type="number"
                value={form.displayOrder}
                onChange={e => setForm({ ...form, displayOrder: e.target.value })}
                style={inputStyle}
                aria-label="Display order"
              />
            </label>
          </div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: "1rem" }}>
            Description
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, resize: "vertical" }}
              aria-label="Category description"
            />
          </label>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              disabled={saving}
              onClick={() => void save()}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: "0.5rem", background: UI_COLORS.accent, color: UI_COLORS.surface, fontWeight: 700, fontSize: "0.875rem", border: "none", cursor: "pointer", minHeight: 44, opacity: saving ? 0.6 : 1 }}
            >
              <Save size={15} aria-hidden="true" /> {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={reset}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: "0.5rem", background: UI_COLORS.surface, color: TEXT_COLORS.secondary, fontWeight: 700, fontSize: "0.875rem", border: `1px solid ${UI_COLORS.border}`, cursor: "pointer", minHeight: 44 }}
            >
              <X size={15} aria-hidden="true" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search + filter toolbar */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or code…"
          aria-label="Search categories by name or code"
          style={{ padding: "0.5rem 0.75rem", borderRadius: "0.4rem", border: `1px solid ${UI_COLORS.border}`, fontSize: "0.875rem", width: "100%", maxWidth: 320 }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          style={{ padding: "0.5rem 0.75rem", borderRadius: "0.4rem", border: `1px solid ${UI_COLORS.border}`, fontSize: "0.875rem", minHeight: 38 }}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All statuses</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, overflowX: "auto" }}>
        {loading ? (
          <div role="status" aria-label="Loading categories" style={{ padding: "3rem", textAlign: "center", color: TEXT_COLORS.muted }}>
            <span aria-hidden="true">⏳</span> Loading categories…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: TEXT_COLORS.muted }}>
            {search ? `No categories match "${search}".` : "No categories found."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: UI_COLORS.card, borderBottom: `1px solid ${UI_COLORS.border}` }}>
                <th scope="col" style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT_COLORS.muted }}>Code</th>
                <th scope="col" style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT_COLORS.muted }}>Category</th>
                <th scope="col" style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT_COLORS.muted }}>Status</th>
                <th scope="col" style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT_COLORS.muted }}>Subjects</th>
                <th scope="col" style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT_COLORS.muted }}>Order</th>
                <th scope="col" style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT_COLORS.muted }}>Description</th>
                <th scope="col" style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT_COLORS.muted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr key={c._id} style={{ borderTop: idx === 0 ? "none" : `1px solid ${UI_COLORS.border}` }}>
                  <td style={{ padding: "0.9rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 800, color: UI_COLORS.accent }}>{c.code}</td>
                  <td style={{ padding: "0.9rem 1rem", fontWeight: 700, color: TEXT_COLORS.body }}>{c.name}</td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <span style={{
                      padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700,
                      backgroundColor: c.status === "active" ? STATUS_COLORS.success.bg : STATUS_COLORS.neutral.bg,
                      color: c.status === "active" ? STATUS_COLORS.success.color : TEXT_COLORS.muted,
                    }}>
                      {c.status === "active" ? "Active" : c.status === "archived" ? "Archived" : c.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.9rem 1rem", color: TEXT_COLORS.muted, textAlign: "center" }}>
                    {c.subjectCount ?? "—"}
                  </td>
                  <td style={{ padding: "0.9rem 1rem", color: TEXT_COLORS.muted }}>{c.displayOrder}</td>
                  <td style={{ padding: "0.9rem 1rem", color: TEXT_COLORS.muted, maxWidth: 220, fontSize: "0.82rem" }}>{c.description || "—"}</td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    {archiveConfirmId === c._id ? (
                      <span role="alert" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.75rem", color: "#be123c", fontWeight: 600 }}>Archive?</span>
                        <button
                          onClick={() => { void handleArchive(c._id); setArchiveConfirmId(null); }}
                          style={{ padding: "0.3rem 0.6rem", borderRadius: 4, border: "none", background: "#be123c", color: "white", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", minHeight: 36 }}
                        >Yes</button>
                        <button
                          onClick={() => setArchiveConfirmId(null)}
                          style={{ padding: "0.3rem 0.6rem", borderRadius: 4, border: `1px solid ${UI_COLORS.border}`, background: "white", color: TEXT_COLORS.muted, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", minHeight: 36 }}
                        >Cancel</button>
                      </span>
                    ) : (
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <button
                          onClick={() => { setEditing(c._id); setForm({ code: c.code, name: c.name, description: c.description || "", displayOrder: String(c.displayOrder || 0) }); setOpen(true); }}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 700, fontSize: "0.82rem", color: UI_COLORS.accent, background: "none", border: "none", cursor: "pointer", padding: "0.4rem 0.5rem", borderRadius: 4, minHeight: 36 }}
                          aria-label={`Edit ${c.name}`}
                        >
                          <Pencil size={14} aria-hidden="true" /> Edit
                        </button>
                        {c.status !== "archived" && (
                          <button
                            onClick={() => setArchiveConfirmId(c._id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 700, fontSize: "0.82rem", color: "#be123c", background: "none", border: "none", cursor: "pointer", padding: "0.4rem 0.5rem", borderRadius: 4, minHeight: 36 }}
                            aria-label={`Archive ${c.name}`}
                          >
                            <Archive size={14} aria-hidden="true" /> Archive
                          </button>
                        )}
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
