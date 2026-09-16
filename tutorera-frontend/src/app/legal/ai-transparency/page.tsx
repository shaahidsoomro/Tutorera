import {
  LEGAL_OPERATOR,
  SUPPORT_EMAIL,
  TERMS_VERSION
} from "@/lib/site";
import {
  ArrowRight,
  Cpu,
  Scale,
  ShieldCheck,
  Sliders,
  UserCheck,
  XCircle
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "AI & Algorithmic Transparency Policy | TUTORERA",
  description:
    "How TUTORERA uses algorithms, match scores, ranking signals, and automated moderation to connect students and tutors fairly and transparently.",
  alternates: {
    canonical: "/legal/ai-transparency",
  },
};

export default function AITransparencyPage() {
  return (
    <div className={s.wrapper}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.badge}>
          <Cpu size={16} /> Algorithmic Governance & Ethics
        </div>
        <h1 className={s.title}>AI & Algorithmic Transparency Policy</h1>
        <p className={s.subtitle}>
          How TUTORERA (operated by {LEGAL_OPERATOR}) leverages machine intelligence,
          search rankings, matchmaking algorithms, and automated safety screening to empower
          authentic human educational connections.
        </p>
        <div className={s.meta}>
          <span>Framework Version: v{TERMS_VERSION}</span>
          <span>•</span>
          <span>Compliance Standard: EU AI Act & Global Ethics</span>
          <span>•</span>
          <span>Contact: {SUPPORT_EMAIL}</span>
        </div>
      </section>

      <div className={s.container}>
        {/* Core Philosophy Box */}
        <div className={s.highlightBox}>
          <strong>Core Philosophy: Human Agency & Absolute Choice</strong>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", lineHeight: "1.7" }}>
            At TUTORERA, algorithms are designed solely to eliminate friction, organize vast educational
            directories, and protect community members from fraud.
            <strong>
              {" "}Algorithms never make binding hiring decisions, never lock prices, and never displace human
              judgement.
            </strong>{" "}
            Students and parents always retain complete sovereignty to choose any verified tutor of their
            choice, and independent educators always retain complete autonomy over their rates and scheduling.
          </p>
        </div>

        {/* Section 1: Search & Match Ranking Signals */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Sliders size={22} color="var(--primary, #0f172a)" /> 1. Search Ranking & Match Score Signals
          </h2>
          <p>
            When a student searches the tutor directory or posts a tuition requirement, our ranking systems
            evaluate transparent pedagogical and operational metrics:
          </p>

          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Curriculum & Subject Alignment</h3>
              <p className={s.cardText}>
                The highest weight is assigned to direct subject relevance, grade level, and curriculum expertise
                (e.g., Cambridge IGCSE, Edexcel A-Level, IB, AP, Oxford, Federal Board, Matric, or University disciplines).
              </p>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Location Compatibility (Home Tuition)</h3>
              <p className={s.cardText}>
                For in-person tuition, geographic proximity between student neighborhood and tutor operating radius
                is prioritized to ensure realistic commute times and punctual attendance.
              </p>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Verification & Screening Status</h3>
              <p className={s.cardText}>
                Profiles with Tier 1 (ID verified), Tier 2 (Degrees verified), and Tier 4 (Police/DBS background cleared)
                badges are surfaced prominently to safeguard families.
              </p>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Student Reviews & Lesson Completion</h3>
              <p className={s.cardText}>
                Historical student ratings, repeat booking ratios, punctual attendance records, and verified reviews
                from completed platform milestones inform profile visibility.
              </p>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Platform Responsiveness</h3>
              <p className={s.cardText}>
                Tutors who actively maintain their calendar availability and respond promptly to student inquiries
                and offers receive positive ranking consideration.
              </p>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Budget & Rate Compatibility</h3>
              <p className={s.cardText}>
                When matching posted requests to tutors, alignment between the student&apos;s proposed budget and
                the tutor&apos;s customary hourly rate helps surface realistic proposals.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Prohibited Factors */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Scale size={22} color="var(--primary, #0f172a)" /> 2. Prohibited & Excluded Signals (Non-Discrimination)
          </h2>
          <p>
            To guarantee absolute educational equity, TUTORERA strictly prohibits the following attributes
            from entering our ranking or recommendation models:
          </p>
          <div className={s.cardGrid}>
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIcon} style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                  <XCircle size={20} />
                </div>
                <h3 className={s.cardTitle}>Zero Demographic Bias</h3>
              </div>
              <p className={s.cardText}>
                Gender, race, ethnicity, religion, sect, nationality, age, disability, or marital status are never
                used as ranking parameters or predictive weights.
              </p>
            </div>

            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIcon} style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                  <XCircle size={20} />
                </div>
                <h3 className={s.cardTitle}>No Hidden &quot;Pay-to-Win&quot; Auction</h3>
              </div>
              <p className={s.cardText}>
                Organic marketplace search results cannot be purchased. Tutors cannot pay secret fees to artificially
                boost their algorithmic position over higher-rated or better-qualified educators.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Automated Safety & Moderation */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <ShieldCheck size={22} color="var(--primary, #0f172a)" /> 3. Automated Safety & Trust Classifiers
          </h2>
          <p>
            To protect minors and prevent marketplace fraud, TUTORERA utilizes real-time algorithmic classifiers:
          </p>
          <ul className={s.list}>
            <li>
              <strong>Off-Platform Leakage Filters:</strong> Detect patterns resembling external phone numbers,
              private email addresses, banking IBANs, or unmonitored links designed to circumvent platform checkout and payment records.
            </li>
            <li>
              <strong>Child Safeguarding Classifiers:</strong> Detect suggestive language, harassment, predatory
              phrasing, or requests for unmonitored private contact with minor students.
            </li>
            <li>
              <strong>Academic Dishonesty Detection:</strong> Flag solicitations involving exam taking, live quiz
              cheating, or thesis ghostwriting.
            </li>
          </ul>
          <div className={s.highlightBox} style={{ marginTop: "1rem" }}>
            <strong>Human-in-the-Loop Oversight:</strong> Automated filters flag or quarantine suspicious
            content for priority review by human Trust & Safety specialists. No account is permanently
            terminated without opportunity for human compliance review.
          </div>
        </section>

        {/* Section 4: Rights and Recourse */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <UserCheck size={22} color="var(--primary, #0f172a)" /> 4. User Rights, Inquiries & Recourse
          </h2>
          <p>
            If a tutor or student believes their profile visibility or account standing has been unfairly
            impacted by an algorithmic score or automated flag, they have the right to request a human review:
          </p>
          <p>
            Contact our algorithmic governance team at{" "}
            <strong>
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Algorithmic%20Transparency%20Inquiry`} style={{ color: "var(--accent, #2563eb)" }}>
                {SUPPORT_EMAIL}
              </a>
            </strong>
            . We review appeals within five (5) business days and provide clear explanations of account standing.
          </p>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/terms" className={s.primaryBtn}>
              Read Terms of Service <ArrowRight size={16} />
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
