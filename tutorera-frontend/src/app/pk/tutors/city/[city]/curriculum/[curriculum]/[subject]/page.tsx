import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import { CITIES, SUBJECTS, fetchTutors, slugify } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const TARGET_CITIES = ["lahore", "karachi", "islamabad", "rawalpindi", "faisalabad"] as const;
const TARGET_SUBJECTS = ["mathematics", "physics", "chemistry", "biology", "english", "computer-science"] as const;

const CURRICULA = {
  matric: "Matric",
  "intermediate-fsc": "Intermediate / FSc",
  "federal-board": "Federal Board",
  "punjab-board": "Punjab Board",
  "sindh-board": "Sindh Board",
  "cambridge-o-a-levels": "Cambridge O/A Levels",
  edexcel: "Edexcel",
  "mdcat-ecat": "MDCAT / ECAT",
} as const;

type Props = { params: Promise<{ city: string; curriculum: string; subject: string }> };

function resolveParams(citySlug: string, curriculumSlug: string, subjectSlug: string) {
  if (!TARGET_CITIES.includes(citySlug as (typeof TARGET_CITIES)[number])) return null;
  if (!TARGET_SUBJECTS.includes(subjectSlug as (typeof TARGET_SUBJECTS)[number])) return null;
  const curriculum = CURRICULA[curriculumSlug as keyof typeof CURRICULA];
  if (!curriculum) return null;

  return {
    city: CITIES[citySlug as keyof typeof CITIES],
    curriculum,
    subject: SUBJECTS[subjectSlug as keyof typeof SUBJECTS],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, curriculum: curriculumSlug, subject: subjectSlug } = await params;
  const resolved = resolveParams(citySlug, curriculumSlug, subjectSlug);
  if (!resolved) return { robots: { index: false, follow: true } };

  const { city, curriculum, subject } = resolved;
  const { total } = await fetchTutors({ countryCode: "PK", city, curriculum, subject }, 1);
  const canonical = `/pk/tutors/city/${citySlug}/curriculum/${curriculumSlug}/${subjectSlug}`;
  const title = `${curriculum} ${subject} Tutors in ${city}`;
  const description = `Find ${curriculum} ${subject} tutors in ${city}, Pakistan. Compare verified tutor profiles, teaching mode, experience and published rates.`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: total > 0, follow: true },
    openGraph: { title: `${title} | TUTORERA`, description, url: canonical },
  };
}

export default async function CurriculumTutorPage({ params }: Props) {
  const { city: citySlug, curriculum: curriculumSlug, subject: subjectSlug } = await params;
  const resolved = resolveParams(citySlug, curriculumSlug, subjectSlug);
  if (!resolved) notFound();

  const { city, curriculum, subject } = resolved;
  const result = await fetchTutors({ countryCode: "PK", city, curriculum, subject });
  if (!result.total) notFound();

  const canonical = `/pk/tutors/city/${citySlug}/curriculum/${curriculumSlug}/${subjectSlug}`;

  return (
    <>
      <SeoTutorDirectory
        kind="subject"
        value={subject}
        filters={{ countryCode: "PK", city, curriculum, subject }}
        title={`${curriculum} ${subject} Tutors in ${city}`}
        description={`Compare verified ${curriculum} ${subject} tutors serving ${city}, with live tutor inventory, teaching mode, experience and published rates.`}
        canonicalPath={canonical}
        currency="PKR"
      />
      <nav aria-label="Related tutor searches" style={{ maxWidth: 900, margin: "-2rem auto 4rem", padding: "0 1.5rem", lineHeight: 2 }}>
        <strong>Explore:</strong>{" "}
        <Link href="/pk">Pakistan tutors</Link>{" · "}
        <Link href={`/pk/tutors/city/${citySlug}`}>{city} tutors</Link>{" · "}
        <Link href={`/tutors/subject/${subjectSlug}`}>{subject} tutors</Link>{" · "}
        <Link href={`/pk/tutors/city/${citySlug}/${curriculumSlug === "matric" ? "matric" : curriculumSlug === "intermediate-fsc" ? "intermediate" : curriculumSlug === "cambridge-o-a-levels" ? "o-level" : "university"}/${subjectSlug}`}>Related level results</Link>
      </nav>
    </>
  );
}
