import TutorsExplorer from "@/components/Tutors/TutorsExplorer";
import { fetchTutors } from "@/lib/tutor-directory";
import type { FiltersState } from "@/types/tutor";
import type { Metadata } from "next";

const TUTORS_TITLE = "Find Tutors Online & In-Person";
const TUTORS_DESCRIPTION = "Search tutor profiles worldwide and locally by subject, curriculum, country, teaching mode, published reviews, availability, verification status, and hourly rates where provided.";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Filtered/sorted variants (/tutors?subject=...) duplicate the clean directory
// routes (/tutors/subject/[slug], /tutors/city/[slug]); keep them out of the index.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const hasParams = Object.values(params).some((v) => v !== undefined && v !== "");
  return {
    title: TUTORS_TITLE,
    description: TUTORS_DESCRIPTION,
    alternates: { canonical: "/tutors" },
    robots: hasParams ? { index: false, follow: true } : undefined,
    openGraph: { title: `${TUTORS_TITLE} | TUTORERA`, description: TUTORS_DESCRIPTION, url: "/tutors" },
    twitter: { title: `${TUTORS_TITLE} | TUTORERA`, description: TUTORS_DESCRIPTION },
  };
}
const value = (input: string | string[] | undefined) => typeof input === "string" ? input : "";

export default async function TutorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialFilters: Partial<FiltersState> = {
    search: value(params.search),
    subject: value(params.subject),
    country: value(params.country || params.countryCode),
    city: value(params.city),
    level: value(params.level),
    teachingMode: value(params.teachingMode),
    minPrice: value(params.minPrice),
    maxPrice: value(params.maxPrice),
    minRating: value(params.minRating),
    sortBy: value(params.sortBy) || "rating",
  } as Partial<FiltersState>;

  const subject = value(params.subject);
  // Keep the subject as a dedicated filter so client-side pagination retains it.

  const result = await fetchTutors({
    schoolOfferingId: value(params.schoolOfferingId),
    search: initialFilters.search,
    city: initialFilters.city,
    countryCode: value(params.countryCode),
    country: value(params.country),
    level: initialFilters.level,
    subject,
    teachingMode: initialFilters.teachingMode,
    minPrice: initialFilters.minPrice,
    maxPrice: initialFilters.maxPrice,
    minRating: initialFilters.minRating,
  }, 12);

  return (
    <TutorsExplorer
      initialTutors={result.tutors}
      initialError={result.error ?? false}
      initialPagination={{ total: result.total, page: result.page, pages: result.pages, limit: 12 }}
      initialFilters={initialFilters}
    />
  );
}
