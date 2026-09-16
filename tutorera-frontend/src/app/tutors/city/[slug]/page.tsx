import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import { CITIES, LOCAL_SUBJECT_SLUGS, SUBJECTS, fetchTutors } from "@/lib/tutor-directory";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(CITIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const city = CITIES[slug as keyof typeof CITIES];
  if (!city) return { robots: { index: false, follow: true } };

  const path = `/tutors/city/${slug}`;
  const { total } = await fetchTutors({ city }, 1);
  const title = `Online & Home Tutors in ${city}`;
  const description = `Browse tutor profiles serving ${city} for online and locally available in-person lessons. Compare published subjects, experience, reviews, availability, verification status, and rates.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: total > 0, follow: true },
    openGraph: { title: `${title} | TUTORERA`, description, url: path },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const city = CITIES[slug as keyof typeof CITIES];
  if (!city) notFound();

  return (
    <>
      <SeoTutorDirectory
        kind="city"
        value={city}
        title={`Online & Home Tutors in ${city}`}
        description={`Browse tutor profiles serving ${city}, available online, in person, or both where listed.`}
        canonicalPath={`/tutors/city/${slug}`}
      />
      <nav aria-label={`Popular subjects in ${city}`} style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.5rem 4rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Popular tutors in {city}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
          {LOCAL_SUBJECT_SLUGS.map((subjectSlug) => (
            <Link key={subjectSlug} href={`/tutors/city/${slug}/${subjectSlug}`} style={{ color: "#0329B2", background: "#EEF5FF", padding: ".6rem 1rem", borderRadius: 999, textDecoration: "none", fontWeight: 600 }}>
              {SUBJECTS[subjectSlug]} tutors
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
