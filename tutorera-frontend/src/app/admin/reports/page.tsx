"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileText, FileSpreadsheet, Search, ArrowLeft } from "lucide-react";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import PayoutReportDownload from "@/components/Finance/PayoutReportDownload";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

export default function ReportsHubPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [tutorIdSearch, setTutorIdSearch] = useState("");

  const handleDownloadReport = async (period: "weekly" | "monthly", format: "excel" | "pdf") => {
    const key = `${period}-${format}`;
    setDownloading(key);
    try {
      const response = await api.get("/admin/reports", {
        params: { period, format },
        responseType: "blob",
      });
      const ext = format === "excel" ? "xlsx" : "pdf";
      const filename = `tutorera-${period}-report.${ext}`;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess(`Downloaded ${filename}`);
    } catch {
      showError("Failed to generate report.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
            <ArrowLeft size={14} /> Control Tower
          </Link>
          <span style={{ color: UI_COLORS.border }}>/</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: STATUS_COLORS.purple.color }}>Reports</span>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>Reports &amp; Exports Hub</h1>
        <p style={{ color: TEXT_COLORS.muted, marginTop: "0.2rem", fontSize: "0.85rem" }}>
          Centralized dashboard for generating financial summaries and tutor statements.
        </p>
      </div>

      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        
        {/* Global Financial Summaries */}
        <div style={{ background: UI_COLORS.surface, padding: "1.5rem", borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}` }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: TEXT_COLORS.primary, marginTop: 0, marginBottom: "0.25rem" }}>Global Platform Reports</h2>
          <p style={{ fontSize: "0.85rem", color: TEXT_COLORS.muted, marginBottom: "1.5rem" }}>
            Generate comprehensive summaries for finance, bookings, and compliance across the platform.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ border: `1px solid ${UI_COLORS.border}`, padding: "1rem", borderRadius: "0.5rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: TEXT_COLORS.primary, margin: "0 0 0.75rem 0" }}>Weekly Summary</h3>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  aria-label="Download weekly summary report as PDF"
                  onClick={() => handleDownloadReport("weekly", "pdf")}
                  disabled={downloading === "weekly-pdf"}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1rem", background: STATUS_COLORS.info.bg, color: STATUS_COLORS.info.color, border: `1px solid ${STATUS_COLORS.info.border}`, borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", opacity: downloading === "weekly-pdf" ? 0.7 : 1, minHeight: 44 }}
                >
                  <FileText size={16} aria-hidden="true" /> {downloading === "weekly-pdf" ? "Generating..." : "Download PDF"}
                </button>
                <button
                  type="button"
                  aria-label="Download weekly summary report as Excel"
                  onClick={() => handleDownloadReport("weekly", "excel")}
                  disabled={downloading === "weekly-excel"}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1rem", background: STATUS_COLORS.success.bg, color: STATUS_COLORS.success.color, border: `1px solid ${STATUS_COLORS.success.border}`, borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", opacity: downloading === "weekly-excel" ? 0.7 : 1, minHeight: 44 }}
                >
                  <FileSpreadsheet size={16} aria-hidden="true" /> {downloading === "weekly-excel" ? "Generating..." : "Download Excel"}
                </button>
              </div>
            </div>

            <div style={{ border: `1px solid ${UI_COLORS.border}`, padding: "1rem", borderRadius: "0.5rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: TEXT_COLORS.primary, margin: "0 0 0.75rem 0" }}>Monthly Summary</h3>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  aria-label="Download monthly summary report as PDF"
                  onClick={() => handleDownloadReport("monthly", "pdf")}
                  disabled={downloading === "monthly-pdf"}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1rem", background: STATUS_COLORS.info.bg, color: STATUS_COLORS.info.color, border: `1px solid ${STATUS_COLORS.info.border}`, borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", opacity: downloading === "monthly-pdf" ? 0.7 : 1, minHeight: 44 }}
                >
                  <FileText size={16} aria-hidden="true" /> {downloading === "monthly-pdf" ? "Generating..." : "Download PDF"}
                </button>
                <button
                  type="button"
                  aria-label="Download monthly summary report as Excel"
                  onClick={() => handleDownloadReport("monthly", "excel")}
                  disabled={downloading === "monthly-excel"}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1rem", background: STATUS_COLORS.success.bg, color: STATUS_COLORS.success.color, border: `1px solid ${STATUS_COLORS.success.border}`, borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", opacity: downloading === "monthly-excel" ? 0.7 : 1, minHeight: 44 }}
                >
                  <FileSpreadsheet size={16} aria-hidden="true" /> {downloading === "monthly-excel" ? "Generating..." : "Download Excel"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Tutor Statements */}
        <div style={{ background: UI_COLORS.surface, padding: "1.5rem", borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}` }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: TEXT_COLORS.primary, marginTop: 0, marginBottom: "0.25rem" }}>Tutor Payout Statements</h2>
          <p style={{ fontSize: "0.85rem", color: TEXT_COLORS.muted, marginBottom: "1.5rem" }}>
            Generate a detailed statement for a specific tutor by entering their exact Tutor ID.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT_COLORS.primary }}>Tutor System ID</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={16} color={TEXT_COLORS.muted} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  value={tutorIdSearch}
                  onChange={(e) => setTutorIdSearch(e.target.value)}
                  placeholder="e.g. 64b8f..."
                  style={{ width: "100%", padding: "0.6rem 0.6rem 0.6rem 2.25rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.5rem", fontSize: "0.85rem", color: TEXT_COLORS.body }}
                />
              </div>
            </div>

            <div style={{ marginTop: "1rem", padding: "1.25rem", background: STATUS_COLORS.neutral.bg, borderRadius: "0.5rem", border: `1px dashed ${UI_COLORS.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              {tutorIdSearch.trim().length >= 24 ? (
                <>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: TEXT_COLORS.secondary, textAlign: "center" }}>
                    Ready to generate statement for: <br/> <strong style={{color: TEXT_COLORS.primary}}>{tutorIdSearch.trim()}</strong>
                  </p>
                  <PayoutReportDownload
                    endpoint={`/admin/tutors/${tutorIdSearch.trim()}/payout-report/pdf`}
                    label="Generate Statement PDF"
                  />
                </>
              ) : (
                <p style={{ margin: 0, fontSize: "0.85rem", color: TEXT_COLORS.muted, textAlign: "center" }}>
                  Please enter a valid 24-character Tutor ID to generate their specific payout statement.
                </p>
              )}
            </div>

            <div style={{ marginTop: "1rem" }}>
              <Link href="/admin/tutors" style={{ fontSize: "0.85rem", color: UI_COLORS.accent, fontWeight: 600, textDecoration: "none" }}>
                Browse Tutors Directory →
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
