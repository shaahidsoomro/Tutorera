import { RootFilterQuery } from "mongoose";
import { ITutorProfile } from "../models/TutorProfile.model";

/**
 * Canonical eligibility rule for exposing a tutor in public marketplace surfaces.
 * Keep public directory, profile, SEO facets, sitemap and matching discovery aligned
 * by importing this rule instead of checking verificationStatus independently.
 */
export const PUBLIC_TUTOR_ELIGIBILITY_FILTER: RootFilterQuery<ITutorProfile> = {
  verificationStatus: "approved",
  isVerified: true,
  onboardingComplete: true,
  marketplaceEligible: true,
  suspendedAt: { $exists: false },
  reVerificationRequired: { $ne: true },
};

export const isPublicTutorEligible = (profile: Partial<ITutorProfile>): boolean =>
  profile.verificationStatus === "approved" &&
  profile.isVerified === true &&
  profile.onboardingComplete === true &&
  profile.marketplaceEligible === true &&
  !profile.suspendedAt &&
  profile.reVerificationRequired !== true;
