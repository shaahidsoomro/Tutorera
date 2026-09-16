import { BRAND_NAME,SUPPORT_EMAIL,formatPKR } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Student Journey",
  description: "Student-led TUTORERA journey from posting a tutoring request to receiving offers, paying, and learning.",
  alternates: { canonical: "/student-journey" },
};

const journey = [
  ["Student needs tutor", "A student or parent identifies the subject, level, schedule, learning mode, and support required."],
  ["Student posts tutoring request", "The requirement is submitted on TUTORERA with learning goals and relevant preferences."],
  ["Student proposes budget in PKR", `Example: ${formatPKR(1500, "hour")} for O-Level Mathematics.`],
  ["Tutors submit offers", "Eligible tutors can accept the proposed budget or submit a different rate with a short message and availability."],
  ["Student compares offers", "The comparison view shows tutor profile, verification, qualifications, experience, reviews, availability, teaching mode, response time, and PKR price."],
  ["Student selects one tutor", "The student independently chooses the tutor who best fits the requirement. The cheapest offer is not automatically selected."],
  ["Final agreed rate is locked", `Example: student budget ${formatPKR(1500, "hour")}; tutor offer ${formatPKR(1800, "hour")}; accepted booking rate ${formatPKR(1800, "hour")}.`],
  ["Booking generated", "A booking record is created for the selected tutor and agreed tutoring service."],
  ["Checkout shows final amount", "The customer reviews agreed rate, sessions, subtotal, platform fee, tax, discounts, and total payable in PKR."],
  ["Payment gateway processes payment", "Payment begins only after selection, price acceptance, and booking creation."],
  ["Payment confirmation received", "TUTORERA verifies the transaction result server-side."],
  ["Booking confirmed", "The booking status is confirmed and the selected tutor is notified."],
  ["Tutor delivers lesson", "The tutor conducts the agreed online or in-person tutoring session."],
  ["Student receives service", `After the session, the student may rate the tutor, leave a review, contact ${SUPPORT_EMAIL}, or request an eligible refund.`],
];

export default function StudentJourneyPage() {
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <h1>Student Journey on TUTORERA</h1>
        <p>{BRAND_NAME} is a student-led demand marketplace: students set the requirement, tutors respond with offers, and the student chooses.</p>
      </section>

      <section className={s.container}>
        <h2 className={s.sectionTitle}>Complete customer journey</h2>
        <ol className={s.journey}>{journey.map(([title, body]) => <li key={title}><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol>
      </section>

      <section className={s.soft}>
        <div className={s.container}>
          <div className={s.grid}>
            <article className={s.card}>
              <h2>Offer comparison screen includes</h2>
              <ul className={s.checklist}>{["Tutor photo","Tutor name","Verified status","Qualification","Years of experience","Subject expertise","Rating and reviews","Proposed price in PKR","Teaching mode","Availability","Offer message","Response time","View Profile","Accept Offer","Decline","Message Tutor where appropriate"].map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article className={s.card}>
              <h2>Payment rule</h2>
              <p>The payment gateway is not used to process offers or hold speculative money. Payment occurs only after a tutor has been selected, a final tutoring rate has been agreed, a booking exists, and the final amount is clearly displayed in PKR.</p>
              <Link className={s.cta} href="/payment-process">See payment process</Link>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
