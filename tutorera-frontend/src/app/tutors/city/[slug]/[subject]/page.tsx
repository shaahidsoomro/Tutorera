import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import { CITIES, LOCAL_SUBJECT_SLUGS, PRIMARY_CITY_SLUGS, SUBJECTS, fetchTutors } from "@/lib/tutor-directory";

type Props = { params: Promise<{ slug: string; subject: string }> };

export function generateStaticParams() {
  return PRIMARY_CITY_SLUGS.flatMap((slug) => LOCAL_SUBJECT_SLUGS.map((subject) => ({ slug, subject })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subject: subjectSlug } = await params;
  const city = CITIES[slug as keyof typeof CITIES];
  const subject = SUBJECTS[subjectSlug as keyof typeof SUBJECTS];
  if (!city || !subject) return { robots: { index: false, follow: true } };

  const path = `/tutors/city/${slug}/${subjectSlug}`;
  const { total } = await fetchTutors({ countryCode: "PK", city, subject }, 1);
  const title = `${subject} Tutors in ${city}`;
  const description = `Browse ${subject} tutor profiles serving ${city} for online and in-person lessons where available. Compare published experience, reviews, availability, verification status, and hourly rates.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: total > 0, follow: true },
    openGraph: { title: `${title} | TUTORERA`, description, url: path },
  };
}

export default async function Page({ params }: Props) {
  const { slug, subject: subjectSlug } = await params;
  const city = CITIES[slug as keyof typeof CITIES];
  const subject = SUBJECTS[subjectSlug as keyof typeof SUBJECTS];
  if (!city || !subject || !PRIMARY_CITY_SLUGS.includes(slug as typeof PRIMARY_CITY_SLUGS[number]) || !LOCAL_SUBJECT_SLUGS.includes(subjectSlug as typeof LOCAL_SUBJECT_SLUGS[number])) notFound();

  return (
    <SeoTutorDirectory
      kind="city"
      value={city}
      filters={{ countryCode: "PK", city, subject }}
      title={`${subject} Tutors in ${city}`}
      description={`Compare ${subject} tutor profiles available in ${city} for online and in-person lessons where listed.`}
      canonicalPath={`/tutors/city/${slug}/${subjectSlug}`}
    />
  );
}
