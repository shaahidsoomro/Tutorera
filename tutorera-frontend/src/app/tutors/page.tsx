import TutorsExplorer from "@/components/Tutors/TutorsExplorer";
import { fetchTutors } from "@/lib/tutor-directory";
import type { FiltersState } from "@/types/tutor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Tutors Online & In-Person",
  description: "Search tutor profiles worldwide and locally by subject, curriculum, country, teaching mode, published reviews, availability, verification status, and hourly rates where provided.",
  alternates: { canonical: "/tutors" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const value = (input: string | string[] | undefined) => typeof input === "string" ? input : "";

export default async function TutorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialFilters: Partial<FiltersState> = {
    search: value(params.search),
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
  if (subject && !initialFilters.search) initialFilters.search = subject;

  const result = await fetchTutors({
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
      initialPagination={{ total: result.total, page: result.page, pages: result.pages, limit: 12 }}
      initialFilters={initialFilters}
    />
  );
}
