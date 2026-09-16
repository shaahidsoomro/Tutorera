import {
  BUSINESS_ADDRESS,
  LAST_LEGAL_UPDATE,
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  TERMS_VERSION,
  TRADING_NAME
} from "@/lib/site";
import {
  FileText,
  Globe,
  HeartHandshake,
  Lock,
  Scale,
  ShieldCheck
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Global Legal & Compliance Center | TUTORERA",
  description: "Official legal frameworks, marketplace terms, privacy policies, safety standards, and country-specific regulatory schedules for TUTORERA by MENTISERA.",
};

const legalCategories = [
  {
    title: "Master Marketplace Terms",
    icon: Scale,
    description: "Core contracts governing access to the TUTORERA student-led marketplace, multi-currency offers, and facilitation.",
    links: [
      { label: "Global Terms of Service", href: "/terms", desc: "Master terms for students, parents, tutors, and visitors." },
      { label: "Tutor Marketplace Agreement", href: "/terms/tutors", desc: "Independent tutor status, earnings, and professional warranties." },
      { label: "Student & Parent Platform Terms", href: "/terms/students", desc: "Rules for student accounts, parent authority, and booking conduct." },
      { label: "Pricing & Fee Policy", href: "/pricing", desc: "Authoritative transparent breakdown of 0% student fee & tutor platform fee." },
    ]
  },
  {
    title: "Tutoring Service Modes",
    icon: Globe,
    description: "Rules governing different educational delivery channels across borders and within local communities.",
    links: [
      { label: "Online Tutoring Master Terms", href: "/terms/online-tutoring", desc: "Cross-border tutoring, timezones, recordings, and connectivity failures." },
      { label: "Home Tuition & In-Person Terms", href: "/terms/home-tuition", desc: "Geographical boundaries, address privacy, safety, and guardian rules." },
      { label: "First-Session Quality Guarantee", href: "/first-session-guarantee", desc: "Student satisfaction and trial session dispute protection policy." },
    ]
  },
  {
    title: "Privacy, Data Rights & AI",
    icon: Lock,
    description: "Multi-jurisdiction personal data governance, international transfers, and algorithmic transparency.",
    links: [
      { label: "Global Privacy Policy", href: "/privacy", desc: "Data collection inventory, legal bases, retention, and international transfers." },
      { label: "Child Safeguarding & Minors Privacy", href: "/child-safety", desc: "Protections for minor students, parent controls, and safety escalation." },
      { label: "Cookie Policy & Preferences", href: "/cookies", desc: "Strictly necessary, preferences, analytics, and marketing cookie details." },
      { label: "Privacy Center & Data Export", href: "/privacy-center", desc: "Self-serve data subject rights, export data, and marketing opt-out." },
      { label: "Account Deletion Workflow", href: "/account/delete", desc: "Self-serve GDPR/right-to-be-forgotten account erasure." },
      { label: "Subprocessors Directory", href: "/legal/subprocessors", desc: "Approved third-party cloud infrastructure, analytics, and payment providers." },
      { label: "AI & Algorithm Transparency", href: "/legal/ai-transparency", desc: "Match Score explanation, tutor search ranking, and anti-bias principles." },
    ]
  },
  {
    title: "Trust, Verification & Safety",
    icon: ShieldCheck,
    description: "Standards ensuring physical safeguarding, academic integrity, and authentic tutor identity screening.",
    links: [
      { label: "Global Safety Center", href: "/safety", desc: "Multi-pillar safety guidance for students, parents, and tutors." },
      { label: "Tutor Verification & Badging Policy", href: "/verification-policy", desc: "Identity, academic credential, demo video, and screening definitions." },
      { label: "Background Check Policy", href: "/background-check-policy", desc: "Jurisdiction-specific background checks, limitations, and appeals." },
      { label: "Academic Integrity Policy", href: "/academic-integrity", desc: "Zero tolerance for cheating, ghostwriting, and examination taking." },
      { label: "Community & Conduct Guidelines", href: "/community-guidelines", desc: "Zero tolerance for harassment, discrimination, spam, and fraud." },
      { label: "Review & Feedback Policy", href: "/review-policy", desc: "Authentic verified booking reviews and anti-manipulation rules." },
    ]
  },
  {
    title: "Payment, Refunds & Disputes",
    icon: HeartHandshake,
    description: "Financial terms, multi-currency processing, refund rights, and structured dispute resolution.",
    links: [
      { label: "Payment & Financial Terms", href: "/payment-process", desc: "Payment providers, multi-currency FX snapshots, and payout schedules." },
      { label: "Refund Policy", href: "/refund-policy", desc: "Eligibility criteria, tutor no-shows, technical failures, and statutory rights." },
      { label: "Cancellation & Rescheduling Policy", href: "/cancellation-policy", desc: "Cancellation notice windows and emergency exception guidelines." },
      { label: "Dispute Resolution Process", href: "/complaint-process", desc: "Fair mediation workflow, evidence submission, and appeal paths." },
    ]
  },
  {
    title: "Jurisdiction-Specific Schedules",
    icon: FileText,
    description: "Country-specific statutory overrides, age thresholds, consumer rights, and local regulatory disclosures.",
    links: [
      { label: "Pakistan Legal Schedule", href: "/legal/country/pk", desc: "Applicable provisions under Pakistani consumer and electronic transactions law." },
      { label: "United Arab Emirates Schedule", href: "/legal/country/ae", desc: "Compliance with UAE Federal Decree-Law No. 45 of 2021 on Personal Data." },
      { label: "United Kingdom Legal Schedule", href: "/legal/country/gb", desc: "UK GDPR, Age Appropriate Design Code, and Consumer Rights Act 2015." },
      { label: "United States Legal Schedule", href: "/legal/country/us", desc: "State-level privacy disclosures, COPPA compliance, and consumer arbitration rules." },
      { label: "Saudi Arabia Legal Schedule", href: "/legal/country/sa", desc: "Compliance with KSA Personal Data Protection Law (PDPL) and local tutoring rules." },
    ]
  },
];

