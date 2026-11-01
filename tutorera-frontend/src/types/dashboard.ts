// types/dashboard.ts

export interface DashRequest {
  _id: string;
  student: { _id: string; name: string; avatar: string; city?: string; countryCode?: string; countryName?: string };
  subject: string;
  level: string;
  description: string;
  budget: number;
  currency?: string;
  maximumBudget?: number;
  pricingUnit: "hour" | "session" | "month" | "course";
  allowCounterOffers: boolean;
  classGrade?: string; curriculum?: string; examType?: string; studentLevel?: string; learningObjectives?: string;
  area?: string; travelRadiusKm?: number; tutorGenderPreference?: "male" | "female" | "none";
  minimumQualification?: string; minimumExperience?: number; preferredLanguage?: string; preferredTutorRating?: number;
  preferredDays?: string[]; preferredStartTime?: string; sessionDurationMinutes?: number; sessionsPerWeek?: number; expectedStartDate?: string;
  teachingMode: string;
  countryCode?: string;
  countryName?: string;
  timezone?: string;
  isWorldwideEligible?: boolean;
  preferredTutorCountries?: string[];
  city: string;
  schedule: string;
  status: "draft" | "open" | "published" | "receiving_offers" | "negotiating" | "awaiting_payment" | "booked" | "in_progress" | "completed" | "closed" | "cancelled" | "expired" | "disputed" | "archived";
  createdAt: string;
  publishedAt?: string;
  expiresAt?: string;
  expiredAt?: string;
  extensionCount?: number;
  maxExtensions?: number;
  repostedFromRequestId?: string;
  archivedAt?: string;
  canExtend?: boolean;
  canRepost?: boolean;
  isExpired?: boolean;
  secondsRemaining?: number;
  offersCount?: number;
  bid?: Pick<DashBid, "_id" | "amount" | "currency" | "status" | "expiresAt" | "pricingUnit" | "createdAt"> | null;
}

export interface DashBid {
  _id: string;
  request: string;
  tutor: { _id: string; name: string; city: string; countryCode?: string; countryName?: string; avatar: string };
  amount: number;
  currency?: string;
  originalAmount?: number;
  originalCurrency?: string;
  convertedRequestAmount?: number;
  exchangeRate?: number;
  initialStudentRate: number;
  pricingUnit: "hour" | "session" | "month" | "course";
  status: "pending" | "submitted" | "accepted" | "rejected" | "countered" | "counter_by_student" | "counter_by_tutor" | "withdrawn" | "expired";
  message?: string;
  availability?: string;
  expiresAt: string;
  sequenceNumber?: number;
  counterCounts?: { student: number; tutor: number };
  latestSenderRole?: "student" | "tutor";
  senderRole?: "student" | "tutor";
  matchScore?: number;
  matchTier?: "excellent" | "great" | "good" | "fair";
  matchReasons?: string[];
  matchScoreBreakdown?: Record<string, number>;
  completedSessions?: number;
  responseRate?: number;
  profile?: {
    isVerified?: boolean;
    averageRating?: number;
    totalReviews?: number;
    experience?: number;
    education?: { degree: string; institution: string; year: number }[];
    subjects?: string[];
    videoIntro?: string;
    demoVideoStatus?: string;
    cnicVerificationStatus?: string;
    degreeVerificationStatus?: string;
    policeVerificationStatus?: string;
    homeTuitionEligible?: boolean;
    teachingMode?: string;
  };
  createdAt: string;
}

export interface DashBooking {
  _id: string;
  request: DashRequest;
  tutor: { _id: string; name: string; avatar?: string; city?: string; countryName?: string; phone?: string; email?: string };
  student: { _id: string; name: string; avatar?: string; city?: string; countryName?: string; phone?: string; email?: string };
  totalAmount: number;
  amount: number;
  subtotal: number;
  studentFee?: number;
  studentTotal?: number;
  tutorFee?: number;
  platformFee?: number;
  tutorNet?: number;
  tax?: number;
  hourlyRate?: number;
  finalAgreedRate: number;
  pricingUnit?: "hour" | "session" | "month" | "course";
  sessionCount?: number;
  currency?: string;
  schedule?: string;
  teachingMode?: string;
  isFirstSession?: boolean;
  paymentStatus?: "pending" | "received" | "confirmed" | "paid" | "refunded" | "partially_refunded" | "failed" | "chargeback" | "disputed";
  status: "pending" | "confirmed" | "upcoming" | "ongoing" | "in_progress" | "completed" | "cancelled" | "disputed";
  scheduledAt?: string;
  createdAt: string;
}

export interface TutorProfile {
  _id: string;
  user: {
    _id: string; name: string; email: string;
    phone?: string; city: string; countryCode?: string; countryName?: string; avatar: string;
  };
  bio: string;
  subjects: string[];
  levels: string[];
  hourlyRate: number;
  currency?: string;
  experience: number;
  teachingMode: string;
  city: string;
  countryCode?: string;
  countryName?: string;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  verificationStatus: string;
  policeVerificationStatus?: string;
  education: { degree: string; institution: string; year: number; _id: string }[];
  availability: { day: string; slots: string[]; _id: string }[];
}

export type TutorProfileData = TutorProfile;

export interface PostRequestPayload {
  subject: string;
  level: string;
  description: string;
  budget: string;
  schoolOfferingId?: string;
  learnerType?: string;
  learnerId?: string;
  learningNeed?: string;
  urgency?: string;
  country?: string;
  cityRef?: string;
  currency?: string;
  countryCode?: string;
  countryName?: string;
  timezone?: string;
  isWorldwideEligible?: boolean;
  preferredTutorCountries?: string[];
  teachingMode: string;
  city: string;
  schedule: string;
  maximumBudget: string; pricingUnit: "hour" | "session" | "month" | "course"; allowCounterOffers: boolean;
  classGrade: string; curriculum: string; examType: string; studentLevel: string; learningObjectives: string;
  area: string; travelRadiusKm: string; tutorGenderPreference: "male" | "female" | "none";
  minimumQualification: string; minimumExperience: string; preferredLanguage: string; preferredTutorRating: string;
  preferredDays: string[]; preferredStartTime: string; sessionDurationMinutes: string; sessionsPerWeek: string; expectedStartDate: string;
}

export interface PlaceBidPayload {
  amount: string;
  currency?: string;
  message: string;
}

export interface DashDirectRequest extends DashRequest {
  isDirect: true;
  bid: DashBid | null;
}

export interface RankedRequestMatch {
  request: DashRequest;
  score: number;
  tier: "excellent" | "great" | "good" | "fair";
  scoreBreakdown: Record<string, number>;
  reasons: string[];
}
