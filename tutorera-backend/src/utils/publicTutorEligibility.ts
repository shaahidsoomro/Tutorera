import { ITutorProfile } from "../models/TutorProfile.model";

/**
 * Canonical eligibility rule for exposing a tutor in public marketplace surfaces.
 * Keep public directory, profile, SEO facets, sitemap and matching discovery aligned
 * by importing this rule instead of checking verificationStatus independently.
 *
 * Keep this object structurally typed rather than importing query helper types from
 * mongoose. The project currently carries legacy @types/mongoose alongside Mongoose
 * 9's built-in declarations, which can shadow modern query type exports.
 */
export const PUBLIC_TUTOR_ELIGIBILITY_FILTER = {
  verificationStatus: "approved",
  isVerified: true,
  onboardingComplete: true,
  marketplaceEligible: true,
  suspendedAt: { $exists: false },
  reVerificationRequired: { $ne: true },
} as const;

export const isPublicTutorEligible = (profile: Partial<ITutorProfile>): boolean =>
  profile.verificationStatus === "approved" &&
  profile.isVerified === true &&
  profile.onboardingComplete === true &&
  profile.marketplaceEligible === true &&
  !profile.suspendedAt &&
  profile.reVerificationRequired !== true;
