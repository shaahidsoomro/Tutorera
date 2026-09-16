import {
  LEGAL_ENTITY_NAME,
  SAFETY_CONTACT_EMAIL,
  TRADING_NAME
} from "@/lib/site";
import {
  CheckCircle2,
  PhoneCall,
  ShieldAlert
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Child Safeguarding & Minor Protection Policy | TUTORERA",
  description: "Comprehensive child protection framework, parental consent rules, online and in-person safety protocols, and zero-tolerance safeguarding standards on TUTORERA®.",
};

const safeguardingPillars = [
  { title: "Zero Tolerance for Child Harm", desc: "Absolute zero-tolerance policy for child abuse, exploitation, grooming, sexual misconduct, harassment, or emotional intimidation." },
  { title: "Parent / Guardian Oversight", desc: "Adult supervision is required for all minor learners; sessions must occur in observable spaces with transparent parental visibility." },
  { title: "Strict Age-Gating Architecture", desc: "Independent account creation is restricted to users aged 18+; children under 13 must be registered through parent-managed accounts." },
  { title: "No Commercial Profiling", desc: "We never profile children for behavioral advertising, sell minor personal data, or utilize child data for unrelated commercial purposes." },
  { title: "Urgent Safety Escalation", desc: "Child safety reports bypass standard customer support queues and are immediately prioritized for investigation and law enforcement referral." },
  { title: "Verified Educator Standards", desc: "Tutors undergo identity verification, credential checks, and background screening before being approved to instruct minor learners." },
];

const safeguardingClauses = [
  {
    title: "1. Our Unwavering Commitment to Child Safety",
    content: `${TRADING_NAME} by ${LEGAL_ENTITY_NAME} prioritizes the safety, dignity, and wellbeing of every child who learns through our marketplace. Because education inherently involves young learners, we implement robust safety-by-design principles across our web platform and mobile applications to protect children from harm, exploitation, inappropriate content, and privacy violations.`
  },
  {
    title: "2. Age Tiers & Account Architecture",
    content: `To comply with international child protection standards (including COPPA in the United States, the UK Age Appropriate Design Code, and UAE child protection frameworks):
• Adult Users (18+): Eligible for independent student or tutor accounts.
• Teen Learners (13–17): May use the platform only with verifiable parent or legal guardian authorization. Parents maintain visibility into bookings, payments, and communications.
• Young Children (Under 13): May NOT create independent accounts. All requests, tutor selections, messages, and payments must be managed entirely by a parent or legal guardian on their behalf.`
  },
  {
    title: "3. Digital Safeguarding in Online Tutoring",
    content: `For online video tutoring involving minor students:
• Open Family Space Requirement: Lessons must take place in an open, visible area of the home (e.g., dining area, study nook, living room), never in a closed or locked bedroom.
• Professional Attire & Decorum: Tutors and students must maintain professional, modest attire and appropriate educational demeanor throughout the call.
• No Private Social Media Contact: Tutors are strictly forbidden from asking for or sharing personal social media handles (Instagram, Snapchat, TikTok, etc.), private messaging apps, or personal phone numbers with minor students.
• No Unsolicited Photos or Non-Academic Files: Exchanging non-academic personal photographs or unrelated files is strictly prohibited and leads to immediate permanent termination.`
  },
  {
    title: "4. Physical Safeguarding in Home Tuition",
    content: `For in-person home tutoring involving minor students:
• Mandatory Guardian Presence: An adult parent, legal guardian, or designated adult caregiver (18+) MUST be physically present on the premises for the entire duration of every lesson.
• Visible Common Areas Only: Lessons must occur in common rooms with doors open at all times.
• Tutors Restricted to Study Areas: Tutors may not enter private bedrooms, unobservable spaces, or explore residential quarters.
• Refusal Protocol: If a tutor arrives and no adult is present, the tutor is instructed to remain outside and contact platform support.`
  },
  {
    title: "5. Child Data Protection & Privacy Rights",
    content: `We design minor experiences with the highest default privacy settings:
• Minor student profiles are private by default and are never publicly indexed or accessible to web crawlers.
• We do not collect more personal information from minors than is reasonably necessary to provide educational instruction.
• Parents have the right to review, export, correct, or request the immediate deletion of their child's personal data at any time through our Privacy Center.`
  },
  {
    title: "6. Zero Tolerance for Prohibited Conduct",
    content: `TUTORERA enforces immediate, permanent account bans and cooperates with criminal authorities for any of the following:
• Any sexualized conversation, suggestive comments, or grooming behavior.
• Any attempt to meet minor students outside scheduled, parent-authorized tutoring sessions.
• Physical violence, verbal aggression, or psychological intimidation.
• Introduction of alcohol, drugs, weapons, or age-inappropriate media.`
  },
  {
    title: "7. High-Priority Child Safety Reporting & Escalation",
    content: `Child safety complaints are NOT treated as ordinary customer-service inquiries. They are routed directly to our Executive Safety Team:
• Immediate Triage: Safety reports are reviewed within 2 hours of receipt.
• Protective Account Hold: Any tutor or user subject to a credible child welfare complaint is immediately placed on protective administrative suspension pending investigation.
• Mandatory Law Enforcement Referral: Where evidence of child abuse or criminal endangerment exists, TUTORERA preserves relevant chat and audit records and refers the incident to appropriate child protection and law enforcement authorities.`
  },
  {
    title: "8. Emergency Guidance",
    content: `TUTORERA is a technology marketplace and not an emergency first-responder service. If you believe a child is in immediate physical danger, contact your local emergency authorities immediately (e.g., 15 in Pakistan, 999 in the UAE/UK, 911 in the United States). Once safety is established, notify our Safety Team at ${SAFETY_CONTACT_EMAIL}.`
  }
];

