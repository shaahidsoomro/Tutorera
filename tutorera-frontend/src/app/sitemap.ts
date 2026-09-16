import { MARKETS } from "@/lib/markets";
import { SITE_URL } from "@/lib/site";
import { CITIES,LEVELS,LOCAL_SUBJECT_SLUGS,PRIMARY_CITY_SLUGS,SUBJECTS,fetchTutors,tutorProfileSlug } from "@/lib/tutor-directory";
import { assessTutorSeoQuality } from "@/lib/tutor-seo";
import type { MetadataRoute } from "next";

const routes = [
  "", "online-tutors", "about", "become-a-tutor", "blog", "business-model", "contact", "coverage", "first-session-guarantee", "team",
  "help", "help/for-parents", "help/for-tutors", "how-it-works", "how-tutor-offers-work", "levels", "locations", "pricing",
  "payment-process", "refund-policy", "safety-policy", "services", "student-journey", "subjects", "tutors", "terms", "privacy", "complaint-process", "cancellation-policy",
  "tutor-verification-standards", "in-person-home-tuition-terms", "review-policy", "editorial-policy", "academic-standards",
  "content-review-policy", "research-methodology", "tutor-screening-policy", "governance",
  "tuition-requests", "tuition-requests/pk", "tuition-requests/pk/lahore", "tuition-requests/pk/islamabad", "tuition-requests/pk/karachi",
  "blog/how-to-find-a-trusted-tutor-in-pakistan", "blog/online-vs-home-tuition-in-pakistan",
  "blog/what-to-look-for-before-hiring-a-tutor-pakistan",
];

const HOME_TUTOR_CITY_SLUGS = ["lahore", "islamabad", "karachi"] as const;
const PAKISTAN_LEVEL_SLUGS = ["matric", "intermediate", "o-level", "a-level"] as const;
const PAKISTAN_EXAM_SLUGS = ["mdcat", "ecat", "ielts"] as const;
const CURRICULUM_SUBJECT_SLUGS = ["mathematics", "physics", "chemistry", "biology", "english", "computer-science"] as const;
const CURRICULUM_CITY_SLUGS = ["lahore", "karachi", "islamabad", "rawalpindi", "faisalabad"] as const;

type SitemapEntry = MetadataRoute.Sitemap[number];

