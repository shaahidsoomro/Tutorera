import {
  BUSINESS_ADDRESS,
  LAST_LEGAL_UPDATE,
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  SUPPORT_EMAIL,
  TERMS_VERSION,
  TRADING_NAME
} from "@/lib/site";
import {
  CheckCircle2,
  FileText,
  Globe2
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Global Terms of Service | TUTORERA",
  description: "Master contractual terms and conditions governing the TUTORERA global tutoring marketplace for students, parents, and tutors.",
};

const keyPointsSummary = [
  { title: "Marketplace Technology Provider", desc: "TUTORERA provides software that connects students/parents with independent tutors. TUTORERA is not a school or employer of every tutor." },
  { title: "Student-Led Economic Model", desc: "Students post requirements and propose budgets; tutors submit offers or counter-offers; final rates are locked only upon student acceptance." },
  { title: "Dual Delivery Modes", desc: "Online tutoring is borderless worldwide; Home tuition is strictly geographically constrained within verified local service areas." },
  { title: "Child Safeguarding by Design", desc: "Minors under 18 require parent or legal guardian participation; under-13 accounts are created and managed exclusively by parents." },
  { title: "Statutory Consumer Rights Preserved", desc: "Nothing in these Terms excludes or limits statutory consumer rights that cannot be waived under applicable local laws." },
  { title: "Anti-Circumvention & Trust", desc: "Off-platform payment circumvention, credential falsification, and academic dishonesty (cheating) are strictly prohibited." },
];

