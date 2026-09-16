import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { MARKETS } from "@/lib/markets";
import { CITIES, LEVELS, LOCAL_SUBJECT_SLUGS, PRIMARY_CITY_SLUGS, SUBJECTS, fetchTutors, tutorProfileSlug } from "@/lib/tutor-directory";
import { assessTutorSeoQuality } from "@/lib/tutor-seo";
import { getEditorialArticles, getEditorialCategories, categoryToSlug } from "@/lib/editorial-content";

const routes = [
  "", "online-tutors", "about", "become-a-tutor", "blog", "business-model", "contact", "coverage", "first-session-guarantee", "team",
  "help", "help/for-parents", "help/for-tutors", "how-it-works", "how-tutor-offers-work", "levels", "locations", "pricing",
  "payment-process", "refund-policy", "safety-policy", "services", "student-journey", "subjects", "tutors", "terms", "privacy", "complaint-process", "cancellation-policy",
  "tutor-verification-standards", "in-person-home-tuition-terms", "review-policy", "editorial-policy", "academic-standards",
  "content-review-policy", "research-methodology", "tutor-screening-policy", "governance",
  "tuition-requests", "tuition-requests/pk", "tuition-requests/pk/lahore", "tuition-requests/pk/islamabad", "tuition-requests/pk/karachi",
];

const HOME_TUTOR_CITY_SLUGS = ["lahore", "islamabad", "karachi"] as const;
const PAKISTAN_LEVEL_SLUGS = ["matric", "intermediate", "o-level", "a-level"] as const;
const PAKISTAN_EXAM_SLUGS = ["mdcat", "ecat", "ielts"] as const;
const CURRICULUM_SUBJECT_SLUGS = ["mathematics", "physics", "chemistry", "biology", "english", "computer-science"] as const;
const CURRICULUM_CITY_SLUGS = ["lahore", "karachi", "islamabad", "rawalpindi", "faisalabad"] as const;

// A single sitemap file supports up to 50,000 URLs (the sitemaps.org / Google limit).
// Splitting the tutors sitemap into multiple generateSitemaps() ids beyond the original
// 4 was tried and hits a reproducible crash in this Next.js version's multi-sitemap
// route matcher. Keep one tutors shard comfortably below the real 50k ceiling.
const TUTOR_SITEMAP_CAP = 20000;

