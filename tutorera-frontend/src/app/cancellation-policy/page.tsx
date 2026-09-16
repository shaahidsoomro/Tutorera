import { BUSINESS_ADDRESS,LEGAL_OPERATOR,SUPPORT_EMAIL } from "@/lib/site";
import type { Metadata } from "next";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "Read TUTORERA's booking cancellation, no-show, refund, and dispute policy.",
  alternates: { canonical: "/cancellation-policy" },
};

const sections = [
  { title: "Cancellation by Student", content: "Students may request cancellation before the first session or according to the booking terms shown at checkout. Because students currently pay no marketplace service fee, eligible full refunds are assessed against the paid tutoring amount and any actual non-refundable payment-provider deductions where applicable." },
  { title: "Cancellation by Tutor", content: "Tutors must notify the student and TUTORERA® as early as possible when they cannot deliver a confirmed session. Repeated late cancellations, no-shows, or unreliable scheduling may lead to profile restrictions or account suspension." },
  { title: "No-Show Policy", content: "If a tutor fails to attend a confirmed paid session without notice, the student may request a full refund review. TUTORERA may inspect booking records, messages, attendance evidence, and payment status before finalizing the outcome." },
  { title: "Rescheduling", content: "Students and tutors may agree to reschedule through the platform where the new timing is documented. Rescheduling does not change the accepted rate unless a new offer or support-approved adjustment is recorded." },
  { title: "Refund Processing", content: "Approved refunds are processed to the original payment method where supported, or another documented method confirmed by support. Payment-provider and bank timelines may vary." },
  { title: "Disputes", content: `For payment, cancellation, no-show, or service-delivery disputes, contact ${SUPPORT_EMAIL} with the booking reference, transaction reference, screenshots, and a short explanation.` },
  { title: "Merchant Details", content: `TUTORERA by MENTISERA is operated by ${LEGAL_OPERATOR}. Business address: ${BUSINESS_ADDRESS}.` },
];

export default function CancellationPolicyPage() {
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <h1>Cancellation Policy</h1>
        <p>Rules for cancelling or rescheduling tutor bookings created through the student-led offer marketplace.</p>
      </section>
      <section className={s.container}>
        <div className={s.grid}>
          {sections.map((section) => (
            <article key={section.title} className={s.card}>
              <h2>{section.title}</h2>
              <p>{section.content}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
