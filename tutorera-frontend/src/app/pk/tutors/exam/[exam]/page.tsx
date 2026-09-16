import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import { SUBJECTS,fetchTutors } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const EXAMS = ["mdcat", "ecat", "ielts"] as const;
type ExamSlug = (typeof EXAMS)[number];
type Props = { params: Promise<{ exam: string }> };

export function generateStaticParams() {
  return EXAMS.map((exam) => ({ exam }));
}

function getExam(slug: string) {
  return EXAMS.includes(slug as ExamSlug) ? SUBJECTS[slug as ExamSlug] : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { exam: slug } = await params;
  const exam = getExam(slug);
  if (!exam) return {};
  const { total } = await fetchTutors({ countryCode: "PK", subject: exam }, 1);
  const canonical = `/pk/tutors/exam/${slug}`;
  return {
    title: `${exam} Tutors in Pakistan | TUTORERA`,
    description: `Find ${exam} tutors in Pakistan. Compare approved profiles, experience, lesson mode and published rates, or post your requirement to receive tutor offers.`,
    alternates: { canonical },
    robots: { index: total > 0, follow: true },
  };
}

export default async function PakistanExamPage({ params }: Props) {
  const { exam: slug } = await params;
  const exam = getExam(slug);
  if (!exam) notFound();
  return (
    <>
      <SeoTutorDirectory
        kind="subject"
        value={exam}
        filters={{ countryCode: "PK", subject: exam }}
        title={`${exam} Tutors in Pakistan`}
        description={`Browse approved ${exam} tutors serving students in Pakistan. Compare real profiles, lesson modes and published rates before choosing a tutor.`}
        canonicalPath={`/pk/tutors/exam/${slug}`}
        currency="PKR"
      />
      <nav aria-label="Related Pakistan exam tutor searches" style={{ maxWidth: 900, margin: "-2rem auto 4rem", padding: "0 1.5rem", lineHeight: 2 }}>
        <strong>Related:</strong>{" "}<Link href="/pk">Pakistan tutors</Link>{" · "}<Link href="/pk/tutors/level/matric">Matric tutors</Link>{" · "}<Link href="/pk/tutors/level/intermediate">FSc / Intermediate tutors</Link>{" · "}<Link href="/tuition-requests/pk">Tuition requests</Link>
      </nav>
    </>
  );
}