function liveOnly<T>(items: Array<T | null>): T[] {
  return items.filter((item): item is T => item !== null);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticPages: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${SITE_URL}/${route}`,
    lastModified,
    changeFrequency: route === "" || route === "tutors" || route === "online-tutors" ? "daily" : "monthly",
    priority: route === "" ? 1 : route === "tutors" || route === "online-tutors" ? 0.9 : 0.7,
  }));

  const marketPages: MetadataRoute.Sitemap = Object.values(MARKETS)
    .filter((market) => market.status === "LIVE")
    .map((market) => ({
      url: `${SITE_URL}/${market.route}`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: { languages: { [market.locale]: `${SITE_URL}/${market.route}`, "x-default": SITE_URL } },
    }));

  const [{ tutors }, subjectDirectoryResults, cityDirectoryResults, levelDirectoryResults] = await Promise.all([
    fetchTutors({}, 500),
    Promise.all(Object.entries(SUBJECTS).map(async ([slug, subject]) => {
      const { total } = await fetchTutors({ subject }, 1);
      return total > 0
        ? { url: `${SITE_URL}/tutors/subject/${slug}`, lastModified, changeFrequency: "daily" as const, priority: 0.8 }
        : null;
    })),
    Promise.all(Object.entries(CITIES).map(async ([slug, city]) => {
      const { total } = await fetchTutors({ city }, 1);
      return total > 0
        ? { url: `${SITE_URL}/tutors/city/${slug}`, lastModified, changeFrequency: "daily" as const, priority: 0.8 }
        : null;
    })),
    Promise.all(Object.entries(LEVELS).map(async ([slug, level]) => {
      const { total } = await fetchTutors({ level }, 1);
      return total > 0
        ? { url: `${SITE_URL}/tutors/level/${slug}`, lastModified, changeFrequency: "daily" as const, priority: 0.8 }
        : null;
    })),
  ]);

  const indexableTutors = tutors.filter((tutor) => assessTutorSeoQuality(tutor).indexable);
  const profiles: MetadataRoute.Sitemap = indexableTutors.map((tutor) => ({
    url: `${SITE_URL}/tutors/${tutorProfileSlug(tutor)}`,
    lastModified,
    changeFrequency: "weekly",
    priority: tutor.totalReviews > 0 ? 0.75 : 0.7,
  }));

  const localResults = await Promise.all(PRIMARY_CITY_SLUGS.flatMap((citySlug) => LOCAL_SUBJECT_SLUGS.map(async (subjectSlug) => {
    const city = CITIES[citySlug];
    const subject = SUBJECTS[subjectSlug];
    const { total } = await fetchTutors({ countryCode: "PK", city, subject }, 1);
    return total > 0
      ? { url: `${SITE_URL}/tutors/city/${citySlug}/${subjectSlug}`, lastModified, changeFrequency: "daily" as const, priority: 0.85 }
      : null;
  })));

  const countryHubResults = await Promise.all(Object.values(MARKETS).map(async (market) => {
    if (market.status !== "LIVE") return null;
    const { total } = await fetchTutors({ countryCode: market.isoCountryCode }, 1);
    return total > 0 ? {
      url: `${SITE_URL}/${market.route}/tutors`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.85,
      alternates: { languages: { [market.locale]: `${SITE_URL}/${market.route}/tutors`, "x-default": `${SITE_URL}/tutors` } },
    } : null;
  }));

  const homeTutorResults = await Promise.all(HOME_TUTOR_CITY_SLUGS.map(async (citySlug) => {
    const city = CITIES[citySlug];
    const { total } = await fetchTutors({ countryCode: "PK", city, teachingMode: "in-person" }, 1);
    return total > 0
      ? { url: `${SITE_URL}/pk/home-tutors/${citySlug}`, lastModified, changeFrequency: "daily" as const, priority: 0.9 }
      : null;
  }));

  const pakistanLevelResults = await Promise.all(PAKISTAN_LEVEL_SLUGS.map(async (levelSlug) => {
    const level = LEVELS[levelSlug];
    const { total } = await fetchTutors({ countryCode: "PK", level }, 1);
    return total > 0
      ? { url: `${SITE_URL}/pk/tutors/level/${levelSlug}`, lastModified, changeFrequency: "daily" as const, priority: 0.88 }
      : null;
  }));

  const pakistanExamResults = await Promise.all(PAKISTAN_EXAM_SLUGS.map(async (examSlug) => {
    const subject = SUBJECTS[examSlug];
    const { total } = await fetchTutors({ countryCode: "PK", subject }, 1);
    return total > 0
      ? { url: `${SITE_URL}/pk/tutors/exam/${examSlug}`, lastModified, changeFrequency: "daily" as const, priority: 0.88 }
      : null;
  }));

  const curriculumResults = await Promise.all(CURRICULUM_CITY_SLUGS.flatMap((citySlug) => PAKISTAN_LEVEL_SLUGS.flatMap((levelSlug) => CURRICULUM_SUBJECT_SLUGS.map(async (subjectSlug) => {
    const city = CITIES[citySlug];
    const level = LEVELS[levelSlug];
    const subject = SUBJECTS[subjectSlug];
    const { total } = await fetchTutors({ countryCode: "PK", city, level, subject }, 1);
    return total > 0 ? {
      url: `${SITE_URL}/pk/tutors/city/${citySlug}/${levelSlug}/${subjectSlug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.9,
    } : null;
  }))));

  const research: MetadataRoute.Sitemap = tutors.length >= 10 ? [
    { url: `${SITE_URL}/research/pakistan-tutoring-rates`, lastModified, changeFrequency: "weekly", priority: 0.75 },
    { url: `${SITE_URL}/research/tutoring-index`, lastModified, changeFrequency: "weekly", priority: 0.75 },
  ] : [];

  const tuitionRequestDemandPages: MetadataRoute.Sitemap = localResults.flatMap((page, index) => {
    if (!page) return [];
    const citySlug = PRIMARY_CITY_SLUGS[Math.floor(index / LOCAL_SUBJECT_SLUGS.length)];
    const subjectSlug = LOCAL_SUBJECT_SLUGS[index % LOCAL_SUBJECT_SLUGS.length];
    return [{ url: `${SITE_URL}/tuition-requests/pk/${citySlug}/${subjectSlug}`, lastModified, changeFrequency: "daily" as const, priority: 0.8 }];
  });

  const entries: SitemapEntry[] = [
    ...staticPages,
    ...marketPages,
    ...liveOnly(subjectDirectoryResults),
    ...liveOnly(cityDirectoryResults),
    ...liveOnly(levelDirectoryResults),
    ...liveOnly(countryHubResults),
    ...liveOnly(homeTutorResults),
    ...liveOnly(localResults),
    ...liveOnly(pakistanLevelResults),
    ...liveOnly(pakistanExamResults),
    ...liveOnly(curriculumResults),
    ...research,
    ...profiles,
    ...tuitionRequestDemandPages,
  ];

  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}
