import {
  PLATFORM_FEE_PERCENT,
  TRADING_NAME
} from "@/lib/site";
import {
  Briefcase
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import s from "../../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Tutor Marketplace Agreement | TUTORERA",
  description: "Official legal terms, independent contractor status, earnings flow, verification warranties, and professional conduct obligations for tutors on TUTORERA®.",
};

const tutorTerms = [
  {
    title: "1. Agreement Scope & Professional Relationship",
    content: `This Tutor Marketplace Agreement ("Agreement") governs your registration, approval, listing, bidding, and delivery of tutoring services on ${TRADING_NAME}. By applying to become a tutor or submitting offers to students, you agree to these terms, our master Global Terms of Service, and related safeguarding standards.`
  },
  {
    title: "2. Independent Contractor Status & Worker Classification",
    content: `You provide tutoring services as an independent educational professional and independent contractor. Nothing in this Agreement creates an employment, agency, franchise, partnership, or joint venture relationship between you and TUTORERA. You independently decide whether to accept or decline student requests, set your rates, determine your schedule, select your teaching methods, and furnish your own teaching materials.
    
[COUNSEL REVIEW NOTICE]: Worker classification rules vary by jurisdiction. You agree that you are solely responsible for compliance with any business registration, freelance licensing, or self-employment requirements applicable in your jurisdiction.`
  },
  {
    title: "3. Professional Qualifications & Credential Warranties",
    content: `You represent and warrant that:
• All academic diplomas, transcripts, teaching certificates, and professional credentials submitted for verification are genuine, unaltered, and lawfully obtained.
• You have the requisite pedagogical skill, subject knowledge, and language proficiency to instruct in the subjects and levels you offer.
• Your bio, experience years, and video intro accurately represent your background without puffery or deception.`
  },
  {
    title: "4. Pricing Autonomy, Currencies & Offer Integrity",
    content: `You have full autonomy to set your direct hourly rates and submit custom offers or counter-offers in response to student requests. You select your native operating currency. When you submit an offer or counter-offer to a student, you commit to honor that price and schedule for the duration of the engagement upon acceptance.`
  },
  {
    title: "5. Marketplace Platform Fee & Payout Deductions",
    content: `For facilitating discovery, verification, secure payment records, and student mediation, TUTORERA deducts a service fee from gross booking earnings (currently configured at ${PLATFORM_FEE_PERCENT}% plus applicable statutory sales tax/GST on the fee). The net payable amount is clearly displayed on your tutor dashboard before and after each transaction.`
  },
  {
    title: "6. Payout Cycles, Methods & Disputed Funds",
    content: `Tutor earnings are deposited into your registered bank account or verified digital wallet according to platform settlement cycles (typically 3 to 5 business days following confirmed session completion). In the event of a valid quality claim under our First-Session Guarantee, a student dispute, or suspected fraudulent activity, TUTORERA reserves the right to hold the disputed funds pending investigation.`
  },
  {
    title: "7. Tax, Licensing & Social Contribution Responsibilities",
    content: `You acknowledge that you are solely responsible for:
• Declaring your tutoring earnings to your local tax authorities.
• Paying all applicable income taxes, self-employment taxes, or social security levies.
• Obtaining any local municipal permits or private tutoring licences required in your jurisdiction.
TUTORERA does not provide personal tax advice and will issue statutory tax reports only where legally required by local authorities.`
  },
  {
    title: "8. Strict Anti-Circumvention & Off-Platform Ban",
    content: `You agree that for any student or parent introduced to you through TUTORERA, all bookings, lessons, extensions, and payments must be conducted through the platform for at least 12 months following initial contact. You must not:
• Solicit direct cash, bank transfers, or external wallet payments.
• Share personal phone numbers, WhatsApp, or private emails prior to booking confirmation.
• Encourage students to leave the platform to evade fees.
Circumvention deprives both parties of platform payment records, first-session guarantees, dispute mediation, and official support protections, and may result in account termination, forfeiture of pending payouts where lawful, and liability for lost platform fees.`
  },
  {
    title: "9. Child Safeguarding & Minor Student Rules",
    content: `Tutors instructing minor students (under 18) must adhere to our Child Safety Policy at all times:
• All communication must include or be accessible to the student's parent or legal guardian.
• Lessons must occur in common observable areas—never behind closed doors or in private bedrooms.
• Tutors may never request or share non-academic personal photos, social media accounts, or personal messaging handles with minor students.`
  },
  {
    title: "10. Anti-Harassment & Non-Discrimination Policy",
    content: `TUTORERA is committed to an inclusive and safe educational environment. Tutors may not discriminate against or refuse service to any student on the basis of race, religion, ethnicity, gender, disability, or nationality. Harassment, verbal abuse, or inappropriate personal remarks will result in immediate removal.`
  },
  {
    title: "11. Academic Integrity & Anti-Cheating Compliance",
    content: `You must strictly uphold academic honesty. You are forbidden from taking exams for students, writing graded coursework for submission, or engaging in ghostwriting. Tutoring must focus on conceptual clarity, guidance, and revision.`
  },
  {
    title: "12. Review Integrity & Anti-Manipulation",
    content: `Tutors may not artificially inflate their ratings by creating fake student accounts, purchasing reviews, offering incentives for 5-star ratings, or retaliating against students who leave constructive negative reviews.`
  }
];

export default function TutorTermsPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <h1>Tutor Marketplace Agreement</h1>
        <p>
          The authoritative legal contract governing tutor eligibility, pricing autonomy, earnings payouts, independent status, and professional standards on TUTORERA®.
        </p>
      </header>

      <section className={s.container}>
        <div style={{ backgroundColor: "#F8FAFF", border: "1.5px solid #bfdbfe", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <Briefcase size={32} color="#0329B2" />
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#021550", margin: "0 0 0.25rem" }}>
              Independent Educator Partnership
            </h2>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155", lineHeight: 1.65 }}>
              TUTORERA empowers independent tutors with pricing autonomy and global student demand, backed by verified credentials, transparent service fees, and professional safeguarding standards.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {tutorTerms.map((clause) => (
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
            Tutor Verification & Guidance Resources
          </h2>
          <p style={{ color: "#334155", lineHeight: 1.7, fontSize: "0.92rem", marginBottom: "1rem" }}>
            Review our complete screening guidelines and fee structure:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link href="/verification-policy" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Verification & Badging Policy →</Link>
            <Link href="/pricing" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Marketplace Pricing & Fees →</Link>
            <Link href="/child-safety" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Child Safeguarding Policy →</Link>
            <Link href="/terms" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Master Terms of Service →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
