import {
  LEGAL_OPERATOR,
  SAFETY_CONTACT_EMAIL,
  SUPPORT_PHONE,
  TERMS_VERSION
} from "@/lib/site";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Eye,
  FileCheck,
  Home,
  Laptop,
  LifeBuoy,
  Lock,
  ShieldCheck,
  Users
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Trust & Safety Center | Global Student & Tutor Protection | TUTORERA",
  description:
    "TUTORERA's comprehensive Global Trust and Safety Center. Safety guidelines for students, parents, and tutors across online and in-person home tuition worldwide.",
  alternates: {
    canonical: "/safety",
  },
};

export default function SafetyCenterPage() {
  return (
    <div className={s.wrapper}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.badge}>
          <ShieldCheck size={16} /> Global Trust & Safety Center
        </div>
        <h1 className={s.title}>Safety by Design. Protection Across Borders.</h1>
        <p className={s.subtitle}>
          At TUTORERA (operated by {LEGAL_OPERATOR}), safeguarding students, parents,
          and independent educators is our foundational priority. Whether learning takes
          place across global timezones via live video or in person at home, we enforce
          rigorous multi-layered safety standards.
        </p>
        <div className={s.meta}>
          <span>Policy Framework: v{TERMS_VERSION}</span>
          <span>•</span>
          <span>Emergency Lead: {SAFETY_CONTACT_EMAIL}</span>
          <span>•</span>
          <span>Response SLA: Within 24 Hours</span>
        </div>
      </section>

      {/* Emergency Disclaimer Banner */}
      <div className={s.emergencyBanner}>
        <AlertTriangle size={24} style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ display: "block", marginBottom: "0.25rem", fontSize: "1rem" }}>
            Immediate Physical Danger or Emergency Notice
          </strong>
          TUTORERA is a digital communications and marketplace platform, not an emergency
          response service. If you, a student, or any individual is in immediate physical danger,
          facing violence, medical emergency, or abuse, contact your local emergency authorities
          immediately (e.g., <strong>911</strong> in the United States/Canada, <strong>999</strong>{" "}
          in the UK, <strong>112</strong> in the European Union, <strong>999</strong> in the UAE, or{" "}
          <strong>15</strong> in Pakistan) before contacting our support team.
        </div>
      </div>

      <div className={s.container}>
        {/* Quick Links Matrix */}
        <div className={s.cardGrid} style={{ marginBottom: "2.5rem" }}>
          <Link href="/child-safety" className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.cardIcon}>
                <Eye size={20} />
              </div>
              <h3 className={s.cardTitle}>Child Safeguarding Policy</h3>
            </div>
            <p className={s.cardText}>
              Zero-tolerance standards, parental supervision requirements, and minor account protections.
            </p>
          </Link>

          <Link href="/terms/home-tuition" className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.cardIcon}>
                <Home size={20} />
              </div>
              <h3 className={s.cardTitle}>Home Tuition Safety Rules</h3>
            </div>
            <p className={s.cardText}>
              Mandatory address privacy, adult chaperone rules, and in-person verification protocols.
            </p>
          </Link>

          <Link href="/verification-policy" className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.cardIcon}>
                <FileCheck size={20} />
              </div>
              <h3 className={s.cardTitle}>Tutor Verification Standards</h3>
            </div>
            <p className={s.cardText}>
              Multi-tiered identity checks, credential reviews, demo video audits, and badge definitions.
            </p>
          </Link>
        </div>

        {/* Section 1: For Students & Parents */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Users size={22} color="var(--primary, #0f172a)" /> 1. Student & Minor Safety Protocols
          </h2>
          <p>
            Whether learning mathematics, languages, test preparation, or university curricula,
            students must experience a secure, respectful, and encouraging environment.
          </p>
          <ul className={s.list}>
            <li>
              <strong>Accounts for Children Under 13:</strong> Direct account registration by minors
              under age 13 (or under 14–16 depending on jurisdiction) is strictly prohibited. Accounts
              must be created, managed, and monitored exclusively by a parent or verified legal guardian.
            </li>
            <li>
              <strong>Safe On-Platform Messaging:</strong> Always use TUTORERA&apos;s encrypted messaging
              portal. Our platform employs automated safety filters that deter off-platform solicitations,
              personal contact leakage, inappropriate language, and harassment.
            </li>
            <li>
              <strong>Zero Tolerance for Solicitation:</strong> Any tutor or student attempting to exchange
              personal social media handles, unmonitored private phone numbers, or private streaming links
              prior to confirmed booking is subject to immediate account review and potential suspension.
            </li>
            <li>
              <strong>Right to Leave Immediately:</strong> If at any point during an online or in-person
              session a student feels uncomfortable, demeaned, or unsafe, they have the unqualified right
              to immediately terminate the lesson and inform our Safety Team.
            </li>
          </ul>
        </section>

        {/* Section 2: Online Tutoring Safety */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Laptop size={22} color="var(--primary, #0f172a)" /> 2. Online Tutoring Safety Standards
          </h2>
          <p>
            Online tutoring offers borderless access to elite educators worldwide. To protect both
            participants in digital learning spaces, the following mandatory protocols apply:
          </p>
          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Professional Attire & Neutral Environment</h3>
              <p className={s.cardText}>
                Both tutors and students must be fully and professionally attired during live video sessions.
                Lessons must be conducted in appropriate, well-lit study rooms with neutral or blurred
                backgrounds—never from private bedrooms without appropriate camera framing.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Strict Recording Consent Rules</h3>
              <p className={s.cardText}>
                Recording of audio, video, or screen shares without explicit written mutual consent of all
                participants (and parental consent for minors) is strictly prohibited under international
                privacy legislation. Unauthorized recordings will lead to immediate deplatforming.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>No Personal Contact Distribution</h3>
              <p className={s.cardText}>
                Do not share private home addresses, financial credentials, personal phone numbers, or
                private social media profiles during online sessions. All lesson coordination, scheduling,
                and file exchanges should occur through official platform channels.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Screen Sharing & Content Safeguards</h3>
              <p className={s.cardText}>
                Screen sharing must be restricted solely to legitimate instructional materials (slides, code,
                diagrams, problem sets). Sharing illicit, sexually suggestive, copyrighted, or unauthorized
                content results in permanent termination and notification to relevant bodies.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: In-Person & Home Tuition Safety */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Home size={22} color="var(--primary, #0f172a)" /> 3. In-Person & Home Tuition Safeguards
          </h2>
          <div className={s.highlightBox}>
            <strong>Observable Space & Adult Supervision Requirement:</strong>
            <p style={{ marginTop: "0.5rem" }}>
              For all in-person lessons involving minor students (under 18 years of age), an adult
              parent, guardian, or authorized adult chaperone <strong>must remain on the premises</strong>{" "}
              and within reasonable earshot and sight throughout the entire duration of the session.
              Lessons must take place in an open, common living or study room with the door unlocked or open.
            </p>
          </div>
          <ul className={s.list} style={{ marginTop: "1rem" }}>
            <li>
              <strong>Address Confidentiality:</strong> Exact residential street addresses, apartment
              numbers, and gate codes are never displayed publicly. They are disclosed to an approved tutor
              only after a tuition request is accepted, identity verified, and lesson scheduled.
            </li>
            <li>
              <strong>Initial Meeting in Common Areas:</strong> For the first in-person session, parents
              and tutors are advised to meet briefly in the presence of the adult household member to confirm
              credentials, discuss academic objectives, and establish house rules.
            </li>
            <li>
              <strong>Prohibited Items:</strong> Weapons, illegal substances, alcohol, and hazardous materials
              are strictly prohibited from any home tutoring environment. Violation results in immediate
              termination of services and mandatory law enforcement reporting.
            </li>
            <li>
              <strong>Tutor Environmental Safety:</strong> Tutors have the absolute right to refuse entry or
              leave immediately without financial penalty if they arrive at a premises and feel unsafe,
              threatened, or if promised chaperone supervision is absent.
            </li>
          </ul>
        </section>

        {/* Section 4: Financial & Anti-Scam Protection */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Lock size={22} color="var(--primary, #0f172a)" /> 4. Financial Protection & Anti-Scam Rules
          </h2>
          <p>
            Payment scams and off-platform disintermediation represent the most common threat to both
            students and tutors across digital marketplaces.
          </p>
          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>On-Platform Payment Verification</h3>
              <p className={s.cardText}>
                Lesson fees must be paid through TUTORERA&apos;s authorized platform checkout when available.
                TUTORERA verifies payment server-side, records booking payment status, and supports dispute review
                under the published refund and first-session guarantee policies.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Never Pay Cash or Direct Wire</h3>
              <p className={s.cardText}>
                Never send direct bank transfers, Western Union, crypto, or direct cash to a tutor.
                TUTORERA cannot refund, protect, or dispute any transactions conducted outside the official
                platform checkout.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Beware of Overpayment Scams</h3>
              <p className={s.cardText}>
                Tutors must never accept third-party check deposits, overpayment checks, or requests to
                &quot;forward funds&quot; to agents or textbook suppliers. These are fraudulent schemes. Report
                any such request immediately.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Dispute & First-Session Protection</h3>
              <p className={s.cardText}>
                If a tutor fails to attend or a session falls catastrophically short of academic standards,
                students can open a dispute within 24 hours under our First-Session Satisfaction Guarantee.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Incident Escalation & Reporting */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <AlertOctagon size={22} color="var(--primary, #0f172a)" /> 5. Reporting Violations & Escalation Matrix
          </h2>
          <p>
            TUTORERA maintains an active Trust and Safety team dedicated to investigating violations,
            reviewing flagged messages, and taking swift disciplinary action.
          </p>
          <div className={s.highlightBox}>
            <strong>How We Handle Reports:</strong>
            <ol style={{ paddingLeft: "1.25rem", marginTop: "0.5rem", lineHeight: "1.7" }}>
              <li>
                <strong>Immediate Receipt & Triage:</strong> Reports received via our contact forms or
                safety email are acknowledged and triaged within 2 to 4 hours for priority safety alerts.
              </li>
              <li>
                <strong>Precautionary Restriction:</strong> Where serious allegations involving minor safety,
                harassment, or fraud are raised, the reported user&apos;s account is placed on temporary
                administrative hold pending evidence review.
              </li>
              <li>
                <strong>Evidence Audit:</strong> Our compliance team audits chat histories, lesson logs,
                submitted documents, and mutual witness statements.
              </li>
              <li>
                <strong>Resolution & Sanction:</strong> Violators face immediate permanent deplatforming,
                forfeiture of platform privileges, and, where appropriate, formal referral to local criminal
                justice authorities.
              </li>
            </ol>
          </div>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <a
              href={`mailto:${SAFETY_CONTACT_EMAIL}?subject=Urgent%20Safety%20Incident%20Report`}
              className={s.primaryBtn}
            >
              <AlertTriangle size={18} /> Email Trust & Safety Team
            </a>
            <Link href="/contact" className={s.secondaryBtn}>
              Submit Web Report <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* Support & Contact Footer */}
        <div className={s.highlightBox} style={{ textAlign: "center", padding: "2rem" }}>
          <LifeBuoy size={36} color="var(--primary, #0f172a)" style={{ margin: "0 auto 0.75rem auto" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>
            Need Direct Safety Consultation?
          </h3>
          <p style={{ maxWidth: "600px", margin: "0 auto 1rem auto", color: "#4b5563" }}>
            Our compliance officers and community managers are available to advise parents, students,
            and educators on best practices, dispute resolutions, and verification inquiries.
          </p>
          <p style={{ fontSize: "0.95rem" }}>
            <strong>Safety Desk:</strong>{" "}
            <a href={`mailto:${SAFETY_CONTACT_EMAIL}`} style={{ color: "var(--accent, #2563eb)", fontWeight: "600" }}>
              {SAFETY_CONTACT_EMAIL}
            </a>{" "}
            | <strong>Support Helpline:</strong> {SUPPORT_PHONE}
          </p>
        </div>
      </div>
    </div>
  );
}
