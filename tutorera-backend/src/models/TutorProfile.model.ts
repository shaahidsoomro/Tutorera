import mongoose, { Schema, Document, Types } from "mongoose";
import { EDUCATION_LEVELS, normalizeEducationLevels, normalizeEducationLevel } from "../config/educationLevels";
import { evaluateMarketplaceAccess } from "../services/eligibility.service";
import logger from "../config/logger";

export type TutorStatus =
  | "registered"
  | "profile_incomplete"
  | "profile_complete"
  | "documents_pending"
  | "under_verification"
  | "admin_review"
  | "changes_requested"
  | "rejected"
  | "approved_pending_subject_approval"
  | "approved_pending_agreement"
  | "agreement_pending"
  | "active"
  | "suspended"
  | "reverification_required"
  | "agreement_reacceptance_required"
  | "deactivated"
  | "terminated";

export interface ITutorProfile extends Document {
  user: Types.ObjectId;

  // SEO-friendly public profile URL: /tutors/{countrySlug}/{slug}. Never
  // contains the Mongo ObjectId - see services/tutorSlug.service.ts for
  // generation/collision handling.
  slug?: string;
  countrySlug?: string;

  // Step 1 — Personal & Global Location
  fullName: string;
  phone: string;
  countryCode: string;
  countryName: string;
  city: string;
  state?: string;
  zipCode?: string;
  cityId?: string;                   // slug from location dataset e.g. "pk-lhe"
  regionCode?: string;               // ISO 3166-2 region code e.g. "PK-PB"
  postalCode?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  timezone: string;
  country?: Types.ObjectId; region?: Types.ObjectId; cityRef?: Types.ObjectId; locality?: Types.ObjectId;
  nationalityCountryCode?: string; residenceCountryCode?: string; onlineCountryReach?: string[];
  gender: string;
  dateOfBirth: string;
  languages?: { language: string; proficiency: string }[];

  // Step 2 — Education
  education: {
    degree: string;
    institution: string;
    year: number;
    degreeDoc: string;
    degreeDocPublicId: string;
    // Normalized discipline selection (e.g. "Computer Science") distinct
    // from the free-text `degree` credential name (e.g. "BS Computer
    // Science, FAST-NUCES") - drives DisciplineSubjectMap lookups so the
    // admin reviewing subject requests sees which ones plausibly match the
    // tutor's actual qualification. Optional: older profiles predate this
    // field and won't have it.
    discipline?: string;
    /** Canonical AcademicDiscipline reference; legacy discipline text is retained as a snapshot. */
    disciplineRef?: Types.ObjectId;
    verificationStatus?: "pending" | "approved" | "rejected";
    verifiedDegreeLevel?: string;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    reviewReason?: string;
    reviewFingerprint?: string;
  }[];

  // Step 3 — Experience
  experience: number;
  previousInstitutions: string[];
  // `subjects`/`levels` remain the tutor's self-declared WISH list, exactly
  // as before this feature - selecting a subject here has never granted
  // (and still does not grant) any marketplace privilege by itself. Actual
  // eligibility to bid/accept/book for a given subject is tracked
  // separately below in `subjectEligibility` and only takes effect once an
  // admin explicitly approves that specific (subject, levels) entry.
  subjects: string[];
  levels: string[];
  curricula?: string[];
  schoolOfferingIds?: string[];
  // One entry per subject the tutor has ever requested (via onboarding or
  // a later "request additional subject" action). This is the actual
  // source of truth for what a tutor may bid/accept/book - see
  // services/subjectEligibility.service.ts for the enforcement helper.
  subjectEligibility?: {
    subject: string;
    levels: string[]; // approved teaching levels for this subject; empty = not yet scoped
    status: "pending" | "needs_evidence" | "approved" | "rejected" | "suspended" | "revoked";
    /** Additive canonical references. `subject` remains a historical display snapshot. */
    subjectRef?: Types.ObjectId;
    eligibilityRuleRef?: Types.ObjectId;
    eligibilityType?: "direct" | "conditional" | "unmapped";
    evidenceRequired?: boolean;
    evidence?: { url: string; publicId?: string; label?: string; uploadedAt?: Date; status?: "pending" | "approved" | "rejected"; reason?: string; reviewedBy?: Types.ObjectId; reviewedAt?: Date; reviewedPublicId?: string }[];
    // Whether this subject appears in a DisciplineSubjectMap entry matching
    // the tutor's declared discipline at the time it was requested - shown
    // to the admin as a hint, never used to auto-approve (tutor selections
    // alone must never grant eligibility, per the feature spec).
    matchesDiscipline: boolean;
    qualificationIndex?: number; // index into `education[]` this request is tied to, if any
    requestedAt: Date;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    reason?: string; // rejection/revocation reason, shown to the tutor
  }[];
  // Denormalized flat list of currently-APPROVED subjects, kept in sync
  // with subjectEligibility whenever an entry's status changes - exists
  // purely so matching/listing queries (matching.service.ts, the tutor
  // "browse requests" endpoint, etc.) can filter with a simple $in query
  // instead of an $elemMatch over subjectEligibility on every read. Never
  // written to directly; always derived - see
  // services/subjectEligibility.service.ts's syncApprovedSubjects().
  approvedSubjects?: string[];

