import { MARKETS } from "@/lib/markets";
import { SITE_URL } from "@/lib/site";
import {
  CITIES,
  LEVELS,
  LOCAL_SUBJECT_SLUGS,
  PRIMARY_CITY_SLUGS,
  SUBJECTS,
  fetchTutorSeoFacets,
  fetchTutors,
  tutorProfileSlug,
} from "@/lib/tutor-directory";
import { fetchRequestSeoFacets } from "@/lib/tuition-requests";
import { assessTutorSeoQuality } from "@/lib/tutor-seo";
import type { MetadataRoute } from "next";

const routes = [
  "", "online-tutors", "about", "become-a-tutor", "blog", "business-model", "contact", "coverage", "first-session-guarantee", "team",
  "help", "help/for-parents", "help/for-tutors", "how-it-works", "how-tutor-offers-work", "levels", "locations", "pricing",
  "payment-process", "refund-policy", "safety-policy", "services", "student-journey", "subjects", "tutors", "terms", "privacy", "complaint-process", "cancellation-policy",
  "tutor-verification-standards", "in-person-home-tuition-terms", "review-policy", "editorial-policy", "academic-standards",
  "content-review-policy", "research-methodology", "tutor-screening-policy", "governance",
  "tuition-requests",
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

function hasFacet<T extends { _id: unknown }>(items: T[], predicate: (item: T) => boolean) {
  return items.some(predicate);
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

  // One cached inventory facet request replaces dozens of live API queries during
  // sitemap generation. Individual tutor profile retrieval remains capped at 500.
  const [facets, demandFacets, tutorDirectory] = await Promise.all([
    fetchTutorSeoFacets(),
    fetchRequestSeoFacets(),
    fetchTutors({}, 500),
  ]);

  const subjectDirectoryResults = Object.entries(SUBJECTS).map(([slug, subject]) => {
    const live = Boolean(facets && hasFacet(facets.subjects, (item) => item._id.subject.toLowerCase() === subject.toLowerCase()));
    return live ? {
      url: `${SITE_URL}/tutors/subject/${slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    } : null;
  });

  const cityDirectoryResults = Object.entries(CITIES).map(([slug, city]) => {
    const live = Boolean(facets && hasFacet(facets.cities, (item) => item._id.city.toLowerCase() === city.toLowerCase()));
    return live ? {
      url: `${SITE_URL}/tutors/city/${slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    } : null;
  });

  const levelDirectoryResults = Object.entries(LEVELS).map(([slug, level]) => {
    const live = Boolean(facets && hasFacet(facets.levels, (item) => item._id.level.toLowerCase() === level.toLowerCase()));
    return live ? {
      url: `${SITE_URL}/tutors/level/${slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    } : null;
  });

  const indexableTutors = tutorDirectory.tutors.filter((tutor) => assessTutorSeoQuality(tutor).indexable);
  const profiles: MetadataRoute.Sitemap = indexableTutors.map((tutor) => ({
    url: `${SITE_URL}/tutors/${tutorProfileSlug(tutor)}`,
    lastModified: tutor.updatedAt ? new Date(tutor.updatedAt) : lastModified,
    changeFrequency: "weekly",
    priority: tutor.totalReviews > 0 ? 0.75 : 0.7,
  }));

  const localResults = PRIMARY_CITY_SLUGS.flatMap((citySlug) =>
    LOCAL_SUBJECT_SLUGS.map((subjectSlug) => {
      const city = CITIES[citySlug];
      const subject = SUBJECTS[subjectSlug];
      const live = Boolean(facets && hasFacet(
        facets.citySubjects,
        (item) =>
          item._id.countryCode === "PK" &&
          item._id.city.toLowerCase() === city.toLowerCase() &&
          item._id.subject.toLowerCase() === subject.toLowerCase()
      ));
      return live ? {
        url: `${SITE_URL}/tutors/city/${citySlug}/${subjectSlug}`,
        lastModified,
        changeFrequency: "daily" as const,
        priority: 0.85,
      } : null;
    })
  );

  const countryHubResults = Object.values(MARKETS).map((market) => {
    if (market.status !== "LIVE") return null;
    const live = Boolean(facets && facets.countries.some((item) => item._id === market.isoCountryCode));
    return live ? {
      url: `${SITE_URL}/${market.route}/tutors`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.85,
      alternates: { languages: { [market.locale]: `${SITE_URL}/${market.route}/tutors`, "x-default": `${SITE_URL}/tutors` } },
    } : null;
  });

  const homeTutorResults = await Promise.all(HOME_TUTOR_CITY_SLUGS.map(async (citySlug) => {
    const city = CITIES[citySlug];
    const { total } = await fetchTutors({ countryCode: "PK", city, teachingMode: "in-person" }, 1);
    return total > 0
      ? { url: `${SITE_URL}/pk/home-tutors/${citySlug}`, lastModified, changeFrequency: "daily" as const, priority: 0.9 }
      : null;
  }));

  const pakistanLevelResults = PAKISTAN_LEVEL_SLUGS.map((levelSlug) => {
    const level = LEVELS[levelSlug];
    const live = Boolean(facets && hasFacet(
      facets.levels,
      (item) => item._id.countryCode === "PK" && item._id.level.toLowerCase() === level.toLowerCase()
    ));
    return live ? {
      url: `${SITE_URL}/pk/tutors/level/${levelSlug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.88,
    } : null;
  });

  const pakistanExamResults = PAKISTAN_EXAM_SLUGS.map((examSlug) => {
    const subject = SUBJECTS[examSlug];
    const live = Boolean(facets && hasFacet(
      facets.subjects,
      (item) => item._id.countryCode === "PK" && item._id.subject.toLowerCase() === subject.toLowerCase()
    ));
    return live ? {
      url: `${SITE_URL}/pk/tutors/exam/${examSlug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.88,
    } : null;
  });

  const curriculumResults = CURRICULUM_CITY_SLUGS.flatMap((citySlug) =>
    PAKISTAN_LEVEL_SLUGS.flatMap((levelSlug) =>
      CURRICULUM_SUBJECT_SLUGS.map((subjectSlug) => {
        const city = CITIES[citySlug];
        const level = LEVELS[levelSlug];
        const subject = SUBJECTS[subjectSlug];
        const live = Boolean(facets && hasFacet(
          facets.cityLevelSubjects,
          (item) =>
            item._id.countryCode === "PK" &&
            item._id.city.toLowerCase() === city.toLowerCase() &&
            item._id.level.toLowerCase() === level.toLowerCase() &&
            item._id.subject.toLowerCase() === subject.toLowerCase()
        ));
        return live ? {
          url: `${SITE_URL}/pk/tutors/city/${citySlug}/${levelSlug}/${subjectSlug}`,
          lastModified,
          changeFrequency: "daily" as const,
          priority: 0.9,
        } : null;
      })
    )
  );

  // Demand URLs are admitted to the sitemap only when an active public request
  // actually exists for that exact country/city/subject combination.
  const demandCityResults = PRIMARY_CITY_SLUGS.map((citySlug) => {
    const city = CITIES[citySlug];
    const live = Boolean(demandFacets && demandFacets.citySubjects.some(
      (item) => item._id.countryCode === "PK" && item._id.city.toLowerCase() === city.toLowerCase()
    ));
    return live ? {
      url: `${SITE_URL}/tuition-requests/pk/${citySlug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    } : null;
  });

  const demandSubjectResults = PRIMARY_CITY_SLUGS.flatMap((citySlug) =>
    LOCAL_SUBJECT_SLUGS.map((subjectSlug) => {
      const city = CITIES[citySlug];
      const subject = SUBJECTS[subjectSlug];
      const live = Boolean(demandFacets && demandFacets.citySubjects.some(
        (item) =>
          item._id.countryCode === "PK" &&
          item._id.city.toLowerCase() === city.toLowerCase() &&
          item._id.subject.toLowerCase() === subject.toLowerCase()
      ));
      return live ? {
        url: `${SITE_URL}/tuition-requests/pk/${citySlug}/${subjectSlug}`,
        lastModified,
        changeFrequency: "daily" as const,
        priority: 0.8,
      } : null;
    })
  );

  const research: MetadataRoute.Sitemap = tutorDirectory.total >= 10 ? [
    { url: `${SITE_URL}/research/pakistan-tutoring-rates`, lastModified, changeFrequency: "weekly", priority: 0.75 },
    { url: `${SITE_URL}/research/tutoring-index`, lastModified, changeFrequency: "weekly", priority: 0.75 },
  ] : [];

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
    ...liveOnly(demandCityResults),
    ...liveOnly(demandSubjectResults),
    ...research,
    ...profiles,
  ];

  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}
