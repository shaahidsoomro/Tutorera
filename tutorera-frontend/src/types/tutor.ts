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
  createdAt?: string;
  updatedAt?: string;
  user: TutorUser;
  subjects: string[];
  city: string;
  countryCode?: string;
  countryName?: string;
  /** SEO-friendly public profile URL pieces - see tutorera-backend's
   * services/tutorSlug.service.ts. May be absent on profiles created
   * before the backfill migration ran; callers should fall back to the
   * legacy ObjectId-based URL in that case. */
  slug?: string;
  countrySlug?: string;
  timezone?: string;
  currency?: string;
  serviceAreas?: string[];
  travelRadiusKm?: number;
  // Stored on TutorProfile as { language, proficiency } objects, not plain
  // strings - a caller that just wants the names should map .language.
  languages?: { language: string; proficiency: string }[];
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
  degreeVerificationStatus?: string;
  fullName?: string;
  matchScore?: number;
  matchBreakdown?: Record<string, number>;
  matchReasons?: string[];
  matchTier?: "excellent" | "great" | "good" | "fair";
  averageResponseMinutes?: number;
  responseTimeFormatted?: string;
  lastActiveAt?: string;
  payoutAccount?: PayoutAccount;
  cnicVerificationStatus?: string;
  demoVideoStatus?: string;
  homeTuitionEligible?: boolean;
  badges?: {
    identityVerified?: boolean;
    credentialsVerified?: boolean;
    videoVerified?: boolean;
    experiencedTutor?: boolean;
    topPerformer?: boolean;
    experiencedTutorGrantedAt?: string;
  };
}

export interface PayoutAccount {
  method: "bank_transfer" | "raast" | "easypaisa" | "jazzcash" | "other";
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  branchCode?: string;
  swiftCode?: string;
  routingNumber?: string;
  notes?: string;
}

export interface FiltersState {
  search: string;
  subject?: string;
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
  subject: "",
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