const masterTermsSections = [
  {
    id: "1-introduction",
    title: "1. Introduction & Acceptance",
    content: `Welcome to TUTORERA®. These Global Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and ${LEGAL_ENTITY_NAME}, trading as "${TRADING_NAME}" ("TUTORERA", "we", "us", or "our"). By registering an account, posting a tuition requirement, submitting a tutor offer, or booking a session, you confirm that you have read, understood, and agree to be bound by these Terms and our incorporated policies.`
  },
  {
    id: "2-legal-entity",
    title: "2. Contracting Entity & Corporate Information",
    content: `The contracting platform entity is ${LEGAL_ENTITY_NAME}, a company registered in ${BUSINESS_ADDRESS}. Official legal and regulatory correspondence must be directed to ${LEGAL_CONTACT_EMAIL}.`
  },
  {
    id: "3-definitions",
    title: "3. Definitions & Interpretation",
    content: `In these Terms:
• "Marketplace" means the digital student-led demand and direct-booking platform operated at tutorera.ac.pk and related mobile applications.
• "Student" means an individual or learner receiving educational instruction.
• "Parent/Guardian" means the adult legally responsible for a minor Student.
• "Tutor" means an independent educational provider approved to offer tutoring.
• "Tuition Request" means a student-posted tutoring requirement specifying subject, curriculum, schedule, and proposed budget.
• "Offer / Counter-Offer" means a pricing and availability proposal submitted by a tutor or countered by a student.
• "Booking" means a confirmed tutoring engagement created upon student acceptance of a final locked rate.`
  },
  {
    id: "4-eligibility",
    title: "4. User Eligibility & Jurisdiction",
    content: `You must be of legal age to form a binding contract under the laws of your jurisdiction. TUTORERA operates subject to applicable laws in the jurisdictions in which its services are offered. Access to the Marketplace is void where prohibited by applicable local law or international sanctions.`
  },
  {
    id: "5-age-requirements",
    title: "5. Age Requirements & Minor Safeguarding",
    content: `Users must be at least 18 years old (or the age of majority in their jurisdiction) to create an independent account. Minor students between 13 and 17 may use the platform only with the verified consent and active supervision of a Parent or Legal Guardian. Children under 13 must be registered through a Parent Account.`
  },
  {
    id: "6-parent-accounts",
    title: "6. Parent & Guardian Managed Accounts",
    content: `Parents creating accounts on behalf of their children are directly responsible for reviewing tutor credentials, monitoring communications, approving payment obligations, and supervising tutoring sessions in accordance with our Child Safety Policy.`
  },
  {
    id: "7-student-accounts",
    title: "7. Student Accounts & Responsibilities",
    content: `Students agree to provide accurate academic grade, curriculum, and learning objective details, communicate respectfully with tutors, and adhere strictly to academic integrity standards.`
  },
  {
    id: "8-tutor-accounts",
    title: "8. Tutor Registration & Professional Warranties",
    content: `Tutors warrant that all academic degrees, certifications, government identity documents, experience records, and bio descriptions submitted are genuine, accurate, and current. Submitting forged or misleading credentials will result in immediate permanent termination and referral to authorities.`
  },
  {
    id: "9-account-registration",
    title: "9. Account Security & Credentials",
    content: `You are solely responsible for maintaining the confidentiality of your login credentials. You must notify TUTORERA immediately at ${SUPPORT_EMAIL} if you suspect unauthorized access to your account.`
  },
  {
    id: "10-accuracy",
    title: "10. Accuracy of Information & Continuous Updates",
    content: `All users must keep their profile, contact details, location, and payment details accurate. Tutors must immediately update their availability calendar to prevent booking conflicts.`
  },
  {
    id: "11-country-availability",
    title: "11. Country Availability & Soft Launch Model",
    content: `Features vary by jurisdiction. Certain countries support borderless online tutoring but not in-person home tutoring; payment options and tax rules are configured on a jurisdiction-by-jurisdiction basis. TUTORERA does not warrant that all platform features are functional in all territories.`
  },
  {
    id: "12-marketplace-role",
    title: "12. Platform Marketplace Role & Technology Facilitation",
    content: `TUTORERA provides the communication and transaction technology that enables students, parents, and tutors to discover one another, negotiate rates, coordinate schedules, and process payments. TUTORERA does not provide educational curriculum directly and is not an accredited educational institution.`
  },
  {
    id: "13-independent-relationship",
    title: "13. Independent Contractor Status of Tutors",
    content: `Tutors are independent contractors and service providers. Tutors are not employees, partners, agents, or joint venturers of TUTORERA. Tutors independently determine whether to submit offers, set their rates, select their teaching materials, and manage their teaching schedule.`
  },
  {
    id: "14-student-tutor-contract",
    title: "14. Student-Tutor Direct Educational Agreement",
    content: `Upon student acceptance of a tutor's offer or direct booking, a direct agreement for educational services is formed between the student (or parent) and the tutor. TUTORERA is not a party to that educational agreement, although it facilitates payment, dispute mediation, and quality guarantees.`
  },
  {
    id: "15-tuition-requests",
    title: "15. Student Tuition Requests & Proposed Rates",
    content: `Students initiate the marketplace process by posting a tuition request detailing their subject, academic level, mode (online, home, or either), schedule, and proposed budget. Posting a request does not obligate the student to book any tutor.`
  },
  {
    id: "16-tutor-offers",
    title: "16. Tutor Offers & Bids",
    content: `Verified tutors may review open student requests and submit offers matching or countering the student's proposed budget. Tutors must honor the price and schedule terms submitted in their offer.`
  },
  {
    id: "17-counter-offers",
    title: "17. Counter-Offers & Transparent Negotiation",
    content: `Where counter-offers are enabled on a request, both parties may negotiate price and scheduling transparently within platform limits (up to 3 counter-offer rounds). Counter-offers expire after 48 hours if unaccepted.`
  },
  {
    id: "18-negotiation-conduct",
    title: "18. Fair Negotiation Standards",
    content: `Negotiation must be conducted in good faith. Tutors and students may not use abusive language, engage in coercive rate adjustments, or attempt to extract off-platform payments during negotiation.`
  },
  {
    id: "19-agreed-rates",
    title: "19. Locked Final Agreed Rate",
    content: `Once a student accepts an offer or counter-offer, the agreed rate and currency are permanently locked for the duration of that tutoring booking. Neither party may retroactively adjust rates without mutual written consent through platform support.`
  },
  {
    id: "20-direct-bookings",
    title: "20. Direct Tutor Booking Workflow",
    content: `Students may choose to book verified tutors directly from the public tutor directory based on the tutor's advertised hourly rate, bypassing the tuition request wizard.`
  },
  {
    id: "21-invitations",
    title: "21. Tutor Invitations to Requests",
    content: `Students browsing the directory may invite specific tutors to submit an offer for their active or newly composed tuition request.`
  },
  {
    id: "22-platform-fees",
    title: "22. Platform Marketplace Fees",
    content: `Students currently pay 0% platform marketplace fee on tutoring sessions. Tutors pay a service fee deducted from the gross booking value (currently configured at 20% plus applicable local sales tax/GST on the fee). The exact fee breakdown is presented clearly prior to booking confirmation.`
  },
  {
    id: "23-taxes",
    title: "23. Taxes & Local Statutory Obligations",
    content: `Users are responsible for any personal income tax, value-added tax, sales tax, or social contributions arising from their tutoring earnings or purchases. TUTORERA collects and remits indirect taxes where legally required by applicable jurisdiction.`
  },
  {
    id: "24-currency",
    title: "24. Supported Currencies & ISO Standard",
    content: `TUTORERA operates in multiple global currencies (including PKR, USD, AED, GBP, EUR, SAR, CAD, AUD). All requests and offers declare their operating ISO 4217 currency code.`
  },
  {
    id: "25-fx-conversion",
    title: "25. Foreign Exchange Conversion & Snapshots",
    content: `When a tutor quotes in a currency different from the student's request currency, TUTORERA displays an estimated converted rate based on prevailing market FX rates. Once an offer is accepted, the currency exchange rate snapshot is locked permanently for that transaction.`
  },
  {
    id: "26-payment-processing",
    title: "26. Payment Processing & Authorized Gateways",
    content: `Payments are processed through PCI-DSS compliant third-party payment providers (such as Stripe, Paymob, or regional banking partners). TUTORERA never stores raw credit or debit card numbers on its servers.`
  },
  {
    id: "27-tutor-payouts",
    title: "27. Tutor Payouts & Settlement Timing",
    content: `Tutor earnings are released following successful completion of the scheduled session or billing cycle, less applicable marketplace fees. Payouts are made to the tutor's verified bank account or digital payment provider within standard platform settlement cycles (typically 3–5 business days).`
  },
  {
    id: "28-refunds",
    title: "28. Refund Policy & First-Session Guarantee",
    content: `Refunds are processed in accordance with our published Refund Policy. Under our First-Session Guarantee, students dissatisfied with their first lesson with a new tutor may submit a claim within 48 hours for a credit or refund.`
  },
  {
    id: "29-cancellations",
    title: "29. Cancellation Notice Windows",
    content: `Sessions cancelled by students with at least 12 hours notice receive a full rescheduling credit. Cancellations made with less than 4 hours notice may incur a cancellation fee to compensate the tutor for reserved time.`
  },
  {
    id: "30-rescheduling",
    title: "30. Mutual Rescheduling Protocol",
    content: `Students and tutors may mutually agree to reschedule a session via platform messaging without penalty, provided the rescheduled slot is confirmed at least 2 hours before the original start time.`
  },
  {
    id: "31-no-shows",
    title: "31. No-Show Policies",
    content: `If a tutor fails to attend a scheduled session within 15 minutes of the start time without prior notice, the student receives an immediate 100% refund or credit, and the tutor's reliability score is penalized. Repeated tutor no-shows lead to profile suspension.`
  },
  {
    id: "32-disputes",
    title: "32. Dispute Resolution & Mediation",
    content: `Disputes regarding lesson quality, attendance, or billing must be submitted through our Dispute Center within 7 calendar days of the session. TUTORERA investigates records, chat history, and evidence to reach an equitable resolution.`
  },
  {
    id: "33-home-tuition",
    title: "33. In-Person Home Tuition Terms",
    content: `Physical home tutoring involves distinct safety and location obligations. In-person tutoring is governed additionally by our Home Tuition Terms. Exact residential addresses are shared only after booking confirmation.`
  },
  {
    id: "34-online-tutoring",
    title: "34. Borderless Online Tutoring Terms",
    content: `Online tutoring allows students to learn from qualified tutors across international borders. Users must maintain stable internet connectivity, compatible devices, and respect cross-border timezone differences.`
  },
  {
    id: "35-tutor-verification",
    title: "35. Tutor Verification Scope & Disclaimers",
    content: `Verification badges (Identity Verified, Education Verified, Demo Video Screened) confirm that TUTORERA reviewed submitted documents against standard screening criteria. Verification is not an absolute guarantee of character, pedagogical skill, or future performance.`
  },
  {
    id: "36-background-checks",
    title: "36. Background & Police Checks",
    content: `Where required by local jurisdiction or platform policy for home tutoring, background checks are performed by approved government registries or accredited third-party screening agencies. Background checks represent a snapshot in time and are not an infallible guarantee.`
  },
  {
    id: "37-reviews",
    title: "37. Verified Student Reviews",
    content: `Only students who have completed and paid for sessions with a tutor may submit verified reviews. Fake, retaliatory, incentivized, or abusive reviews are removed under our Review Policy.`
  },
  {
    id: "38-messaging",
    title: "38. Platform Messaging & Communication Privacy",
    content: `Users must conduct tutoring discussions through the platform's messaging system. Automated moderation tools screen messages to detect spam, abusive language, fraud, and off-platform payment attempts.`
  },
  {
    id: "39-prohibited-conduct",
    title: "39. Prohibited Platform Conduct",
    content: `Users may not: (a) harass, stalk, or discriminate against others; (b) share sexually explicit, threatening, or illegal materials; (c) attempt unauthorized platform access or reverse-engineer software; (d) misrepresent credentials or qualifications.`
  },
  {
    id: "40-anti-circumvention",
    title: "40. Anti-Circumvention Policy",
    content: `Users introduced through TUTORERA must process all bookings and payments through the platform for a minimum period of 12 months from introduction. Bypassing platform payments deprives users of platform payment records, first-session guarantees, dispute mediation, and official support protections, and may result in account termination.`
  },
  {
    id: "41-intellectual-property",
    title: "41. Platform Intellectual Property",
    content: `All trademarks, logos, visual designs, software code, algorithm models, and proprietary content on TUTORERA are the intellectual property of ${LEGAL_ENTITY_NAME} or its licensors. Unauthorized reproduction is strictly prohibited.`
  },
  {
    id: "42-user-content",
    title: "42. User-Generated Content & Limited Licence",
    content: `You retain ownership of the bios, profile photos, reviews, and learning materials you upload. By posting content, you grant TUTORERA a non-exclusive, worldwide, royalty-free licence to display and process that content strictly to operate and promote the Marketplace.`
  },
  {
    id: "43-tutor-materials",
    title: "43. Tutor Educational Materials & Copyright",
    content: `Tutors warrant that any worksheets, slides, or notes shared during tutoring do not infringe third-party copyrights and adhere to academic fair-use standards.`
  },
  {
    id: "44-session-recording",
    title: "44. Session Recording Protocol",
    content: `Lessons may not be recorded by either student or tutor without the explicit prior written consent of all participants (and parent/guardian consent for minor students). Unauthorized recording or redistribution of tutoring sessions violates personal privacy and will result in legal action.`
  },
  {
    id: "45-ai-features",
    title: "45. AI-Assisted Features & Algorithm Transparency",
    content: `TUTORERA uses algorithmic compatibility models (such as Match Score) to assist discovery. These algorithms analyze subject, curriculum, timezone, and budget parameters. Students retain complete autonomy to select any tutor of their choice.`
  },
  {
    id: "46-platform-availability",
    title: "46. Platform Availability & Maintenance",
    content: `TUTORERA strives for 99.9% system availability but does not warrant uninterrupted service. Periodic maintenance and third-party hosting disruptions may occasionally affect access.`
  },
  {
    id: "47-suspension",
    title: "47. Account Suspension & Investigation",
    content: `TUTORERA reserves the right to temporarily suspend accounts during ongoing investigations into safety complaints, fraudulent payment attempts, credential disputes, or terms violations.`
  },
  {
    id: "48-termination",
    title: "48. Termination by Platform or User",
    content: `You may close your account at any time, provided all outstanding sessions and payments are reconciled. TUTORERA may terminate accounts for severe or repeated breaches of these Terms.`
  },
  {
    id: "49-account-deletion",
    title: "49. Account Deletion & Right to be Forgotten",
    content: `Users may initiate self-serve account deletion via our Privacy Center. Personal identifying information is purged or anonymized within 30 days, except records required for tax, accounting, or ongoing legal defense.`
  },
  {
    id: "50-limitation-of-liability",
    title: "50. Limitation of Platform Liability",
    content: `To the maximum extent permitted by applicable law, TUTORERA and its directors, officers, and employees shall not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or academic results. Nothing in these Terms excludes liability for gross negligence, willful misconduct, or fraud, or statutory obligations that cannot be lawfully excluded.`
  },
  {
    id: "51-indemnification",
    title: "51. Indemnification Where Permissible",
    content: `Where permitted by applicable law, you agree to indemnify and hold harmless TUTORERA from claims, damages, and reasonable legal fees arising from your breach of these Terms, unlawful conduct, or infringement of third-party rights.`
  },
  {
    id: "52-statutory-rights",
    title: "52. Preservation of Consumer Statutory Rights",
    content: `Nothing in these Terms excludes, restricts, or modifies any consumer guarantee, right, or remedy conferred by applicable mandatory laws in your country of residence that cannot be excluded by agreement.`
  },
  {
    id: "53-governing-law",
    title: "53. Base Governing Law & Dispute Forum",
    content: `Subject to mandatory local consumer protection and data privacy legislation, these Terms are governed by the laws of Pakistan. For users residing in jurisdictions granting non-waivable rights to local courts, disputes may be submitted to the competent court in the user's country of domicile.`
  },
  {
    id: "54-country-schedules",
    title: "54. Country-Specific Supplemental Schedules",
    content: `Jurisdiction-specific statutory overrides (including local age requirements, tax notices, and regulatory disclosures for Pakistan, UAE, UK, US, and Saudi Arabia) are set forth in our Country Legal Schedules and take precedence over conflicting general terms.`
  },
  {
    id: "55-changes-to-terms",
    title: "55. Amendments & Notice of Changes",
    content: `We may modify these Terms periodically. For material changes, we will provide at least 15 days notice via email or platform notification. Continued use of the platform after effective updates constitutes acceptance of the revised Terms.`
  },
  {
    id: "56-contact",
    title: "56. Official Compliance Contact Information",
    content: `For questions, legal notices, or compliance inquiries, contact:
${LEGAL_ENTITY_NAME}
Registered Address: ${BUSINESS_ADDRESS}
Legal Email: ${LEGAL_CONTACT_EMAIL}
Support Email: ${SUPPORT_EMAIL}`
  }
];

