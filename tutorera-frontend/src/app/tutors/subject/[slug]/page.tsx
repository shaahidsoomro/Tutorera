import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import SeoTutorDirectory from "@/components/Tutors/SeoTutorDirectory";
import CurriculumInfo from "@/components/Tutors/CurriculumInfo";
import { CITIES, LOCAL_SUBJECT_SLUGS, PRIMARY_CITY_SLUGS, SUBJECTS, fetchTutors } from "@/lib/tutor-directory";
import { SeoEligibilityService } from "@/lib/seo-eligibility";
import { CURRICULUM_CONTENT } from "@/lib/curriculum-content";

// Cities that have dedicated city-hub pages and can receive cross-links
const CROSS_LINK_CITY_SLUGS = [
  "lahore", "karachi", "islamabad", "rawalpindi", "faisalabad",
  "dubai", "abu-dhabi", "sharjah",
  "riyadh", "jeddah", "dammam",
  "london", "manchester", "birmingham",
  "new-york", "los-angeles", "chicago",
] as const;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(SUBJECTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const subject = SUBJECTS[slug as keyof typeof SUBJECTS];
  if (!subject) return {};
  const path = `/tutors/subject/${slug}`;

  let robotsIndex = false;
  try {
    const { total } = await fetchTutors({ subject }, 1);
    const eligibility = SeoEligibilityService.evaluatePage({ activeApprovedTutors: total, homeTuitionEnabled: true });
    robotsIndex = eligibility === "INDEX";
  } catch {
    robotsIndex = false;
  }

  return {
    title: `${subject} Tutor — Find Verified ${subject} Tutors | TUTORERA`,
    description: `Find a verified ${subject} tutor for online or in-person lessons. Post your requirement, set a budget, and compare ${subject} tutor offers on TUTORERA — the student-first tutoring marketplace.`,
    alternates: { canonical: path },
    robots: { index: robotsIndex, follow: true },
    openGraph: {
      title: `${subject} Tutor — Verified Tutors | TUTORERA®`,
      description: `Compare verified ${subject} tutors on TUTORERA. Post your requirement free — eligible tutors send offers you compare before choosing.`,
      url: path,
    },
    twitter: { title: `${subject} Tutor — Find Verified ${subject} Tutors | TUTORERA`, description: `Find a verified ${subject} tutor for online or in-person lessons. Post your requirement, set a budget, and compare ${subject} tutor offers on TUTORERA — the student-first tutoring marketplace.` },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const subject = SUBJECTS[slug as keyof typeof SUBJECTS];
  if (!subject) notFound();

  const curriculum = CURRICULUM_CONTENT[slug];
  const canonical = `https://tutorera.ac.pk/tutors/subject/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        name: `${subject} Tutor — Find Verified ${subject} Tutors`,
        url: canonical,
        description: `Find a verified ${subject} tutor for online or in-person lessons. Post your requirement and compare offers on TUTORERA.`,
        isPartOf: { "@id": "https://tutorera.ac.pk/#website" },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://tutorera.ac.pk/" },
          { "@type": "ListItem", position: 2, name: "Find Tutors", item: "https://tutorera.ac.pk/tutors" },
          { "@type": "ListItem", position: 3, name: `${subject} Tutor`, item: canonical },
        ],
      },
      {
        "@type": "Service",
        name: `${subject} Tutoring`,
        description: `Personalised ${subject} tutoring sessions delivered online or in person. Students post requirements; verified tutors submit offers to compare.`,
        provider: { "@type": "Organization", name: "TUTORERA", url: "https://tutorera.ac.pk" },
        serviceType: "Private tutoring",
        areaServed: ["PK", "AE", "SA", "GB", "US"],
        url: canonical,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `How do I find a ${subject} tutor on TUTORERA?`,
            acceptedAnswer: { "@type": "Answer", text: `Post a free ${subject} tuition requirement — include your level, curriculum, schedule and preferred budget. Verified ${subject} tutors can then send offers for you to compare before choosing.` },
          },
          {
            "@type": "Question",
            name: `Are ${subject} tutors on TUTORERA verified?`,
            acceptedAnswer: { "@type": "Answer", text: `Yes. Every tutor must submit qualifications and pass TUTORERA's subject-specific approval process before they can respond to ${subject} tuition requirements.` },
          },
        ],
      },
    ],
  };

  // Related subjects for cross-linking — subjects in same category
  const relatedSubjectSlugs = Object.keys(SUBJECTS).filter(
    (s) => s !== slug && CURRICULUM_CONTENT[s]
  ).slice(0, 8);
  const relatedLinks = [
    ...relatedSubjectSlugs.map((s) => ({
      label: `${SUBJECTS[s as keyof typeof SUBJECTS]} Tutors`,
      href: `/tutors/subject/${s}`,
    })),
    ...CROSS_LINK_CITY_SLUGS.slice(0, 6).map((citySlug) => ({
      label: `${subject} Tutors in ${(CITIES as Record<string, string>)[citySlug] || citySlug}`,
      href: `/tutors/city/${citySlug}/${slug}`,
    })),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SeoTutorDirectory
        kind="subject"
        value={subject}
        title={`${subject} Tutor — Find Verified ${subject} Tutors`}
        description={`Compare verified ${subject} tutors for online worldwide learning and local in-person lessons where available.`}
        canonicalPath={`/tutors/subject/${slug}`}
        relatedLinks={relatedLinks}
      />
      {curriculum && <CurriculumInfo content={curriculum} />}
      <nav aria-label={`${subject} tutors by city`} style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.5rem 4rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>{subject} tutors by city</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
          {CROSS_LINK_CITY_SLUGS.map((citySlug) => (
            <Link
              key={citySlug}
              href={`/tutors/city/${citySlug}/${slug}`}
              style={{ color: "#0329B2", background: "#EEF5FF", padding: ".6rem 1rem", borderRadius: 999, textDecoration: "none", fontWeight: 600 }}
            >
              {(CITIES as Record<string, string>)[citySlug] || citySlug}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