  // Step 4 — Profile
  bio: string;
  hourlyRate: number;
  currency: string;
  sessionRate?: number;              // rate per session (optional override)
  monthlyRate?: number;              // rate per month (optional override)
  teachingMode: "online" | "in-person" | "both";
  serviceAreas?: string[];
  travelRadiusKm?: number;
  availability: {
    day: string;
    slots: string[];
  }[];

  payoutAccount?: {
    method: "bank_transfer" | "raast" | "easypaisa" | "jazzcash" | "other";
    accountTitle: string;
    accountNumber: string;
    bankName?: string;
    branchCode?: string;
    swiftCode?: string;
    routingNumber?: string;
    notes?: string;
  };

  // Step 5 — Verification
  cnicFront: string;
  cnicFrontPublicId: string;
  cnicBack: string;
  cnicBackPublicId: string;
  videoIntro: string;
  videoIntroPublicId: string;
  policeCertificate: string;
  policeCertificatePublicId: string;
  identityDocumentType?: string;
  identityDocumentSubtype?: string;
  safetyVerificationType?: string;

  // Status & Lifecycle State Machine
  tutorStatus?:
    | "registered"
    | "profile_incomplete"
    | "profile_complete"
    | "documents_pending"
    | "under_verification"
    | "admin_review"
    | "changes_requested"
    | "rejected"
    | "approved_pending_subject_approval"
    | "approved_pending_agreement"
    | "agreement_pending"
    | "active"
    | "suspended"
    | "reverification_required"
    | "agreement_reacceptance_required"
    | "deactivated"
    | "terminated";
  onboardingStep: number;
  onboardingComplete: boolean;
  verificationStatus: "pending" | "approved" | "rejected";
  rejectionReason: string;
  isVerified: boolean;
  /** Explicit administrative override for approval gates, preserved for auditability. */
  adminApprovalExempt?: boolean;
  adminApprovalExemptAt?: Date;
  adminApprovalExemptBy?: Types.ObjectId;
  agreementAcceptanceRequired?: boolean;
  agreementAcceptedAt?: Date;
  agreementVersion?: string;
  // Tracks the daily reminder cron (legalAgreementReminder.service.ts) so it
  // can throttle to at most one email per day per tutor and show an
  // admin-visible reminder count/history, rather than blindly re-emailing
  // every time its interval fires.
  agreementReminderLastSentAt?: Date;
  agreementReminderCount?: number;
  // Same pattern, for missingDocumentsReminder.service.ts's cron: nudges a
  // tutor stuck in onboarding with no education entries or no subject
  // eligibility requests yet.
  missingDocsReminderLastSentAt?: Date;
  missingDocsReminderCount?: number;
  legacyAgreementStatus?: "none" | "legacy_unrecorded" | "reacceptance_pending" | "accepted";
  isTestAccount: boolean;

