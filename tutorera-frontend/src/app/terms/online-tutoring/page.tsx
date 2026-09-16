import {
  LEGAL_CONTACT_EMAIL,
  SUPPORT_EMAIL,
  TRADING_NAME
} from "@/lib/site";
import {
  Globe2
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import s from "../../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Online Tutoring Master Terms | TUTORERA",
  description: "Terms governing cross-border 1-on-1 live interactive online tutoring, video protocols, technical failure rescheduling, and digital child safeguarding.",
};

const onlineClauses = [
  {
    title: "1. Scope of Online Tutoring",
    content: `Online tutoring on ${TRADING_NAME} connects students with qualified tutors located in the student's country or across international borders. These Online Tutoring Terms supplement our master Global Terms of Service and apply to all digital, video-based, or screen-share tutoring sessions.`
  },
  {
    title: "2. Cross-Border Service & Licensing Clarification",
    content: `Online tutoring enables students worldwide to learn from tutors located in different countries. You acknowledge that educational systems, curricula standards, professional teacher licensing regimes, and academic terminology vary by jurisdiction. TUTORERA verification badges confirm identity, academic credentials, and demo screening, but do NOT represent that a tutor holds a government teaching licence in the student's home jurisdiction unless expressly noted with a certified licence badge.`
  },
  {
    title: "3. Timezones & IANA Time Conversion",
    content: `All session bookings, offer proposals, and reminders are synchronized using standard IANA timezone identifiers (e.g., Asia/Karachi, Asia/Dubai, Europe/London, America/New_York). Both parties must verify their local scheduled time displayed on their dashboard. Missed sessions resulting from user failure to track their local time conversion are treated under standard student or tutor no-show rules.`
  },
  {
    title: "4. Device, Bandwidth & Hardware Standards",
    content: `To ensure productive sessions, both student and tutor must maintain:
• A reliable broadband internet connection (minimum recommended: 10 Mbps download / 5 Mbps upload).
• A desktop, laptop, or tablet device with updated browser software.
• A working microphone, speaker/headset, and webcam.
• A quiet, well-lit, and distraction-free learning environment.`
  },
  {
    title: "5. Virtual Classroom Links & Third-Party Platforms",
    content: `Online sessions may be conducted through TUTORERA's integrated virtual classroom or authorized third-party video conferencing platforms (e.g., Google Meet, Zoom, Microsoft Teams). Access links must be shared exclusively through the platform's secure messaging or booking dashboard. Sharing external links via unauthorized off-platform channels is prohibited.`
  },
  {
    title: "6. Technical Failures & Connectivity Rescheduling",
    content: `In the event of unforeseen internet outages, platform disconnections, or electrical disruptions:
• If connectivity fails within the first 15 minutes of a session and cannot be restored within 10 minutes, the session must be paused and rescheduled for the full duration at no additional cost.
• If connectivity fails after more than 50% of the session has elapsed, the remaining time must be added to a subsequent session or credited proportionately.
• Technical failure claims must be reported within 24 hours to ${SUPPORT_EMAIL}.`
  },
  {
    title: "7. Zero Tolerance for Unauthorized Recording",
    content: `Neither tutors nor students (nor parents) may record, capture, screen-record, or screenshot tutoring sessions without the prior, explicit, written consent of all participating parties. In the case of minor students, written consent from a parent or legal guardian is mandatory. Unauthorized publishing or distribution of session recordings on social media or video platforms constitutes an actionable breach of privacy.`
  },
  {
    title: "8. Screen Sharing, File Transfers & Digital Safety",
    content: `Screen sharing and file exchanges during lessons must be strictly confined to relevant academic materials, textbooks, worksheets, and syllabus exercises. Sharing malware, copyrighted pirated media, inappropriate personal images, or unrelated commercial links will result in immediate permanent banning.`
  },
  {
    title: "9. Academic Integrity & Anti-Cheating Mandate",
    content: `Online tutoring is for instructional support, conceptual understanding, and exam preparation. Tutors are strictly forbidden from:
• Sitting live examinations, quizzes, or tests on behalf of a student.
• Writing graded dissertations, essays, or coursework for student submission as their own work (ghostwriting).
• Completing online homework assignments without student participation.
Violations result in immediate forfeiture of tutor payouts and account termination.`
  },
  {
    title: "10. Digital Child Safeguarding Protocol",
    content: `When tutoring minor students online:
• Tutoring sessions must take place in an open or shared family room where parents can observe, never in a private locked room.
• Tutors must maintain professional attire and appropriate decorum at all times.
• Tutors may never request personal social media contact, private messaging handles, or non-educational personal photos from minor students.
• Any suspicious or inappropriate interaction must be reported immediately to our Safety Team at ${LEGAL_CONTACT_EMAIL}.`
  },
  {
    title: "11. Cross-Border Currency & Payment Snapshots",
    content: `Online session fees are negotiated and agreed in the currency selected during the tuition request. Where currency conversion occurs, the exchange rate snapshot is locked permanently upon offer acceptance to protect both student and tutor from foreign exchange fluctuations.`
  },
  {
    title: "12. Reporting Online Misconduct",
    content: `If you experience harassment, unprofessional behavior, or abusive language during an online lesson, immediately terminate the video call and submit an urgent incident report via your dashboard or by emailing ${SUPPORT_EMAIL}.`
  }
];

export default function OnlineTutoringTermsPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <h1>Online Tutoring Master Terms</h1>
        <p>
          Specialized contractual rules for cross-border 1-on-1 live video tutoring, hardware standards, connectivity rescheduling, and digital safeguarding on TUTORERA®.
        </p>
      </header>

      <section className={s.container}>
        <div style={{ backgroundColor: "#F0FDF4", border: "1.5px solid #bbf7d0", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <Globe2 size={32} color="#16a34a" />
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#166534", margin: "0 0 0.25rem" }}>
              Borderless Global Learning Standard
            </h2>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#14532d", lineHeight: 1.65 }}>
              Online tutoring on TUTORERA transcends geographical borders, connecting students with educators worldwide while upholding strict digital safety, transparent IANA time synchronization, and zero-tolerance academic integrity rules.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {onlineClauses.map((clause) => (
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
            Related Legal Frameworks
          </h2>
          <p style={{ color: "#334155", lineHeight: 1.7, fontSize: "0.92rem", marginBottom: "1rem" }}>
            These Online Tutoring Terms are incorporated into our Master Global Terms of Service.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link href="/terms" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Master Terms of Service →</Link>
            <Link href="/child-safety" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Child Safeguarding Policy →</Link>
            <Link href="/academic-integrity" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Academic Integrity Policy →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
