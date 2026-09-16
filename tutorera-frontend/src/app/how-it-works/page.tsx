import { GST_EFFECTIVE_PERCENT,PLATFORM_FEE_PERCENT,SUPPORT_EMAIL } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "How TUTORERA Works",
  description: "Complete student-led customer journey from request posting to tutor offers, checkout, payment verification, booking confirmation, delivery, and support.",
  alternates: { canonical: "/how-it-works" },
};

const customerJourney = ["Post Requirement", "Propose a Budget", "Receive Offers", "Compare Tutors", "Select Tutor", "Lock Final Rate", "Booking Generated", "Checkout When Available", "Payment Confirmed", "Booking Confirmed", "Tutor Delivers Lesson"];

const studentSteps = [
  ["Tell Us What You Need", "Post your subject, level, schedule, tutoring mode and preferred budget."],
  ["Receive Tutor Offers", "Relevant tutors can submit competitive tutoring offers."],
  ["Compare & Choose", "Compare tutor rates, qualifications, experience and reviews."],
  ["Confirm the Deal", "Accept the tutor's offer and lock the final tutoring rate."],
  ["Pay When Available", "In a checkout-enabled market, review the final agreed amount and complete payment."],
  ["Start Learning", "Attend your online or in-person tutoring session."],
];

const tutorSteps = [
  ["Create a Tutor Profile", "Add your qualifications, experience, subjects and availability."],
  ["Receive Student Requests", "See relevant tutoring requirements."],
  ["Submit Your Offer", "Accept the proposed budget or propose your own rate."],
  ["Get Selected", "The student compares offers and chooses a tutor."],
  ["Deliver Tutoring", "Conduct the scheduled tutoring session."],
  ["Receive Eligible Earnings", "Tutor earnings are processed according to TUTORERA's published fee and settlement terms."],
];

export default function HowItWorksPage() {
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <h1>How TUTORERA Works</h1>
        <p>A complete public walkthrough of how students post requirements, receive tutor offers, lock a final rate in the request currency, and complete tutoring services.</p>
      </section>

      <section className={s.container}>
        <h2 className={s.sectionTitle}>Customer journey diagram</h2>
        <div className={s.flow}>{customerJourney.map((step) => <span key={step}>{step}</span>)}</div>
      </section>

      <section className={s.soft}>
        <div className={s.container}>
          <div className={s.grid}>
            <article className={s.card}>
              <h2>How it works — student</h2>
              <ol className={s.journey}>{studentSteps.map(([title, body], index) => <li key={title}><div><strong>{index + 1}. {title}</strong><p>{body}</p></div></li>)}</ol>
            </article>
            <article className={s.card}>
              <h2>How it works — tutor</h2>
              <ol className={s.journey}>{tutorSteps.map(([title, body], index) => <li key={title}><div><strong>{index + 1}. {title}</strong><p>{body}</p></div></li>)}</ol>
            </article>
          </div>
        </div>
      </section>

      <section className={s.container}>
        <div className={s.grid}>
          <article className={s.card}>
            <h2>Final price is locked before checkout</h2>
            <p>Example: a student posts a rate in the selected market currency; a tutor sends an offer; the student accepts; and that final rate is locked into the booking.</p>
            <p>This amount is used consistently for booking, checkout, payment records, receipt, refund calculation, tutor settlement, and transaction history.</p>
            <Link className={s.cta} href="/student-journey">View student journey</Link>
          </article>
          <article className={s.card}>
            <h2>Payments happen after selection</h2>
            <p>No payment is collected merely to post a request or receive offers. In markets with checkout enabled, payment begins only after tutor selection, final price acceptance, and booking generation. Discovery-beta markets clearly show when acceptance and payment are unavailable.</p>
            <p>Tutor earnings are subject to {PLATFORM_FEE_PERCENT}% marketplace fee plus {GST_EFFECTIVE_PERCENT}% effective tax on that fee. Students currently pay no marketplace fee.</p>
            <p>Support: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
          </article>
        </div>
      </section>
    </div>
  );
}