  // Per-component verification (Tutor Application Tracking)
  cnicVerificationStatus: "not_submitted" | "pending" | "approved" | "rejected";
  cnicRejectionReason: string;
  degreeVerificationStatus: "not_submitted" | "pending" | "approved" | "rejected";
  degreeRejectionReason: string;
  demoVideoStatus: "not_submitted" | "pending" | "approved" | "rejected";
  demoVideoRejectionReason: string;
  policeVerificationStatus: "not_required" | "not_submitted" | "pending" | "approved" | "rejected";
  policeRejectionReason: string;
  // "not_submitted" forever means either the tutor hasn't reached step 1
  // yet, or (grandfathering) they completed onboarding before this
  // requirement existed - the pre-save hook only requires this to be
  // "approved" for full verification when it's actually been submitted.
  avatarVerificationStatus: "not_submitted" | "pending" | "approved" | "rejected";
  avatarRejectionReason: string;
  cnicSubmittedAt: Date;
  degreeSubmittedAt: Date;
  demoVideoSubmittedAt: Date;
  policeSubmittedAt: Date;
  avatarSubmittedAt: Date;
  cnicReviewedAt: Date;
  degreeReviewedAt: Date;
  demoVideoReviewedAt: Date;
  policeReviewedAt: Date;
  avatarReviewedAt: Date;

  // Eligibility & lifecycle
  marketplaceEligible: boolean;
  marketplaceEligibleAt?: Date;
  homeTuitionEligible: boolean;
  homeTuitionEligibleAt?: Date;
  homeTuitionRequired: boolean;
  suspendedAt?: Date;
  suspendedReason: string;
  reVerificationRequired: boolean;
  reVerificationReason: string;
  lastStatusChangeAt: Date;

  // Stats
  averageRating: number;
  totalReviews: number;
  averageResponseMinutes: number;
  lastActiveAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const tutorProfileSchema = new Schema<ITutorProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    countrySlug: { type: String, trim: true, lowercase: true },

