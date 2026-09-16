import TuitionRequestsExplorer from "@/components/TuitionRequests/TuitionRequestsExplorer";
import type { RequestFilters } from "@/lib/tuition-requests";
import { fetchRequests } from "@/lib/tuition-requests";
import { CITIES,LOCAL_SUBJECT_SLUGS,PRIMARY_CITY_SLUGS,SUBJECTS } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import Link from "next/link";

type Props = {
  params: Promise<{ country: string; city: string; subject: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const COUNTRY_NAMES: Record<string, string> = {
  PK: "Pakistan", AE: "UAE", SA: "Saudi Arabia", GB: "United Kingdom",
};

function slugToLabel(slug: string, map: Record<string, string>): string {
  return map[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateStaticParams() {
  return PRIMARY_CITY_SLUGS.flatMap((citySlug) =>
    LOCAL_SUBJECT_SLUGS.map((subjectSlug) => ({
      country: "pk",
      city: citySlug,
      subject: subjectSlug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, city, subject } = await params;
  const countryName = COUNTRY_NAMES[country.toUpperCase()] || country;
  const cityLabel = slugToLabel(city, CITIES);
  const subjectLabel = slugToLabel(subject, SUBJECTS);
  const title = `${subjectLabel} Tuition in ${cityLabel}, ${countryName} | TUTORERA`;
  const description = `Browse open ${subjectLabel} tuition requests from students in ${cityLabel}, ${countryName}. Submit your offer today.`;
  return { title, description, alternates: { canonical: `/tuition-requests/${country}/${city}/${subject}` } };
}

export default async function SubjectTuitionRequestsPage({ params, searchParams }: Props) {
  const { country, city, subject } = await params;
  const sp = await searchParams;
  const cityLabel = slugToLabel(city, CITIES);
  const subjectLabel = slugToLabel(subject, SUBJECTS);
  const countryName = COUNTRY_NAMES[country.toUpperCase()] || country;

  const filters: RequestFilters = {
    city: cityLabel,
    country: country.toUpperCase(),
    subject: subjectLabel,
    level: typeof sp.level === "string" ? sp.level : "",
    teachingMode: typeof sp.teachingMode === "string" ? sp.teachingMode : "",
    page: typeof sp.page === "string" ? sp.page : "1",
  };

  const result = await fetchRequests(filters, 12);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${subjectLabel} tuition requests in ${cityLabel}, ${countryName}`,
    description: `Active ${subjectLabel} tuition requests from verified students in ${cityLabel}, ${countryName}. Tutors can submit offers directly.`,
    url: `https://tutorera.ac.pk/tuition-requests/${country}/${city}/${subject}`,
    isPartOf: {
      "@type": "WebSite",
      name: "TUTORERA",
      url: "https://tutorera.ac.pk",
    },
    about: {
      "@type": "Thing",
      name: `${subjectLabel} tutoring`,
      description: `Tuition requests for ${subjectLabel} in ${cityLabel}`,
    },
    numberOfItems: result.total,
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div style={{ background: "linear-gradient(135deg, #021550 0%, #0329B2 100%)", color: "white", padding: "2rem 1rem", textAlign: "center" }}>
        <p style={{ opacity: 0.7, fontSize: "0.875rem", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tuition Requests</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.4rem" }}>{subjectLabel} in {cityLabel}, {countryName}</h1>
        <p style={{ opacity: 0.85, fontSize: "0.9rem" }}>Browse {result.total.toLocaleString()} open {subjectLabel} request{result.total !== 1 ? "s" : ""} from students in {cityLabel}</p>
      </div>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem" }}>
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", fontSize: "0.875rem" }}>
          <Link href="/tuition-requests" style={{ color: "#0329b2", textDecoration: "none" }}>All Requests</Link>
          <span style={{ color: "#94a3b8" }}>/</span>
          <Link href={`/tuition-requests/${country}/${city}`} style={{ color: "#0329b2", textDecoration: "none" }}>{cityLabel}</Link>
          <span style={{ color: "#94a3b8" }}>/</span>
          <span style={{ color: "#64748b" }}>{subjectLabel}</span>
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
