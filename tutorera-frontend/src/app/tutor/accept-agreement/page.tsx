"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Building2,
  Scale,
  Lock,
} from "lucide-react";

interface AgreementData {
  _id: string;
  agreementType: string;
  version: string;
  title: string;
  content: string;
  country: string;
  countrySchedule?: string;
  contentHash: string;
  effectiveDate: string;
  companyDetails: {
    legalName: string;
    tradingName: string;
    registrationNumber: string;
    taxId: string;
    address: string;
    email: string;
  };
}

interface CurrentAgreementResponse {
  agreement: AgreementData;
  verifiedLegalName: string;
  tutorProfileId: string;
  applicationId: string;
  alreadyAccepted: boolean;
  latestAcceptance?: {
    _id: string;
    agreementVersion: string;
    agreementHash: string;
    acceptedAt: string;
    electronicSignature: string;
    pdfDownloadUrl: string;
  };
  feeSchedule: {
    marketplaceFeePercent: number;
    taxRatePercent: number;
    currency: string;
    summary: string;
  };
}

const MANDATORY_CONSENTS = [
  {
    key: "informationAccurate",
    label: "Accurate & Authentic Information",
    description:
      "I confirm that all personal, academic, identity, qualification, and professional background information submitted to TUTORERA is true, accurate, and authentic in all respects.",
  },
  {
    key: "agreementAccepted",
    label: "Tutor Agreement Terms (TTA-2026.1)",
    description:
      "I have thoroughly read, understood, and unconditionally agree to the TUTORERA Tutor Marketplace & Independent Tutor Agreement, including all terms, dispute resolution mechanisms, and operational rules.",
  },
  {
    key: "safeguardingAccepted",
    label: "Child Safeguarding, Code of Conduct & Academic Integrity",
    description:
      "I agree to adhere strictly to TUTORERA's Child Safeguarding Policy, zero-tolerance child protection standards, Academic Integrity policies, and professional conduct requirements at all times.",
  },
  {
    key: "independentProvider",
    label: "Independent Contractor Relationship",
    description:
      "I acknowledge and agree that I participate as an independent freelance service provider, not an employee, agent, worker, partner, or joint venturer of TUTORERA or MENTISERA (SMC-Private) Limited.",
  },
  {
    key: "feesTaxesUnderstood",
    label: "Marketplace Platform Fees & Tax Responsibilities",
    description:
      "I understand and agree to the 20% marketplace platform commission deduction on bookings, and acknowledge that I am solely responsible for calculating, filing, and paying all personal taxes under applicable Pakistani laws (FBR / provincial authorities).",
  },
  {
    key: "electronicRecordsConsent",
    label: "Electronic Contracting & Signature Consent (ETO 2002)",
    description:
      "I consent to contracting electronically under the Electronic Transactions Ordinance, 2002 (ETO 2002), and agree that entering my typed full legal name constitutes a legally valid, binding, and enforceable electronic signature.",
  },
];