    // Step 1
    fullName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    countryCode: { type: String, uppercase: true, trim: true },
    countryName: { type: String, trim: true },
    cityId: { type: String, trim: true, lowercase: true },
    regionCode: { type: String, uppercase: true, trim: true },
    postalCode: { type: String, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number] },
    },
    country: { type: Schema.Types.ObjectId, ref: "Country", index: true },
    region: { type: Schema.Types.ObjectId, ref: "Region", index: true },
    cityRef: { type: Schema.Types.ObjectId, ref: "City", index: true },
    locality: { type: Schema.Types.ObjectId, ref: "Locality", index: true },
    nationalityCountryCode: { type: String, uppercase: true, trim: true },
    residenceCountryCode: { type: String, uppercase: true, trim: true },
    onlineCountryReach: [{ type: String, uppercase: true, trim: true }],
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    zipCode: { type: String, trim: true, default: "" },
    timezone: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    dateOfBirth: { type: String, default: "" },
    languages: [{
      language: { type: String, trim: true },
      proficiency: { type: String, enum: ["Native", "Fluent", "Professional", "Conversational"], default: "Fluent" }
    }],

    // Step 2
    education: [{
      degree: { type: String, trim: true },
      institution: { type: String, trim: true },
      year: { type: Number },
      degreeDoc: { type: String, default: "" },
      degreeDocPublicId: { type: String, default: "" },
      discipline: { type: String, trim: true },
      disciplineRef: { type: Schema.Types.ObjectId, ref: "AcademicDiscipline" },
      verificationStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      verifiedDegreeLevel: { type: String, enum: ["secondary", "diploma", "bachelors", "masters", "doctorate"] },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
      reviewReason: { type: String, default: "" },
      reviewFingerprint: { type: String },
    }],

    // Step 3
    experience: { type: Number, default: 0 },
    previousInstitutions: [{ type: String, trim: true }],
    subjects: [{ type: String, trim: true }],
    levels: [{
      type: String,
      trim: true,
    }],
    subjectEligibility: [{
      subject: { type: String, trim: true, required: true },
      levels: [{ type: String, trim: true }],
      status: { type: String, enum: ["pending", "needs_evidence", "approved", "rejected", "suspended", "revoked"], default: "pending" },
      subjectRef: { type: Schema.Types.ObjectId, ref: "Subject" },
      eligibilityRuleRef: { type: Schema.Types.ObjectId, ref: "TeachingEligibilityRule" },
      eligibilityType: { type: String, enum: ["direct", "conditional", "unmapped"] },
      evidenceRequired: { type: Boolean, default: false },
      evidence: [{ url: { type: String, required: true }, publicId: { type: String }, label: { type: String }, uploadedAt: { type: Date, default: Date.now }, status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }, reason: { type: String, default: "" }, reviewedBy: { type: Schema.Types.ObjectId, ref: "User" }, reviewedAt: { type: Date }, reviewedPublicId: { type: String } }],
      matchesDiscipline: { type: Boolean, default: false },
      qualificationIndex: { type: Number },
      requestedAt: { type: Date, default: Date.now },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
      reason: { type: String, trim: true, default: "" },
    }],
    approvedSubjects: [{ type: String, trim: true }],
    curricula: [{ type: String, trim: true }],
    schoolOfferingIds: [{ type: String, trim: true }],

    // Step 4
    bio: { type: String, trim: true, default: "" },
    hourlyRate: { type: Number, default: 0 },
    currency: { type: String, uppercase: true, trim: true },
    sessionRate: { type: Number, min: 0 },
    monthlyRate: { type: Number, min: 0 },
    teachingMode: { type: String, enum: ["online", "in-person", "both"], default: "both" },
    serviceAreas: [{ type: String, trim: true }],
    travelRadiusKm: { type: Number, default: 10, min: 0, max: 100 },
    availability: [{
      day: { type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
      slots: [{ type: String }],
    }],

    // Step 5
    cnicFront: { type: String, default: "" },
    cnicFrontPublicId: { type: String, default: "" },
    cnicBack: { type: String, default: "" },
    cnicBackPublicId: { type: String, default: "" },
    videoIntro: { type: String, default: "" },
    videoIntroPublicId: { type: String, default: "" },
    policeCertificate: { type: String, default: "" },
    policeCertificatePublicId: { type: String, default: "" },
    identityDocumentType: { type: String, trim: true, default: "identity_document" },
    identityDocumentSubtype: { type: String, trim: true, select: false },
    safetyVerificationType: { type: String, trim: true, default: "background_safety_verification" },

    // Payout Destination
    payoutAccount: {
      method: {
        type: String,
        enum: ["bank_transfer", "raast", "easypaisa", "jazzcash", "other"],
        default: "bank_transfer",
      },
      accountTitle: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      bankName: { type: String, default: "" },
      branchCode: { type: String, default: "" },
      swiftCode: { type: String, default: "" },
      routingNumber: { type: String, default: "" },
      notes: { type: String, default: "" },
    },

    // Status & State Machine
    tutorStatus: {
      type: String,
      enum: [
        "registered",
        "profile_incomplete",
        "profile_complete",
        "documents_pending",
        "under_verification",
        "admin_review",
        "changes_requested",
        "rejected",
        "approved_pending_subject_approval",
        "approved_pending_agreement",
        "agreement_pending",
        "active",
        "suspended",
        "reverification_required",
        "agreement_reacceptance_required",
        "deactivated",
        "terminated",
      ],
      default: "registered",
      index: true,
    },
    legacyAgreementStatus: {
      type: String,
      enum: ["none", "legacy_unrecorded", "reacceptance_pending", "accepted"],
      default: "none",
      index: true,
    },
    onboardingStep: { type: Number, default: 1 },
    onboardingComplete: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejectionReason: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    adminApprovalExempt: { type: Boolean, default: false, index: true },
    adminApprovalExemptAt: { type: Date },
    adminApprovalExemptBy: { type: Schema.Types.ObjectId, ref: "User" },
    agreementAcceptanceRequired: { type: Boolean, default: false },
    agreementAcceptedAt: { type: Date },
    agreementVersion: { type: String, trim: true },
    agreementReminderLastSentAt: { type: Date },
    agreementReminderCount: { type: Number, default: 0 },
    missingDocsReminderLastSentAt: { type: Date },
    missingDocsReminderCount: { type: Number, default: 0 },
    // Kept on the profile as well as User so every public profile query can
    // exclude test/demo records without relying on a populated user document.
    isTestAccount: { type: Boolean, default: false, index: true },

    // Per-component verification
    cnicVerificationStatus: { type: String, enum: ["not_submitted", "pending", "approved", "rejected"], default: "not_submitted" },
    cnicRejectionReason: { type: String, default: "" },
    degreeVerificationStatus: { type: String, enum: ["not_submitted", "pending", "approved", "rejected"], default: "not_submitted" },
    degreeRejectionReason: { type: String, default: "" },
    demoVideoStatus: { type: String, enum: ["not_submitted", "pending", "approved", "rejected"], default: "not_submitted" },
    demoVideoRejectionReason: { type: String, default: "" },
    policeVerificationStatus: { type: String, enum: ["not_required", "not_submitted", "pending", "approved", "rejected"], default: "not_required" },
    policeRejectionReason: { type: String, default: "" },
    avatarVerificationStatus: { type: String, enum: ["not_submitted", "pending", "approved", "rejected"], default: "not_submitted" },
    avatarRejectionReason: { type: String, default: "" },
    cnicSubmittedAt: { type: Date },
    degreeSubmittedAt: { type: Date },
    demoVideoSubmittedAt: { type: Date },
    policeSubmittedAt: { type: Date },
    avatarSubmittedAt: { type: Date },
    cnicReviewedAt: { type: Date },
    degreeReviewedAt: { type: Date },
    demoVideoReviewedAt: { type: Date },
    policeReviewedAt: { type: Date },
    avatarReviewedAt: { type: Date },

    // Eligibility & lifecycle
    marketplaceEligible: { type: Boolean, default: false },
    marketplaceEligibleAt: { type: Date },
    homeTuitionEligible: { type: Boolean, default: false },
    homeTuitionEligibleAt: { type: Date },
    homeTuitionRequired: { type: Boolean, default: false },
    suspendedAt: { type: Date },
    suspendedReason: { type: String, default: "" },
    reVerificationRequired: { type: Boolean, default: false },
    reVerificationReason: { type: String, default: "" },
    lastStatusChangeAt: { type: Date },

    // Stats
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    averageResponseMinutes: { type: Number, default: 0 },
    lastActiveAt: { type: Date },
  },
  { timestamps: true }
);

