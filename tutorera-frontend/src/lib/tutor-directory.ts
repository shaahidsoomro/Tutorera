import type { TutorProfile } from "@/types/tutor";

export const SUBJECTS = {
  mathematics: "Mathematics", physics: "Physics", chemistry: "Chemistry", biology: "Biology",
  english: "English Language", urdu: "Urdu Language", arabic: "Arabic Language", persian: "Persian",
  "computer-science": "Computer Science", statistics: "Statistics", economics: "Economics",
  accounting: "Accounting", "business-studies": "Business Studies", commerce: "Commerce", history: "History",
  geography: "Geography", islamiyat: "Islamiyat", "pakistan-studies": "Pakistan Studies", civics: "Civics",
  mdcat: "MDCAT", ecat: "ECAT", sat: "SAT", ielts: "IELTS", "entry-tests": "Entry Tests",
  programming: "Programming", "web-development": "Web Development", "data-science": "Data Science",
  "graphic-design": "Graphic Design",
} as const;

export const CITIES = {
  lahore: "Lahore", karachi: "Karachi", islamabad: "Islamabad", rawalpindi: "Rawalpindi",
  faisalabad: "Faisalabad", multan: "Multan", peshawar: "Peshawar", quetta: "Quetta",
  sialkot: "Sialkot", gujranwala: "Gujranwala",
  dubai: "Dubai", "abu-dhabi": "Abu Dhabi", sharjah: "Sharjah",
  riyadh: "Riyadh", jeddah: "Jeddah", dammam: "Dammam",
  london: "London", manchester: "Manchester", birmingham: "Birmingham",
} as const;

export const LEVELS = {
  primary: "Primary (Grades 1-5)", middle: "Middle (Grades 6-8)", matric: "Matric (9th & 10th)", intermediate: "Intermediate / FSc",
  "o-level": "O-Level (Cambridge / Edexcel)", "a-level": "A-Level (Cambridge / Edexcel)", university: "University / Degree",
} as const;

export const PRIMARY_CITY_SLUGS = ["lahore", "karachi", "islamabad", "rawalpindi", "faisalabad"] as const;
export const LOCAL_SUBJECT_SLUGS = ["mathematics", "physics", "chemistry", "biology", "english", "computer-science", "mdcat", "ielts"] as const;

export type DirectoryKind = "subject" | "city" | "level";
export type TutorSearchFilters = Partial<Record<DirectoryKind | "search" | "teachingMode" | "minPrice" | "maxPrice" | "minRating" | "countryCode" | "country", string>>;

export interface TutorSeoFacets {
  countries: Array<{ _id: string; count: number }>;
  cities: Array<{ _id: { countryCode: string; city: string }; count: number }>;
  subjects: Array<{ _id: { countryCode: string; subject: string }; count: number }>;
  levels: Array<{ _id: { countryCode: string; level: string }; count: number }>;
  citySubjects: Array<{ _id: { countryCode: string; city: string; subject: string }; count: number }>;
  cityLevelSubjects: Array<{ _id: { countryCode: string; city: string; level: string; subject: string }; count: number }>;
  cityCurriculumSubjects: Array<{ _id: { countryCode: string; city: string; curriculum: string; subject: string }; count: number }>;
}

export interface TutorDirectoryResponse {
  tutors: TutorProfile[];
  total: number;
  page: number;
  pages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://tutorera-backend.onrender.com/api/v1";

export async function fetchTutorSeoFacets(): Promise<TutorSeoFacets | null> {
  try {
    const response = await fetch(`${API_URL}/tutors/seo-facets`, {
      next: { revalidate: 900, tags: ["tutor-seo-facets"] },
    });
    if (!response.ok) throw new Error(`Tutor SEO facets returned ${response.status}`);
    const data = await response.json();
    return {
      countries: data.countries ?? [],
      cities: data.cities ?? [],
      subjects: data.subjects ?? [],
      levels: data.levels ?? [],
      citySubjects: data.citySubjects ?? [],
      cityLevelSubjects: data.cityLevelSubjects ?? [],
      cityCurriculumSubjects: data.cityCurriculumSubjects ?? [],
    };
  } catch (error) {
    console.error("Unable to load tutor SEO facets", error);
    return null;
  }
}

export async function fetchTutors(filters: TutorSearchFilters = {}, limit = 24): Promise<TutorDirectoryResponse> {
  const params = new URLSearchParams({ limit: String(limit), page: "1" });
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));

  try {
    const response = await fetch(`${API_URL}/tutors?${params}`, { next: { revalidate: 900 } });
    if (!response.ok) throw new Error(`Tutor API returned ${response.status}`);
    const data = await response.json();
    const tutors = data.tutors ?? [];
    return { tutors, total: data.total ?? tutors.length, page: data.page ?? 1, pages: data.pages ?? 1 };
  } catch (error) {
    console.error("Unable to load the public tutor directory", error);
    return { tutors: [], total: 0, page: 1, pages: 1 };
  }
}

export async function fetchTutor(id: string): Promise<TutorProfile | null> {
  try {
    const response = await fetch(`${API_URL}/tutors/${encodeURIComponent(extractTutorId(id))}`, { next: { revalidate: 900 } });
    if (!response.ok) return null;
    const data = await response.json();
    return data.profile ?? null;
  } catch {
    return null;
  }
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function tutorProfileSlug(tutor: Pick<TutorProfile, "_id" | "subjects"> & { city?: string; user?: { name?: string; city?: string } }) {
  const name = tutor.user?.name || "tutor";
  const subject = tutor.subjects?.[0] || "tutor";
  const city = tutor.city || tutor.user?.city || "pakistan";
  return `${tutor._id}-${slugify(`${name} ${subject} tutor ${city}`)}`;
}

export function tutorProfileHref(tutor: Pick<TutorProfile, "_id" | "subjects"> & { city?: string; user?: { name?: string; city?: string } }) {
  return `/tutors/${tutorProfileSlug(tutor)}`;
}

export function extractTutorId(value: string) {
  const objectId = value.match(/[a-f\d]{24}/i)?.[0];
  return objectId || value;
}
