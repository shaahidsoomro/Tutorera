import { BRAND_NAME,SUPPORT_EMAIL,formatPKR } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "How Payments Work",
  description: "Customer payment process for TUTORERA's student-led tutoring marketplace.",
  alternates: { canonical: "/payment-process" },
};

const steps = [
  ["Post Requirement", "The student enters subject, level, location where applicable, online/in-person mode, schedule, number of sessions, learning requirements, and proposed budget in PKR."],
  ["Tutor Offers", "Suitable tutors submit their offers. Each offer shows a proposed PKR rate."],
  ["Compare", "The student compares rate, qualifications, experience, ratings, availability, teaching mode, and tutor profile."],
  ["Select Tutor", "The student accepts one tutor's offer."],
  ["Final Price Locked", "The accepted offer becomes the final booking price."],
  ["Booking Summary", "The checkout summary displays tutor, subject, agreed rate, sessions, subtotal, any student-side fee if configured, tax if applicable to the student amount, and total payable in PKR. Under the current model, the student marketplace fee is 0%."],
  ["Checkout", "Customer clicks Pay Securely."],
  ["Gateway Transaction", "The payment gateway processes the transaction after merchant activation."],
  ["Payment Verification", "TUTORERA receives and verifies the transaction result server-side."],
  ["Booking Confirmation", "Payment status becomes paid and booking status becomes confirmed."],
  ["Tutor Service Delivery", "Tutor conducts the agreed lesson as an independent service provider."],
  ["Completion", "Booking/session becomes completed after service delivery."],
  ["Customer Feedback", "Student may rate tutor, leave review, contact support, or request an eligible refund."],
];

export default function PaymentProcessPage() {
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <h1>How Payments Work on TUTORERA</h1>
        <p>{BRAND_NAME} uses payments only for genuine tutoring bookings created after student selection and final price acceptance.</p>
      </section>

      <section className={s.narrow}>
        <p className={s.lead}>No payment is collected simply because a student posts a tutoring requirement. The correct sequence is: post requirement → receive offers → select tutor → accept final price → create booking → proceed to payment. The payment gateway is used only after the final payable amount is displayed in PKR against a specific booking.</p>
      </section>

      <section className={s.soft}>
        <div className={s.container}>
          <h2 className={s.sectionTitle}>Complete payment customer journey</h2>
          <ol className={s.journey}>{steps.map(([title, body], index) => <li key={title}><div><strong>Step {index + 1} – {title}</strong><p>{body}</p></div></li>)}</ol>
        </div>
      </section>

      <section className={s.container}>
        <div className={s.grid}>
          <article className={s.card}>
            <h2>Example booking summary</h2>
            <p><strong>Tutor:</strong> Selected tutor name</p>
            <p><strong>Subject:</strong> O-Level Mathematics</p>
            <p><strong>Rate:</strong> {formatPKR(2000, "hour")}</p>
            <p><strong>Sessions:</strong> 3</p>
            <p><strong>Subtotal:</strong> {formatPKR(6000)}</p>
            <p><strong>Student marketplace fee:</strong> {formatPKR(0)}</p>
            <p><strong>Student-side tax:</strong> {formatPKR(0)}</p>
            <p><strong>Total Payable:</strong> {formatPKR(6000)}</p>
            <p>Current student marketplace fee: 0%. Tutor-side marketplace deductions are calculated separately from tutor earnings.</p>
          </article>
          <article className={s.card}>
            <h2>Gateway activation note</h2>
            <p>Secure online payment will be processed through TUTORERA&apos;s authorized payment gateway upon merchant activation.</p>
            <p>The official marketplace price and settlement amount remains PKR. Foreign-currency estimates, if displayed later, will be for convenience only.</p>
            <p>For support, contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
            <Link className={s.cta} href="/student-journey">View student journey</Link>
          </article>
        </div>
      </section>
    </div>
  );
}
