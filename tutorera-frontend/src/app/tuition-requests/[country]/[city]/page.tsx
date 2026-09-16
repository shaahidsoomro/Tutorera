import TuitionRequestsExplorer from "@/components/TuitionRequests/TuitionRequestsExplorer";
import type { RequestFilters } from "@/lib/tuition-requests";
import { fetchRequests } from "@/lib/tuition-requests";
import { CITIES,PRIMARY_CITY_SLUGS } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import Link from "next/link";

type Props = {
  params: Promise<{ country: string; city: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const COUNTRY_NAMES: Record<string, string> = {
  PK: "Pakistan", AE: "UAE", SA: "Saudi Arabia", GB: "United Kingdom",
};

function slugToLabel(slug: string, map: Record<string, string>): string {
  return map[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateStaticParams() {
  return PRIMARY_CITY_SLUGS.map((city) => ({ country: "pk", city }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, city } = await params;
  const countryName = COUNTRY_NAMES[country.toUpperCase()] || country;
  const cityLabel = slugToLabel(city, CITIES);
  const title = `Tuition Requests in ${cityLabel}, ${countryName} | TUTORERA`;
  const description = `Browse open tuition requests from students in ${cityLabel}, ${countryName}. Find tutoring opportunities in your area.`;
  return { title, description, alternates: { canonical: `/tuition-requests/${country}/${city}` } };
}

export default async function CityTuitionRequestsPage({ params, searchParams }: Props) {
  const { country, city } = await params;
  const sp = await searchParams;
  const cityLabel = slugToLabel(city, CITIES);
  const countryName = COUNTRY_NAMES[country.toUpperCase()] || country;

  const filters: RequestFilters = {
    city: cityLabel,
    country: country.toUpperCase(),
    subject: typeof sp.subject === "string" ? sp.subject : "",
    level: typeof sp.level === "string" ? sp.level : "",
    teachingMode: typeof sp.teachingMode === "string" ? sp.teachingMode : "",
    page: typeof sp.page === "string" ? sp.page : "1",
  };

  const result = await fetchRequests(filters, 12);

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #021550 0%, #0329B2 100%)", color: "white", padding: "2rem 1rem", textAlign: "center" }}>
        <p style={{ opacity: 0.7, fontSize: "0.875rem", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tuition Requests</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.4rem" }}>{cityLabel}, {countryName}</h1>
        <p style={{ opacity: 0.85, fontSize: "0.9rem" }}>Browse {result.total.toLocaleString()} open request{result.total !== 1 ? "s" : ""} from students in {cityLabel}</p>
      </div>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Link href="/tuition-requests" style={{ color: "#0329b2", fontSize: "0.875rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            ← All Tuition Requests
          </Link>
        </div>
        <TuitionRequestsExplorer
          initialRequests={result.requests}
          initialPagination={{ total: result.total, page: result.page, pages: result.pages }}
          initialFilters={filters}
        />
      </div>
    </div>
  );
}
