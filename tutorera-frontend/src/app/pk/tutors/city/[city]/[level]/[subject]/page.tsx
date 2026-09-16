import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import { CITIES,LEVELS,SUBJECTS,fetchTutors } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const CITIES_TO_TARGET = ["lahore", "karachi", "islamabad", "rawalpindi", "faisalabad"] as const;
const LEVELS_TO_TARGET = ["matric", "intermediate", "o-level", "a-level"] as const;
const SUBJECTS_TO_TARGET = ["mathematics", "physics", "chemistry", "biology", "english", "computer-science"] as const;

type Props = { params: Promise<{ city: string; level: string; subject: string }> };

export function generateStaticParams() {
  return CITIES_TO_TARGET.flatMap((city) => LEVELS_TO_TARGET.flatMap((level) => SUBJECTS_TO_TARGET.map((subject) => ({ city, level, subject }))));
}

function resolveParams(citySlug: string, levelSlug: string, subjectSlug: string) {
  if (!CITIES_TO_TARGET.includes(citySlug as (typeof CITIES_TO_TARGET)[number])) return null;
  if (!LEVELS_TO_TARGET.includes(levelSlug as (typeof LEVELS_TO_TARGET)[number])) return null;
  if (!SUBJECTS_TO_TARGET.includes(subjectSlug as (typeof SUBJECTS_TO_TARGET)[number])) return null;
  return {
    city: CITIES[citySlug as keyof typeof CITIES],
    level: LEVELS[levelSlug as keyof typeof LEVELS],
    subject: SUBJECTS[subjectSlug as keyof typeof SUBJECTS],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, level: levelSlug, subject: subjectSlug } = await params;
  const resolved = resolveParams(citySlug, levelSlug, subjectSlug);
  if (!resolved) return {};
  const { city, level, subject } = resolved;
  const { total } = await fetchTutors({ countryCode: "PK", city, level, subject }, 1);
  const canonical = `/pk/tutors/city/${citySlug}/${levelSlug}/${subjectSlug}`;
  return {
    title: `${level} ${subject} Tutors in ${city} | TUTORERA`,
    description: `Find ${level} ${subject} tutors in ${city}, Pakistan. Compare approved tutor profiles, lesson mode and published rates, then choose a tutor or post your requirement.`,
    alternates: { canonical },
    robots: { index: total > 0, follow: true },
    openGraph: { title: `${level} ${subject} Tutors in ${city}`, description: `Compare ${level} ${subject} tutors serving ${city} on TUTORERA.`, url: canonical },
  };
}

export default async function LocalCurriculumSubjectPage({ params }: Props) {
  const { city: citySlug, level: levelSlug, subject: subjectSlug } = await params;
  const resolved = resolveParams(citySlug, levelSlug, subjectSlug);
  if (!resolved) notFound();
  const { city, level, subject } = resolved;
  const canonical = `/pk/tutors/city/${citySlug}/${levelSlug}/${subjectSlug}`;

  return <>
    <SeoTutorDirectory
      kind="subject"
      value={subject}
      filters={{ countryCode: "PK", city, level, subject }}
      title={`${level} ${subject} Tutors in ${city}`}
      description={`Browse approved ${level} ${subject} tutors serving students in ${city}. Results come from TUTORERA's live tutor directory; compare profiles, teaching mode and published rates.`}
      canonicalPath={canonical}
      currency="PKR"
    />
    <nav aria-label="Related tutor searches" style={{ maxWidth: 900, margin: "-2rem auto 4rem", padding: "0 1.5rem", lineHeight: 2 }}>
      <strong>Explore:</strong>{" "}
      <Link href="/pk">Pakistan tutors</Link>{" · "}
      <Link href={`/tutors/city/${citySlug}`}>{city} tutors</Link>{" · "}
      <Link href={`/pk/tutors/level/${levelSlug}`}>{level} tutors in Pakistan</Link>{" · "}
      <Link href={`/tutors/subject/${subjectSlug}`}>{subject} tutors</Link>{" · "}
      <Link href={`/tuition-requests/pk/${citySlug}`}>Tuition requests in {city}</Link>
    </nav>
  </>;
}
