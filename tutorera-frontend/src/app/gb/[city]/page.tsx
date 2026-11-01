import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketByRoute } from "@/lib/markets";

const CITIES = {
  london:     { name: "London",     currency: "GBP", currencyName: "British Pounds" },
  birmingham: { name: "Birmingham", currency: "GBP", currencyName: "British Pounds" },
  manchester: { name: "Manchester", currency: "GBP", currencyName: "British Pounds" },
  leeds:      { name: "Leeds",      currency: "GBP", currencyName: "British Pounds" },
  glasgow:    { name: "Glasgow",    currency: "GBP", currencyName: "British Pounds" },
  edinburgh:  { name: "Edinburgh",  currency: "GBP", currencyName: "British Pounds" },
  bradford:   { name: "Bradford",   currency: "GBP", currencyName: "British Pounds" },
} as const;

type CitySlug = keyof typeof CITIES;

const SUBJECTS = [
  { slug: "mathematics", label: "Mathematics" },
  { slug: "physics",     label: "Physics" },
  { slug: "chemistry",   label: "Chemistry" },
  { slug: "biology",     label: "Biology" },
  { slug: "english",     label: "English" },
  { slug: "economics",   label: "Economics" },
  { slug: "computer-science", label: "Computer Science" },
  { slug: "ielts",       label: "IELTS" },
];

const CURRICULA = ["GCSE (AQA / Edexcel / OCR)", "A-Level", "IGCSE (Cambridge / Edexcel)", "11+ / 13+ Entrance", "National 5 / Highers (Scotland)"];

export function generateStaticParams() {
  return (Object.keys(CITIES) as CitySlug[]).map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  if (!(city in CITIES)) return {};
  const c = CITIES[city as CitySlug];
  return {
    title: `Tutors in ${c.name} — Find Verified ${c.name} Tutors | TUTORERA`,
    description: `Find verified online tutors for learners in ${c.name}, UK for GCSE, A-Level, IGCSE and other curricula. Post your requirement, set a budget in ${c.currency}, and compare tutor offers on TUTORERA.`,
    alternates: { canonical: `/gb/${city}` },
    openGraph: {
      title: `Tutors in ${c.name} | TUTORERA®`,
      description: `Post a free online tuition requirement for ${c.name}. Verified tutors submit offers in ${c.currency} — compare before you choose.`,
      url: `/gb/${city}`,
    },
  };
}

export default async function UKCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  if (!(city in CITIES)) notFound();
  const c = CITIES[city as CitySlug];
  const homeTuitionEnabled = getMarketByRoute("uk")?.homeTuitionEnabled ?? false;
  const canonical = `https://tutorera.ac.pk/gb/${city}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        name: `Tutors in ${c.name}, UK`,
        url: canonical,
        description: `Find verified online tutors for learners in ${c.name}, UK. Post your requirement on TUTORERA and compare offers from approved tutors.`,
        isPartOf: { "@id": "https://tutorera.ac.pk/#website" },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
        inLanguage: "en-GB",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://tutorera.ac.pk/" },
          { "@type": "ListItem", position: 2, name: "UK Tutors", item: "https://tutorera.ac.pk/gb" },
          { "@type": "ListItem", position: 3, name: `Tutors in ${c.name}`, item: canonical },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `How do I find a tutor in ${c.name}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Post a free online tuition requirement on TUTORERA — specify your subject, curriculum (GCSE, A-Level, IGCSE), level, schedule, and preferred budget in ${c.currency}. Eligible verified tutors can send you offers to compare before choosing.`,
            },
          },
          {
            "@type": "Question",
            name: `What curricula can tutors in ${c.name} teach?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Tutors in ${c.name} on TUTORERA cover GCSE, A-Level, IGCSE, 11+ / 13+ entrance exams, and (in Scotland) National 5 / Highers. Specify your curriculum when posting so eligible tutors can respond.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.25rem 5rem" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" style={{ fontSize: "0.9rem", marginBottom: "1.5rem", color: "#64748b" }}>
        <Link href="/">Home</Link>{" / "}<Link href="/gb">UK</Link>{" / "}<span>{c.name}</span>
      </nav>

      <header style={{ maxWidth: 760, marginBottom: "2.5rem" }}>
        <p style={{ color: "#016EF8", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          STUDENT-FIRST TUTORING · {c.name.toUpperCase()}, UK
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.1, color: "#021550", margin: "0 0 1rem" }}>
          Find a Tutor in {c.name}
        </h1>
        <p style={{ fontSize: "1.1rem", lineHeight: 1.7, color: "#475569", marginBottom: "1.5rem" }}>
          Post your online learning requirement, set a preferred budget in {c.currency}, and compare verified tutor offers before you choose.
        </p>
        <Link
          href="/post-tuition-request?country=GB"
          style={{ display: "inline-block", background: "#0329B2", color: "#fff", padding: "0.85rem 1.5rem", borderRadius: "0.5rem", fontWeight: 700, textDecoration: "none" }}
        >
          Post a requirement — free
        </Link>
      </header>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#021550", marginBottom: "1rem" }}>Popular subjects in {c.name}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {SUBJECTS.map((s) => (
            <Link
              key={s.slug}
              href={`/tutors/city/${city}/${s.slug}`}
              style={{ color: "#0329B2", background: "#EEF5FF", padding: "0.6rem 1rem", borderRadius: 999, textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}
            >
              {s.label} tutor in {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ background: "#F5F7FF", borderRadius: "0.75rem", padding: "1.5rem", marginBottom: "3rem" }}>
        <h2 style={{ color: "#021550", marginTop: 0 }}>Curricula covered in {c.name}</h2>
        <ul style={{ color: "#374151", lineHeight: 1.8, paddingLeft: "1.25rem", margin: 0 }}>
          {CURRICULA.map((curriculum) => <li key={curriculum}>{curriculum}</li>)}
        </ul>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#021550" }}>How TUTORERA works in {c.name}</h2>
        <ol style={{ color: "#374151", lineHeight: 1.9, paddingLeft: "1.25rem" }}>
          <li>Post your subject, curriculum, level, preferred teaching mode, and budget in {c.currency}.</li>
          <li>Verified tutors who match your requirement send you offers — qualifications, experience, and rate included.</li>
          <li>Choose the offer that fits, confirm the booking, and start learning.</li>
        </ol>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#021550" }}>Tuition modes available in {c.name}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          {[
            ...(homeTuitionEnabled ? [{ label: "Home Tuition", desc: `A tutor visits you at your home in ${c.name}.`, href: `/gb/${city}/home-tuition` }] : []),
            { label: "Online Tuition", desc: "Live online sessions — available worldwide.", href: `/gb/${city}/online-tuition` },
          ].map((mode) => (
            <Link key={mode.label} href={mode.href} style={{ display: "block", padding: "1.25rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", textDecoration: "none", color: "#021550" }}>
              <strong style={{ display: "block", marginBottom: "0.4rem" }}>{mode.label}</strong>
              <span style={{ fontSize: "0.9rem", color: "#64748b" }}>{mode.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <nav style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.9rem" }}>
        <Link href="/gb">All UK cities</Link>
        <Link href={`/tutors/city/${city}`}>Browse all {c.name} tutors</Link>
        <Link href="/how-it-works">How tutor offers work</Link>
        <Link href="/safety">Safety guidance</Link>
      </nav>
    </main>
  );
}