export default function GlobalLegalHubPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <h1>TUTORERA Legal & Compliance Center</h1>
        <p>
          Authoritative legal agreements, privacy frameworks, trust & safety standards, and regional regulatory compliance schedules governing the {TRADING_NAME} global tutoring marketplace.
        </p>
      </header>

      <section className={s.container}>
        {/* Entity Banner */}
        <div style={{ backgroundColor: "#F5F7FF", border: "1.5px solid #bfdbfe", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", margin: "0 0 0.35rem" }}>
              Contracting Platform Entity
            </h2>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155", lineHeight: 1.65 }}>
              <strong>{LEGAL_ENTITY_NAME}</strong> trading as <strong>{TRADING_NAME}</strong><br />
              Registered Address: {BUSINESS_ADDRESS}<br />
              Legal & Privacy Inquiries: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} style={{ color: "#0329B2", fontWeight: 600 }}>{LEGAL_CONTACT_EMAIL}</a>
            </p>
          </div>
          <div style={{ textAlign: "right", minWidth: 200 }}>
            <span style={{ display: "inline-block", backgroundColor: "#EEF5FF", color: "#0329B2", padding: "0.3rem 0.8rem", borderRadius: 999, fontSize: "0.8rem", fontWeight: 700, border: "1px solid #bfdbfe", marginBottom: "0.4rem" }}>
              Active Framework: {TERMS_VERSION}
            </span>
            <div style={{ fontSize: "0.8rem", color: "#475569" }}>
              Last Updated: {LAST_LEGAL_UPDATE}
            </div>
          </div>
        </div>

        {/* Global Architecture Statement */}
        <div style={{ borderLeft: "4px solid #0329B2", paddingLeft: "1.25rem", marginBottom: "3.5rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", margin: "0 0 0.4rem" }}>
            The TUTORERA Regulatory Principle: One Global Framework, Local Compliance
          </h3>
          <p style={{ color: "#1e293b", fontSize: "0.95rem", lineHeight: 1.75, margin: 0 }}>
            TUTORERA provides technology enabling students, parents, and tutors to discover one another, communicate, negotiate tutoring arrangements, book sessions, and process payments. Online tutoring connects users across international borders, while in-person home tuition is strictly constrained to local communities and service areas. TUTORERA operates subject to applicable laws in the jurisdictions where its services are provided.
          </p>
        </div>

        {/* Legal Categories Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "1.75rem" }}>
          {legalCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.title} className={s.card} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#EEF5FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#0329B2" }}>
                    <Icon size={22} />
                  </div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#021550", margin: 0 }}>
                    {cat.title}
                  </h3>
                </div>
                <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.65, marginBottom: "1.25rem" }}>
                  {cat.description}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "auto" }}>
                  {cat.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      style={{
                        padding: "0.75rem 1rem",
                        backgroundColor: "#F8FAFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: 12,
                        textDecoration: "none",
                        display: "block",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0329B2", marginBottom: "0.15rem" }}>
                        {link.label} →
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.5 }}>
                        {link.desc}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
