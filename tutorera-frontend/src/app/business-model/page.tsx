import { BRAND_NAME,LEGAL_OPERATOR } from "@/lib/site";
import type { Metadata } from "next";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "TUTORERA Business Model | Global Student-Led Tutoring Marketplace",
  description: "How TUTORERA by MENTISERA operates as a global student-led demand tutoring marketplace with multi-currency transparency, authorized checkout, and server-side payment verification.",
  alternates: { canonical: "/business-model" },
};

const explanation =
  "TUTORERA by MENTISERA is a global student-led digital tutoring marketplace operated by MENTISERA (SMC-Private) Limited. Students or parents post tutoring requirements with their preferred budget in their selected currency (such as AED, USD, GBP, SAR, or PKR). Eligible verified independent tutors can respond with customized offers based on the student's subject, academic curriculum, timezone, schedule, learning mode (online worldwide or home tuition locally), and proposed budget. The student compares available tutors and independently selects the tutor they prefer. Once the tutor's offer is accepted, the final tutoring rate is locked and a booking is created. Payment is then collected against that specific booking and processed securely under platform satisfaction guarantees before the tutoring session is delivered.";

const flow = [
  "Student posts tutoring requirement specifying subject, curriculum, and mode",
  "Student enters preferred budget and local currency",
  "Matching verified tutors receive the tuition opportunity",
  "Tutors submit competitive offers or transparent counter-offers",
  "Student compares tutor profiles, verified credentials, and rates",
  "Student independently selects preferred tutor",
  "Final tutoring rate is agreed and locked",
  "Booking schedule and payment order are generated",
  "Customer reviews final amount in preferred currency with transparent base conversion",
  "Customer proceeds to authorized platform checkout",
  "Payment is verified and secured",
  "Booking is confirmed with session calendar and room link",
  "Tutor delivers tutoring service independently",
  "Session is completed and verified",
  "Student provides feedback and confirms successful lesson delivery",
];

const studentItems = [
  "Create an account & select country/currency",
  "Browse verified tutors worldwide & locally",
  "Filter by curriculum, subject, timezone & mode",
  "Post tutoring requirements with custom specifications",
  "Enter preferred budget in local currency",
  "Receive competitive tutor offers in real-time",
  "Compare tutor rates & counter-offers",
  "Inspect verified credentials, degrees & badges",
  "Check police verification for home tutors",
  "Review tutor ratings, experience & past student feedback",
  "Select tutor independently with zero booking pressure",
  "Accept offer & confirm schedule",
  "Pay transparent checkout total through authorized platform checkout",
  "Attend online or in-person tutoring session",
  "Rate tutor performance",
  "Access 100% money-back guarantee & dispute resolution",
];

const tutorItems = [
  "Create educator profile & select teaching modes",
  "Submit identity & academic degrees for manual verification",
  "Submit police verification clearance (required for home tuition)",
  "Add specialized subjects, international curricula & levels",
  "Configure availability calendar & timezone",
  "Receive targeted student tutoring opportunities",
  "Review student budget in stated currency",
  "Accept student proposed budget directly",
  "Submit customized counter-offers where appropriate",
  "Add tailored introduction message & lesson proposal",
  "Receive confirmed booking with payment guarantee",
  "Deliver high-standard tutoring service independently",
  "Receive timely payouts after transparent platform commission",
];

export default function BusinessModelPage() {
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <h1>How TUTORERA Works – Our Business Model</h1>
        <p>{BRAND_NAME} is operated by {LEGAL_OPERATOR} as a global education technology marketplace.</p>
      </section>
      <section className={s.narrow}>
        <div className={s.content}>
          <p>{explanation}</p>
        </div>
      </section>
      <section className={s.soft}>
        <div className={s.container}>
          <h2 className={s.sectionTitle}>Marketplace flow</h2>
          <ol className={s.timeline}>{flow.map((step) => <li key={step}>{step}</li>)}</ol>
        </div>
      </section>
      <section className={s.container}>
        <div className={s.grid}>
          <article className={s.card}>
            <h2>For Students and Parents</h2>
            <ul className={s.checklist}>{studentItems.map((x) => <li key={x}>{x}</li>)}</ul>
          </article>
          <article className={s.card}>
            <h2>For Tutors</h2>
            <ul className={s.checklist}>{tutorItems.map((x) => <li key={x}>{x}</li>)}</ul>
          </article>
        </div>
      </section>
    </div>
  );
}