export async function generateSitemaps() {
  return [
    { id: "core" },
    { id: "local" },
    { id: "demand" },
    { id: "tutors" },
  ];
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  if (id === "core") {
    const staticPages: MetadataRoute.Sitemap = routes.map((route) => ({
      url: `${SITE_URL}/${route}`,
      lastModified,
      changeFrequency: route === "" || route === "tutors" || route === "online-tutors" ? "daily" : "monthly",
      priority: route === "" ? 1 : route === "tutors" || route === "online-tutors" ? 0.9 : 0.7,
    }));

    const liveMarkets = Object.values(MARKETS).filter((market) => market.status === "LIVE");
    const marketPages: MetadataRoute.Sitemap = liveMarkets.map((market) => ({
      url: `${SITE_URL}/${market.route}`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          [market.locale]: `${SITE_URL}/${market.route}`,
          "x-default": SITE_URL,
        },
      },
    }));

    const directories: MetadataRoute.Sitemap = [
      ...Object.keys(SUBJECTS).map((slug) => `/tutors/subject/${slug}`),
      ...Object.keys(CITIES).map((slug) => `/tutors/city/${slug}`),
      ...Object.keys(LEVELS).map((slug) => `/tutors/level/${slug}`),
    ].map((path) => ({ url: `${SITE_URL}${path}`, lastModified, changeFrequency: "daily", priority: 0.8 }));

    const countryHubResults = await Promise.all(
      liveMarkets.map(async (market) => {
        const { total } = await fetchTutors({ countryCode: market.isoCountryCode }, 1);
        return total > 0
          ? {
              url: `${SITE_URL}/${market.route}/tutors`,
              lastModified,
              changeFrequency: "daily" as const,
              priority: 0.85,
              alternates: {
                languages: {
                  [market.locale]: `${SITE_URL}/${market.route}/tutors`,
                  "x-default": `${SITE_URL}/tutors`,
                },
              },
            }
          : null;
      })
    );

    const homeTutorResults = await Promise.all(
      HOME_TUTOR_CITY_SLUGS.map(async (citySlug) => {
        const city = CITIES[citySlug];
        const { total } = await fetchTutors({ countryCode: "PK", city, teachingMode: "in-person" }, 1);
        return total > 0
          ? {
              url: `${SITE_URL}/pk/home-tutors/${citySlug}`,
              lastModified,
              changeFrequency: "daily" as const,
              priority: 0.9,
            }
          : null;
      })
    );

    const research: MetadataRoute.Sitemap = [
      { url: `${SITE_URL}/research/pakistan-tutoring-rates`, lastModified, changeFrequency: "weekly", priority: 0.75 },
      { url: `${SITE_URL}/research/tutoring-index`, lastModified, changeFrequency: "weekly", priority: 0.75 },
    ];

    const [{ articles: blogPosts }, blogCategories] = await Promise.all([
      getEditorialArticles({ limit: 200 }),
      getEditorialCategories(),
    ]);
    const blog: MetadataRoute.Sitemap = [
      ...blogPosts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...blogCategories.map((cat) => ({
        url: `${SITE_URL}/blog/category/${categoryToSlug(cat.category)}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];

    return [
      ...staticPages,
      ...marketPages,
      ...directories,
      ...countryHubResults.filter((page): page is NonNullable<typeof page> => page !== null),
      ...homeTutorResults.filter((page): page is NonNullable<typeof page> => page !== null),
      ...research,
      ...blog,
    ];
  }

  if (id === "local") {
    const TOP_LEVEL_SLUGS = ["primary", "matric", "o-level", "igcse", "a-level"] as const;

    const [cityResults, levelResults, pakistanLevelResults, pakistanExamResults, curriculumResults] = await Promise.all([
      Promise.all(
        PRIMARY_CITY_SLUGS.flatMap((citySlug) =>
          LOCAL_SUBJECT_SLUGS.map(async (subjectSlug) => {
            const city = CITIES[citySlug];
            const subject = SUBJECTS[subjectSlug];
            const { total } = await fetchTutors({ countryCode: "PK", city, subject }, 1);
            return total > 0
              ? {
                  url: `${SITE_URL}/tutors/city/${citySlug}/${subjectSlug}`,
                  lastModified,
                  changeFrequency: "daily" as const,
                  priority: 0.85,
                }
              : null;
          })
        )
      ),
      Promise.all(
        PRIMARY_CITY_SLUGS.flatMap((citySlug) =>
          LOCAL_SUBJECT_SLUGS.slice(0, 5).flatMap((subjectSlug) =>
            TOP_LEVEL_SLUGS.map(async (levelSlug) => {
              const city = CITIES[citySlug];
              const subject = SUBJECTS[subjectSlug];
              const level = LEVELS[levelSlug];
              const { total } = await fetchTutors({ countryCode: "PK", city, subject, level }, 1);
              return total > 0
                ? {
                    url: `${SITE_URL}/tutors/city/${citySlug}/${subjectSlug}/${levelSlug}`,
                    lastModified,
                    changeFrequency: "daily" as const,
                    priority: 0.8,
                  }
                : null;
            })
          )
        )
      ),
      Promise.all(
        PAKISTAN_LEVEL_SLUGS.map(async (levelSlug) => {
          const level = LEVELS[levelSlug];
          const { total } = await fetchTutors({ countryCode: "PK", level }, 1);
          return total > 0
            ? {
                url: `${SITE_URL}/pk/tutors/level/${levelSlug}`,
                lastModified,
                changeFrequency: "daily" as const,
                priority: 0.88,
              }
            : null;
        })
      ),
      Promise.all(
        PAKISTAN_EXAM_SLUGS.map(async (examSlug) => {
          const subject = SUBJECTS[examSlug];
          const { total } = await fetchTutors({ countryCode: "PK", subject }, 1);
          return total > 0
            ? {
                url: `${SITE_URL}/pk/tutors/exam/${examSlug}`,
                lastModified,
                changeFrequency: "daily" as const,
                priority: 0.88,
              }
            : null;
        })
      ),
      Promise.all(
        CURRICULUM_CITY_SLUGS.flatMap((citySlug) =>
          PAKISTAN_LEVEL_SLUGS.flatMap((levelSlug) =>
            CURRICULUM_SUBJECT_SLUGS.map(async (subjectSlug) => {
              const city = CITIES[citySlug];
              const level = LEVELS[levelSlug];
              const subject = SUBJECTS[subjectSlug];
              const { total } = await fetchTutors({ countryCode: "PK", city, level, subject }, 1);
              return total > 0
                ? {
                    url: `${SITE_URL}/pk/tutors/city/${citySlug}/${levelSlug}/${subjectSlug}`,
                    lastModified,
                    changeFrequency: "daily" as const,
                    priority: 0.9,
                  }
                : null;
            })
          )
        )
      ),
    ]);

    return [
      ...cityResults,
      ...levelResults,
      ...pakistanLevelResults,
      ...pakistanExamResults,
      ...curriculumResults,
    ].filter((page): page is NonNullable<typeof page> => page !== null);
  }

  if (id === "demand") {
    const demandResults = await Promise.all(
      PRIMARY_CITY_SLUGS.flatMap((citySlug) =>
        LOCAL_SUBJECT_SLUGS.map(async (subjectSlug) => {
          const city = CITIES[citySlug];
          const subject = SUBJECTS[subjectSlug];
          const { total } = await fetchTutors({ countryCode: "PK", city, subject }, 1);
          return total > 0
            ? {
                url: `${SITE_URL}/tuition-requests/pk/${citySlug}/${subjectSlug}`,
                lastModified,
                changeFrequency: "daily" as const,
                priority: 0.8,
              }
            : null;
        })
      )
    );

    return demandResults.filter((page): page is NonNullable<typeof page> => page !== null);
  }

  if (id === "tutors") {
    const { tutors } = await fetchTutors({}, TUTOR_SITEMAP_CAP);
    const profiles: MetadataRoute.Sitemap = tutors
      .filter((tutor) => assessTutorSeoQuality(tutor).indexable)
      .map((tutor) => ({
        url: `${SITE_URL}/tutors/${tutorProfileSlug(tutor)}`,
        lastModified: tutor.lastActiveAt ? new Date(tutor.lastActiveAt) : lastModified,
        changeFrequency: "weekly",
        priority: tutor.totalReviews > 0 ? 0.75 : 0.7,
      }));

    return profiles;
  }

  return [];
}
