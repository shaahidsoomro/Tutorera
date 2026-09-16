import { getCountryByCode } from "@/lib/location";
import { MARKETS,getMarketByRoute } from "@/lib/markets";
import { SITE_URL } from "@/lib/site";
import { CITIES,LOCAL_SUBJECT_SLUGS,PRIMARY_CITY_SLUGS,SUBJECTS,fetchTutors } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound,permanentRedirect } from "next/navigation";

interface Props { params: Promise<{ countryCode: string }> }

export function generateStaticParams() {
  return Object.values(MARKETS).map((market) => ({ countryCode: market.route }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countryCode } = await params;
  if (countryCode.toLowerCase() === "gb") return {};
  const market = getMarketByRoute(countryCode);
  if (!market) return { robots: { index: false, follow: true } };

  const canonical = `/${market.route}`;
  const canonicalUrl = `${SITE_URL}${canonical}`;
  const title = `Find Tutors & Tutoring Opportunities in ${market.countryName}`;
  const description = `TUTORERA is a student-led tutoring marketplace in ${market.countryName}. Post your requirement and preferred budget in ${market.currency}, compare tutor offers, and choose your tutor.`;
  const isLive = market.status === "LIVE";

  return {
    title,
    description,
    robots: { index: isLive, follow: true },
    alternates: isLive
      ? { canonical, languages: { [market.locale]: canonicalUrl, "x-default": SITE_URL } }
      : { canonical },
    openGraph: { title, description, url: canonicalUrl, locale: market.locale.replace("-", "_") },
  };
}

export default async function MarketPage({ params }: Props) {
  const { countryCode } = await params;
  if (countryCode.toLowerCase() === "gb") permanentRedirect("/uk");
  const market = getMarketByRoute(countryCode);
  if (!market) notFound();
  const country = getCountryByCode(market.isoCountryCode);
  if (!country) notFound();

  const isPakistan = market.route === "pk";
  const pakistanInventory = isPakistan
    ? await Promise.all(PRIMARY_CITY_SLUGS.map(async (citySlug) => {
        const city = CITIES[citySlug];
        const { total } = await fetchTutors({ countryCode: "PK", city }, 1);
        return { citySlug, city, total };
      }))
    : [];

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `TUTORERA ${market.countryName}`,
    url: `${SITE_URL}/${market.route}`,
    inLanguage: market.locale,
    about: {
      "@type": "Service",
      name: `TUTORERA tutoring marketplace in ${market.countryName}`,
      areaServed: { "@type": "Country", name: market.countryName },
      provider: { "@id": `${SITE_URL}/#organization` },
    },
  };

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "3rem 1.5rem 5rem" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <p style={{ fontWeight: 700, color: "#0329b2" }}>{market.status === "LIVE" ? "Live market" : "Discovery beta"} · {market.currency} ({market.currencySymbol})</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.6rem)", lineHeight: 1.05, color: "#021550", maxWidth: 900 }}>Find Tutors & Tutoring Opportunities in {market.countryName}</h1>
      <p style={{ fontSize: "1.1rem", lineHeight: 1.7, maxWidth: 820 }}>Students post what they need and their preferred budget in {market.currency}. Eligible tutors can respond with offers or counter-offers. Students compare tutor profiles and choose who they want to learn with.</p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", margin: "1.5rem 0 2.5rem" }}>
        <Link href="/post-tuition-request" style={{ padding: "0.8rem 1.2rem", borderRadius: 10, background: "#0329b2", color: "white", textDecoration: "none", fontWeight: 700 }}>Post a Tuition Request</Link>
        <Link href={`/${market.route}/tutors`} style={{ padding: "0.8rem 1.2rem", borderRadius: 10, border: "1px solid #0329b2", color: "#0329b2", textDecoration: "none", fontWeight: 700 }}>Browse Tutors</Link>
      </div>

      {isPakistan && (
        <section style={{ margin: "2.5rem 0", padding: "1.5rem", border: "1px solid #dbeafe", borderRadius: 16, background: "#f8fbff" }}>
          <h2 style={{ color: "#021550", marginTop: 0 }}>Find tutors across Pakistan</h2>
          <p>Explore live tutor inventory by city, subject, academic level and exam. Thin combinations are kept out of the search index until matching tutor supply exists.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", margin: "1rem 0 1.5rem" }}>
            {pakistanInventory.map(({ citySlug, city, total }) => (
              <Link key={citySlug} href={`/tutors/city/${citySlug}`} style={{ padding: "0.9rem", background: "white", border: "1px solid #e2e8f0", borderRadius: 10, color: "#0329b2", textDecoration: "none", fontWeight: 700 }}>
                {city} tutors{total > 0 ? ` (${total})` : ""}
              </Link>
            ))}
          </div>
          <h3 style={{ color: "#021550" }}>Popular subjects</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
            {LOCAL_SUBJECT_SLUGS.map((subjectSlug) => (
              <Link key={subjectSlug} href={`/tutors/subject/${subjectSlug}`} style={{ padding: "0.55rem 0.8rem", borderRadius: 999, border: "1px solid #bfdbfe", color: "#0329b2", textDecoration: "none", fontWeight: 600 }}>{SUBJECTS[subjectSlug]}</Link>
            ))}
          </div>
          <h3 style={{ color: "#021550", marginTop: "1.5rem" }}>Academic levels & exams</h3>
          <p><Link href="/pk/tutors/level/matric">Matric tutors</Link> · <Link href="/pk/tutors/level/intermediate">Intermediate / FSc tutors</Link> · <Link href="/pk/tutors/level/o-level">O-Level tutors</Link> · <Link href="/pk/tutors/level/a-level">A-Level tutors</Link> · <Link href="/pk/tutors/exam/mdcat">MDCAT tutors</Link> · <Link href="/pk/tutors/exam/ecat">ECAT tutors</Link> · <Link href="/pk/tutors/exam/ielts">IELTS tutors</Link></p>
          <p style={{ marginBottom: 0, marginTop: "1.5rem" }}><Link href="/tuition-requests/pk">Browse tuition requests in Pakistan</Link> · <Link href="/pk/home-tutors/lahore">Home tutors in Lahore</Link> · <Link href="/pk/home-tutors/islamabad">Home tutors in Islamabad</Link> · <Link href="/pk/home-tutors/karachi">Home tutors in Karachi</Link></p>
        </section>
      )}

      <section>
        <h2>How this market works</h2>
        <p><strong>Currency:</strong> Student budgets and market offers use {market.currency} ({market.currencySymbol}). Existing bookings retain their original transaction currency even if the user later changes market.</p>
        <p><strong>Online Tuition:</strong> {market.onlineTuitionEnabled ? "Available worldwide; online tutors are not restricted to the student's country." : "Not currently enabled."}</p>
        <p><strong>Home Tuition:</strong> {market.homeTuitionEnabled ? `Available locally in ${market.countryName}, subject to location and verification requirements.` : "Not yet enabled for this market."}</p>
        <p><strong>Checkout:</strong> {market.checkoutEnabled ? `Enabled for the ${market.countryName} market using supported payment methods.` : "Not yet live. TUTORERA will not present a payment method as available until market checkout is activated."}</p>
        <p><Link href={market.legalSchedule}>Read the {market.countryName} legal schedule</Link></p>
      </section>
      {country.curricula?.length > 0 && <section style={{ marginTop: "2.5rem" }}><h2>Relevant curricula</h2><p>{country.curricula.join(" · ")}</p></section>}
    </main>
  );
}
