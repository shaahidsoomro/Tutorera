// ─── Tutor Types ──────────────────────────────────────────────────────────────

export interface TutorUser {
  _id: string;
  name: string;
  avatar?: string;
  city: string;
  countryCode?: string;
  countryName?: string;
  phone: string;
}

export interface TutorProfile {
  _id: string;
  user: TutorUser;
  subjects: string[];
  city: string;
  countryCode?: string;
  countryName?: string;
  timezone?: string;
  currency?: string;
  serviceAreas?: string[];
  travelRadiusKm?: number;
  languages?: string[];
  curricula?: string[];
  teachingMode: "online" | "in-person" | "both";
  levels: string[];
  hourlyRate: number;
  averageRating: number;
  /** Legacy API compatibility only. Prefer averageRating for public tutor ratings. */
  rating?: number;
  totalReviews: number;
  bio: string;
  videoIntro?: string;
  isVerified: boolean;
  experience?: number;
  education: { degree: string; institution: string; year: number; _id: string }[];
  availability: { day: string; slots: string[]; _id: string }[];
  verificationStatus?: string;
  policeVerificationStatus?: string;
  fullName?: string;
  matchScore?: number;
  averageResponseMinutes?: number;
  responseTimeFormatted?: string;
  lastActiveAt?: string;
}

export interface FiltersState {
  search: string;
  country?: string;
  city: string;
  level: string;
  teachingMode: string;
  currency?: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  sortBy: string;
}

export const LEVELS = [
  "Primary (Grades 1-5)",
  "Middle (Grades 6-8)",
  "Matric (9th & 10th)",
  "Intermediate / FSc",
  "O-Level (Cambridge / Edexcel)",
  "A-Level (Cambridge / Edexcel)",
  "IB (Middle Years / Diploma)",
  "University / Degree",
  "Test Preparation",
  "Other",
];

export const TEACHING_MODES = [
  { value: "online", label: "Online" },
  { value: "in-person", label: "In-Person" },
  { value: "both", label: "Both" },
];

export const CITIES = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Karachi",
  "Peshawar",
  "Quetta",
  "Faisalabad",
  "Multan",
  "Sialkot",
  "Gujranwala",
];

export const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "reviews", label: "Most Reviewed" },
  { value: "newest", label: "Newest" },
];

export const INITIAL_FILTERS: FiltersState = {
  search: "",
  country: "",
  city: "",
  level: "",
  teachingMode: "",
  minPrice: "",
  maxPrice: "",
  minRating: "",
  sortBy: "rating",
};

export interface Review {
  _id: string;
  student: { name: string; avatar: string };
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}
