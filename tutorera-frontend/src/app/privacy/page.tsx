import {
  BUSINESS_ADDRESS,
  LAST_LEGAL_UPDATE,
  LEGAL_ENTITY_NAME,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_VERSION,
  SUPPORT_EMAIL,
  TRADING_NAME
} from "@/lib/site";
import {
  CheckCircle2,
  Lock,
  UserCheck
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Global Privacy Policy | TUTORERA",
  description: "Comprehensive privacy policy explaining data collection, lawful bases, international data transfers, child data protection, and self-serve user rights.",
};

const keyPrivacyPoints = [
  { title: "Data Controller Identity", desc: `${LEGAL_ENTITY_NAME} ("${TRADING_NAME}") controls your personal data with dedicated privacy contact at ${PRIVACY_CONTACT_EMAIL}.` },
  { title: "No Sale of Personal Data", desc: "We never sell your personal identifying data to third parties, advertisers, or data brokers for financial consideration." },
  { title: "Location Privacy by Design", desc: "Exact home street addresses are kept private and revealed only to a confirmed tutor after an in-person booking is mutually accepted." },
  { title: "Child Safeguarding Standards", desc: "Strict protections for minors under 18; parent/guardian consent is mandatory; children under 13 use parent-managed accounts." },
  { title: "Self-Serve Data Rights", desc: "You have the right to access, export, correct, or delete your account data directly via our Privacy Center without support delays." },
  { title: "International Transfer Safeguards", desc: "Cross-border data transfers are protected under Standard Contractual Clauses (SCCs), UK Addenda, and strict encryption protocols." },
];