// Compound indexes for global marketplace queries
tutorProfileSchema.index({ location: "2dsphere" });
tutorProfileSchema.index({ countryCode: 1, isVerified: 1, teachingMode: 1 });
tutorProfileSchema.index({ countryCode: 1, cityId: 1, subjects: 1, isVerified: 1 });
tutorProfileSchema.index({ countryCode: 1, cityId: 1, approvedSubjects: 1, isVerified: 1 });
tutorProfileSchema.index({ onlineCountryReach: 1, isVerified: 1, averageRating: -1 });
tutorProfileSchema.index({ verificationStatus: 1, onboardingComplete: 1, createdAt: -1 });

function policeIsRequired(profile: ITutorProfile): boolean {
  const inPerson = profile.teachingMode === "in-person" || profile.teachingMode === "both";
  const homeCountries = ["PK", "SA", "AE", "IN", "GB"];
  const country = profile.countryCode || "PK";
  return inPerson && homeCountries.includes(country);
}

function hasApprovedTeachingSubject(profile: ITutorProfile | Record<string, any>): boolean {
  return Array.isArray(profile.subjectEligibility) && profile.subjectEligibility.some((entry: NonNullable<ITutorProfile['subjectEligibility']>[number]) =>
    entry?.status === "approved" && Array.isArray(entry.levels) && entry.levels.length > 0
  );
}

// location.type defaults to "Point" whenever the location subdocument exists
// at all, even if coordinates was never populated (e.g. an online-only tutor
// who never went through geocoding). MongoDB's 2dsphere index on `location`
// then rejects EVERY save of that document with "Can't extract geo keys" -
// not just location updates - because it can't build an index entry from an
// incomplete GeoJSON Point. Strip an invalid location out so any save can
// proceed and self-heals previously-corrupted documents. This must run from
// pre("save"), not just pre("validate") - callers that intentionally skip
// validation (profile.save({ validateBeforeSave: false }), e.g. admin
// verification decisions that shouldn't revalidate legacy application data)
// still always run pre("save"), so putting this fix only in pre("validate")
// left every such save able to trip the same index error again.
function repairInvalidLocation(p: ITutorProfile) {
  if (p.location && (!Array.isArray(p.location.coordinates) || p.location.coordinates.length !== 2)) {
    p.location = undefined;
  }
}