export default function GlobalTermsPage() {
  return (
    <div className={s.page}>
      <header className={s.hero}>
        <h1>TUTORERA Global Terms of Service</h1>
        <p>
          The master contractual agreement governing platform access, student demand requests, tutor offers, bookings, and payments across all supported jurisdictions.
        </p>
      </header>

      <section className={s.container}>
        {/* Framework Header Card */}
        <div style={{ backgroundColor: "#F8FAFF", border: "1.5px solid #E2E8F0", borderRadius: 20, padding: "1.75rem", marginBottom: "3rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0329B2" }}>
                Active Global Framework
              </span>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#021550", margin: "0.25rem 0" }}>
                Contractual Master Agreement ({TERMS_VERSION})
              </h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Effective: {LAST_LEGAL_UPDATE}</div>
              <div style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 700 }}>✓ Multi-Jurisdiction Ready</div>
            </div>
          </div>
          <p style={{ fontSize: "0.92rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>
            Operated by <strong>{LEGAL_ENTITY_NAME}</strong> ("{TRADING_NAME}"). This agreement establishes one global legal framework with country-specific schedules to comply with local laws in each territory where TUTORERA operates.
          </p>
        </div>

        {/* Plain Language Key Points Summary */}
        <div style={{ marginBottom: "3.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <FileText size={20} color="#0329B2" />
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#021550", margin: 0 }}>
              Plain-Language Key Points Summary
            </h2>
          </div>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.25rem" }}>
            This summary is provided for convenience. The complete numbered clauses below constitute the authoritative legal agreement.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {keyPointsSummary.map((item) => (
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

        {/* Quick Links to Specialized Terms */}
        <div style={{ backgroundColor: "#EEF5FF", border: "1px solid #bfdbfe", borderRadius: 16, padding: "1.25rem 1.5rem", marginBottom: "3.5rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Globe2 size={24} color="#0329B2" />
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#021550" }}>Looking for specialized terms?</div>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>Specific service delivery and user role contracts supplement these master terms.</div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Link href="/terms/online-tutoring" style={{ fontSize: "0.8rem", fontWeight: 700, backgroundColor: "#fff", color: "#0329B2", border: "1px solid #bfdbfe", padding: "0.4rem 0.8rem", borderRadius: 8, textDecoration: "none" }}>
              Online Terms →
            </Link>
            <Link href="/terms/home-tuition" style={{ fontSize: "0.8rem", fontWeight: 700, backgroundColor: "#fff", color: "#0329B2", border: "1px solid #bfdbfe", padding: "0.4rem 0.8rem", borderRadius: 8, textDecoration: "none" }}>
              Home Tuition Terms →
            </Link>
            <Link href="/terms/tutors" style={{ fontSize: "0.8rem", fontWeight: 700, backgroundColor: "#fff", color: "#0329B2", border: "1px solid #bfdbfe", padding: "0.4rem 0.8rem", borderRadius: 8, textDecoration: "none" }}>
              Tutor Agreement →
            </Link>
            <Link href="/terms/students" style={{ fontSize: "0.8rem", fontWeight: 700, backgroundColor: "#fff", color: "#0329B2", border: "1px solid #bfdbfe", padding: "0.4rem 0.8rem", borderRadius: 8, textDecoration: "none" }}>
              Student/Parent Terms →
            </Link>
          </div>
        </div>

        {/* Numbered Master Terms Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {masterTermsSections.map((sec) => (
            <article key={sec.id} id={sec.id} className={s.card} style={{ scrollMarginTop: "100px" }}>
              <h2 style={{ fontSize: "1.18rem", fontWeight: 800, color: "#021550", marginBottom: "0.75rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
                {sec.title}
              </h2>
              <div style={{ fontSize: "0.95rem", color: "#1e293b", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {sec.content}
              </div>
            </article>
          ))}
        </div>

        {/* Country Schedules Notice */}
        <div className={s.infoBox} style={{ marginTop: "3.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
            Jurisdiction Schedules & Local Consumer Protections
          </h2>
          <p style={{ color: "#334155", lineHeight: 1.75, fontSize: "0.925rem" }}>
            If you reside in Pakistan, the United Arab Emirates, the United Kingdom, the United States, or Saudi Arabia, your relationship with TUTORERA is also governed by the applicable <Link href="/legal" style={{ color: "#0329B2", fontWeight: 700 }}>Country Legal Schedule</Link>, which contains mandatory statutory disclosures, consumer complaint procedures, and dispute resolution venues.
          </p>
        </div>
      </section>
    </div>
  );
}
