import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import { CITIES,LOCAL_SUBJECT_SLUGS,PRIMARY_CITY_SLUGS,SUBJECTS,fetchTutors } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(SUBJECTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const subject = SUBJECTS[slug as keyof typeof SUBJECTS];
  if (!subject) return { robots: { index: false, follow: true } };

  const path = `/tutors/subject/${slug}`;
  const { total } = await fetchTutors({ subject }, 1);
  const title = `${subject} Tutors Online & Locally`;
  const description = `Browse ${subject} tutor profiles for online learning and local in-person lessons where available. Compare published experience, reviews, availability, verification status, and rates.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: total > 0, follow: true },
    openGraph: {
      title: `${title} | TUTORERA`,
      description,
      url: path,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const subject = SUBJECTS[slug as keyof typeof SUBJECTS];
  if (!subject) notFound();

  return (
    <>
      <SeoTutorDirectory
        kind="subject"
        value={subject}
        title={`${subject} Tutors Online & Locally`}
        description={`Compare ${subject} tutor profiles for online learning and local in-person lessons where available.`}
        canonicalPath={`/tutors/subject/${slug}`}
      />
      {LOCAL_SUBJECT_SLUGS.includes(slug as (typeof LOCAL_SUBJECT_SLUGS)[number]) && (
        <nav aria-label={`${subject} tutors by city`} style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.5rem 4rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>{subject} tutors by city</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
            {PRIMARY_CITY_SLUGS.map((citySlug) => (
              <Link key={citySlug} href={`/tutors/city/${citySlug}/${slug}`} style={{ color: "#0329B2", background: "#EEF5FF", padding: ".6rem 1rem", borderRadius: 999, textDecoration: "none", fontWeight: 600 }}>
                {CITIES[citySlug]}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
