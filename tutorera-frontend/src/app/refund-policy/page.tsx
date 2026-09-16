import { BRAND_NAME,BUSINESS_ADDRESS,LEGAL_OPERATOR,SUPPORT_EMAIL,SUPPORT_PHONE } from "@/lib/site";
import type { Metadata } from "next";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund eligibility, payment issue handling, and dispute process for TUTORERA tutoring bookings.",
  alternates: { canonical: "/refund-policy" },
};

const cases = [
  ["Tutor cancellation", "If a tutor cancels a paid confirmed session and no acceptable reschedule is arranged, the customer may request refund review."],
  ["Tutor no-show", "If a tutor does not attend a confirmed paid session, TUTORERA may review attendance and communication records for refund eligibility."],
  ["Student cancellation", "Student cancellation eligibility depends on cancellation timing, booking terms, tutor preparation, and whether service delivery has started."],
  ["Student no-show", "A student no-show after a confirmed booking may be non-refundable unless the published cancellation terms or support review allow otherwise."],
  ["Duplicate transaction", "Duplicate verified payments for the same booking may be refunded after transaction matching."],
  ["Incorrect charge", "Incorrectly charged amounts may be corrected or refunded after amount and booking verification."],
  ["Failed payment", "Failed or unverified payment should not activate a booking. If money is debited, support can help trace the transaction."],
  ["Partially used packages", "Partially used tutoring packages are reviewed based on delivered sessions, remaining balance, and agreed booking terms."],
  ["Completed session", "Completed sessions are generally not refundable unless there is a verified service failure or policy exception."],
];

export default function RefundPolicyPage() {
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <h1>Refund Policy</h1>
        <p>Refund and dispute support for tutoring bookings made through {BRAND_NAME}.</p>
      </section>
      <section className={s.container}>
        <div className={s.grid}>
          {cases.map(([title, body]) => (
            <article key={title} className={s.card}>
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={s.soft}>
        <div className={s.container}>
          <div className={s.grid}>
            <article className={s.card}>
              <h2>Refund request period and method</h2>
              <p>Customers should request refund review as soon as possible after the issue occurs and include the booking reference, transaction reference, amount paid in PKR, screenshots or communication evidence where relevant, and a short explanation.</p>
              <p>Approved refunds are processed back through the original payment method where supported, or through another documented method approved by TUTORERA support. Because students currently pay no marketplace service fee, refund review focuses on the paid tutoring amount and any actual payment-provider deductions that cannot be reversed.</p>
            </article>
            <article className={s.card}>
              <h2>Refund processing and disputes</h2>
              <p>TUTORERA reviews booking records, payment verification, cancellation timing, service delivery evidence, and communications before deciding eligibility. Processing times may vary by payment provider and bank.</p>
              <p>Refund and dispute requests: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · {SUPPORT_PHONE}</p>
            </article>
          </div>
        </div>
      </section>
      <section className={s.narrow}>
        <div className={s.infoBox}>
          <h2>Operator details</h2>
          <p><strong>{LEGAL_OPERATOR}</strong></p>
          <p className={s.address}>{BUSINESS_ADDRESS}</p>
        </div>
      </section>
    </div>
  );
}
