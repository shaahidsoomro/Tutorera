import TuitionRequestsExplorer from "@/components/TuitionRequests/TuitionRequestsExplorer";
import type { RequestFilters } from "@/lib/tuition-requests";
import { fetchRequests } from "@/lib/tuition-requests";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Tuition Requests | TUTORERA",
  description: "Browse open tuition requests from students worldwide. Submit your offer and start teaching. Filter by subject, city, level, and teaching mode.",
  alternates: { canonical: "/tuition-requests" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const value = (input: string | string[] | undefined) => typeof input === "string" ? input : "";

export default async function TuitionRequestsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters: RequestFilters = {
    subject: value(params.subject),
    level: value(params.level),
    city: value(params.city),
    country: value(params.country),
    teachingMode: value(params.teachingMode),
    page: value(params.page) || "1",
  };

  const result = await fetchRequests(filters, 12);

  return (
    <TuitionRequestsExplorer
      initialRequests={result.requests}
      initialPagination={{ total: result.total, page: result.page, pages: result.pages }}
      initialFilters={filters}
    />
  );
}
