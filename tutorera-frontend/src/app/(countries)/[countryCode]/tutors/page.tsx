import TutorsExplorer from "@/components/Tutors/TutorsExplorer";
import { getCountryByCode } from "@/lib/location";
import { MARKETS,getMarketByRoute } from "@/lib/markets";
import { SITE_URL } from "@/lib/site";
import { CITIES,fetchTutors } from "@/lib/tutor-directory";
import type { FiltersState } from "@/types/tutor";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound,permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ countryCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const value = (input: string | string[] | undefined) => (typeof input === "string" ? input : "");

export function generateStaticParams() {
  return Object.values(MARKETS).map((market) => ({ countryCode: market.route }));
}

function resolveMarket(route: string) {
  const normalized = route.toLowerCase();
  if (normalized === "gb") permanentRedirect("/uk/tutors");
  return getMarketByRoute(normalized);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countryCode } = await params;
  const market = getMarketByRoute(countryCode);
  if (!market) return { title: "Tutors Directory", robots: { index: false, follow: true } };

  const country = getCountryByCode(market.isoCountryCode);
  if (!country) return { title: "Tutors Directory", robots: { index: false, follow: true } };

  const title = `Find Tutors in ${market.countryName} | Online & Home Tuition`;
  const description = `Post your tutoring requirement in ${market.countryName}, compare tutor offers, and browse tutor profiles. Prices and budgets use ${market.currency}; online tuition is available worldwide${market.homeTuitionEnabled ? " and local home tuition is available where eligible" : ""}.`;
  const canonical = `/${market.route}/tutors`;
  const canonicalUrl = `${SITE_URL}${canonical}`;
  const isLive = market.status === "LIVE";

  return {
    title,
    description,
    robots: { index: isLive, follow: true },
    alternates: isLive
      ? { canonical, languages: { [market.locale]: canonicalUrl, "x-default": `${SITE_URL}/tutors` } }
      : { canonical },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      locale: market.locale.replace("-", "_"),
    },
  };
}

export default async function CountryTutorsPage({ params, searchParams }: Props) {
  const { countryCode } = await params;
  const market = resolveMarket(countryCode);
  if (!market) notFound();

  const country = getCountryByCode(market.isoCountryCode);
  if (!country) notFound();

  const queryParams = await searchParams;
  const initialFilters: Partial<FiltersState> = {
    search: value(queryParams.search),
    country: market.countryName,
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
      countryCode: market.isoCountryCode,
      country: market.countryName,
      level: initialFilters.level,
      subject,
      teachingMode: initialFilters.teachingMode,
      minPrice: initialFilters.minPrice,
      maxPrice: initialFilters.maxPrice,
      minRating: initialFilters.minRating,
    },
    12
  );

  const canonicalUrl = `${SITE_URL}/${market.route}/tutors`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Tutors in ${market.countryName}`,
    description: `Browse tutor profiles serving the ${market.countryName} market. Student budgets and offers use ${market.currency}.`,
    url: canonicalUrl,
    inLanguage: market.locale,
    about: {
      "@type": "Service",
      name: `TUTORERA tutoring marketplace in ${market.countryName}`,
      areaServed: { "@type": "Country", name: market.countryName },
      provider: { "@id": `${SITE_URL}/#organization` },
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Tutors", item: `${SITE_URL}/tutors` },
        { "@type": "ListItem", position: 3, name: market.countryName, item: canonicalUrl },
      ],
    },
  };

  const marketStatus = market.status === "LIVE" ? "Live market" : "Discovery beta";
  const tuitionModes = [
    market.onlineTuitionEnabled ? "Online Tuition: worldwide" : null,
    market.homeTuitionEnabled ? `Home Tuition: available locally in ${market.countryName}` : "Home Tuition: not yet enabled for this market",
  ].filter(Boolean).join(" · ");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section style={{ maxWidth: 1120, margin: "1.25rem auto 0", padding: "0 1.5rem" }} aria-label="Current TUTORERA market">
        <div style={{ background: "#f8faff", border: "1px solid #dbe5ff", borderRadius: "14px", padding: "0.9rem 1rem", color: "#021550" }}>
          <strong>You are viewing TUTORERA for {market.countryName} · {market.currency} ({market.currencySymbol})</strong>
          <div style={{ marginTop: "0.3rem", fontSize: "0.88rem" }}>{marketStatus} · {tuitionModes}</div>
          {!market.checkoutEnabled && (
            <div style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>Online checkout is not yet available in this market. No payment option will be presented as live.</div>
          )}
        </div>
      </section>

      <TutorsExplorer
        initialTutors={result.tutors}
        initialPagination={{ total: result.total, page: result.page, pages: result.pages, limit: 12 }}
        initialFilters={initialFilters}
        title={`Find Tutors in ${market.countryName}`}
        subtitle={
          result.total
            ? `${result.total} tutor profiles available for the ${market.countryName} market · budgets and offers in ${market.currency}`
            : `Browse tutor profiles for ${country.curricula.slice(0, 3).join(", ")} and other subjects · budgets and offers in ${market.currency}`
        }
      />

      {market.homeTuitionEnabled && country.cities && country.cities.length > 0 && (
        <section style={{ maxWidth: 1120, margin: "2rem auto 4rem", padding: "0 1.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#021550", marginBottom: "1rem" }}>Explore Home Tuition Cities in {market.countryName}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {country.cities.map((city) => {
              const citySlug = city.name.toLowerCase().replace(/\s+/g, "-");
              const hasDedicatedLanding = citySlug in CITIES;
              const href = hasDedicatedLanding
                ? `/tutors/city/${citySlug}`
                : `/${market.route}/tutors?city=${encodeURIComponent(city.name)}&teachingMode=in-person`;

              return (
                <Link key={city.id || city.name} href={href} style={{ background: "#f8faff", border: "1px solid #e2e8f0", borderRadius: "999px", padding: "0.45rem 1rem", fontSize: "0.85rem", fontWeight: 600, color: "#0329b2", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  {city.name} {hasDedicatedLanding ? "Tutors →" : ""}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section style={{ maxWidth: 1120, margin: "0 auto 4rem", padding: "0 1.5rem", fontSize: "0.9rem" }}>
        <Link href={market.legalSchedule}>View the {market.countryName} legal schedule</Link>
      </section>
    </>
  );
}
