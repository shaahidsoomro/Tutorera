import {
  LEGAL_OPERATOR,
  SAFETY_CONTACT_EMAIL,
  TERMS_VERSION
} from "@/lib/site";
import {
  ArrowRight,
  Heart,
  ShieldAlert,
  Users,
  XCircle
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Community Guidelines & Code of Conduct",
  description:
    "Standards of mutual respect, professionalism, safety, and non-discrimination expected of all students, parents, and tutors on TUTORERA.",
  alternates: {
    canonical: "/community-guidelines",
  },
};

export default function CommunityGuidelinesPage() {
  return (
    <div className={s.wrapper}>
      <section className={s.hero}>
        <div className={s.badge}>
          <Users size={16} /> Community & Conduct Standards
        </div>
        <h1 className={s.title}>Community Guidelines & Code of Conduct</h1>
        <p className={s.subtitle}>
          TUTORERA (operated by {LEGAL_OPERATOR}) thrives on trust, intellectual curiosity,
          and mutual respect. These guidelines outline expectations for all participants across
          our global educational community.
        </p>
        <div className={s.meta}>
          <span>Standard: v{TERMS_VERSION}</span>
          <span>•</span>
          <span>Applies To: Students, Parents & Tutors</span>
          <span>•</span>
          <span>Moderation Desk: {SAFETY_CONTACT_EMAIL}</span>
        </div>
      </section>

      <div className={s.container}>
        <div className={s.highlightBox}>
          <strong>A Safe, Inclusive, and Empowering Learning Sanctuary:</strong>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", lineHeight: "1.7" }}>
            Every interaction on TUTORERA—whether in a live video classroom, through on-platform
            messaging, or during in-person home tuition—must reflect the highest standards of dignity,
            professionalism, and academic encouragement. We maintain zero tolerance for harassment,
            discrimination, exploitation, or abusive conduct.
          </p>
        </div>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Heart size={22} color="#ec4899" /> 1. Core Principles of Conduct
          </h2>
          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Dignity & Non-Discrimination</h3>
              <p className={s.cardText}>
                Treat every student, parent, and educator with kindness and respect. We strictly prohibit
                discrimination or derogatory remarks based on race, ethnicity, nationality, religion, gender,
                age, disability, or socioeconomic background.
              </p>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Professional Punctuality & Preparation</h3>
              <p className={s.cardText}>
                Both tutors and students must arrive on time for scheduled lessons, prepared with necessary
                learning materials, and ready to engage constructively. If an unavoidable delay occurs, notify
                the other party promptly via platform chat.
              </p>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Constructive Communication</h3>
              <p className={s.cardText}>
                Maintain courteous, encouraging language. Constructive criticism must always be focused on
                academic concepts and problem-solving, never personal character or attributes.
              </p>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Honesty & Transparency</h3>
              <p className={s.cardText}>
                Represent your qualifications, experience, educational needs, and scheduling availability
                accurately. Misleading claims, fake degrees, or false reviews undermine the entire community.
              </p>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <XCircle size={22} color="#dc2626" /> 2. Prohibited Behaviors
          </h2>
          <p>The following violations result in immediate disciplinary review and potential deplatforming:</p>
          <ul className={s.list}>
            <li>
              <strong>Harassment & Bullying:</strong> Persistent unwanted messaging, intimidation, verbal abuse,
              demeaning remarks, or threats of physical or reputational harm.
            </li>
            <li>
              <strong>Sexual Misconduct:</strong> Inappropriate remarks, suggestive gestures, unsolicited personal
              compliments, or any sexualized content in chat or live lessons.
            </li>
            <li>
              <strong>Platform Circumvention & Disintermediation:</strong> Demanding off-platform direct cash payments,
              soliciting bank transfers, or attempting to bypass TUTORERA platform checkout, payment records, or dispute safeguards.
            </li>
            <li>
              <strong>Spam & Solicitation:</strong> Unsolicited promotional messages, pyramid schemes, or advertising
              unrelated third-party commercial products.
            </li>
            <li>
              <strong>Academic Dishonesty:</strong> Demanding or agreeing to take exams for students, write graded essays,
              or assist in live quiz cheating (see our <Link href="/academic-integrity" style={{ color: "var(--accent, #2563eb)" }}>Academic Integrity Policy</Link>).
            </li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <ShieldAlert size={22} color="var(--primary, #0f172a)" /> 3. Violations & Disciplinary Matrix
          </h2>
          <p>
            TUTORERA enforces a structured disciplinary procedure to maintain community integrity:
          </p>
          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Tier 1: Formal Warning</h3>
              <p className={s.cardText}>
                Issued for minor, non-malicious infractions (e.g., occasional unexcused tardiness or accidental contact
                sharing). A compliance note is placed on the user account.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Tier 2: Temporary Suspension</h3>
              <p className={s.cardText}>
                Imposed for repeated policy infractions, disintermediation attempts, or disrespectful conduct.
                The account is paused for 7 to 30 days pending behavioral review.
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Tier 3: Permanent Deplatforming</h3>
              <p className={s.cardText}>
                Mandatory for severe violations: harassment, child safeguarding infractions, payment fraud, violent threats,
                or contract cheating. The user is permanently barred from TUTORERA.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/safety" className={s.primaryBtn}>
              Visit Safety Center <ArrowRight size={16} />
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
