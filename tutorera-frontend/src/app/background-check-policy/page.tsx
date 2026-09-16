import {
  LEGAL_OPERATOR,
  SAFETY_CONTACT_EMAIL,
  TERMS_VERSION
} from "@/lib/site";
import {
  AlertTriangle,
  ArrowRight,
  FileCheck2,
  Globe2,
  RefreshCw,
  Scale,
  ShieldAlert
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Background Check Policy | In-Person & Home Tuition Screening | TUTORERA",
  description:
    "TUTORERA's background check requirements for in-person and home tutors across Pakistan, the UK, UAE, US, and international jurisdictions.",
  alternates: {
    canonical: "/background-check-policy",
  },
};

export default function BackgroundCheckPolicyPage() {
  return (
    <div className={s.wrapper}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.badge}>
          <FileCheck2 size={16} /> Safeguarding & Screening
        </div>
        <h1 className={s.title}>Global Background Check Policy</h1>
        <p className={s.subtitle}>
          Requirements, jurisdictional standards, disqualifying criteria, and procedural
          safeguards for independent tutors offering in-person and home tuition on TUTORERA
          (operated by {LEGAL_OPERATOR}).
        </p>
        <div className={s.meta}>
          <span>Standard: v{TERMS_VERSION}</span>
          <span>•</span>
          <span>Applies To: In-Person & Home Tutors</span>
          <span>•</span>
          <span>Inquiries: {SAFETY_CONTACT_EMAIL}</span>
        </div>
      </section>

      <div className={s.container}>
        {/* Core Notice */}
        <div className={s.highlightBox}>
          <strong>Mandatory Requirement for Physical Lessons:</strong>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.92rem", lineHeight: "1.6" }}>
            While online borderless tutoring requires Tier 1 government photo ID verification,
            any independent tutor who elects to deliver <strong>in-person or home tuition</strong> must
            satisfy appropriate local criminal history or police record screening prior to accepting
            physical bookings. Physical tutoring introduces unique physical safety dynamics that demand
            elevated diligence.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
            <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: "0.5rem", padding: "0.85rem" }}>
              <strong style={{ color: "#166534", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span>🌐</span> Online Tuition
              </strong>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "#15803d", lineHeight: "1.4" }}>
                <strong>No Police Verification required.</strong> Online tutoring is authorized upon verifying government photo ID (CNIC / Passport) and academic credentials.
              </p>
            </div>
            <div style={{ backgroundColor: "#fff7ed", border: "1px solid #fdba74", borderRadius: "0.5rem", padding: "0.85rem" }}>
              <strong style={{ color: "#9a3412", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span>🏠</span> Home / In-Person Tuition
              </strong>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "#c2410c", lineHeight: "1.4" }}>
                <strong>Police Verification Report is STRICTLY MANDATORY.</strong> An official Police Character Certificate / clearance report must be submitted and approved before accepting home tuition.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Modular Jurisdiction Breakdown */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Globe2 size={22} color="var(--primary, #0f172a)" /> 1. Accepted Screening Documents by Jurisdiction
          </h2>
          <p>
            Because criminal history reporting and statutory police registries vary fundamentally across
            countries, TUTORERA enforces a modular jurisdictional compliance model:
          </p>

          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>🇵🇰 Pakistan</h3>
              <p className={s.cardText}>
                <strong>Police Character Certificate (PCC) / Police Verification:</strong>
              </p>
              <ul className={s.list} style={{ marginTop: "0.5rem" }}>
                <li>Issued by Police Khidmat Markaz (PKM), ICT Police, Punjab Police, Sindh Police, KP, or Balochistan.</li>
                <li>Must bear an official verification barcode, QR code, or verifiable diary tracking number.</li>
                <li>Must be issued within twelve (12) months of submission.</li>
              </ul>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>🇬🇧 United Kingdom</h3>
              <p className={s.cardText}>
                <strong>Disclosure and Barring Service (DBS) Check:</strong>
              </p>
              <ul className={s.list} style={{ marginTop: "0.5rem" }}>
                <li>Enhanced DBS certificate (with barred list checks) or Basic DBS certificate.</li>
                <li>Tutors registered with the DBS Update Service may provide consent for online verification.</li>
                <li>Certificates must be less than 12 months old unless enrolled in the DBS Update Service.</li>
              </ul>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>🇦🇪 United Arab Emirates</h3>
              <p className={s.cardText}>
                <strong>Good Conduct / Police Clearance Certificate:</strong>
              </p>
              <ul className={s.list} style={{ marginTop: "0.5rem" }}>
                <li>Issued by Ministry of Interior (MOI), Dubai Police, or Abu Dhabi Police.</li>
                <li>Digital certificate with verifiable MOI/Police QR validation code.</li>
                <li>Issued within six (6) months of initial marketplace submission.</li>
              </ul>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>🇺🇸 United States & Canada</h3>
              <p className={s.cardText}>
                <strong>Criminal Record & Registry Checks:</strong>
              </p>
              <ul className={s.list} style={{ marginTop: "0.5rem" }}>
                <li>County, state, and nationwide criminal database searches via accredited screening vendors.</li>
                <li>National Sex Offender Registry verification.</li>
                <li>Canadian Police Information Centre (CPIC) check or Vulnerable Sector Check where required.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Disqualifying Criteria */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <ShieldAlert size={22} color="var(--primary, #0f172a)" /> 2. Automatic Disqualifying Offenses
          </h2>
          <p>
            An individual will be permanently barred from conducting in-person or home tuition, and may be
            completely prohibited from the TUTORERA marketplace, if their background check, court records, or
            credible regulatory notices indicate any of the following:
          </p>
          <ul className={s.list}>
            <li>
              <strong>Offenses Against Minors:</strong> Any record of child abuse, child exploitation, neglect,
              endangerment, grooming, or child sexual abuse material (CSAM).
            </li>
            <li>
              <strong>Violent Crimes:</strong> Any conviction or pending charge involving homicide, assault,
              battery, domestic violence, armed robbery, kidnapping, or weapons offenses.
            </li>
            <li>
              <strong>Sexual Misconduct:</strong> Any history of sexual harassment, sexual assault, stalking,
              or inclusion on any statutory sex offender registry.
            </li>
            <li>
              <strong>Financial Dishonesty & Fraud:</strong> Serious convictions for grand theft, identity
              theft, embezzlement, extortion, or systemic consumer fraud.
            </li>
            <li>
              <strong>Controlled Substances:</strong> Drug manufacturing, distribution, or trafficking offenses.
            </li>
          </ul>
        </section>

        {/* Section 3: Inherent Limitations */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <AlertTriangle size={22} color="var(--primary, #0f172a)" /> 3. Inherent Limitations of Background Checks
          </h2>
          <div className={s.highlightBox} style={{ borderLeftColor: "#ef4444" }}>
            <strong>Important Safety Notice for Parents and Families:</strong>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.92rem", lineHeight: "1.6" }}>
              While background checks represent an essential safety filter, they possess inherent technical and
              legal limitations:
            </p>
            <ul className={s.list} style={{ marginTop: "0.5rem" }}>
              <li>
                <strong>Historical Snapshot:</strong> A certificate reflects records up to the exact date of issue.
                It does not guarantee real-time notifications of subsequent arrests or pending foreign investigations.
              </li>
              <li>
                <strong>Cross-Border Gaps:</strong> An individual who recently relocated internationally may possess
                a clean domestic certificate while having records in another sovereign nation that are not linked
                to international databases.
              </li>
              <li>
                <strong>Supervision Remains Essential:</strong> Under our Home Tuition Terms, an adult parent
                or guardian must always remain on site during in-person lessons involving minors. Verification
                is never a replacement for watchful parental presence.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Appeals and Disputing Inaccurate Records */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Scale size={22} color="var(--primary, #0f172a)" /> 4. Appeals, False Positives & Procedural Fairness
          </h2>
          <p>
            TUTORERA believes in fair review and procedural due process. Occasionally, public records or police
            databases generate false positives due to common names, outdated expungements, or clerical errors:
          </p>
          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Right to Review Findings</h3>
              <p className={s.cardText}>
                If a tutor&apos;s application is rejected based on screening reports, the tutor will receive notice
                and an opportunity to inspect the non-confidential grounds of the adverse determination.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Formal Appeal Submission</h3>
              <p className={s.cardText}>
                Tutors may lodge a formal appeal within fourteen (14) days by providing official court expungement
                orders, police pardon letters, or documentary proof of misidentification to{" "}
                <strong>{SAFETY_CONTACT_EMAIL}</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Renewal and Privacy */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <RefreshCw size={22} color="var(--primary, #0f172a)" /> 5. Annual Renewal & Record Confidentiality
          </h2>
          <p>
            To maintain high trust, home tuition background documentation must be renewed periodically:
          </p>
          <ul className={s.list}>
            <li>
              <strong>Mandatory Re-Screening:</strong> In-person tutors must submit an updated Police Character
              Certificate or DBS verification every 12 to 24 months (depending on jurisdiction).
            </li>
            <li>
              <strong>Privacy Protection:</strong> Background screening reports are classified as Restricted PII.
              They are never published to students, parents, or external marketing channels. They are used
              solely by our Trust & Safety team to approve or deny physical tuition permissions.
            </li>
          </ul>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/in-person-home-tuition-terms" className={s.primaryBtn}>
              Read Home Tuition Terms <ArrowRight size={16} />
            </Link>
            <Link href="/safety" className={s.secondaryBtn}>
              Return to Safety Center
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