export default function AcceptTutorAgreementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [agreementInfo, setAgreementInfo] = useState<CurrentAgreementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Form State
  const [checkedConsents, setCheckedConsents] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState("");
  const [showFullSchedule, setShowFullSchedule] = useState(true);

  // Success execution state
  const [executedRecord, setExecutedRecord] = useState<{
    acceptanceId: string;
    acceptedAt: string;
    agreementHash: string;
    agreementVersion: string;
    electronicSignature: string;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "tutor" && user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        const res = await api.get("/tutor/agreements/current");
        if (isMounted) {
          setAgreementInfo(res.data);
          if (res.data.alreadyAccepted && res.data.latestAcceptance) {
            setExecutedRecord({
              acceptanceId: res.data.latestAcceptance._id,
              acceptedAt: res.data.latestAcceptance.acceptedAt,
              agreementHash: res.data.latestAcceptance.agreementHash,
              agreementVersion: res.data.latestAcceptance.agreementVersion,
              electronicSignature: res.data.latestAcceptance.electronicSignature,
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const message = err?.response?.data?.message || "Failed to load the agreement. Please refresh or contact support.";
          setLoadError(message);
          showError(err, message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, router]);

  const verifiedName = agreementInfo?.verifiedLegalName || user?.name || "";
  const signatureMatches =
    signature.trim().length > 0 &&
    signature.trim().toLowerCase() === verifiedName.trim().toLowerCase();

  const allConsentsChecked = MANDATORY_CONSENTS.every(
    (c) => checkedConsents[c.key] === true
  );

  const canSubmit = Boolean(agreementInfo?.agreement?._id && agreementInfo?.agreement?.contentHash) &&
    allConsentsChecked && signatureMatches && !submitting;

  const handleConsentToggle = (key: string) => {
    setCheckedConsents((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAcceptAgreement = async () => {
    if (!canSubmit) {
      if (!allConsentsChecked) {
        showError("Please check all mandatory consent checkboxes to proceed.");
      } else if (!signatureMatches) {
        showError(`Please type your exact verified legal name: "${verifiedName}".`);
      }
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        agreementId: agreementInfo?.agreement?._id,
        agreementHash: agreementInfo?.agreement?.contentHash,
        electronicSignature: signature.trim(),
        confirmations: checkedConsents,
      };

      const res = await api.post("/tutor/agreements/accept", payload);

      showSuccess(res.data.activated ? "Agreement executed successfully. Your tutor account is active." : "Agreement recorded. Additional activation requirements remain.");
      setExecutedRecord({
        acceptanceId: res.data.acceptanceId,
        acceptedAt: res.data.acceptedAt || new Date().toISOString(),
        agreementHash: res.data.agreementHash,
        agreementVersion: res.data.agreementVersion || agreementInfo?.agreement?.version || "TTA-2026.1",
        electronicSignature: signature.trim(),
      });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        // Never reuse a signature or consent against replacement terms.
        setCheckedConsents({});
        setSignature("");
        setAgreementInfo(null);
        setExecutedRecord(null);
        try {
          const current = await api.get("/tutor/agreements/current");
          setAgreementInfo(current.data);
          setLoadError("");
          showError("The agreement or your application changed. Review the current terms and confirm every consent again before signing.");
        } catch (refreshError: unknown) {
          setLoadError("Unable to load the updated agreement. Reload this page before signing; your previous signature and consents have been cleared.");
          showError(refreshError, "Unable to load the updated agreement.");
        }
        return;
      }
      showError(err, "Failed to submit agreement acceptance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async (acceptanceId: string) => {
    setDownloadingPdf(true);
    try {
      const response = await api.get(`/tutor/agreements/${acceptanceId}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `TUTORERA-Agreement-${agreementInfo?.agreement?.version || "TTA-2026.1"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess("Executed contract PDF downloaded.");
    } catch (err: any) {
      showError(err, "Unable to download contract PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main style={{ minHeight: "100vh", background: STATUS_COLORS.neutral.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div role="status" style={{ textAlign: "center", padding: "40px" }}>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div aria-hidden="true" style={{ width: 44, height: 44, border: `4px solid ${UI_COLORS.border}`, borderTopColor: UI_COLORS.accent, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: TEXT_COLORS.muted, fontWeight: 600, fontSize: 15 }}>Loading Tutor Agreement & Verification Records…</p>
        </div>
      </main>
    );
  }

  if (loadError || !agreementInfo?.agreement) {
    return (
      <main style={{ minHeight: "100vh", background: STATUS_COLORS.neutral.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <section role="alert" style={{ maxWidth: 560, background: "#FFFFFF", border: `1px solid ${STATUS_COLORS.danger.border}`, borderRadius: 16, padding: 28, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}>
          <AlertCircle size={30} color={STATUS_COLORS.danger.color} aria-hidden="true" />
          <h1 style={{ color: TEXT_COLORS.body, fontSize: 22, margin: "14px 0 8px" }}>The agreement could not be opened</h1>
          <p style={{ color: TEXT_COLORS.muted, lineHeight: 1.55, margin: 0 }}>{loadError || "A current agreement is not available yet."}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, border: 0, borderRadius: 9, padding: "10px 16px", background: UI_COLORS.accent, color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}>Try again</button>
            <Link href="/tutor/application-status" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, boxSizing: "border-box", border: "1px solid #CBD5E1", borderRadius: 9, padding: "10px 16px", color: TEXT_COLORS.body, fontWeight: 700, textDecoration: "none" }}>View application status</Link>
          </div>
        </section>
      </main>
    );
  }

  const agreement = agreementInfo?.agreement;
  const company = agreement?.companyDetails;

  return (
    <main style={{ minHeight: "100vh", background: "#F1F5F9", padding: "36px 16px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Top Breadcrumb & Status Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Link
            href="/tutor/application-status"
            style={{ color: UI_COLORS.accent, fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            ← Back to Application Status
          </Link>
          <span style={{ fontSize: 12, color: TEXT_COLORS.muted, fontWeight: 600 }}>
            Jurisdiction: <strong style={{ color: TEXT_COLORS.body }}>Pakistan (ETO 2002)</strong>
          </span>
        </div>

        {/* Post-Acceptance / Active Contract Confirmation */}
        {executedRecord && (
          <div
            style={{
              background: "#FFFFFF",
              border: `2px solid ${STATUS_COLORS.success.color}`,
              borderRadius: 16,
              padding: "32px 28px",
              marginBottom: 28,
              boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.1), 0 8px 10px -6px rgba(16, 185, 129, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: STATUS_COLORS.success.bg,
                  color: STATUS_COLORS.success.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <span
                  style={{
                    display: "inline-block",
                    background: STATUS_COLORS.success.border,
                    color: STATUS_COLORS.success.color,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "3px 10px",
                    borderRadius: 999,
                    marginBottom: 8,
                  }}
                >
                  Active &amp; Legally Binding Contract
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 6px" }}>
                  Tutor Marketplace Agreement Executed
                </h2>
                <p style={{ fontSize: 14, color: TEXT_COLORS.muted, lineHeight: 1.5, margin: "0 0 16px" }}>
                  Congratulations! Your explicit electronic contract has been accepted and recorded. Your tutor profile is now fully activated and eligible to bid on student requests and appear in TUTORERA's verified public directory.
                </p>

                {/* Audit Evidence Grid */}
                <div
                  style={{
                    background: STATUS_COLORS.neutral.bg,
                    border: `1px solid ${UI_COLORS.border}`,
                    borderRadius: 10,
                    padding: "16px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 12,
                    fontSize: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <span style={{ color: TEXT_COLORS.muted, display: "block" }}>Contract Version:</span>
                    <strong style={{ color: TEXT_COLORS.body }}>{executedRecord.agreementVersion}</strong>
                  </div>
                  <div>
                    <span style={{ color: TEXT_COLORS.muted, display: "block" }}>Executed By:</span>
                    <strong style={{ color: TEXT_COLORS.body }}>{executedRecord.electronicSignature}</strong>
                  </div>
                  <div>
                    <span style={{ color: TEXT_COLORS.muted, display: "block" }}>Execution Timestamp:</span>
                    <strong style={{ color: TEXT_COLORS.body }}>
                      {new Date(executedRecord.acceptedAt).toLocaleString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </strong>
                  </div>
                  <div style={{ gridColumn: "1 / -1", wordBreak: "break-all" }}>
                    <span style={{ color: TEXT_COLORS.muted, display: "block" }}>Cryptographic SHA-256 Digest:</span>
                    <code style={{ color: UI_COLORS.accent, background: STATUS_COLORS.info.bg, padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
                      {executedRecord.agreementHash}
                    </code>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(executedRecord.acceptanceId)}
                    disabled={downloadingPdf}
                    style={{
                      background: UI_COLORS.accent,
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 10,
                      padding: "11px 20px",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: downloadingPdf ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Download size={16} />
                    {downloadingPdf ? "Generating PDF…" : "Download Signed Contract (PDF)"}
                  </button>
                  <Link
                    href="/dashboard"
                    style={{
                      background: TEXT_COLORS.body,
                      color: "#FFFFFF",
                      borderRadius: 10,
                      padding: "11px 20px",
                      fontWeight: 700,
                      fontSize: 13,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    Go to Tutor Dashboard →
                  </Link>
                  <Link
                    href="/profile"
                    style={{
                      background: "#FFFFFF",
                      color: TEXT_COLORS.secondary,
                      border: "1px solid #CBD5E1",
                      borderRadius: 10,
                      padding: "11px 18px",
                      fontWeight: 700,
                      fontSize: 13,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ExternalLink size={15} />
                    Manage Tutor Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Master Agreement Container */}
        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #CBD5E1",
            borderRadius: 16,
            padding: "36px 32px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: `1px solid ${UI_COLORS.border}`, paddingBottom: 24, marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    background: STATUS_COLORS.info.bg,
                    color: STATUS_COLORS.info.color,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    borderRadius: 6,
                    marginBottom: 8,
                  }}
                >
                  Version {agreement?.version || "TTA-2026.1"} · Electronic Contracting
                </span>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT_COLORS.body, margin: "4px 0 8px", letterSpacing: "-0.02em" }}>
                  {agreement?.title || "Tutor Marketplace & Independent Tutor Agreement"}
                </h1>
                <p style={{ fontSize: 14, color: TEXT_COLORS.muted, margin: 0, lineHeight: 1.5 }}>
                  Please review all clauses, operating rules, safeguarding requirements, and fee schedules carefully before signing electronically.
                </p>
              </div>

              <div
                style={{
                  background: STATUS_COLORS.neutral.bg,
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 12,
                  textAlign: "right",
                  minWidth: 180,
                }}
              >
                <div style={{ color: TEXT_COLORS.muted }}>Effective Date:</div>
                <div style={{ fontWeight: 700, color: TEXT_COLORS.body }}>
                  {agreement?.effectiveDate
                    ? new Date(agreement.effectiveDate).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Immediate"}
                </div>
              </div>
            </div>
          </div>

          {/* Legal Contracting Parties Box */}
          <div
            style={{
              background: STATUS_COLORS.neutral.bg,
              border: `1px solid ${UI_COLORS.border}`,
              borderRadius: 12,
              padding: "18px 20px",
              marginBottom: 24,
            }}
          >
            <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: TEXT_COLORS.muted, margin: "0 0 12px", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
              <Scale size={16} color={UI_COLORS.accent} /> Contracting Parties &amp; Legal Entities
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: TEXT_COLORS.muted, display: "block", fontSize: 11 }}>Platform Operator:</span>
                <strong style={{ color: TEXT_COLORS.body, display: "block" }}>{company?.legalName || "MENTISERA (SMC-Private) Limited"}</strong>
                <span style={{ color: TEXT_COLORS.muted }}>Trading as: {company?.tradingName || "TUTORERA®"}</span>
                <br />
                <span style={{ color: TEXT_COLORS.muted, fontSize: 12 }}>{company?.address || "Islamabad, Pakistan"} · {company?.email || "hello@mentisera.pk"}</span>
              </div>
              <div>
                <span style={{ color: TEXT_COLORS.muted, display: "block", fontSize: 11 }}>Independent Tutor:</span>
                <strong style={{ color: TEXT_COLORS.body, display: "block" }}>{verifiedName}</strong>
                <span style={{ color: TEXT_COLORS.muted }}>Account Email: {user?.email}</span>
                <br />
                <span style={{ color: TEXT_COLORS.muted, fontSize: 12 }}>Application ID: {agreementInfo?.applicationId || "Verified"}</span>
              </div>
            </div>
          </div>

          {/* Transparent Fee Disclosure Card */}
          <div
            style={{
              background: STATUS_COLORS.success.bg,
              border: `1px solid ${STATUS_COLORS.success.border}`,
              borderRadius: 12,
              padding: "18px 20px",
              marginBottom: 28,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Building2 size={18} color={STATUS_COLORS.success.color} />
              <h3 style={{ fontSize: 14, fontWeight: 800, color: STATUS_COLORS.success.color, margin: 0 }}>
                Transparent Marketplace Fee &amp; Commission Disclosure
              </h3>
            </div>
            <p style={{ fontSize: 13, color: STATUS_COLORS.success.color, margin: "0 0 10px", lineHeight: 1.5 }}>
              Under TUTORERA's standard commission structure, the platform deducts a standard <strong>{agreementInfo?.feeSchedule?.marketplaceFeePercent ?? 20}% platform fee</strong> on completed tutoring bookings to cover matchmaking, secure payment processing, dispute resolution, and continuous verification services.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: STATUS_COLORS.success.color }}>
              <span>✓ Payouts processed every Monday via Bank Transfer / Raast</span>
              <span>✓ No hidden charges or registration sign-up fees</span>
              <span>✓ Direct earnings statements generated with each booking</span>
            </div>
          </div>

          {/* Full Agreement Text Reader */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT_COLORS.body, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <FileText size={18} color={UI_COLORS.accent} /> Master Agreement Terms &amp; Conditions
              </h3>
              <span style={{ fontSize: 12, color: TEXT_COLORS.muted }}>Scroll through all clauses below</span>
            </div>

            <div
              style={{
                height: 380,
                overflowY: "auto",
                border: "1px solid #CBD5E1",
                borderRadius: 10,
                padding: "20px 24px",
                background: "#FAFAFA",
                fontSize: 13,
                lineHeight: 1.7,
                color: TEXT_COLORS.secondary,
                whiteSpace: "pre-wrap",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {agreement?.content}

              {/* Pakistan Schedule Display */}
              {agreement?.countrySchedule && (
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: `2px solid ${UI_COLORS.border}` }}>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 10px" }}>
                    Schedule PK — Pakistan Specific Legal Provisions
                  </h4>
                  <p>{agreement.countrySchedule}</p>
                </div>
              )}
            </div>
          </div>

          {/* 6 Mandatory Consents (Un-prechecked) */}
          <div style={{ borderTop: `1px solid ${UI_COLORS.border}`, paddingTop: 28, marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <ShieldCheck size={20} color={UI_COLORS.accent} />
              <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>
                Mandatory Declarations &amp; Consents
              </h3>
            </div>
            <p style={{ fontSize: 13, color: TEXT_COLORS.muted, margin: "0 0 18px" }}>
              All 6 declarations are mandatory. You must review and confirm each statement individually:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {MANDATORY_CONSENTS.map((item, index) => {
                const isChecked = Boolean(checkedConsents[item.key]);
                return (
                  <label
                    key={item.key}
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                      padding: "14px 16px",
                      borderRadius: 10,
                      background: isChecked ? STATUS_COLORS.info.bg : STATUS_COLORS.neutral.bg,
                      border: `1px solid ${isChecked ? STATUS_COLORS.info.border : UI_COLORS.border}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleConsentToggle(item.key)}
                      style={{
                        marginTop: 3,
                        width: 18,
                        height: 18,
                        accentColor: UI_COLORS.accent,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: isChecked ? UI_COLORS.accent : TEXT_COLORS.body, marginBottom: 3 }}>
                        {index + 1}. {item.label}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: TEXT_COLORS.muted, lineHeight: 1.5 }}>
                        {item.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Typed Electronic Signature Section */}
          <div
            style={{
              background: STATUS_COLORS.neutral.bg,
              border: "1px solid #CBD5E1",
              borderRadius: 12,
              padding: "24px 22px",
              marginBottom: 28,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Lock size={18} color={UI_COLORS.accent} />
              <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>
                Electronic Signature (Electronic Transactions Ordinance, 2002)
              </h3>
            </div>
            <p style={{ fontSize: 13, color: TEXT_COLORS.muted, margin: "0 0 16px", lineHeight: 1.5 }}>
              To execute this agreement, please type your full legal name exactly as verified on your national identity document / CNIC (<strong>{verifiedName}</strong>).
            </p>

            <div style={{ marginBottom: 12 }}>
              <label htmlFor="electronicSignature" style={{ display: "block", fontSize: 12, fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: 6 }}>
                Full Legal Name Signature:
              </label>
              <input
                id="electronicSignature"
                type="text"
                placeholder={verifiedName}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `2px solid ${signatureMatches ? STATUS_COLORS.success.color : signature.length > 0 ? "#F87171" : "#CBD5E1"}`,
                  fontSize: 15,
                  fontWeight: 600,
                  color: TEXT_COLORS.body,
                  background: "#FFFFFF",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Signature Validation Feedback */}
            <div aria-live="polite" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              {signatureMatches ? (
                <span style={{ color: STATUS_COLORS.success.color, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={15} /> Signature matches verified identity record ("{verifiedName}").
                </span>
              ) : signature.length > 0 ? (
                <span style={{ color: TEXT_COLORS.danger, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={15} /> Signature must match your verified legal name: "{verifiedName}".
                </span>
              ) : (
                <span style={{ color: TEXT_COLORS.muted }}>
                  Expected signature format: <strong>{verifiedName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              onClick={handleAcceptAgreement}
              disabled={!canSubmit}
              style={{
                width: "100%",
                padding: "16px 24px",
                border: "none",
                borderRadius: 10,
                background: canSubmit ? UI_COLORS.accentGradient : "#94A3B8",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 800,
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? "0 4px 12px rgba(3, 41, 178, 0.3)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s ease",
              }}
            >
              {submitting ? (
                "Recording Acceptance & Activating Account…"
              ) : (
                <>
                  <Lock size={18} />
                  I Have Read, Understood, and Electronically Execute This Agreement
                </>
              )}
            </button>

            <div style={{ textAlign: "center", fontSize: 12, color: TEXT_COLORS.muted }}>
              By executing, an immutable contract record, audit log, and cryptographic hash will be certified under Pakistan law.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
