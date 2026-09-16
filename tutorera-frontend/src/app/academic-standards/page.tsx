import TrustArticle from "@/components/TrustArticle";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Academic Standards", description: "The information and conduct expected from tutors offering lessons through TUTORERA.", alternates: { canonical: "/academic-standards" } };
export default function Page() { return <TrustArticle title="Academic Standards" path="/academic-standards" intro="TUTORERA expects tutors to represent their qualifications accurately, teach within their stated competence, and support honest learning." sections={[
  { heading: "Accurate qualifications", body: "Tutors must provide accurate education, experience, subject, and level information. They must not claim credentials, affiliations, results, or expertise they do not possess." },
  { heading: "Appropriate teaching practice", body: "Tutors should agree learning goals with the student, prepare for sessions, explain concepts at the student's level, and provide constructive feedback without discrimination or humiliation." },
  { heading: "Academic integrity", body: "Tutoring should help students learn. Tutors must not impersonate students, complete assessed work dishonestly, facilitate cheating, or misrepresent a student's work as their own." },
  { heading: "Professional boundaries", body: "Tutors must follow the safety policy, protect student information, keep communication professional, and use platform reporting channels when a safeguarding concern arises." },
  { heading: "Feedback and enforcement", body: "Completed-booking reviews contribute to tutor reputation. Reports of inaccurate credentials, unsafe conduct, or serious academic misconduct may lead to review, restriction, suspension, or removal." },
]} />; }
