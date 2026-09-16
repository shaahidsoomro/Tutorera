import TutorsExplorer from "@/components/Tutors/TutorsExplorer";
import { SITE_URL } from "@/lib/site";
import { fetchTutors } from "@/lib/tutor-directory";
import type { FiltersState } from "@/types/tutor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Online Tutors Worldwide | 1-on-1 Live Lessons",
  description:
    "Browse online tutor profiles worldwide. Post your requirement, compare published tutor information and rates in the relevant currency, and arrange flexible 1-on-1 sessions.",
  alternates: { canonical: "/online-tutors" },
  openGraph: {
    title: "Find Online Tutors Worldwide | TUTORERA",
    description:
      "Browse online tutor profiles across Cambridge, IB, GCSE, local-board and other curricula with transparent marketplace offers.",
    url: `${SITE_URL}/online-tutors`,
  },
};

const onlineFaqs = [
  {
    q: "How does online tutoring work on TUTORERA?",
    a: "Students post their subject, curriculum, timezone, and preferred budget. Eligible matching tutors can submit customized offers. After accepting an offer, students and tutors arrange the agreed online lesson format through the supported booking flow.",
  },
  {
    q: "What curricula do online tutors cover?",
    a: "Tutor profiles may list Cambridge O/A Levels, British GCSE/IGCSE, International Baccalaureate, American curricula, Matric, FSc, university subjects, languages, and standardized-test preparation. Availability depends on current tutor supply.",
  },
  {
    q: "In what currencies can I pay for online tutoring?",
    a: "Requests and offers use the selected market currency. Checkout availability is market-specific: a market may support discovery and negotiation before checkout is enabled.",
  },
  {
    q: "What timezone scheduling is supported?",
    a: "Tutor profiles can list availability and timezone information. Students should confirm the agreed lesson time and timezone before booking.",
  },
];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const value = (input: string | string[] | undefined) => (typeof input === "string" ? input : "");

export default async function OnlineTutorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialFilters: Partial<FiltersState> = {
    search: value(params.search),
    country: value(params.country || params.countryCode),
    city: value(params.city),
    level: value(params.level),
    teachingMode: "online",
    minPrice: value(params.minPrice),
    maxPrice: value(params.maxPrice),
    minRating: value(params.minRating),
    sortBy: value(params.sortBy) || "rating",
  } as Partial<FiltersState>;

  const subject = value(params.subject);
  if (subject && !initialFilters.search) initialFilters.search = subject;

  const result = await fetchTutors(
    {
      search: initialFilters.search,
      city: initialFilters.city,
      countryCode: value(params.countryCode),
      country: value(params.country),
      level: initialFilters.level,
      subject,
      teachingMode: "online",
      minPrice: initialFilters.minPrice,
      maxPrice: initialFilters.maxPrice,
      minRating: initialFilters.minRating,
    },
    12
  );

  return (
    <>
      <TutorsExplorer
        initialTutors={result.tutors}
        initialPagination={{
          total: result.total,
          page: result.page,
          pages: result.pages,
          limit: 12,
        }}
        initialFilters={initialFilters}
        title="Find Online Tutors Worldwide"
        subtitle={
          result.total
            ? `${result.total} online tutor profiles available for 1-on-1 virtual lessons`
            : "Browse online tutor profiles across international and local curricula"
        }
      />
      <section style={{ maxWidth: 1120, margin: "2rem auto 4rem", padding: "0 1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#021550", marginBottom: "1rem" }}>
          Frequently Asked Questions About Online Tutoring
        </h2>
        <div style={{ display: "grid", gap: "1rem" }}>
          {onlineFaqs.map((item) => (
            <details
              key={item.q}
              style={{
                background: "#f8faff",
                border: "1px solid #e2e8f0",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
              }}
            >
              <summary style={{ fontWeight: 700, color: "#021550", cursor: "pointer" }}>{item.q}</summary>
              <p style={{ marginTop: "0.5rem", color: "#64748b", lineHeight: 1.6, fontSize: "0.95rem" }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
