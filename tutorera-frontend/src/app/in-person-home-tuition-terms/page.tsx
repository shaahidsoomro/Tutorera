import TrustArticle from "@/components/TrustArticle";
import { SUPPORT_EMAIL } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "In-Person / Home Tuition Terms",
  description: "Terms for TUTORERA in-person and home tuition, including police verification, safeguarding, tutor conduct, incident reporting, and responsibility allocation.",
  alternates: { canonical: "/in-person-home-tuition-terms" },
};

const sections = [
  {
    heading: "1. What in-person / home tuition means",
    body: "In-person or home tuition means tutoring where a tutor and student physically meet at an agreed lawful location for educational support. This may include a student's home, parent or guardian residence, educational institution, library, co-working space, study facility, or another mutually agreed physical location. Home tuition and in-person tuition are treated as the same service category on TUTORERA.",
  },
  {
    heading: "2. Tutors are independent service providers",
    body: "Tutors who provide in-person or home tuition through TUTORERA act as independent service providers. They are not employees, agents, representatives, partners, or joint venture partners of TUTORERA or MENTISERA merely because they use the platform. TUTORERA provides marketplace technology, verification workflows, booking records, payment facilitation, communication tools, support, and governance; the selected tutor independently delivers the tutoring service.",
  },
  {
    heading: "3. Mandatory background & character verification",
    body: "Any tutor who wishes to offer in-person or home tuition must satisfy mandatory background screening requirements applicable to their jurisdiction (such as a Police Character Certificate or verified government background screening check) before becoming eligible for in-person bookings. This applies regardless of qualifications, experience, professional status, age, gender, or tutoring history.",
    items: [
      "TUTORERA may block in-person availability until satisfactory documentation is reviewed.",
      "Online-only tutors may have different verification requirements.",
      "An online booking must not be converted into an in-person arrangement unless the tutor has completed the required in-person verification.",
    ],
  },
  {
    heading: "4. Verification documents and authenticity",
    body: "TUTORERA may require government identity documents (such as CNIC, Emirates ID, Passport, or Driver's Licence), recent photograph, police verification or background certificate, verified address, education credentials, and other reasonable identity or safety information. Tutors are responsible for ensuring all documents are genuine, legally obtained, accurate, valid, current, unaltered, and issued by the appropriate authority.",
    items: [
      "False, forged, altered, stolen, or misleading documents may result in immediate suspension or permanent removal.",
      "TUTORERA may request renewal or resubmission where documents expire, appear uncertain, personal details change, a safety complaint is received, policy requires re-verification, or legal requirements change.",
      "Where appropriate, suspected document fraud may be preserved and referred to competent authorities.",
    ],
  },
  {
    heading: "5. Verification reduces risk but is not an absolute guarantee",
    body: "Background verification is a risk-management and eligibility requirement. It does not guarantee future conduct, teaching outcomes, legal compliance, or that misconduct will never occur. Tutors remain personally responsible for their behaviour, actions, omissions, statements, and activities during every in-person visit.",
  },
  {
    heading: "6. Tutor conduct at student premises",
    body: "A tutor attending a student's residence or another agreed physical location must act professionally, follow applicable laws in their jurisdiction, comply with TUTORERA policies, respect safeguarding requirements, observe reasonable household rules, and protect student privacy.",
    items: [
      "Tutors must remain within areas reasonably designated for tutoring.",
      "Tutors must avoid unnecessary physical contact, harassment, discrimination, threats, offensive conduct, sexual conduct, intoxicants, illegal substances, unauthorized photography, and unauthorized recording.",
      "Tutors must leave the premises when lawfully requested by the student, parent, or guardian.",
    ],
  },
  {
    heading: "7. Property, privacy, and restricted areas",
    body: "Tutors may access only those areas reasonably necessary for the tutoring session. Without explicit permission, tutors must not access bedrooms, cupboards, drawers, personal files, devices, storage areas, private offices, financial documents, personal belongings, or other restricted areas. Theft, property damage, misuse, borrowing, or removal of household property without authorization is serious misconduct.",
  },
  {
    heading: "8. Safeguarding of minors",
    body: "Where a student is under 18, a parent or guardian is responsible for authorizing the in-person tutoring arrangement. A responsible adult should ordinarily remain present or reasonably accessible, and tutoring should normally occur in an appropriate and reasonably observable study area such as a drawing room, study room, dining area, family room, or other suitable teaching space.",
    items: [
      "Tutors must maintain strict professional boundaries with minors.",
      "Tutors must not ask a minor student to conceal communication or meetings from a parent or guardian.",
      "Administrative communication involving minors should, where reasonably practical, include or remain visible to the parent or guardian.",
    ],
  },
  {
    heading: "9. Zero tolerance for sexual misconduct and abuse",
    body: "TUTORERA maintains zero tolerance for sexual harassment, grooming, sexual exploitation, sexual advances, requests for intimate images, inappropriate touching, sexual comments toward students, attempts to arrange inappropriate private meetings with minors, or inappropriate relationships arising from tutoring. Where reasonably supported by evidence, such conduct may result in immediate suspension, permanent removal, and reporting to competent authorities.",
  },
  {
    heading: "10. Parent, guardian, and household responsibility",
    body: "Parents and guardians retain responsibility for reasonable supervision of minors and for providing a suitable and reasonably safe physical tutoring environment. Families should review the tutor profile, check displayed verification status, confirm that the arriving person matches the booked tutor, maintain appropriate adult supervision, and promptly report suspicious behaviour.",
  },
  {
    heading: "11. Tutor identity at arrival",
    body: "The person attending the session must be the tutor whose profile was selected and booked. A tutor must not send a friend, colleague, relative, assistant, replacement teacher, or subcontractor without prior approval from the student or parent and, where required, TUTORERA. Entry may be refused if the person arriving does not reasonably match the booked tutor.",
  },
  {
    heading: "12. Unsafe conditions for tutors",
    body: "Students, parents, and household members also owe basic safety and respect to tutors. A tutor may refuse to enter or may leave a location where there is a reasonable concern about violence, harassment, weapons, uncontrolled dangerous animals, illegal activity, intoxicated or threatening persons, serious health or safety hazards, or a materially different undisclosed location.",
  },
  {
    heading: "13. Misconduct, criminal conduct, and platform action",
    body: "Alleged unlawful, negligent, abusive, inappropriate, fraudulent, dangerous, or unauthorized conduct remains attributable to the individual responsible, subject to evidence and applicable law. If an offence or serious incident is suspected, affected persons should contact relevant police or emergency authorities where required. TUTORERA may suspend access, restrict in-person privileges, preserve records, review complaints, request re-verification, and cooperate with lawful requests.",
  },
  {
    heading: "14. Off-platform in-person arrangements",
    body: "If users deliberately arrange in-person or home tuition outside TUTORERA after connecting through the platform, TUTORERA may be unable to verify the booking, verify payment, maintain session records, investigate disputes effectively, apply platform refund protections, or provide transaction evidence. Unauthorized off-platform transactions are outside normal platform protections except where applicable law expressly provides otherwise.",
  },
  {
    heading: "15. Responsibility allocation and indemnification",
    body: "TUTORERA is responsible for operating and administering the digital marketplace. The tutor is responsible for the tutoring service and their personal conduct while providing that service. The student, parent, or guardian is responsible for the suitability and reasonable safety of the physical location provided for an in-person session. To the maximum extent permitted by law, tutors are responsible for claims arising directly from their unlawful conduct, intentional misconduct, fraud, theft, harassment, property damage, negligence, safeguarding violations, rights infringements, or material breach of these terms.",
  },
  {
    heading: "16. Reporting serious incidents",
    body: `Users should promptly report serious incidents involving a TUTORERA booking, including violence, harassment, theft, property damage, safeguarding concerns, inappropriate contact, fraud, threats, or criminal activity. Reports may be sent to ${SUPPORT_EMAIL}. In emergencies or suspected criminal activity, users should contact police or emergency authorities rather than relying only on TUTORERA support.`,
  },
  {
    heading: "17. Tutor acceptance",
    body: "By activating in-person or home tuition on TUTORERA, the tutor acknowledges that police verification is mandatory, submitted documents must be genuine, the tutor acts independently, the tutor remains personally responsible for their behaviour, platform policies and applicable law must be followed, student property and privacy must be respected, safeguarding requirements apply, and serious safety or misconduct concerns may lead to immediate restriction or suspension.",
  },
];

export default function InPersonHomeTuitionTermsPage() {
  return (
    <>
      <TrustArticle
        title="In-Person / Home Tuition Terms"
        path="/in-person-home-tuition-terms"
        intro="These terms explain how TUTORERA handles in-person and home tuition, including police verification, safety expectations, platform responsibility, tutor conduct, and incident reporting."
        updated="3 September 2026"
        sections={sections}
      />
      <nav aria-label="Related safety and marketplace policies" style={{ maxWidth: 820, margin: "-3rem auto 5rem", padding: "0 1.5rem", display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
        <Link href="/terms" style={relatedLink}>Terms & Conditions</Link>
        <Link href="/safety-policy" style={relatedLink}>Safety Policy</Link>
        <Link href="/tutor-verification-standards" style={relatedLink}>Tutor Verification Standards</Link>
        <Link href="/complaint-process" style={relatedLink}>Complaint Process</Link>
      </nav>
    </>
  );
}

const relatedLink = {
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 .95rem",
  borderRadius: 999,
  color: "#1d4ed8",
  background: "#EEF5FF",
  border: "1px solid #bfdbfe",
  fontWeight: 800,
  textDecoration: "none",
} as const;
