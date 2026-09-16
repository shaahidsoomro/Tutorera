import {
  LEGAL_OPERATOR,
  SUPPORT_EMAIL,
  TERMS_VERSION
} from "@/lib/site";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Building,
  CheckCircle2,
  FileBadge,
  HelpCircle,
  ShieldCheck,
  UserCheck,
  Video
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Tutor Verification & Badging Standards | TUTORERA",
  description:
    "TUTORERA's multi-tier tutor vetting process, identity verification standards, credential validation, background screening, and verified badge legal disclosures.",
  alternates: {
    canonical: "/verification-policy",
  },
};

export default function VerificationPolicyPage() {
  return (
    <div className={s.wrapper}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.badge}>
          <ShieldCheck size={16} /> Trust & Verification Standards
        </div>
        <h1 className={s.title}>Tutor Verification & Badging Policy</h1>
        <p className={s.subtitle}>
          How TUTORERA (operated by {LEGAL_OPERATOR}) reviews tutor identity, academic
          credentials, teaching competence, and background records before granting verified
          status in our global marketplace.
        </p>
        <div className={s.meta}>
          <span>Standard: v{TERMS_VERSION}</span>
          <span>•</span>
          <span>Compliance Review: Annual</span>
          <span>•</span>
          <span>Review Team: {SUPPORT_EMAIL}</span>
        </div>
      </section>

      <div className={s.container}>
        {/* Core Disclaimer Box */}
        <div className={s.highlightBox} style={{ borderLeftColor: "#f59e0b" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <AlertCircle size={24} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ fontSize: "1.05rem", display: "block", marginBottom: "0.25rem" }}>
                Important Legal Meaning of &quot;Verified&quot; Status
              </strong>
              <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: "1.6" }}>
                A &quot;Verified&quot; badge or indicator on TUTORERA signifies solely that the independent
                educator has submitted requested identification, academic documentation, or background
                materials that satisfied our administrative onboarding criteria at the time of review.
                <strong>
                  {" "}Verification does NOT constitute an employment relationship, legal endorsement, agency,
                  continuous surveillance, criminal-record warranty, or guarantee of educational outcomes or
                  personal conduct.
                </strong>{" "}
                Parents and adult students retain final discretion and responsibility for evaluating tutors,
                interviewing candidates, and supervising in-person interactions.
              </p>
            </div>
          </div>
        </div>

        {/* Distinction Banner: Online Tuition vs Home Tuition */}
        <div style={{
          backgroundColor: "#f8fafc",
          border: "1.5px solid #cbd5e1",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          margin: "1.5rem 0",
        }}>
          <h3 style={{ margin: "0 0 0.75rem", color: "#021550", fontSize: "1.1rem", fontWeight: 700 }}>
            ⚖️ Core Platform Distinction: Online vs Home Tuition Verification
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: "0.5rem", padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "1.25rem" }}>🌐</span>
                <strong style={{ color: "#166534", fontSize: "0.95rem" }}>Online Tuition (Borderless)</strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#15803d", lineHeight: 1.5 }}>
                <strong>No Police Verification is required.</strong> Online tutors are vetted through Tier 1 Government Photo ID (CNIC / Passport / National ID), Tier 2 Academic Degrees, and Tier 3 Intro Demo Videos. Lessons are delivered digitally with built-in platform safeguards.
              </p>
            </div>
            <div style={{ backgroundColor: "#fff7ed", border: "1px solid #fdba74", borderRadius: "0.5rem", padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "1.25rem" }}>🏠</span>
                <strong style={{ color: "#9a3412", fontSize: "0.95rem" }}>Home Tuition (In-Person)</strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#c2410c", lineHeight: 1.5 }}>
                <strong>Police Verification Report is strictly MANDATORY.</strong> Any tutor visiting a student&apos;s home or conducting face-to-face tuition must provide an official, verifiable Police Character Certificate (issued by Police Khidmat Markaz, PKM, or statutory police registry) before receiving or accepting in-person bookings.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: The 4-Tier Verification Architecture */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <FileBadge size={22} color="var(--primary, #0f172a)" /> 1. The 4-Tier Verification Architecture
          </h2>
          <p>
            To provide transparent trust signals while maintaining accessibility for independent educators
            worldwide, TUTORERA implements a tiered verification model:
          </p>

          <div className={s.cardGrid}>
            {/* Tier 1 */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIcon}>
                  <UserCheck size={20} />
                </div>
                <h3 className={s.cardTitle}>Tier 1: Government Identity (Mandatory)</h3>
              </div>
              <p className={s.cardText}>
                Every tutor must submit authentic government-issued photo identification matching their legal
                name and date of birth. Accepted documents include:
              </p>
              <ul className={s.list} style={{ marginTop: "0.5rem" }}>
                <li><strong>Pakistan:</strong> Computerized National Identity Card (CNIC) or Smart NIC.</li>
                <li><strong>United Kingdom:</strong> Valid British Passport or UK Driving Licence.</li>
                <li><strong>United Arab Emirates:</strong> Emirates ID or UAE Residency Visa.</li>
                <li><strong>United States / Canada:</strong> State Driver&apos;s License, Real ID, or Passport.</li>
                <li><strong>International:</strong> Valid International Machine-Readable Passport (MRZ).</li>
              </ul>
            </div>

            {/* Tier 2 */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIcon}>
                  <Award size={20} />
                </div>
                <h3 className={s.cardTitle}>Tier 2: Academic & Degree Verification</h3>
              </div>
              <p className={s.cardText}>
                Tutors claiming specialized degrees (Bachelor&apos;s, Master&apos;s, PhD, ACCA, MBBS, Engineering)
                must upload degree certificates or official transcripts:
              </p>
              <ul className={s.list} style={{ marginTop: "0.5rem" }}>
                <li>HEC-recognized or regionally accredited institutional verification.</li>
                <li>Transcripts confirming major/discipline corresponding to subjects taught.</li>
                <li>Teaching certificates (PGCE, TEFL, CELTA, B.Ed) where highlighted on profile.</li>
                <li>Profiles without validated degrees cannot display academic credentials badges.</li>
              </ul>
            </div>

            {/* Tier 3 */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIcon}>
                  <Video size={20} />
                </div>
                <h3 className={s.cardTitle}>Tier 3: Video & Audio Lesson Evaluation</h3>
              </div>
              <p className={s.cardText}>
                Quality communication is essential for effective pedagogy. Tutors are evaluated on:
              </p>
              <ul className={s.list} style={{ marginTop: "0.5rem" }}>
                <li>A 60-to-180 second introductory video demonstrating verbal clarity and tone.</li>
                <li>Demonstration of subject-matter competence and lesson structure.</li>
                <li>English and native language pronunciation and pacing suitability.</li>
                <li>Verification that the individual appearing in the video matches the submitted photo ID.</li>
              </ul>
            </div>

            {/* Tier 4 */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIcon}>
                  <Building size={20} />
                </div>
                <h3 className={s.cardTitle}>Tier 4: In-Person Background Screening</h3>
              </div>
              <p className={s.cardText}>
                Mandatory for tutors seeking authorization to conduct in-person home tuition:
              </p>
              <ul className={s.list} style={{ marginTop: "0.5rem" }}>
                <li><strong>Pakistan:</strong> Police Character Certificate issued by local Police Khidmat Markaz.</li>
                <li><strong>United Kingdom:</strong> Enhanced Disclosure and Barring Service (DBS) check.</li>
                <li><strong>United Arab Emirates:</strong> Police Clearance / Good Conduct Certificate.</li>
                <li><strong>United States:</strong> Verified state/federal criminal record history.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Badge Definitions */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <CheckCircle2 size={22} color="var(--primary, #0f172a)" /> 2. Marketplace Badges & Visual Signals
          </h2>
          <p>
            When browsing tutor profiles on TUTORERA, badges indicate specific verified milestones:
          </p>
          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>🛡️ Verified Identity Badge</h3>
              <p className={s.cardText}>
                The tutor has presented government-issued photo ID that was manually checked and validated by
                our compliance team against their account details.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>🎓 Verified Credentials Badge</h3>
              <p className={s.cardText}>
                The tutor has provided verifiable academic diplomas, transcripts, or professional certifications
                from recognized higher education institutions.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>🏡 Home Tuition Approved</h3>
              <p className={s.cardText}>
                The tutor has fulfilled Tier 4 background check documentation, completed location compatibility
                checks, and accepted our In-Person Safety Covenant.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>⭐ Top Rated Tutor</h3>
              <p className={s.cardText}>
                Earned organically through maintaining a minimum of 4.8+ stars across at least 10 completed,
                paid student bookings with high student retention.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Ongoing Compliance & Reverification */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <HelpCircle size={22} color="var(--primary, #0f172a)" /> 3. Ongoing Audits, Expiry & Revocation
          </h2>
          <p>
            Verification is not a permanent, unalterable state. TUTORERA preserves the right to audit,
            temporarily suspend, or permanently revoke badges under the following conditions:
          </p>
          <ul className={s.list}>
            <li>
              <strong>Document Expiry:</strong> Identification cards or police character certificates that
              reach expiration must be renewed within 30 days of notice, failing which in-person tuition
              authorization is paused.
            </li>
            <li>
              <strong>Profile Modifications:</strong> Any change to a tutor&apos;s registered legal name, primary
              country of residence, or core subject claims triggers an automated flag for reverification.
            </li>
            <li>
              <strong>User Complaints & Safety Flags:</strong> Any credible report of misconduct, fraudulent
              credentials, exam cheating, or safety non-compliance results in immediate temporary suspension
              of verified status during investigation.
            </li>
            <li>
              <strong>Inactivity:</strong> Profiles inactive for greater than twelve (12) consecutive months
              may be required to re-confirm contact details and current location before reappearing in search.
            </li>
          </ul>
        </section>

        {/* Section 4: Data Security for Verification Documents */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <ShieldCheck size={22} color="var(--primary, #0f172a)" /> 4. Security & Retention of Sensitive ID Records
          </h2>
          <p>
            We recognize that government IDs, degree scans, and police certificates contain highly sensitive
            personally identifiable information (PII):
          </p>
          <div className={s.highlightBox}>
            <ul style={{ paddingLeft: "1.25rem", margin: 0, lineHeight: "1.7" }}>
              <li>
                <strong>Strict Confidentiality:</strong> Identity documents, CNICs, passports, and criminal
                record scans are strictly confidential and are <em>never published publicly</em> on tutor profiles.
              </li>
              <li>
                <strong>Restricted Administrative Access:</strong> Only trained Trust & Safety personnel with
                multi-factor authentication and role-based access control (RBAC) can view submitted documents.
              </li>
              <li>
                <strong>Encrypted Storage:</strong> All document files are stored in encrypted cloud object
                storage using AES-256 encryption at rest and TLS 1.3 in transit.
              </li>
              <li>
                <strong>Targeted Retention:</strong> Verification records are retained during the active lifecycle
                of the tutor&apos;s account plus statutory limitation periods (normally 5 years after account closure
                under anti-fraud and marketplace liability rules), after which files are securely expunged.
              </li>
            </ul>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/background-check-policy" className={s.primaryBtn}>
              Read Background Check Policy <ArrowRight size={16} />
            </Link>
            <Link href="/legal" className={s.secondaryBtn}>
              Return to Legal Center
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
