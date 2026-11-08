"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";
import { formatDateLong } from "@/lib/site";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { COUNTRY_SCHEDULES, formatScheduleDraft } from "@/lib/legalJurisdictions";
import {
  Scale,
  Download,
  Search,
  Plus,
  Eye,
} from "lucide-react";

interface AgreementItem {
  _id: string;
  agreementType: string;
  version: string;
  title: string;
  country: string;
  status: "draft" | "published" | "archived";
  contentHash: string;
  effectiveDate: string;
  isCurrent: boolean;
  totalAcceptances?: number;
  content: string;
  countrySchedule?: string;
  companyDetails?: {
    legalName: string;
    tradingName: string;
    email: string;
  };
}

interface ComplianceStats {
  totalApprovedTutors: number;
  activeWithAgreement: number;
  awaitingAgreement: number;
  reacceptanceRequired: number;
  acceptanceRatePercent: number;
}

export default function AdminLegalAgreementsPage() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [agreements, setAgreements] = useState<AgreementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementItem | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Search by tutor ID
  const [searchTutorId, setSearchTutorId] = useState("");
  const [searchingTutor, setSearchingTutor] = useState(false);
  const [tutorCompliance, setTutorCompliance] = useState<any>(null);

  // Create draft agreement modal
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftVersion, setDraftVersion] = useState("");
  const [draftTitle, setDraftTitle] = useState("Tutor Marketplace & Independent Tutor Agreement");
  const [draftCountry, setDraftCountry] = useState("PK");
  const [draftContent, setDraftContent] = useState("");
  const [draftSchedule, setDraftSchedule] = useState("");
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState<{ id: string; version: string } | null>(null);
  const [confirmScheduleReplace, setConfirmScheduleReplace] = useState(false);

  // PDF download loading
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchAgreementsAndStats = async () => {
    try {
      setLoading(true);
      const [agreementsRes, statsRes] = await Promise.all([
        api.get("/admin/legal/agreements"),
        api.get("/admin/legal/compliance-stats"),
      ]);
      setAgreements(agreementsRes.data.agreements || []);
      setStats(statsRes.data.stats || null);
    } catch (err: any) {
      showError(err, "Failed to load legal agreements or compliance stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreementsAndStats();
  }, []);

  const handleSearchTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTutorId.trim()) return;
    setSearchingTutor(true);
    setTutorCompliance(null);
    try {
      const res = await api.get(`/admin/tutors/${searchTutorId.trim()}/agreements`);
      const acceptance = (res.data.acceptances || [])[0] || null;
      setTutorCompliance({
        ...res.data,
        tutorUserId: res.data.tutor?.userId?._id || res.data.tutor?.userId || searchTutorId.trim(),
        latestAcceptance: acceptance,
      });
      showSuccess("Tutor compliance record found.");
    } catch (err: any) {
      showError(err, "Tutor agreement record not found or invalid Tutor ID.");
    } finally {
      setSearchingTutor(false);
    }
  };

  const handleDownloadPdf = async (acceptanceId: string, tutorName: string) => {
    setDownloadingId(acceptanceId);
    try {
      const res = await api.get(`/tutor/agreements/${acceptanceId}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TUTORERA-Contract-${tutorName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess("Signed agreement PDF downloaded.");
    } catch (err: any) {
      showError(err, "Failed to download contract PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftVersion.trim() || !draftContent.trim()) {
      showError("Version identifier and agreement content are required.");
      return;
    }
    setSubmittingDraft(true);
    try {
      await api.post("/admin/legal/agreements", {
        documentType: "TUTOR_AGREEMENT",
        version: draftVersion.trim(),
        title: draftTitle.trim(),
        country: draftCountry,
        content: draftContent.trim(),
        applicableSchedule: draftSchedule.trim(),
      });
      showSuccess(`Draft agreement ${draftVersion} created successfully.`);
      setShowDraftModal(false);
      setDraftVersion("");
      setDraftContent("");
      setDraftSchedule("");
      fetchAgreementsAndStats();
    } catch (err: any) {
      showError(err, "Failed to create draft agreement.");
    } finally {
      setSubmittingDraft(false);
    }
  };

  const handlePublishAgreement = async (id: string, version: string) => {
    setPublishConfirm(null);
    try {
      await api.post(`/admin/legal/agreements/${id}/publish`, {
        markReacceptance: false,
      });
      showSuccess(`Agreement ${version} published and set as current.`);
      fetchAgreementsAndStats();
    } catch (err: any) {
      showError(err, "Failed to publish agreement.");
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: UI_COLORS.accent, display: "block", marginBottom: 4 }}>
            Legal Tech &amp; Marketplace Compliance
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT_COLORS.primary, margin: "0 0 6px" }}>
            Tutor Agreements &amp; Contract Administration
          </h1>
          <p style={{ fontSize: 14, color: TEXT_COLORS.muted, margin: 0, lineHeight: 1.5 }}>
            Manage versioned legal contracts under the Electronic Transactions Ordinance, 2002 (Pakistan). Enforces the strict rule: Admin Approval ≠ Tutor Activation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDraftModal(true)}
          style={{
            background: UI_COLORS.accent,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(3, 41, 178, 0.2)",
          }}
        >
          <Plus size={16} /> Draft New Agreement
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#FFFFFF", border: `1px solid ${UI_COLORS.border}`, borderRadius: 12, padding: "18px 20px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_COLORS.muted, display: "block", marginBottom: 4 }}>Active Marketplace Tutors</span>
          <div style={{ fontSize: 28, fontWeight: 900, color: TEXT_COLORS.primary }}>
            {loading ? "…" : stats?.totalApprovedTutors ?? 0}
          </div>
          <span style={{ fontSize: 11, color: STATUS_COLORS.success.color, fontWeight: 700 }}>Approved tutor applications</span>
        </div>

        <div style={{ background: "#FFFFFF", border: `1px solid ${UI_COLORS.border}`, borderRadius: 12, padding: "18px 20px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_COLORS.muted, display: "block", marginBottom: 4 }}>Active tutors with recorded agreement</span>
          <div style={{ fontSize: 28, fontWeight: 900, color: UI_COLORS.accent }}>
            {loading ? "…" : stats?.activeWithAgreement ?? 0}
          </div>
          <span style={{ fontSize: 11, color: TEXT_COLORS.muted }}>On active release</span>
        </div>

        <div style={{ background: "#FFFFFF", border: `1px solid ${UI_COLORS.border}`, borderRadius: 12, padding: "18px 20px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_COLORS.muted, display: "block", marginBottom: 4 }}>Pending Contract Signature</span>
          <div style={{ fontSize: 28, fontWeight: 900, color: STATUS_COLORS.warning.color }}>
            {loading ? "…" : stats?.awaitingAgreement ?? 0}
          </div>
          <span style={{ fontSize: 11, color: STATUS_COLORS.warning.color, fontWeight: 700 }}>Admin approved · Inactive</span>
        </div>

        <div style={{ background: "#FFFFFF", border: `1px solid ${UI_COLORS.border}`, borderRadius: 12, padding: "18px 20px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_COLORS.muted, display: "block", marginBottom: 4 }}>Legal Compliance Rate</span>
          <div style={{ fontSize: 28, fontWeight: 900, color: STATUS_COLORS.success.color }}>
            {loading ? "…" : `${stats?.acceptanceRatePercent ?? 0}%`}
          </div>
          <span style={{ fontSize: 11, color: TEXT_COLORS.muted }}>Fail-closed enforced</span>
        </div>
      </div>

      {/* Tutor Contract Verification Lookup */}
      <section style={{ background: "#FFFFFF", border: `1px solid ${UI_COLORS.border}`, borderRadius: 12, padding: "20px", marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: TEXT_COLORS.primary, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={18} color={UI_COLORS.accent} /> Tutor Compliance &amp; Contract Audit Inspector
        </h2>
        <p style={{ fontSize: 13, color: TEXT_COLORS.muted, margin: "0 0 14px" }}>
          Verify executed contracts, electronic signatures, and SHA-256 hashes for any tutor by User ID.
        </p>
        <form onSubmit={handleSearchTutor} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: tutorCompliance ? 16 : 0 }}>
          <input
            type="text"
            placeholder="Enter Tutor User ID (e.g. 6ab956a5...)"
            value={searchTutorId}
            onChange={(e) => setSearchTutorId(e.target.value)}
            style={{ flex: 1, minWidth: 260, padding: "10px 14px", border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={searchingTutor}
            style={{
              background: UI_COLORS.surface,
              color: TEXT_COLORS.primary,
              border: `1px solid ${UI_COLORS.border}`,
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: searchingTutor ? "wait" : "pointer",
            }}
          >
            {searchingTutor ? "Auditing…" : "Audit Record"}
          </button>
        </form>

        {tutorCompliance && (
          <div style={{ background: "#F8FAFC", border: `1px solid ${UI_COLORS.border}`, borderRadius: 10, padding: "16px", marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: TEXT_COLORS.primary }}>
                {tutorCompliance.latestAcceptance ? "✓ Contract Executed & Certified" : "⚠️ No Active Agreement Record"}
              </span>
              <span style={{ fontSize: 12, color: TEXT_COLORS.muted }}>Tutor ID: {tutorCompliance.tutorUserId}</span>
            </div>

            {tutorCompliance.latestAcceptance ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 12 }}>
                <div>
                  <span style={{ color: TEXT_COLORS.muted, display: "block" }}>Contract Version:</span>
                  <strong>{tutorCompliance.latestAcceptance.agreementVersion}</strong>
                </div>
                <div>
                  <span style={{ color: TEXT_COLORS.muted, display: "block" }}>Electronic Signature:</span>
                  <strong>{tutorCompliance.latestAcceptance.electronicSignature}</strong>
                </div>
                <div>
                  <span style={{ color: TEXT_COLORS.muted, display: "block" }}>Execution Timestamp:</span>
                  <strong>{formatDateLong(tutorCompliance.latestAcceptance.acceptedAt)}</strong>
                </div>
                <div style={{ gridColumn: "1 / -1", wordBreak: "break-all" }}>
                  <span style={{ color: TEXT_COLORS.muted, display: "block" }}>Cryptographic SHA-256 Digest:</span>
                  <code style={{ fontSize: 11, color: UI_COLORS.accent }}>{tutorCompliance.latestAcceptance.agreementHash}</code>
                </div>
                <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(tutorCompliance.latestAcceptance._id, tutorCompliance.latestAcceptance.electronicSignature)}
                    disabled={downloadingId === tutorCompliance.latestAcceptance._id}
                    style={{
                      background: UI_COLORS.accent,
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Download size={14} />
                    {downloadingId === tutorCompliance.latestAcceptance._id ? "Downloading…" : "Download Signed Contract (PDF)"}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: STATUS_COLORS.warning.color }}>
                {tutorCompliance.tutor?.marketplaceEligible
                  ? "This tutor has a historic marketplace activation but no executed agreement record. Reconcile the record before relying on agreement compliance metrics."
                  : "This tutor has not completed the electronic agreement acceptance workflow. Marketplace access remains disabled."}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Versioned Legal Agreements Table */}
      <section style={{ background: "#FFFFFF", border: `1px solid ${UI_COLORS.border}`, borderRadius: 12, padding: "20px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: TEXT_COLORS.primary, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <Scale size={18} color={UI_COLORS.accent} /> Master Agreement Releases &amp; Jurisdictions
        </h2>

        {loading ? (
          <p style={{ fontSize: 13, color: TEXT_COLORS.muted }}>Loading legal agreements…</p>
        ) : agreements.length === 0 ? (
          <p style={{ fontSize: 13, color: TEXT_COLORS.muted }}>No agreements registered.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${UI_COLORS.border}`, textAlign: "left", color: TEXT_COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "10px 12px" }}>Version</th>
                  <th style={{ padding: "10px 12px" }}>Title &amp; Jurisdiction</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px" }}>Effective Date</th>
                  <th style={{ padding: "10px 12px" }}>Cryptographic Hash</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agreements.map((item) => (
                  <tr key={item._id} style={{ borderBottom: `1px solid ${UI_COLORS.border}` }}>
                    <td style={{ padding: "12px", fontWeight: 800, color: TEXT_COLORS.primary }}>
                      {item.version} {item.isCurrent && <span style={{ background: STATUS_COLORS.success.bg, color: STATUS_COLORS.success.color, fontSize: 10, padding: "2px 6px", borderRadius: 4, marginLeft: 4 }}>CURRENT</span>}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <strong style={{ color: TEXT_COLORS.primary, display: "block" }}>{item.title}</strong>
                      <span style={{ fontSize: 11, color: TEXT_COLORS.muted }}>Jurisdiction: {item.country} · {item.companyDetails?.legalName || "MENTISERA (SMC-Private) Limited"}</span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          background: item.status === "published" ? STATUS_COLORS.success.bg : item.status === "draft" ? STATUS_COLORS.warning.bg : STATUS_COLORS.neutral.bg,
                          color: item.status === "published" ? STATUS_COLORS.success.color : item.status === "draft" ? STATUS_COLORS.warning.color : STATUS_COLORS.neutral.color,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: TEXT_COLORS.muted }}>
                      {formatDateLong(item.effectiveDate)}
                    </td>
                    <td style={{ padding: "12px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <code style={{ fontSize: 11, color: UI_COLORS.accent }}>{item.contentHash.slice(0, 16)}…</code>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAgreement(item);
                            setShowPreviewModal(true);
                          }}
                          style={{
                            background: UI_COLORS.surface,
                            color: TEXT_COLORS.primary,
                            border: `1px solid ${UI_COLORS.border}`,
                            borderRadius: 6,
                            padding: "5px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Eye size={13} /> View
                        </button>
                        {item.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => setPublishConfirm({ id: item._id, version: item.version })}
                            style={{
                              background: STATUS_COLORS.success.color,
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: 6,
                              padding: "5px 10px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Publish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {publishConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-confirm-title"
          onClick={(e) => { if (e.target === e.currentTarget) setPublishConfirm(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", padding: 16 }}
        >
          <div style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, padding: 24, width: "100%", maxWidth: 460 }}>
            <h2 id="publish-confirm-title" style={{ fontSize: 16, fontWeight: 800, color: TEXT_COLORS.primary, margin: "0 0 8px" }}>
              Publish Version {publishConfirm.version}?
            </h2>
            <p style={{ fontSize: 13, color: TEXT_COLORS.secondary, margin: "0 0 16px", lineHeight: 1.5 }}>
              This will make it the legally binding contract for all new and re-accepted tutors.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" autoFocus onClick={() => setPublishConfirm(null)} style={{ padding: "8px 16px", minHeight: 44, borderRadius: 6, border: `1px solid ${UI_COLORS.border}`, background: UI_COLORS.surface, color: TEXT_COLORS.secondary, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={() => void handlePublishAgreement(publishConfirm.id, publishConfirm.version)} style={{ padding: "8px 16px", minHeight: 44, borderRadius: 6, border: "none", background: STATUS_COLORS.success.color, color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}>Publish</button>
            </div>
          </div>
        </div>
      )}

      {/* Agreement View Modal */}
      {showPreviewModal && selectedAgreement && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(2, 21, 80, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              maxWidth: 760,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: UI_COLORS.accent, textTransform: "uppercase" }}>Version {selectedAgreement.version}</span>
                <h3 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: TEXT_COLORS.primary }}>{selectedAgreement.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: TEXT_COLORS.muted }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "#F8FAFC", border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, padding: "12px", marginBottom: 16, fontSize: 12 }}>
              <div><strong>SHA-256 Digest:</strong> <code>{selectedAgreement.contentHash}</code></div>
              <div><strong>Operating Entity:</strong> {selectedAgreement.companyDetails?.legalName || "MENTISERA (SMC-Private) Limited"}</div>
            </div>

            <div style={{ height: 350, overflowY: "auto", border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, padding: "16px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", background: "#FAFAFA", marginBottom: 16 }}>
              {selectedAgreement.content}

              {selectedAgreement.countrySchedule && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${UI_COLORS.border}` }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800 }}>Country Schedule ({selectedAgreement.country})</h4>
                  <p>{selectedAgreement.countrySchedule}</p>
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: UI_COLORS.surface,
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Draft Agreement Modal */}
      {showDraftModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(2, 21, 80, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT_COLORS.primary }}>Draft New Agreement Version</h3>
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: TEXT_COLORS.muted }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDraft}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: 4 }}>Version (e.g. TTA-2026.2)</label>
                  <input
                    type="text"
                    required
                    placeholder="TTA-2026.2"
                    value={draftVersion}
                    onChange={(e) => setDraftVersion(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: 4 }}>Jurisdiction</label>
                  <select
                    value={draftCountry}
                    onChange={(e) => setDraftCountry(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, fontSize: 13 }}
                  >
                    <option value="PK">Pakistan (PK)</option>
                    <option value="SA">Saudi Arabia (SA)</option>
                    <option value="AE">UAE (AE)</option>
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="US">United States (US)</option>
                    <option value="GLOBAL">Global</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: 4 }}>Agreement Title</label>
                <input
                  type="text"
                  required
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: 4 }}>Master Contract Text (Clauses 1 to 45)</label>
                <textarea
                  required
                  rows={8}
                  placeholder="Paste or write master contract clauses..."
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  style={{ width: "100%", padding: "10px", border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: TEXT_COLORS.secondary }}>Country Schedule ({draftCountry})</label>
                  {COUNTRY_SCHEDULES[draftCountry.toLowerCase()] && (
                    <button
                      type="button"
                      onClick={() => {
                        if (draftSchedule.trim()) { setConfirmScheduleReplace(true); return; }
                        setDraftSchedule(formatScheduleDraft(draftCountry));
                      }}
                      style={{ fontSize: 11, fontWeight: 700, color: UI_COLORS.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Use existing jurisdiction facts for {draftCountry}
                    </button>
                  )}
                </div>
                {confirmScheduleReplace && (
                  <div role="alert" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 12, color: STATUS_COLORS.warning.color, background: STATUS_COLORS.warning.bg, border: `1px solid ${STATUS_COLORS.warning.border}`, borderRadius: 6, padding: "6px 10px", marginBottom: 6 }}>
                    <span style={{ flex: 1 }}>Replace the current Country Schedule text with the jurisdiction facts on file?</span>
                    <button type="button" onClick={() => { setDraftSchedule(formatScheduleDraft(draftCountry)); setConfirmScheduleReplace(false); }} style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 4, border: "none", background: UI_COLORS.accent, color: "#FFFFFF", cursor: "pointer" }}>Replace</button>
                    <button type="button" onClick={() => setConfirmScheduleReplace(false)} style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 4, border: `1px solid ${UI_COLORS.border}`, background: UI_COLORS.surface, color: TEXT_COLORS.secondary, cursor: "pointer" }}>Keep current</button>
                  </div>
                )}
                <p style={{ fontSize: 11, color: TEXT_COLORS.muted, margin: "0 0 6px" }}>
                  Governing law, dispute forum, and consumer/privacy/tax facts already on file at /legal/country/{draftCountry.toLowerCase()} can be pulled in as a starting point - this is jurisdictional reference data, not reviewed contract language, so review before publishing.
                </p>
                <textarea
                  rows={4}
                  placeholder="Country specific provisions under ETO 2002 / PECA 2016..."
                  value={draftSchedule}
                  onChange={(e) => setDraftSchedule(e.target.value)}
                  style={{ width: "100%", padding: "10px", border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowDraftModal(false)}
                  style={{
                    background: UI_COLORS.surface,
                    border: `1px solid ${UI_COLORS.border}`,
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDraft}
                  style={{
                    background: UI_COLORS.accent,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: submittingDraft ? "wait" : "pointer",
                  }}
                >
                  {submittingDraft ? "Saving Draft…" : "Save Draft Agreement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
