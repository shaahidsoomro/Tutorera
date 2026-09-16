import {
  LEGAL_OPERATOR,
  SUPPORT_EMAIL,
  TERMS_VERSION
} from "@/lib/site";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  FileWarning,
  GraduationCap,
  Shield,
  XCircle
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Academic Integrity & Honor Code | Anti-Cheating Policy | TUTORERA",
  description:
    "TUTORERA's strict academic integrity rules, prohibition against ghostwriting, ban on exam cheating, and educational honor code for students and tutors.",
  alternates: {
    canonical: "/academic-integrity",
  },
};

export default function AcademicIntegrityPage() {
  return (
    <div className={s.wrapper}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.badge}>
          <GraduationCap size={16} /> Educational Ethics & Honor Code
        </div>
        <h1 className={s.title}>Academic Integrity & Honor Policy</h1>
        <p className={s.subtitle}>
          At TUTORERA (operated by {LEGAL_OPERATOR}), education is grounded in authentic
          learning, conceptual mastery, and ethical scholarship. We enforce an unyielding,
          zero-tolerance policy against academic dishonesty, exam cheating, and ghostwriting.
        </p>
        <div className={s.meta}>
          <span>Code Version: v{TERMS_VERSION}</span>
          <span>•</span>
          <span>Applies To: All Students, Parents & Tutors</span>
          <span>•</span>
          <span>Honor Council: {SUPPORT_EMAIL}</span>
        </div>
      </section>

      <div className={s.container}>
        {/* Core Honor Covenant */}
        <div className={s.highlightBox}>
          <strong>The TUTORERA Honor Covenant:</strong>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", lineHeight: "1.7" }}>
            Tutoring is an educational partnership designed to help students comprehend complex
            subjects, develop critical problem-solving skills, and achieve genuine intellectual growth.
            <strong>
              {" "}TUTORERA is NOT a homework completion service, essay mill, or exam-taking proxy.
            </strong>{" "}
            Any request or offer to commit academic fraud corrupts the integrity of education and
            results in immediate, non-appealable removal from our platform.
          </p>
        </div>

        {/* Section 1: Strictly Prohibited Violations */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <XCircle size={22} color="#dc2626" /> 1. Strictly Prohibited Conduct
          </h2>
          <p>
            The following actions constitute severe violations of platform terms, university honor codes,
            and, in certain jurisdictions, statutory consumer and fraud regulations:
          </p>

          <div className={s.cardGrid}>
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIcon} style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                  <AlertOctagon size={20} />
                </div>
                <h3 className={s.cardTitle}>Live Exam & Test Assistance</h3>
              </div>
              <p className={s.cardText}>
                Providing live answers, solutions, hints, or problem walkthroughs while a student is actively
                taking a timed exam, quiz, mid-term, final, standardized test (SAT, ACT, IELTS, TOEFL, GRE, GMAT),
                or entry test (MDCAT, ECAT), whether online or in person.
              </p>
            </div>

            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIcon} style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                  <FileWarning size={20} />
                </div>
                <h3 className={s.cardTitle}>Ghostwriting & Work Completion</h3>
              </div>
              <p className={s.cardText}>
                Writing essays, dissertations, theses, term papers, research reports, or programming projects
                that will be submitted under the student&apos;s name as their original work. Tutors must never
                author graded submissions.
              </p>
            </div>

            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIcon} style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                  <AlertOctagon size={20} />
                </div>
                <h3 className={s.cardTitle}>Impersonation & Proxy Taking</h3>
              </div>
              <p className={s.cardText}>
                Logging into a student&apos;s university portal, learning management system (Canvas, Blackboard, Moodle),
                or testing portal to complete assignments, attend lectures, or sit for examinations on their behalf.
              </p>
            </div>

            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardIcon} style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                  <FileWarning size={20} />
                </div>
                <h3 className={s.cardTitle}>Distribution of Stolen Test Materials</h3>
              </div>
              <p className={s.cardText}>
                Buying, selling, sharing, or soliciting leaked examination questions, unauthorized instructor solution
                manuals, proprietary test bank files, or confidential institutional evaluation materials.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Permissible Educational Practices */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <CheckCircle2 size={22} color="#16a34a" /> 2. Permissible & Encouraged Tutoring Activities
          </h2>
          <p>
            We celebrate educators who empower learners through pedagogical excellence. The following
            activities exemplify authentic tutoring:
          </p>
          <ul className={s.list}>
            <li>
              <strong>Conceptual Clarification:</strong> Breaking down theorems, historical narratives,
              scientific mechanisms, mathematical derivations, or syntactic structures.
            </li>
            <li>
              <strong>Working Sample & Practice Problems:</strong> Guiding students through textbook examples,
              public past papers, or tutor-created practice questions to illustrate techniques.
            </li>
            <li>
              <strong>Feedback & Proofreading:</strong> Reviewing a student&apos;s independently authored essay to
              point out grammatical weaknesses, logical gaps, citation formatting, or organizational improvements
              without rewriting sentences for them.
            </li>
            <li>
              <strong>Debugging & Code Mentorship:</strong> Guiding a programming student to locate a bug, read
              stack traces, and understand algorithms without writing the complete codebase for their assignment.
            </li>
            <li>
              <strong>Study Habits & Exam Strategy:</strong> Coaching time management, stress mitigation,
              flashcard methodologies, and effective revision schedules.
            </li>
          </ul>
        </section>

        {/* Section 3: Detection & Enforcement */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Shield size={22} color="var(--primary, #0f172a)" /> 3. Automated Detection & Mandatory Sanctions
          </h2>
          <p>
            TUTORERA employs both proactive technological controls and strict disciplinary procedures:
          </p>
          <div className={s.highlightBox}>
            <ul style={{ paddingLeft: "1.25rem", margin: 0, lineHeight: "1.7" }}>
              <li>
                <strong>Automated Chat Scanning:</strong> Our platform communication filters monitor for
                suspicious keywords such as &quot;take my exam&quot;, &quot;solve quiz now&quot;, &quot;write my assignment&quot;,
                or urgent requests for immediate answers during proctored hours.
              </li>
              <li>
                <strong>Mandatory Tutor Reporting:</strong> Any tutor approached with a cheating solicitation
                is obligated under our Tutor Agreement to reject the request and report the account immediately.
                Tutors who accept cheating solicitations face immediate deplatforming.
              </li>
              <li>
                <strong>Permanent Account Termination:</strong> Confirmed cheating solicitation leads to the
                immediate, permanent closure of both the student and tutor accounts involved.
              </li>
              <li>
                <strong>Refund Ineligibility for Fraudulent Use:</strong> Students who fund sessions for fraudulent
                academic purposes are not eligible for satisfaction guarantees or discretionary refunds for
                contract cheating.
              </li>
              <li>
                <strong>Institutional Notification:</strong> Where legally appropriate or mandated by judicial
                or educational regulatory subpoenas, TUTORERA cooperates fully with university honor boards,
                ministries of education, and institutional integrity officers.
              </li>
            </ul>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/terms/tutors" className={s.primaryBtn}>
              Read Tutor Agreement <ArrowRight size={16} />
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
