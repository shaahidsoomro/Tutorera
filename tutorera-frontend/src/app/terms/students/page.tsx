import {
  TRADING_NAME
} from "@/lib/site";
import {
  GraduationCap
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import s from "../../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Student & Parent Platform Terms | TUTORERA",
  description: "Terms governing student tuition requests, parent account authorization, booking commitments, academic integrity, and quality protections on TUTORERA®.",
};

const studentTerms = [
  {
    title: "1. Agreement Scope for Students & Parents",
    content: `These Student & Parent Platform Terms ("Student Terms") govern your rights and obligations when posting tuition requirements, negotiating with tutors, booking tutoring sessions, and making payments on ${TRADING_NAME}. These terms supplement our master Global Terms of Service.`
  },
  {
    title: "2. Parent / Guardian Authority for Minor Learners",
    content: `If a student is under 18 years of age (or the local age of majority):
• An adult parent or legal guardian must register the account, provide verifiable consent, and supervise platform use.
• The parent or guardian is contractually and financially responsible for all tuition requests posted, offer acceptances, session bookings, and payment charges incurred through the account.
• For children under 13, all communications, profile management, and bookings must be handled directly by the parent.`
  },
  {
    title: "3. Student-Led Marketplace & Tutor Selection Autonomy",
    content: `You have full autonomy to post your learning needs, propose your preferred budget, compare offers submitted by multiple verified tutors, and negotiate transparently. You are never obligated to accept any offer, and the lowest bid is never forced upon you. You make the final independent choice.`
  },
  {
    title: "4. Direct Tutor Bookings",
    content: `You may browse the verified tutor directory and book tutors directly at their posted hourly rate. Direct bookings are confirmed once the tutor approves the requested time slot and payment is processed.`
  },
  {
    title: "5. Transparent Pricing & Zero Student Marketplace Fee",
    content: `Students currently pay zero percent (0%) marketplace service fee to TUTORERA. The total price you pay for tutoring is exactly the final locked rate agreed upon during offer acceptance or direct booking, plus any applicable localized taxes clearly displayed before payment.`
  },
  {
    title: "6. Payment Obligations & Secure Processing",
    content: `Payment for tutoring sessions must be processed through TUTORERA's authorized payment channels. You agree to provide valid, authorized payment method details. Tutoring sessions are confirmed and protected under our quality guarantee only when payment is verified on the platform.`
  },
  {
    title: "7. Attendance, Punctuality & Scheduling Commitments",
    content: `Students must be ready to begin sessions at the scheduled time. If a student is more than 15 minutes late without prior notice, the tutor is entitled to treat the session as completed for that time slot. Tutors who arrive late or fail to appear are penalized, and students receive a full refund or makeup lesson.`
  },
  {
    title: "8. Respectful Conduct & Zero Harassment",
    content: `Students and parents must interact with tutors professionally and respectfully. Any form of verbal abuse, harassment, discrimination, inappropriate personal remarks, or unreasonable demands will result in immediate account termination.`
  },
  {
    title: "9. Academic Integrity & Prohibited Requests",
    content: `Tutoring is designed to enhance understanding, build study skills, and support revision. You may NOT request or pressure tutors to:
• Take an online test, examination, or quiz on your behalf.
• Complete homework or coursework meant to be your independent work (ghostwriting).
• Falsify academic records, attendance records, or grades.
Any such requests violate academic integrity and result in immediate cancellation without refund.`
  },
  {
    title: "10. In-Person Home Tuition Safety Rules",
    content: `When booking in-person home tutoring:
• An adult (18+) must be present at the home for the entire lesson if the student is a minor.
• Tutoring must occur in an observable common room (living room, dining area, study room with open door).
• Exact addresses must not be shared until the booking is confirmed on the platform.`
  },
  {
    title: "11. First-Session Quality Guarantee & Refunds",
    content: `If you are dissatisfied with your very first trial session with a newly booked tutor, you may submit a guarantee claim within 48 hours via your dashboard. TUTORERA will review the claim and provide either platform credit to try an alternative tutor or a full refund in accordance with our Refund Policy.`
  },
  {
    title: "12. Verified Reviews & Feedback Integrity",
    content: `Following completed sessions, you are encouraged to leave an honest, constructive review. Reviews must reflect your actual educational experience and must not contain defamatory language, private personal contact details, or false statements.`
  }
];

export default function StudentTermsPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <h1>Student & Parent Platform Terms</h1>
        <p>
          Contractual rules governing tuition requests, parent authorization, tutor selection, payments, academic integrity, and quality protections on TUTORERA®.
        </p>
      </header>

      <section className={s.container}>
        <div style={{ backgroundColor: "#F0FDF4", border: "1.5px solid #bbf7d0", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <GraduationCap size={32} color="#16a34a" />
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#166534", margin: "0 0 0.25rem" }}>
              Student-Led Learning with Guardian Protection
            </h2>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#14532d", lineHeight: 1.65 }}>
              TUTORERA puts students and parents in control: propose your budget, choose your tutor, learn securely online or locally, and enjoy 100% first-session satisfaction protection.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {studentTerms.map((clause) => (
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

        <div className={s.infoBox} style={{ marginTop: "3.5rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
            Helpful Student & Parent Resources
          </h2>
          <p style={{ color: "#334155", lineHeight: 1.7, fontSize: "0.92rem", marginBottom: "1rem" }}>
            Learn more about our safety standards, guarantee policies, and academic rules:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link href="/first-session-guarantee" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>First-Session Guarantee Policy →</Link>
            <Link href="/child-safety" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Child Safeguarding Guide →</Link>
            <Link href="/academic-integrity" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Academic Integrity Policy →</Link>
            <Link href="/terms" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Master Terms of Service →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
