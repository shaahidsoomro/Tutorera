"use client";

import api from "@/lib/axios";
import {
  LEGAL_OPERATOR,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_VERSION
} from "@/lib/site";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Download,
  ExternalLink,
  Mail,
  Settings,
  ShieldCheck,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";
import s from "../compliance-pages.module.css";

export default function PrivacyCenterPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);
  const [consentSuccess, setConsentSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);
    }
  }, []);

  const handleExportData = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const res = await api.get("/auth/me/export");
      if (res.data?.success && res.data?.data) {
        const dataStr = JSON.stringify(res.data.data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tutorera-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportSuccess(true);
      } else {
        setExportError("Unable to retrieve account data. Please try again or contact support.");
      }
    } catch (err: any) {
      setExportError(
        err.response?.data?.message || "Data export failed. Ensure you are signed in to an active account."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveConsent = async () => {
    setIsUpdatingConsent(true);
    setConsentSuccess(false);

    try {
      await api.patch("/auth/me/consent", {
        consentMarketing: marketingConsent,
        consentCookies: true,
      });
      setConsentSuccess(true);
      setTimeout(() => setConsentSuccess(false), 4000);
    } catch {
      // Handled gracefully
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  return (
    <div className={s.wrapper}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.badge}>
          <ShieldCheck size={16} /> Data Subject Rights Portal
        </div>
        <h1 className={s.title}>Privacy Request & Data Rights Center</h1>
        <p className={s.subtitle}>
          Control your personal data, exercise your statutory rights under GDPR, UK GDPR,
          UAE PDPL, and international regulations, download your account archive, or manage
          privacy preferences with {LEGAL_OPERATOR}.
        </p>
        <div className={s.meta}>
          <span>Compliance Framework: v{PRIVACY_VERSION}</span>
          <span>•</span>
          <span>Data Protection Officer: {PRIVACY_CONTACT_EMAIL}</span>
          <span>•</span>
          <span>Standard Response Time: 30 Days Max</span>
        </div>
      </section>

      <div className={s.container}>
        {/* Quick Statutory Overview */}
        <div className={s.highlightBox}>
          <strong>Your Statutory Data Subject Rights:</strong>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.92rem", lineHeight: "1.6" }}>
            Under modern privacy legislation, you maintain enforceable rights regarding your personal information:
            the <strong>Right of Access</strong> (Art 15), <strong>Right to Rectification</strong> (Art 16),{" "}
            <strong>Right to Erasure / Deletion</strong> (Art 17), <strong>Right to Restriction</strong> (Art 18),{" "}
            <strong>Right to Data Portability</strong> (Art 20), and <strong>Right to Object</strong> (Art 21).
            TUTORERA provides automated, self-service tools below to execute these rights instantly.
          </p>
        </div>

        {/* Self-Serve Action Grid */}
        <div className={s.cardGrid} style={{ marginTop: "2rem" }}>
          {/* Action 1: Data Portability Export */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.cardIcon}>
                <Download size={20} />
              </div>
              <h3 className={s.cardTitle}>Download Account Data Archive</h3>
            </div>
            <p className={s.cardText}>
              Obtain a machine-readable JSON archive containing your full profile attributes, tutoring
              requests, submitted offers, booking milestones, platform payment records, and legal consent logs.
            </p>

            {isLoggedIn ? (
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className={s.primaryBtn}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Download size={16} />
                  {isExporting ? "Compiling Data Archive..." : "Export My Data (JSON)"}
                </button>
                {exportSuccess && (
                  <div style={{ color: "#16a34a", fontSize: "0.85rem", marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                    <CheckCircle size={16} /> Data export generated and downloaded successfully.
                  </div>
                )}
                {exportError && (
                  <div style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                    <AlertCircle size={16} /> {exportError}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: "1rem" }}>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.75rem" }}>
                  Please sign in to verify your identity before downloading your personal data archive.
                </p>
                <Link
                  href="/login?redirect=/privacy-center"
                  className={s.secondaryBtn}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Sign In to Export Data <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>

          {/* Action 2: Right to Erasure / Deletion */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.cardIcon} style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                <Trash2 size={20} />
              </div>
              <h3 className={s.cardTitle}>Right to Erasure (Account Deletion)</h3>
            </div>
            <p className={s.cardText}>
              Permanently close your account, anonymize your PII, cancel open requests, and purge personal
              marketing identifiers in accordance with Article 17 GDPR and global data retention standards.
            </p>
            <div style={{ marginTop: "1rem" }}>
              <Link
                href="/account/delete"
                className={s.secondaryBtn}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  borderColor: "#fca5a5",
                  color: "#dc2626",
                }}
              >
                <Trash2 size={16} /> Go to Self-Serve Deletion Flow
              </Link>
            </div>
          </div>

          {/* Action 3: Cookie & Consent Management */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.cardIcon}>
                <Settings size={20} />
              </div>
              <h3 className={s.cardTitle}>Marketing & Cookie Preferences</h3>
            </div>
            <p className={s.cardText}>
              Manage your optional communication preferences and non-essential analytical tracking cookies.
            </p>

            {isLoggedIn ? (
              <div style={{ marginTop: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                  />
                  Receive educational newsletters and marketplace updates
                </label>

                <button
                  type="button"
                  onClick={handleSaveConsent}
                  disabled={isUpdatingConsent}
                  className={s.secondaryBtn}
                  style={{ marginTop: "1rem", width: "100%", justifyContent: "center" }}
                >
                  {isUpdatingConsent ? "Saving..." : "Save Communication Preferences"}
                </button>

                {consentSuccess && (
                  <div style={{ color: "#16a34a", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    ✓ Preferences updated successfully.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: "1rem" }}>
                <Link href="/cookies" className={s.secondaryBtn} style={{ width: "100%", justifyContent: "center" }}>
                  Manage Cookie Consent <ExternalLink size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Section: Manual Data Protection Officer Inquiries */}
        <section className={s.section} style={{ marginTop: "3rem" }}>
          <h2 className={s.sectionTitle}>
            <Mail size={22} color="var(--primary, #0f172a)" /> Submit Formal Regulatory Inquiries
          </h2>
          <p>
            If you wish to submit an objection, request rectification of public records, or inquire about
            international cross-border data transfers, contact our dedicated Data Protection Officer:
          </p>

          <div className={s.highlightBox}>
            <p style={{ margin: "0 0 0.5rem 0" }}>
              <strong>Direct Privacy Inquiries:</strong>{" "}
              <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} style={{ color: "var(--accent, #2563eb)", fontWeight: "600" }}>
                {PRIVACY_CONTACT_EMAIL}
              </a>
            </p>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#4b5563" }}>
              <strong>Mailing Address:</strong> Data Protection Department, {LEGAL_OPERATOR}, House 387,
              Street 11, Phase 5-b, Ghauri Town, Islamabad, Pakistan.
            </p>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#4b5563" }}>
              <strong>Identity Verification Requirement:</strong> To safeguard user security and prevent
              fraudulent exfiltration, requests submitted via email must originate from the registered
              account email and may require secondary verification.
            </p>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/privacy" className={s.primaryBtn}>
              Read Full Privacy Policy <ArrowRight size={16} />
            </Link>
            <Link href="/legal/subprocessors" className={s.secondaryBtn}>
              View Subprocessors Directory
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
