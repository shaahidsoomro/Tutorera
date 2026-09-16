import {
  LEGAL_CONTACT_EMAIL,
  TRADING_NAME
} from "@/lib/site";
import {
  ShieldCheck
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import s from "../../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Home & In-Person Tuition Terms | TUTORERA",
  description: "Contractual safety standards, address privacy, background verification, travel rules, and safeguarding policies for in-person home tutoring.",
};

const homeTuitionClauses = [
  {
    title: "1. Scope & Geographically Constrained Matching",
    content: `In-person and home tuition on ${TRADING_NAME} involves physical instruction conducted at a student's residence, a tutor's study studio, or a designated local public learning space. Unlike online tutoring, home tuition is strictly constrained geographically: matching is restricted to tutors authorized to operate within the specific country, city, and verified service radius of the student.`
  },
  {
    title: "2. Address Privacy & Location Discovery Hierarchy",
    content: `To protect student and family privacy:
• Public tuition requests and browse views reveal only the student's country, city, and approximate neighborhood/district.
• Exact residential addresses, house numbers, and precise street locations are NEVER displayed publicly or shared with unmatched tutors.
• A student's complete street address is shared with a tutor only AFTER a booking is mutually accepted and confirmed on the platform.`
  },
  {
    title: "3. Tutor Screening & Verification Prerequisites",
    content: `Before being eligible to receive in-person tuition requests or submit home tuition offers, tutors must satisfy platform screening standards:
• Government-Issued Identity Verification (e.g., CNIC, Emirates ID, Passport, Driver's Licence depending on country).
• Verified Academic Credentials (university degree or transcript review).
• Background and police character verification where mandated by applicable country regulations or platform policy.
TUTORERA does not warrant that background checks eliminate all personal risk; families are encouraged to exercise prudent parental supervision.`
  },
  {
    title: "4. Mandatory Parent / Guardian Presence for Minors",
    content: `Where in-person tutoring is provided to a student under 18 years of age:
• An adult parent, legal guardian, or designated family caregiver (aged 18 or older) MUST be physically present on the premises for the entire duration of every tutoring session.
• Tutoring must take place in an open, visible common room (such as a living room, dining area, or study room with an open door)—NEVER in a closed, locked bedroom.
• If a tutor arrives at a home and no adult guardian is present, the tutor is instructed to decline entry, remain outside, and contact platform support immediately.`
  },
  {
    title: "5. Tutor Travel Radius, Commuting & Travel Fees",
    content: `Tutors define their maximum travel radius (in kilometers) from their base location. All travel fees, commuting allowances, or fuel supplements must be disclosed and agreed upon as part of the total booking rate prior to confirmation. Tutors may not demand unexpected cash travel payments upon arrival at the home.`
  },
  {
    title: "6. Late Arrival & Session Completion",
    content: `Both parties must honor the agreed schedule:
• Tutors delayed by traffic or transit must notify the student/parent via platform messaging as soon as possible.
• If a tutor arrives late, the missed time must be made up at the end of the session or credited to a future session.
• If a student is unavailable upon the tutor's arrival, the tutor must wait at least 20 minutes before departing. Departures after 20 minutes of unanswered arrival are billed under standard student no-show rules.`
  },
  {
    title: "7. Strict Prohibition of Dangerous & Inappropriate Conduct",
    content: `The following are strictly prohibited on or near the premises during tutoring:
• Possession of weapons, firearms, or hazardous materials.
• Consumption, possession, or influence of alcohol, illegal narcotics, or non-prescribed controlled substances.
• Any form of physical, verbal, sexual, or psychological harassment, abuse, or intimidation.
• Introduction of unauthorized third-party guests or family members into the lesson without prior mutual agreement.
Violations result in immediate session termination, permanent platform banning, and reporting to law enforcement.`
  },
  {
    title: "8. Property Respect & Safety Standards",
    content: `Tutors and students must treat residential property with care and respect. TUTORERA is not directly liable for accidental property damage or personal belongings; users are advised to maintain standard home insurance coverage.`
  },
  {
    title: "9. Recording in Private Residences",
    content: `Recording audio or video inside a private residence during tutoring is prohibited unless all adults present (and the student's legal guardian) have provided explicit written consent. Home security cameras located in common areas are permitted provided the tutor is notified of their presence upon entry.`
  },
  {
    title: "10. Incident Reporting & Emergency Protocol",
    content: `In the event of an immediate medical emergency, fire, physical threat, or criminal conduct, call your local emergency services (e.g., 15 in Pakistan, 999 in the UAE/UK, 911 in the US) immediately. Once safety is secured, file an urgent incident report with our Safety Team at ${LEGAL_CONTACT_EMAIL}.`
  },
  {
    title: "11. Platform Facilitation Role & Balanced Liability",
    content: `TUTORERA acts as a technology intermediary facilitating discovery, verification review, offer exchange, and payment records. TUTORERA maintains rigorous verification standards and safety reporting protocols. However, TUTORERA does not control the physical premises or daily actions of independent tutors or families. To the extent permitted by applicable law, liability is limited in accordance with Section 50 of our master Global Terms of Service.`
  },
  {
    title: "12. Country-Specific In-Person Rules",
    content: `In-person tutoring requirements and background check policies vary by jurisdiction. For example, in Pakistan, tutors providing home tuition may be required to furnish local police character certificates; in the UAE, local tutoring regulations apply. Consult our Country Legal Schedules for local details.`
  }
];

export default function HomeTuitionTermsPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <h1>Home & In-Person Tuition Terms</h1>
        <p>
          Essential safety standards, address privacy protocols, background screening disclosures, guardian supervision rules, and emergency guidelines for in-person tutoring on TUTORERA®.
        </p>
      </header>

      <section className={s.container}>
        <div style={{ backgroundColor: "#FDF4FF", border: "1.5px solid #f5d0fe", borderRadius: 16, padding: "1.5rem", marginBottom: "3rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <ShieldCheck size={32} color="#a855f7" />
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#7e22ce", margin: "0 0 0.25rem" }}>
              Physical Safety & Address Privacy by Design
            </h2>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#581c87", lineHeight: 1.65 }}>
              Home tuition brings educators directly into your home. TUTORERA protects exact street addresses until booking confirmation, mandates adult guardian presence for minor students, and enforces strict background verification standards.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {homeTuitionClauses.map((clause) => (
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
            Related Safety & Legal Documentation
          </h2>
          <p style={{ color: "#334155", lineHeight: 1.7, fontSize: "0.92rem", marginBottom: "1rem" }}>
            These Home Tuition Terms form a binding part of our Master Global Terms of Service.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link href="/terms" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Master Terms of Service →</Link>
            <Link href="/safety" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Safety Center →</Link>
            <Link href="/child-safety" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Child Safeguarding Policy →</Link>
            <Link href="/background-check-policy" style={{ color: "#0329B2", fontWeight: 700, fontSize: "0.85rem" }}>Background Check Policy →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
