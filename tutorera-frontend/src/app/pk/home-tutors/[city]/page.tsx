import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import { SITE_URL } from "@/lib/site";
import { CITIES,LOCAL_SUBJECT_SLUGS,SUBJECTS,fetchTutors } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import Link from "next/link";

const HOME_TUTOR_CITY_SLUGS = ["lahore", "islamabad", "karachi"] as const;
type HomeTutorCity = typeof HOME_TUTOR_CITY_SLUGS[number];

const cityCopy: Record<HomeTutorCity, { areas: string[]; curricula: string[]; intro: string }> = {
  lahore: {
    areas: ["DHA", "Gulberg", "Johar Town", "Model Town", "Bahria Town", "Cantt"],
    curricula: ["O/A Levels", "Matric", "FSc", "MDCAT", "ECAT"],
    intro: "Find verified home tutors in Lahore for school, college, test preparation, and international curriculum support.",
  },
  islamabad: {
    areas: ["F-6", "F-7", "F-8", "G-10", "G-11", "DHA Islamabad", "Bahria Town"],
    curricula: ["O/A Levels", "Matric", "FSc", "IGCSE", "university foundation"],
    intro: "Compare verified home tutors in Islamabad for in-person lessons, online backup, and structured subject support.",
  },
  karachi: {
    areas: ["DHA", "Clifton", "Gulshan-e-Iqbal", "PECHS", "North Nazimabad", "Bahria Town Karachi"],
    curricula: ["O/A Levels", "Matric", "Intermediate", "SAT", "IELTS"],
    intro: "Browse verified Karachi home tutors for local and international curricula, with student-led offer comparison.",
  },
};

export function generateStaticParams() {
  return HOME_TUTOR_CITY_SLUGS.map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = CITIES[citySlug as keyof typeof CITIES];
  if (!city || !HOME_TUTOR_CITY_SLUGS.includes(citySlug as HomeTutorCity)) return { title: "Home Tutors", robots: { index: false, follow: true } };

  const { total } = await fetchTutors({ city, countryCode: "PK", teachingMode: "in-person" }, 1);
  const path = `/pk/home-tutors/${citySlug}`;
  return {
    title: `Home Tutors in ${city} | Verified In-Person Tutors | TUTORERA`,
    description: `Find verified home tutors in ${city}. Post your tuition requirement, compare tutor offers, rates, subjects, reviews, and availability on TUTORERA.`,
    alternates: { canonical: path },
    robots: total > 0 ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: `Verified Home Tutors in ${city}`,
      description: `Student-led home tuition marketplace for ${city}: post a requirement, receive tutor offers, compare profiles, and book through TUTORERA.`,
      url: `${SITE_URL}${path}`,
    },
  };
}

export default async function PakistanHomeTutorsCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: citySlug } = await params;
  const city = CITIES[citySlug as keyof typeof CITIES];
  if (!city || !HOME_TUTOR_CITY_SLUGS.includes(citySlug as HomeTutorCity)) return null;

  const copy = cityCopy[citySlug as HomeTutorCity];
  const { total } = await fetchTutors({ city, countryCode: "PK", teachingMode: "in-person" }, 1);
  const path = `/pk/home-tutors/${citySlug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}${path}#webpage`,
        url: `${SITE_URL}${path}`,
        name: `Home Tutors in ${city}`,
        description: copy.intro,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `How do I find a verified home tutor in ${city}?`,
            acceptedAnswer: { "@type": "Answer", text: `Post your tuition requirement or browse verified tutor profiles in ${city}. Compare subjects, levels, experience, teaching mode, rates, and reviews before booking.` },
          },
          {
            "@type": "Question",
            name: `Which areas of ${city} does TUTORERA cover?`,
            acceptedAnswer: { "@type": "Answer", text: `Coverage depends on active tutor inventory. Common ${city} localities include ${copy.areas.join(", ")}.` },
          },
          {
            "@type": "Question",
            name: "Does TUTORERA guarantee tutor availability?",
            acceptedAnswer: { "@type": "Answer", text: "Availability depends on active verified tutor inventory, schedule fit, learning mode, and tutor response. Pages are indexed only where inventory exists." },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SeoTutorDirectory
        kind="city"
        value={city}
        filters={{ city, countryCode: "PK", teachingMode: "in-person" }}
        title={`Verified Home Tutors in ${city}`}
        description={`${copy.intro} TUTORERA is a global student-led tutoring marketplace: students post requirements, verified tutors submit offers, and families choose the best fit.`}
        canonicalPath={path}
        currency="PKR"
      />
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 1.5rem 4rem", color: "#475569", lineHeight: 1.8 }}>
        <h2 style={{ color: "#021550", marginBottom: ".75rem" }}>Home tuition coverage in {city}</h2>
        <p>
          TUTORERA lists verified in-person tutors in {city} only when active tutor inventory is available. Current matching inventory signal: {total} {total === 1 ? "profile" : "profiles"}.
        </p>
        <p style={{ marginTop: ".75rem" }}>
          Popular localities include {copy.areas.join(", ")}. Families can compare tutor credentials, subjects, levels, reviews, schedule fit, and proposed PKR rates before confirming a booking.
        </p>
        <h2 style={{ color: "#021550", margin: "2rem 0 .75rem" }}>Popular curriculum support in {city}</h2>
        <p>{copy.curricula.join(", ")} tutoring demand is common in {city}. Students can post exact topics, exam goals, preferred days, and budget so tutors respond with relevant offers.</p>
        <nav aria-label={`${city} home tutor subjects`} style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
          {LOCAL_SUBJECT_SLUGS.map((subjectSlug) => (
            <Link key={subjectSlug} href={`/tutors/city/${citySlug}/${subjectSlug}`} style={{ color: "#0329B2", background: "#EEF5FF", padding: ".6rem 1rem", borderRadius: 999, textDecoration: "none", fontWeight: 700 }}>
              {SUBJECTS[subjectSlug]} tutors in {city}
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}
