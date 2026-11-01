import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import TutorsExplorer from "@/components/Tutors/TutorsExplorer";
import { fetchTutors } from "@/lib/tutor-directory";
import { resolveCountry, liveCountryCodeParams } from "@/lib/geo-server";
import type { FiltersState } from "@/types/tutor";
import { SITE_URL } from "@/lib/site";
import { SeoEligibilityService } from "@/lib/seo-eligibility";
import { getMarketByCountryCode } from "@/lib/markets";

interface Props {
  params: Promise<{ countryCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const value = (input: string | string[] | undefined) => (typeof input === "string" ? input : "");

export async function generateStaticParams() {
  return liveCountryCodeParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countryCode } = await params;
  const country = await resolveCountry(countryCode);
  if (!country) return { title: "Tutors Directory", robots: { index: false, follow: true } };

  const market = getMarketByCountryCode(country.code);
  const homeTuitionEnabled = market?.homeTuitionEnabled ?? country.homeTuitionEnabled;
  const checkoutEnabled = market?.checkoutEnabled ?? country.paymentsEnabled;
  const title = `Find Verified Tutors in ${country.name} | ${homeTuitionEnabled ? "Online & Home Tuition" : "Online Tuition"}`;
  const description = `Connect with verified ${homeTuitionEnabled ? "online and home " : "online "}tutors in ${country.name} (${country.currency}). Compare rates and explore ${country.curricula.slice(0, 3).join(", ")} curricula${checkoutEnabled ? ", then book securely." : "."}`;
  const canonical = `/${countryCode.toLowerCase()}/tutors`;
  const { total } = await fetchTutors({ countryCode: country.code }, 1);
  const eligibility = SeoEligibilityService.evaluatePage({ activeApprovedTutors: total, homeTuitionEnabled });
  const robots = eligibility === "INDEX" ? "index, follow" : "noindex, follow";

  return {
    title,
    description,
    robots,
    alternates: { canonical },
    openGraph: {
      title: `${title} | TUTORERA`,
      description,
      url: `${SITE_URL}${canonical}`,
    },
  };
}

export default async function CountryTutorsPage({ params, searchParams }: Props) {
  const { countryCode } = await params;
  const country = await resolveCountry(countryCode);
  if (!country) notFound();
  const market = getMarketByCountryCode(country.code);
  const homeTuitionEnabled = market?.homeTuitionEnabled ?? country.homeTuitionEnabled;
  const checkoutEnabled = market?.checkoutEnabled ?? country.paymentsEnabled;

  const queryParams = await searchParams;
  const initialFilters: Partial<FiltersState> = {
    search: value(queryParams.search),
    country: country.name,
    city: value(queryParams.city),
    level: value(queryParams.level),
    teachingMode: value(queryParams.teachingMode),
    minPrice: value(queryParams.minPrice),
    maxPrice: value(queryParams.maxPrice),
    minRating: value(queryParams.minRating),
    sortBy: value(queryParams.sortBy) || "rating",
  } as Partial<FiltersState>;

  const subject = value(queryParams.subject);
  if (subject && !initialFilters.search) initialFilters.search = subject;

  const result = await fetchTutors(
    {
      search: initialFilters.search,
      city: initialFilters.city,
      countryCode: country.code,
      country: country.name,
      level: initialFilters.level,
      subject,
      teachingMode: initialFilters.teachingMode,
      minPrice: initialFilters.minPrice,
      maxPrice: initialFilters.maxPrice,
      minRating: initialFilters.minRating,
    },
    12
  );

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Verified Tutors in ${country.name}`,
    description: `Find verified ${homeTuitionEnabled ? "online and home" : "online"} tutors in ${country.name} across ${country.curricula.join(", ")}.`,
    url: `${SITE_URL}/${countryCode.toLowerCase()}/tutors`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Tutors", item: `${SITE_URL}/tutors` },
        { "@type": "ListItem", position: 3, name: country.name, item: `${SITE_URL}/${countryCode.toLowerCase()}/tutors` },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/* Market status banner — explicit discovery/transactional label so users
          in non-live markets are never misled about booking availability. */}
      {country.launchStatus === "coming_soon" && (
        <div role="status" style={{
          background: "#f59e0b", color: "#1c1917",
          textAlign: "center", padding: "0.65rem 1rem",
          fontSize: "0.85rem", fontWeight: 700
        }}>
          TUTORERA is coming to {country.name} — you can browse profiles but booking is not yet available.
        </div>
      )}
      {country.launchStatus === "beta" && (
        <div role="status" style={{
          background: "#0284c7", color: "white",
          textAlign: "center", padding: "0.65rem 1rem",
          fontSize: "0.85rem", fontWeight: 700
        }}>
          TUTORERA {country.name} is in beta
          {!checkoutEnabled && " · Online payment is not yet enabled in this market"}
        </div>
      )}
      {country.launchStatus !== "coming_soon" && country.launchStatus !== "beta" && !checkoutEnabled && (
        <div role="status" style={{
          background: "#021550", color: "white",
          textAlign: "center", padding: "0.65rem 1rem",
          fontSize: "0.85rem", fontWeight: 700
        }}>
          Online payment isn&apos;t live in {country.name} yet
        </div>
      )}
      <div style={{ background: "#f8fafc", padding: "2rem 1.5rem", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#021550", margin: 0 }}>
          Tutors in {country.name}
        </h1>
        <p style={{ maxWidth: 800, margin: "1rem auto 0", color: "#475569", fontSize: "1.1rem", lineHeight: 1.6 }}>
          Connect with top-rated educators offering {homeTuitionEnabled ? "online tutoring and in-person home tuition" : "online tutoring"} across {country.name}.
          Explore verified profiles, compare subjects, and find the perfect match for your academic goals.
        </p>
      </div>

      <TutorsExplorer
        initialTutors={result.tutors}
        initialPagination={{
          total: result.total,
          page: result.page,
          pages: result.pages,
          limit: 12,
        }}
        initialFilters={initialFilters}
        marketCountryCode={country.code}
        title={`Verified Tutors in ${country.name}`}
        subtitle={
          result.total
            ? `${result.total} verified educators available in ${country.name} (${country.currency})`
            : `Browse verified educators in ${country.name} for ${country.curricula.slice(0, 3).join(", ")} and academic subjects`
        }
      />
      {homeTuitionEnabled && country.cities && country.cities.length > 0 && (
        <section style={{ maxWidth: 1120, margin: "2rem auto 4rem", padding: "0 1.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#021550", marginBottom: "1rem" }}>
            Explore In-Person & Home Tuition Cities in {country.name}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {country.cities.map((city) => {
              const href = `/${countryCode.toLowerCase()}/tutors?city=${encodeURIComponent(city.name)}`;

              return (
                <Link
                  key={city.id || city.name}
                  href={href}
                  style={{
                    background: "#f8faff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "999px",
                    padding: "0.45rem 1rem",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#0329b2",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  {city.name}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Top Subjects List */}
      <section style={{ maxWidth: 1120, margin: "2rem auto", padding: "0 1.5rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#021550", marginBottom: "1rem" }}>
          Popular Subjects in {country.name}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
          {["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science", "Economics", "Accounting", "Business Studies", "Urdu"].map((subject) => {
            return (
              <Link
                key={subject}
                href={`/${countryCode.toLowerCase()}/tutors?subject=${encodeURIComponent(subject)}`}
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "999px",
                  padding: "0.45rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#475569",
                  textDecoration: "none",
                }}
              >
                {subject}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Demand Hub Link */}
      <section style={{ maxWidth: 1120, margin: "2rem auto 4rem", padding: "0 1.5rem" }}>
        <div style={{
          background: "linear-gradient(135deg, #021550, #0329b2)",
          color: "white",
          borderRadius: "1rem",
          padding: "2rem",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1rem" }}>
            Are you a tutor in {country.name}?
          </h2>
          <p style={{ opacity: 0.9, marginBottom: "1.5rem", maxWidth: 600, margin: "0 auto 1.5rem" }}>
            Browse active tuition requirements posted by students and parents in {country.name}. Submit your offers and start teaching today.
          </p>
          <Link
            href={`/tuition-requests/${countryCode.toLowerCase()}`}
            style={{
              display: "inline-block",
              background: "white",
              color: "#0329b2",
              padding: "0.75rem 2rem",
              borderRadius: "999px",
              fontWeight: 700,
              textDecoration: "none"
            }}
          >
            View Open Tuition Requests in {country.name} →
          </Link>
        </div>
      </section>
    </>
  );
}
