"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Plus, Edit2, Trash2, Eye, Save, X, AlertCircle, Copy } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS } from "@/lib/brand";

interface EmailTemplate {
  _id: string;
  key: string;
  name: string;
  category: string;
  subject: string;
  variables: string[];
  isActive: boolean;
  description?: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [filter, setFilter] = useState({ category: "", isActive: true });
  const [form, setForm] = useState({
    key: "",
    name: "",
    category: "",
    subject: "",
    htmlBody: "",
    textBody: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const DEFAULT_CATEGORIES = ["Authentication", "Booking", "Payment", "Notification", "Account", "System"];

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append("category", filter.category);
      params.append("isActive", String(filter.isActive));

      const res = await api.get(`/admin/email-templates?${params.toString()}`);
      setTemplates(res.data.templates || []);
    } catch (err) {
      showError("Failed to load email templates");
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/admin/email-templates/categories");
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchCategories(), fetchTemplates()]);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  const handleSubmit = async () => {
    if (!form.key.trim() || !form.name.trim() || !form.category.trim() || !form.subject.trim() || !form.htmlBody.trim()) {
      showError("Key, name, category, subject, and HTML body are required");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/email-templates/${editingId}`, form);
        showSuccess("Email template updated successfully");
      } else {
        await api.post("/admin/email-templates", form);
        showSuccess("Email template created successfully");
      }
      setShowForm(false);
      setEditingId(null);
      setForm({
        key: "",
        name: "",
        category: "",
        subject: "",
        htmlBody: "",
        textBody: "",
        description: "",
      });
      fetchTemplates();
    } catch (err) {
      showError("Failed to save email template");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template: EmailTemplate & { subject: string; htmlBody?: string; textBody?: string; description?: string }) => {
    setForm({
      key: template.key,
      name: template.name,
      category: template.category,
      subject: template.subject || "",
      htmlBody: template.htmlBody || "",
      textBody: template.textBody || "",
      description: template.description || "",
    });
    setEditingId(template._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/email-templates/${id}`);
      showSuccess("Email template deleted successfully");
      fetchTemplates();
    } catch (err) {
      showError("Failed to delete email template");
      console.error(err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({
      key: "",
      name: "",
      category: "",
      subject: "",
      htmlBody: "",
      textBody: "",
      description: "",
    });
  };

  const handlePreview = (template: EmailTemplate & { subject?: string; htmlBody?: string }) => {
    setShowPreview(template._id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading email templates...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700 }}>Email Templates</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1rem",
              background: UI_COLORS.accent,
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <Plus size={18} /> New Template
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div
          style={{
            background: "white",
            border: `1px solid ${UI_COLORS.border}`,
            borderRadius: "0.75rem",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>
            {editingId ? "Edit Email Template" : "Create New Email Template"}
          </h3>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Template Key *</label>
              <input
                type="text"
                placeholder="e.g., WELCOME_EMAIL"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
                disabled={!!editingId}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  opacity: editingId ? 0.7 : 1,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Template Name *</label>
              <input
                type="text"
                placeholder="e.g., Welcome Email"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Category *</label>
              <input
                type="text"
                placeholder="e.g., Authentication"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                list="categories"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              />
              <datalist id="categories">
                {[...categories, ...DEFAULT_CATEGORIES].filter((c, i, a) => a.indexOf(c) === i).map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Subject Line *</label>
              <input
                type="text"
                placeholder="e.g., Welcome to Tutorera"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Description</label>
            <textarea
              placeholder="Describe when this email is sent"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: `1px solid ${UI_COLORS.border}`,
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontFamily: "inherit",
                minHeight: "2rem",
              }}
            />
            <small style={{ color: UI_COLORS.gray500, marginTop: "0.25rem", display: "block" }}>
              💡 Use &#123;&#123;variableName&#125;&#125; for dynamic content (e.g., &#123;&#123;userName&#125;&#125;)
            </small>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>HTML Body *</label>
            <textarea
              placeholder="Enter email HTML content..."
              value={form.htmlBody}
              onChange={(e) => setForm({ ...form, htmlBody: e.target.value })}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: `1px solid ${UI_COLORS.border}`,
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontFamily: "monospace",
                minHeight: "8rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Plain Text Body (Optional)</label>
            <textarea
              placeholder="Enter plain text version for email clients that don't support HTML..."
              value={form.textBody}
              onChange={(e) => setForm({ ...form, textBody: e.target.value })}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: `1px solid ${UI_COLORS.border}`,
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontFamily: "monospace",
                minHeight: "4rem",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button
              onClick={handleCancel}
              style={{
                padding: "0.625rem 1rem",
                border: `1px solid ${UI_COLORS.border}`,
                background: "white",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 1rem",
                background: saving ? UI_COLORS.gray500 : STATUS_COLORS.success.color,
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              <Save size={18} /> {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          style={{
            padding: "0.5rem",
            border: `1px solid ${UI_COLORS.border}`,
            borderRadius: "0.375rem",
          }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={String(filter.isActive)}
          onChange={(e) => setFilter({ ...filter, isActive: e.target.value === "true" })}
          style={{
            padding: "0.5rem",
            border: `1px solid ${UI_COLORS.border}`,
            borderRadius: "0.375rem",
          }}
        >
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            background: UI_COLORS.card,
            borderRadius: "0.75rem",
            color: UI_COLORS.gray500,
          }}
        >
          <AlertCircle size={32} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          No email templates found. Create one to get started.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {templates.map((template) => (
            <div
              key={template._id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto auto",
                gap: "1rem",
                alignItems: "center",
                padding: "1rem",
                background: "white",
                border: `1px solid ${UI_COLORS.border}`,
                borderRadius: "0.75rem",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{template.name}</div>
                <div style={{ fontSize: "0.875rem", color: UI_COLORS.gray500 }}>
                  <strong>{template.key}</strong> • {template.category}
                </div>
                {template.variables.length > 0 && (
                  <div style={{ fontSize: "0.75rem", color: UI_COLORS.gray500, marginTop: "0.25rem" }}>
                    Variables: {template.variables.join(", ")}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(template.key);
                  showSuccess("Key copied!");
                }}
                title="Copy key"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.5rem 0.75rem",
                  background: UI_COLORS.card,
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                }}
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => handlePreview(template as any)}
                title="Preview template"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.5rem 0.75rem",
                  background: UI_COLORS.card,
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                }}
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => handleEdit(template as any)}
                title="Edit template"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.5rem 0.75rem",
                  background: UI_COLORS.card,
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                }}
              >
                <Edit2 size={16} />
              </button>
              {confirmDeleteId === template._id ? (
                <div role="alert" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: STATUS_COLORS.danger.color }}>Delete?</span>
                  <button onClick={() => { setConfirmDeleteId(null); handleDelete(template._id); }} style={{ padding: "0.3rem 0.6rem", background: STATUS_COLORS.danger.color, color: "white", border: "none", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", minHeight: 32 }}>Yes</button>
                  <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "0.3rem 0.6rem", background: "white", color: "#64748b", border: `1px solid ${STATUS_COLORS.danger.border}`, borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", minHeight: 32 }}>No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(template._id)}
                  title="Delete template"
                  aria-label={`Delete template ${template.name}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.5rem 0.75rem",
                    background: STATUS_COLORS.danger.bg,
                    border: `1px solid ${STATUS_COLORS.danger.border}`,
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    color: STATUS_COLORS.danger.color,
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
