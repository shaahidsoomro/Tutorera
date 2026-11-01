import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import { CITIES, LEVELS, PRIMARY_CITY_SLUGS, SUBJECTS, LOCAL_SUBJECT_SLUGS, fetchTutors } from "@/lib/tutor-directory";
import { SeoEligibilityService } from "@/lib/seo-eligibility";

// Extends the existing /tutors/city/[slug]/[subject] pattern with a level
// dimension, rather than introducing a separate /{country}/{city}/{level}-{subject}-tutors
// URL scheme - keeps pSEO authority on one already-indexed route family instead
// of fragmenting it across two competing patterns.
type Props = { params: Promise<{ slug: string; subject: string; level: string }> };

// A bounded "top" slice, matching this route's existing sibling pages rather than
// generating every possible city x subject x level combination up front.
const TOP_LEVEL_SLUGS = ["primary", "matric", "o-level", "igcse", "a-level"] as const;

export function generateStaticParams() {
  return PRIMARY_CITY_SLUGS.flatMap((slug) =>
    LOCAL_SUBJECT_SLUGS.slice(0, 5).flatMap((subject) =>
      TOP_LEVEL_SLUGS.map((level) => ({ slug, subject, level }))
    )
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subject: subjectSlug, level: levelSlug } = await params;
  const city = CITIES[slug as keyof typeof CITIES];
  const subject = SUBJECTS[subjectSlug as keyof typeof SUBJECTS];
  const level = LEVELS[levelSlug as keyof typeof LEVELS];
  if (!city || !subject || !level) return {};
  const path = `/tutors/city/${slug}/${subjectSlug}/${levelSlug}`;
  const { total } = await fetchTutors({ city, subject, level }, 1);
  const title = `${level} ${subject} Tutors in ${city}`;

  const eligibility = SeoEligibilityService.evaluatePage({ activeApprovedTutors: total, homeTuitionEnabled: true });
  const robotsString = eligibility === "INDEX" ? "index, follow" : "noindex, follow";

  return {
    title,
    description: `Find verified ${level} ${subject} tutors in ${city} for online and in-person lessons. Compare experience, ratings, availability, and hourly rates.`,
    alternates: { canonical: path },
    robots: robotsString,
    openGraph: { title: `${title} | TUTORERA`, description: `Browse verified ${level} ${subject} tutors serving ${city}.`, url: path },
  };
}

export default async function Page({ params }: Props) {
  const { slug, subject: subjectSlug, level: levelSlug } = await params;
  const city = CITIES[slug as keyof typeof CITIES];
  const subject = SUBJECTS[subjectSlug as keyof typeof SUBJECTS];
  const level = LEVELS[levelSlug as keyof typeof LEVELS];
  if (!city || !subject || !level || !PRIMARY_CITY_SLUGS.includes(slug as typeof PRIMARY_CITY_SLUGS[number])) notFound();

  const relatedLinks = TOP_LEVEL_SLUGS
    .filter((l) => l !== levelSlug)
    .map((l) => ({
      label: `${(LEVELS as Record<string, string>)[l] || l} ${subject} in ${city}`,
      href: `/tutors/city/${slug}/${subjectSlug}/${l}`,
    }))
    .concat({ label: `All ${subject} tutors in ${city}`, href: `/tutors/city/${slug}/${subjectSlug}` });

  return (
    <SeoTutorDirectory
      kind="city"
      value={city}
      filters={{ city, subject, level }}
      title={`${level} ${subject} Tutors in ${city}`}
      description={`Compare verified ${level} ${subject} tutors available in ${city} for online and in-person lessons.`}
      canonicalPath={`/tutors/city/${slug}/${subjectSlug}/${levelSlug}`}
      relatedLinks={relatedLinks}
    />
  );
}