export default function ChildSafetyPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <h1>Child Safeguarding & Minor Protection Policy</h1>
        <p>
          Our highest platform priority: protecting young learners through age-aware account architecture, parent supervision standards, and zero-tolerance safety enforcement on TUTORERA®.
        </p>
      </header>

      <section className={s.container}>
        {/* Priority Banner */}
        <div style={{ backgroundColor: "#FEF2F2", border: "1.5px solid #fecaca", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <ShieldAlert size={36} color="#dc2626" />
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#991b1b", margin: "0 0 0.25rem" }}>
              Zero-Tolerance Child Protection Standard
            </h2>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#b91c1c", lineHeight: 1.6 }}>
              The safety and emotional wellbeing of children is non-negotiable. TUTORERA enforces mandatory adult guardian presence, private profile defaults, and immediate law enforcement escalation for any child safety violation.
            </p>
          </div>
        </div>

        {/* Safeguarding Pillars Grid */}
        <div style={{ marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#021550", marginBottom: "1.25rem" }}>
            Our Safeguarding Core Commitments
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {safeguardingPillars.map((item) => (
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

        {/* Direct Safety Emergency Contact Box */}
        <div style={{ backgroundColor: "#FFFBEB", border: "1.5px solid #fde68a", borderRadius: 16, padding: "1.25rem 1.5rem", marginBottom: "3.5rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <PhoneCall size={26} color="#d97706" />
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#92400E" }}>Urgent Child Safety Reporting</div>
              <div style={{ fontSize: "0.85rem", color: "#78350F" }}>Direct escalation line monitored 24/7 by our dedicated Safeguarding Team.</div>
            </div>
          </div>
          <div>
            <a 
              href={`mailto:${SAFETY_CONTACT_EMAIL}?subject=URGENT:%20Child%20Safety%20Concern`}
              style={{ display: "inline-block", backgroundColor: "#dc2626", color: "#fff", padding: "0.6rem 1.25rem", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}
            >
              Report Child Safety Concern →
            </a>
          </div>
        </div>

        {/* Numbered Policy Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {safeguardingClauses.map((clause) => (
            <article key={clause.title} className={s.card}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.75rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
                {clause.title}
              </h2>
              <div style={{ fontSize: "0.95rem", color: "#1e293b", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {clause.content}
              </div>
            </article>
          ))}
        </div>

        {/* Navigation InfoBox */}
        <div className={s.infoBox} style={{ marginTop: "3.5rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
            Related Safety Frameworks
          </h2>
          <p style={{ color: "#334155", lineHeight: 1.7, fontSize: "0.92rem", marginBottom: "1rem" }}>
            Learn more about our verified tutor screening and general marketplace safety rules:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link href="/safety" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Global Safety Center →</Link>
            <Link href="/verification-policy" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Tutor Verification Standards →</Link>
            <Link href="/terms/home-tuition" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Home Tuition Safety Terms →</Link>
            <Link href="/privacy" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Global Privacy Policy →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
