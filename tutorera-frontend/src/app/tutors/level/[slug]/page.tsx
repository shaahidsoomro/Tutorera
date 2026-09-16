import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import { LEVELS,fetchTutors } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(LEVELS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const level = LEVELS[slug as keyof typeof LEVELS];
  if (!level) return { robots: { index: false, follow: true } };

  const path = `/tutors/level/${slug}`;
  const { total } = await fetchTutors({ level }, 1);
  const title = `${level} Tutors Online & Locally`;
  const description = `Browse ${level} tutor profiles for online learning and local in-person support where available. Compare published experience, reviews, availability, verification status, and rates.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: total > 0, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const level = LEVELS[slug as keyof typeof LEVELS];
  if (!level) notFound();

  return (
    <SeoTutorDirectory
      kind="level"
      value={level}
      title={`${level} Tutors Online & Locally`}
      description={`Browse tutor profiles listing experience with ${level} students for online learning and local in-person support where available.`}
      canonicalPath={`/tutors/level/${slug}`}
    />
  );
}
