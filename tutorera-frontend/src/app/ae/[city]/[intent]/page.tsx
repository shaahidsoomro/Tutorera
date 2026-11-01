import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketByRoute } from "@/lib/markets";

const CITIES = {
  dubai: "Dubai",
  "abu-dhabi": "Abu Dhabi",
  sharjah: "Sharjah",
} as const;

const INTENTS = {
  tuition: { label: "Tuition", mode: "online tuition", action: "Post an online-tuition requirement" },
  "home-tuition": { label: "Home Tuition", mode: "home tuition", action: "Post a home-tuition requirement" },
  "online-tuition": { label: "Online Tuition", mode: "online tuition", action: "Post an online-tuition requirement" },
} as const;

type City = keyof typeof CITIES;
type Intent = keyof typeof INTENTS;

export function generateStaticParams() {
  return (Object.keys(CITIES) as City[]).flatMap((city) =>
    (Object.keys(INTENTS) as Intent[])
      .filter((intent) => intent !== "home-tuition" || getMarketByRoute("ae")?.homeTuitionEnabled)
      .map((intent) => ({ city, intent })),
  );
}

export async function generateMetadata({ params }: { params: Promise<{ city: string; intent: string }> }): Promise<Metadata> {
  const { city, intent } = await params;
  if (!(city in CITIES) || !(intent in INTENTS)) return {};
  const cityName = CITIES[city as City];
  const page = INTENTS[intent as Intent];
  const title = `${page.label} in ${cityName} | Post a Requirement | TUTORERA`;
  return {
    title,
    description: `Find ${page.mode} in ${cityName}, UAE, by posting your learning requirement, schedule, and preferred budget in AED. Eligible tutors can send offers for you to compare.`,
    alternates: { canonical: `/ae/${city}/${intent}` },
  };
}

export default async function UAECityTuitionIntentPage({ params }: { params: Promise<{ city: string; intent: string }> }) {
  const { city, intent } = await params;
  if (!(city in CITIES) || !(intent in INTENTS) || (intent === "home-tuition" && !getMarketByRoute("ae")?.homeTuitionEnabled)) notFound();
  const cityName = CITIES[city as City];
  const page = INTENTS[intent as Intent];
  const postHref =
    intent === "home-tuition"
      ? "/post-home-tuition-request?country=AE"
      : intent === "online-tuition"
      ? "/post-online-tuition-request?country=AE"
      : "/post-tuition-request?country=AE";
  const question = `How do I find ${page.mode} in ${cityName}, UAE?`;
  const answer = `On TUTORERA, you can post a ${page.mode} requirement with the subject, curriculum (IGCSE, A-Level, IB, American), preferred schedule, approximate area where relevant, and preferred budget in AED. Eligible tutors can then submit offers, so you can compare options before choosing a tutor. Exact addresses and private contact details are not shown before a confirmed booking.`;
  const canonical = `https://tutorera.ac.pk/ae/${city}/${intent}`;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "@id": `${canonical}#webpage`,
                name: `${page.label} in ${cityName}`,
                url: canonical,
                description: answer,
                isPartOf: { "@id": "https://tutorera.ac.pk/#website" },
                breadcrumb: { "@id": `${canonical}#breadcrumb` },
                inLanguage: "en-AE",
              },
              {
                "@type": "BreadcrumbList",
                "@id": `${canonical}#breadcrumb`,
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: "https://tutorera.ac.pk/" },
                  { "@type": "ListItem", position: 2, name: "UAE", item: "https://tutorera.ac.pk/ae" },
                  { "@type": "ListItem", position: 3, name: cityName, item: `https://tutorera.ac.pk/ae/${city}/tuition` },
                  { "@type": "ListItem", position: 4, name: page.label, item: canonical },
                ],
              },
              {
                "@type": "FAQPage",
                mainEntity: [
                  { "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } },
                ],
              },
            ],
          }),
        }}
      />
      <nav aria-label="Breadcrumb" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        <Link href="/">Home</Link>{" / "}<Link href="/ae">UAE</Link>{" / "}<span>{cityName}</span>{" / "}<span>{page.label}</span>
      </nav>
      <header style={{ maxWidth: 760 }}>
        <p style={{ color: "#016EF8", fontWeight: 700, marginBottom: "0.5rem" }}>STUDENT-FIRST TUITION MATCHING</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", lineHeight: 1.1, color: "#021550", margin: 0 }}>
          {page.label} in {cityName}
        </h1>
        <p style={{ fontSize: "1.15rem", lineHeight: 1.7, color: "#475569" }}>
          Tell tutors what you need, set a preferred budget in AED, and compare eligible tutor offers before you choose.
        </p>
        <Link
          href={postHref}
          style={{
            display: "inline-block",
            background: "#0329B2",
            color: "white",
            padding: "0.85rem 1.2rem",
            borderRadius: "0.5rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {page.action}
        </Link>
      </header>

      <section style={{ marginTop: "2.5rem", padding: "1.5rem", background: "#F5F7FF", borderRadius: "0.75rem" }}>
        <h2 style={{ color: "#021550", marginTop: 0 }}>{question}</h2>
        <p style={{ color: "#374151", lineHeight: 1.7, marginBottom: 0 }}>{answer}</p>
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 style={{ color: "#021550" }}>How it works</h2>
        <ol style={{ color: "#374151", lineHeight: 1.8, paddingLeft: "1.25rem" }}>
          <li>Describe the subject, curriculum, schedule and teaching mode.</li>
          <li>Set a preferred budget in AED that tutors can accept or respond to when counter-offers are enabled.</li>
          <li>Compare eligible tutor profiles and offers, then choose the option that fits your needs.</li>
        </ol>
      </section>

      <section style={{ marginTop: "2.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link href={postHref}>Post a requirement</Link>
        <Link href={`/ae`}>UAE tuition hub</Link>
        <Link href="/how-it-works">How tutor offers work</Link>
        <Link href="/safety">Read safety guidance</Link>
      </section>
    </main>
  );
}