tutorProfileSchema.pre("validate", function () {
  const p = this as ITutorProfile;
  if (p.isModified && p.isModified("levels") && Array.isArray(p.levels)) {
    p.levels = normalizeEducationLevels(p.levels) as string[];
  }
  repairInvalidLocation(p);
});

tutorProfileSchema.pre("save", function () {
  const p = this as ITutorProfile;
  if (p.isModified && p.isModified("levels") && Array.isArray(p.levels)) {
    p.levels = normalizeEducationLevels(p.levels) as string[];
  }
  repairInvalidLocation(p);
  // avatarVerificationStatus "not_submitted" means either a tutor who
  // hasn't reached onboarding step 1 yet, or (grandfathering) one who
  // completed onboarding before the mandatory-photo requirement existed -
  // only require approval here once a photo has actually been submitted,
  // so existing verified tutors are never retroactively downgraded.
  // Core marketplace documents: CNIC, Degree, and Demo Video are the mandatory
  // credentials for marketplace approval. Police clearance only gates home tuition.
  //
  // Audit P1-03: the eligibility rules below are no longer re-implemented
  // here. They live in services/eligibility.service.ts, which the activation
  // service and the tracking read paths also call, so a tutor cannot be public
  // according to one authority and ineligible according to another. The only
  // per-caller input is whether the persisted legacy activation flag may stand
  // in for missing document approvals — the save hook passes the profile's own
  // flag so a read or save never revokes a legacy active tutor, and the bypass
  // that uses it is reported by `npm run audit:grandfathered-tutors`.
  const access = evaluateMarketplaceAccess(p, { grandfathered: Boolean(p.marketplaceEligible) });
  const coreApproved = access.coreApproved;
  const subjectApprovalSatisfied = access.subjectApproved;
  const agreementSatisfied = access.agreementSatisfied;

  if (access.grandfatherBypassActive) {
    logger.warn(
      {
        tutorProfileId: p._id?.toString?.(),
        userId: p.user?.toString?.(),
        cnic: p.cnicVerificationStatus,
        degree: p.degreeVerificationStatus,
        demo: p.demoVideoStatus,
      },
      "tutor-profile.grandfather-bypass: profile kept coreApproved only via legacy marketplaceEligible flag",
    );
  }

  if (coreApproved) {
    p.verificationStatus = "approved";
    p.isVerified = true;
    if (p.suspendedAt) {
      p.tutorStatus = "suspended";
      p.marketplaceEligible = false;
    } else if (p.reVerificationRequired) {
      p.tutorStatus = "reverification_required";
      p.marketplaceEligible = false;
    } else if (!subjectApprovalSatisfied && !p.marketplaceEligible) {
      // New tutors must have at least one subject and specific teaching level
      // approved by an administrator. A self-selected subject alone never
      // unlocks marketplace visibility or bidding.
      p.tutorStatus = "approved_pending_subject_approval";
      p.agreementAcceptanceRequired = false;
      p.marketplaceEligible = false;
    } else if (!agreementSatisfied && !p.marketplaceEligible) {
      // NON-NEGOTIABLE RULE: admin/document approval does NOT make a tutor active!
      // Must be approved_pending_agreement until explicit electronic contract acceptance succeeds.
      p.tutorStatus = "approved_pending_agreement";
      p.agreementAcceptanceRequired = true;
      p.marketplaceEligible = false;
    } else if (p.tutorStatus !== "suspended" && p.tutorStatus !== "reverification_required") {
      p.tutorStatus = "active";
    }
  } else if (p.verificationStatus !== "rejected" && p.verificationStatus !== "approved") {
    p.verificationStatus = "pending";
    p.isVerified = false;
    p.marketplaceEligible = false;
    if (p.suspendedAt) {
      p.tutorStatus = "suspended";
    } else if (!p.onboardingComplete) {
      p.tutorStatus = (p.onboardingStep || 1) <= 1 ? "profile_incomplete" : "documents_pending";
    } else {
      p.tutorStatus = "under_verification";
    }
  } else {
    p.isVerified = false;
    p.marketplaceEligible = false;
    p.tutorStatus = "rejected";
  }
});

tutorProfileSchema.index({ schoolOfferingIds: 1 });

export default mongoose.model<ITutorProfile>("TutorProfile", tutorProfileSchema);