const privacySections = [
  {
    id: "1-data-controller",
    title: "1. Data Controller & Governance",
    content: `The controller responsible for processing your personal data across the ${TRADING_NAME} platform and mobile applications is ${LEGAL_ENTITY_NAME}, a registered corporate entity in ${BUSINESS_ADDRESS}. For all data protection and privacy inquiries, contact our Privacy Team at ${PRIVACY_CONTACT_EMAIL}.`
  },
  {
    id: "2-data-inventory",
    title: "2. Personal Data Inventory & Categories Collected",
    content: `We collect and process the following categories of personal data based on your platform role:
• Account Data: Full name, email address, password hash, phone number, role (student/tutor), country code, city, and IANA timezone.
• Student & Learner Data: Academic grade, curriculum, learning objectives, subjects needed, scheduling preferences, and proposed budget.
• Parent / Guardian Data: Guardian name, contact details, relationship to student, and consent verification timestamps.
• Tutor Professional Data: Bio, profile photograph, introductory video, subject proficiencies, education history, hourly rates, and availability slots.
• Verification & Trust Data: Government ID documents (CNIC, Emirates ID, Passport, Driver's Licence), academic degrees, demo videos, and background character certificates. (Sensitive identification numbers and background records are stored in restricted access vaults and NEVER exposed publicly).
• Transactional Data: Bids, agreed rates, currencies, invoice summaries, payment timestamps, and payout records. (Raw credit/debit card numbers are handled exclusively by PCI-DSS certified payment processors).
• Communications & Support: Messages exchanged via the internal chat system, support tickets, dispute submissions, and notification logs.
• Technical & Device Data: IP address, device model, operating system, browser type, app version, error logs, and cookie identifiers.
• Geolocation Data: Country, city, and approximate district/area. Precise GPS location is requested only with explicit consent where necessary for home tuition proximity matching.`
  },
  {
    id: "3-lawful-bases",
    title: "3. Lawful Bases for Processing (GDPR & Global Standards)",
    content: `We process personal data only when an established lawful basis exists:
• Performance of a Contract: To register your account, match requests with tutors, negotiate offers, lock final rates, process bookings, and facilitate payouts.
• Legitimate Interests: To detect platform fraud, prevent off-platform fee circumvention, safeguard child welfare, optimize algorithmic matching (Match Score), and maintain security.
• Legal Obligation: To comply with mandatory tax accounting, financial reporting, and lawful regulatory subpoenas.
• Explicit Consent: For marketing newsletters, non-essential cookies, and specific parental authorization for minor accounts. You may withdraw consent at any time without penalty.`
  },
  {
    id: "4-data-minimization",
    title: "4. Sensitive Data Minimization & Privacy Protection",
    content: `TUTORERA applies data minimization across all user journeys:
• Student profiles are private by default and are not indexed by search engines.
• Exact home addresses are shielded and revealed only to confirmed tutors following an agreed in-person booking.
• Government identity documents submitted by tutors are restricted strictly to authorized compliance officers and are never viewable by students, other tutors, or public crawlers.`
  },
  {
    id: "5-children-privacy",
    title: "5. Children's Privacy & Age-Specific Protections",
    content: `TUTORERA is dedicated to protecting child privacy under international frameworks (including COPPA in the United States, UK GDPR and the Age Appropriate Design Code in the UK, and UAE Federal Decree-Law No. 45):
• Independent account creation is restricted to users aged 18 and older.
• For learners aged 13 to 17, parental or legal guardian consent is verified prior to booking.
• For children under 13, accounts must be created and operated entirely by a parent or legal guardian.
• We do not profile children for behavioral advertising or sell minor personal data. Full details are available in our dedicated Child Safeguarding Policy.`
  },
  {
    id: "6-international-transfers",
    title: "6. International Data Transfers & Cross-Border Safeguards",
    content: `Because TUTORERA operates a global marketplace, personal data may be stored or processed in cloud hosting facilities or by vendors located outside your country of residence (including Pakistan, the European Union, the United Kingdom, and the United States).
Where data is transferred internationally, we implement recognized legal transfer mechanisms:
• Standard Contractual Clauses (SCCs) approved by the European Commission.
• The UK International Data Transfer Addendum (IDTA).
• Contractual data processing agreements (DPAs) requiring equivalent technical encryption and security standards.
We never claim that using the platform waives your international transfer statutory protections.`
  },
  {
    id: "7-subprocessors",
    title: "7. Third-Party Service Providers & Subprocessors",
    content: `We share data with trusted third-party subprocessors strictly to deliver platform services:
• Cloud Infrastructure & Hosting: MongoDB Atlas, Render, Cloudflare Workers, Cloudinary.
• Authentication & Security: Google OAuth, JSON Web Token cryptography.
• Payment Processing: Authorized PCI-DSS payment gateways (Stripe, Paymob, local banking partners).
• Email & Transactional Notifications: SendGrid, Resend.
View our complete, updated directory on our Subprocessors Page.`
  },
  {
    id: "8-retention",
    title: "8. Data Retention Schedule & Anonymization",
    content: `We do not retain personal information indefinitely:
• Active Accounts: Retained for the duration of your active account existence.
• Account Deletion Requests: Personal identifying information (name, email, phone, avatar) is purged or anonymized within 30 days.
• Transaction & Tax Records: Invoices, fee snapshots, and payment records are retained for 7 years to comply with statutory accounting and tax regulations.
• Safety & Dispute Records: Dispute and moderation logs are retained for 2 years post-resolution to protect against fraud, child safety threats, and repeat abuse.`
  },
  {
    id: "9-data-rights",
    title: "9. Your Data Protection Rights & Self-Serve Controls",
    content: `Subject to your jurisdiction (including GDPR, UK GDPR, UAE PDPL, and applicable US state laws), you possess:
• Right of Access & Portability: Download a machine-readable JSON export of your personal profile, requests, bids, and reviews via our Privacy Center.
• Right to Rectification: Correct inaccurate contact or academic information in your settings.
• Right to Erasure (Right to be Forgotten): Initiate self-serve account deletion via /account/delete.
• Right to Object & Restrict: Opt out of marketing communications or algorithmic profiling.
• Right to Withdraw Consent: Toggle cookie and marketing preferences at any time without affecting core service access.
To exercise rights not available self-serve, contact ${PRIVACY_CONTACT_EMAIL}.`
  },
  {
    id: "10-cookies",
    title: "10. Cookies, Tracking & Local Storage",
    content: `We use cookies and local storage to keep you authenticated, remember your preferred currency/timezone, and analyze site traffic. Non-essential analytics and marketing cookies require prior consent in jurisdictions where legally mandated. Learn more in our Cookie Policy.`
  },
  {
    id: "11-mobile-privacy",
    title: "11. Mobile Application Permissions & Google Play Safety",
    content: `Our Android and iOS mobile applications request only necessary permissions:
• Camera / Photos: Uploading tutor profile avatars, introductory videos, and verification credentials.
• Microphone / Audio: Delivering live online audio/video tutoring sessions.
• Location: Determining approximate city/district for home tuition matching (never continuous tracking).
• Push Notifications: Alerting you to new tutor offers, messages, and session reminders.
Our Google Play Data Safety declarations accurately reflect these data collections.`
  },
  {
    id: "12-security",
    title: "12. Technical & Organizational Security Measures",
    content: `We protect personal data with industry-standard safeguards: TLS 1.3 encryption in transit, bcrypt password hashing with salt factor 12, role-based access control, least-privilege infrastructure separation, and regular vulnerability audits. While we implement rigorous controls, no internet transmission is 100% immune from breach.`
  },
  {
    id: "13-policy-updates",
    title: "13. Privacy Policy Updates & Inquiries",
    content: `We may revise this Privacy Policy to reflect platform enhancements or statutory changes. When material modifications occur, we will notify you via dashboard alert or email at least 15 days before changes take effect.
For questions or data requests:
${LEGAL_ENTITY_NAME}
Privacy Officer: ${PRIVACY_CONTACT_EMAIL}
Support: ${SUPPORT_EMAIL}`
  }
];

export default function GlobalPrivacyPolicyPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <h1>TUTORERA Global Privacy Policy</h1>
        <p>
          How {TRADING_NAME} by {LEGAL_ENTITY_NAME} collects, protects, processes, and respects your personal data across international borders and mobile applications.
        </p>
      </header>

      <section className={s.container}>
        {/* Privacy Framework Card */}
        <div style={{ backgroundColor: "#F8FAFF", border: "1.5px solid #E2E8F0", borderRadius: 20, padding: "1.75rem", marginBottom: "3rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0329B2" }}>
                Multi-Jurisdictional Privacy Standard
              </span>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#021550", margin: "0.25rem 0" }}>
                Global Data Governance ({PRIVACY_VERSION})
              </h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Effective: {LAST_LEGAL_UPDATE}</div>
              <div style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 700 }}>✓ GDPR • UK GDPR • UAE PDPL • COPPA Ready</div>
            </div>
          </div>
          <p style={{ fontSize: "0.92rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
            This policy outlines our commitments to transparency, data minimization, child safeguarding, and user autonomy. You can exercise your rights self-serve at our <Link href="/privacy-center" style={{ color: "#0329B2", fontWeight: 700 }}>Privacy Center</Link>.
          </p>
        </div>

        {/* Plain Language Key Points */}
        <div style={{ marginBottom: "3.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Lock size={20} color="#0329B2" />
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#021550", margin: 0 }}>
              Key Privacy Highlights
            </h2>
          </div>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
            Essential principles of how we manage your information. The full numbered sections below constitute our complete policy.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {keyPrivacyPoints.map((item) => (
              <div key={item.title} style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "1.2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#021550", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  {item.title}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Self-Serve Actions Callout */}
        <div style={{ backgroundColor: "#EEF5FF", border: "1px solid #bfdbfe", borderRadius: 16, padding: "1.25rem 1.5rem", marginBottom: "3.5rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <UserCheck size={24} color="#0329B2" />
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#021550" }}>Exercise Your Data Rights Instantly</div>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>Download your personal data, manage marketing consents, or initiate self-serve account deletion.</div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Link href="/privacy-center" style={{ fontSize: "0.8rem", fontWeight: 700, backgroundColor: "#fff", color: "#0329B2", border: "1px solid #bfdbfe", padding: "0.4rem 0.8rem", borderRadius: 8, textDecoration: "none" }}>
              Privacy Center →
            </Link>
            <Link href="/account/delete" style={{ fontSize: "0.8rem", fontWeight: 700, backgroundColor: "#fff", color: "#C81B7F", border: "1px solid #fecdd3", padding: "0.4rem 0.8rem", borderRadius: 8, textDecoration: "none" }}>
              Delete Account →
            </Link>
            <Link href="/legal/subprocessors" style={{ fontSize: "0.8rem", fontWeight: 700, backgroundColor: "#fff", color: "#0329B2", border: "1px solid #bfdbfe", padding: "0.4rem 0.8rem", borderRadius: 8, textDecoration: "none" }}>
              Subprocessors →
            </Link>
          </div>
        </div>

        {/* Numbered Privacy Policy Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {privacySections.map((sec) => (
            <article key={sec.id} id={sec.id} className={s.card} style={{ scrollMarginTop: "100px" }}>
              <h2 style={{ fontSize: "1.18rem", fontWeight: 800, color: "#021550", marginBottom: "0.75rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
                {sec.title}
              </h2>
              <div style={{ fontSize: "0.95rem", color: "#1e293b", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {sec.content}
              </div>
            </article>
          ))}
        </div>

        {/* Regulatory Disclosures */}
        <div className={s.infoBox} style={{ marginTop: "3.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
            Jurisdiction-Specific Privacy Rights
          </h2>
          <p style={{ color: "#334155", lineHeight: 1.75, fontSize: "0.925rem" }}>
            Residents of the European Economic Area (EEA), the United Kingdom, the United Arab Emirates, and California/other US states possess specific statutory privacy rights detailed in our <Link href="/legal" style={{ color: "#0329B2", fontWeight: 700 }}>Country Legal Schedules</Link>. If you have questions regarding our cross-border safeguards or wish to contact our Data Protection Officer, please email <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} style={{ color: "#0329B2", fontWeight: 700 }}>{PRIVACY_CONTACT_EMAIL}</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
