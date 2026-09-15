import Link from "next/link";
import type { Metadata } from "next";
import s from "../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Tutoring Services & Curricula",
  description: "Explore tutoring categories across national and international curricula (Cambridge O/A Levels, GCSE, IB, Matric, FSc, Test Prep). Transparent multi-currency pricing with authorized platform checkout.",
  alternates: { canonical: "/services" },
};

const services = [
  ["Primary School Tutoring","Foundational tutoring for younger learners, homework support, reading, writing, numeracy, and concept confidence.","Primary learners","Online Worldwide / In-person Locally","Primary","primary"],
  ["Middle School Tutoring","Academic support for middle-school learners across available subjects, schoolwork, revision, and study routines.","Middle-school students","Online Worldwide / In-person Locally","Middle","middle"],
  ["Cambridge O-Level Tutoring","Cambridge O-Level tutoring for Mathematics, sciences, English, Pakistan Studies, Islamiyat, and commerce subjects.","O-Level students","Online Worldwide / In-person Locally","O-Level","o-level"],
  ["Cambridge A-Level Tutoring","Cambridge AS/A2 tutoring from available verified tutors with deep syllabus knowledge and exam preparation experience.","A-Level students","Online Worldwide / In-person Locally","A-Level","a-level"],
  ["British Curriculum (GCSE / IGCSE)","GCSE and IGCSE tutoring aligned with Edexcel, AQA, and OCR examination boards.","GCSE / IGCSE students","Online Worldwide / In-person Locally","Secondary","igcse"],
  ["International Baccalaureate (IB)","IB Primary Years, Middle Years, and Diploma Programme (IB DP) subject guidance and internal assessment mentoring.","IB Diploma & MYP candidates","Online Worldwide / In-person Locally","IB DP / MYP","ib"],
  ["Matric & Secondary Board Tutoring","Board-focused tutoring across science, commerce, humanities, languages, and board exam revision.","Matric students","Online Worldwide / In-person Locally","Matric","matric"],
  ["Intermediate (FSc / ICS / FA)","College-level support for FSc Pre-Medical, Pre-Engineering, ICS, FA, and board examination preparation.","Intermediate students","Online Worldwide / In-person Locally","Intermediate","intermediate"],
  ["University & College Tutoring","Conceptual learning support for university-level coursework, coding, engineering, economics, and business without academic cheating.","University students","Online Worldwide / In-person Locally","University","university"],
  ["MDCAT Preparation","Concept review, rapid problem solving, biology review, and exam strategy for medical college admission preparation.","MDCAT candidates","Online Worldwide / In-person Locally","Medical Admissions","mdcat"],
  ["ECAT & Engineering Prep","Engineering entry test concept clarity, calculus, mechanics, and revision planning with verified educators.","ECAT candidates","Online Worldwide / In-person Locally","Engineering Admissions","ecat"],
  ["IELTS & English Proficiency","English language exam support for reading, writing, listening, speaking, and score improvement for study abroad.","IELTS / TOEFL candidates","Online Worldwide / In-person Locally","Language / Proficiency","ielts"],
  ["SAT & ACT Preparation","Comprehensive digital SAT math, reading, and writing preparation with practice strategy and timing drills.","SAT candidates","Online Worldwide / In-person Locally","College Admissions","sat"],
  ["Mathematics","Mathematics tutoring from foundational arithmetic to advanced calculus, linear algebra, and statistics.","Math learners","Online Worldwide / In-person Locally","Primary to university","mathematics"],
  ["Physics","Physics tutoring for school, college, O/A-Level, AP Physics, and competitive university admission exams.","Physics learners","Online Worldwide / In-person Locally","Secondary to university","physics"],
  ["Chemistry","General, organic, and inorganic chemistry tutoring for board, Cambridge, AP, and medical-college entrance needs.","Chemistry learners","Online Worldwide / In-person Locally","Secondary to university","chemistry"],
  ["Biology","Biology tutoring covering cellular biology, genetics, physiology, O/A-Level, and MDCAT syllabus.","Biology learners","Online Worldwide / In-person Locally","Secondary to university","biology"],
  ["English Language & Literature","Grammar mastery, creative and analytical essay writing, literature analysis, and spoken English confidence.","English learners","Online Worldwide / In-person Locally","All levels","english"],
  ["Computer Science & Coding","Python, JavaScript, web development, data structures, algorithms, and AP / A-Level Computer Science.","Technology learners","Online Worldwide / In-person Locally","School to career skills","computer-science"],
  ["Accounting & Finance","Financial accounting, cost accounting, business studies, ACCA, and economics tutoring from qualified professionals.","Commerce learners","Online Worldwide / In-person Locally","College to professional","accounting"],
];

export default function ServicesPage() {
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <h1>TUTORERA Tutoring Services & Curricula</h1>
        <p>Tutoring categories span international and national curricula. Rates are student-proposed or tutor-offered, tailored to subject difficulty, academic level, and learning mode (online worldwide or home tuition locally). Final rates are agreed in your preferred currency before authorized platform checkout.</p>
      </section>
      <section className={s.narrow}>
        <p className={s.lead}><strong>Pricing Transparency:</strong> Student-led demand marketplace model. Students propose their preferred budget or receive custom tutor counter-offers. All checkout totals are displayed with full currency transparency, documented payment status, and published support/dispute routes.</p>
      </section>
      <section className={s.container}>
        <div className={s.serviceGrid}>
          {services.map(([title, desc, learner, mode, level, slug]) => (
            <article key={title} className={s.serviceCard}>
              <div className={s.serviceImage} role="img" aria-label={`${title} education service illustration`}>{title.split(" ")[0]}</div>
              <div className={s.serviceBody}>
                <h2>{title}</h2>
                <p>{desc}</p>
                <div className={s.meta}>
                  <span><strong>Intended learner:</strong> {learner}</span>
                  <span><strong>Delivery mode:</strong> {mode}</span>
                  <span><strong>Academic level:</strong> {level}</span>
                  <span><strong>Tutor availability:</strong> Verified educators matched by curriculum expertise and timezone availability.</span>
                  <span><strong>Pricing model:</strong> Student-led custom offer. Transparent local currency display with authorized platform checkout and payment-status verification.</span>
                </div>
                <div className={s.flow}>
                  <Link className={s.cta} href="/dashboard?tab=requests">Post Requirement</Link>
                  <Link className={s.cta} href={`/tutors/level/${slug}`}>View Tutors</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
