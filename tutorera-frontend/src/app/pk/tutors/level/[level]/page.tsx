import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import { LEVELS,fetchTutors } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const INDEXABLE_LEVELS = ["matric", "intermediate", "o-level", "a-level"] as const;
type LevelSlug = (typeof INDEXABLE_LEVELS)[number];

type Props = { params: Promise<{ level: string }> };

export function generateStaticParams() {
  return INDEXABLE_LEVELS.map((level) => ({ level }));
}

function getLevel(slug: string) {
  return INDEXABLE_LEVELS.includes(slug as LevelSlug) ? LEVELS[slug as LevelSlug] : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { level: slug } = await params;
  const level = getLevel(slug);
  if (!level) return {};
  const { total } = await fetchTutors({ countryCode: "PK", level }, 1);
  const canonical = `/pk/tutors/level/${slug}`;
  return {
    title: `${level} Tutors in Pakistan | TUTORERA`,
    description: `Find ${level} tutors in Pakistan. Compare approved tutor profiles, teaching mode, availability and published rates, then post your requirement and receive tutor offers.`,
    alternates: { canonical },
    robots: { index: total > 0, follow: true },
  };
}

export default async function PakistanLevelPage({ params }: Props) {
  const { level: slug } = await params;
  const level = getLevel(slug);
  if (!level) notFound();

  return (
    <>
      <SeoTutorDirectory
        kind="level"
        value={level}
        filters={{ countryCode: "PK", level }}
        title={`${level} Tutors in Pakistan`}
        description={`Browse approved ${level} tutors serving students in Pakistan. Compare real profiles and published rates for online or local lessons where available.`}
        canonicalPath={`/pk/tutors/level/${slug}`}
        currency="PKR"
      />
      <nav aria-label="Related Pakistan tutor searches" style={{ maxWidth: 900, margin: "-2rem auto 4rem", padding: "0 1.5rem", lineHeight: 2 }}>
        <strong>Related:</strong>{" "}
        <Link href="/pk">Pakistan tutors</Link>{" · "}
        <Link href="/tutors/city/islamabad">Islamabad tutors</Link>{" · "}
        <Link href="/tutors/city/rawalpindi">Rawalpindi tutors</Link>{" · "}
        <Link href="/tutors/city/lahore">Lahore tutors</Link>{" · "}
        <Link href="/tuition-requests/pk">Pakistan tuition requests</Link>
      </nav>
    </>
  );
}
