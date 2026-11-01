import type { ITutorProfile } from "../models/TutorProfile.model";

/**
 * Single authority for "may this tutor be publicly visible, matchable and
 * offerable?".
 *
 * Before this module the same rules were implemented twice — once in the
 * TutorProfile pre-save hook and once in tutorActivation.service — so the hook
 * could keep a tutor public while the activation service reported the same
 * tutor as ineligible. Every caller now goes through `evaluateMarketplaceAccess`
 * so the two can only disagree about the one explicitly-passed policy input,
 * `grandfathered`, and never about the rules themselves.
 */

type ProfileLike = Pick<
  ITutorProfile,
  | "subjectEligibility"
  | "cnicVerificationStatus"
  | "degreeVerificationStatus"
  | "demoVideoStatus"
  | "agreementAcceptedAt"
  | "legacyAgreementStatus"
  | "suspendedAt"
  | "reVerificationRequired"
  | "tutorStatus"
  | "verificationStatus"
  | "isVerified"
  | "adminApprovalExempt"
  | "marketplaceEligible"
>;

/** At least one (subject, level) pair an administrator has explicitly approved. */
export function hasApprovedTeachingSubject(profile: ProfileLike | Record<string, any>): boolean {
  return Array.isArray(profile.subjectEligibility) && profile.subjectEligibility.some((entry: { status?: string; levels?: string[] }) =>
    entry?.status === "approved" && Array.isArray(entry.levels) && entry.levels.length > 0
  );
}

/** CNIC, degree and demo video are the mandatory marketplace credentials. */
export function hasCoreDocumentsApproved(profile: ProfileLike | Record<string, any>): boolean {
  return (
    profile.cnicVerificationStatus === "approved" &&
    profile.degreeVerificationStatus === "approved" &&
    profile.demoVideoStatus === "approved"
  );
}

/** Electronic acceptance of the current agreement, including pre-consent records. */
export function isAgreementSatisfied(profile: ProfileLike | Record<string, any>): boolean {
  return Boolean(profile.agreementAcceptedAt) || profile.legacyAgreementStatus === "accepted";
}

/** Suspension, re-verification and termination always revoke marketplace access. */
export function isAccessBlocked(profile: ProfileLike | Record<string, any>): boolean {
  return Boolean(
    profile.suspendedAt ||
    profile.reVerificationRequired ||
    profile.tutorStatus === "suspended" ||
    profile.tutorStatus === "reverification_required" ||
    profile.tutorStatus === "terminated"
  );
}

/** Explicit admin override bypasses approval gates but never safety blocks. */
export function isApprovalExempt(profile: ProfileLike | Record<string, any>): boolean {
  return Boolean(profile.adminApprovalExempt);
}

export interface MarketplaceAccessEvaluation {
  /** May the tutor be listed, matched and offered to? */
  eligible: boolean;
  /** Document approval satisfied only through the persisted legacy activation flag. */
  grandfatherBypassActive: boolean;
  /** Document gate passed, including the legacy bypass when it applied. */
  coreApproved: boolean;
  subjectApproved: boolean;
  agreementSatisfied: boolean;
  accessBlocked: boolean;
  blockingReasons: string[];
}

export interface MarketplaceAccessOptions {
  /**
   * Whether the persisted `marketplaceEligible` flag may stand in for missing
   * document approvals. The TutorProfile save hook passes the profile's own
   * flag so a legacy active tutor is never silently revoked by a read or a
   * save; the activation service passes false so an explicit administrative
   * action still re-evaluates against current documents. Retiring the bypass
   * entirely is a separate, data-backed decision — run
   * `npm run audit:grandfathered-tutors` to see exactly which profiles depend
   * on it before that decision is made.
   */
  grandfathered?: boolean;
}

export function evaluateMarketplaceAccess(
  profile: ProfileLike | Record<string, any>,
  options: MarketplaceAccessOptions = {}
): MarketplaceAccessEvaluation {
  const coreDocumentsApproved = hasCoreDocumentsApproved(profile);
  const approvalExempt = isApprovalExempt(profile);
  const grandfatherBypassActive =
    !coreDocumentsApproved &&
    Boolean(options.grandfathered) &&
    profile.verificationStatus === "approved" &&
    Boolean(profile.marketplaceEligible);

  const coreApproved = approvalExempt || coreDocumentsApproved || grandfatherBypassActive;
  const subjectApproved = approvalExempt || hasApprovedTeachingSubject(profile);
  const agreementSatisfied = approvalExempt || isAgreementSatisfied(profile);
  const accessBlocked = isAccessBlocked(profile);
  const adminApproved = approvalExempt || profile.verificationStatus === "approved";

  const blockingReasons: string[] = [];
  if (accessBlocked) blockingReasons.push("Account is suspended, under re-verification, or terminated.");
  if (!coreApproved) blockingReasons.push("Mandatory identity, degree and demo video are not verified.");
  if (!subjectApproved) blockingReasons.push("No teaching subject and level has been approved by an administrator.");
  if (!agreementSatisfied) blockingReasons.push("The tutor marketplace agreement has not been accepted.");
  if (!adminApproved) blockingReasons.push("An administrator has not approved this application.");
  if (!approvalExempt && !profile.isVerified) blockingReasons.push("Profile is not marked as verified.");

  return {
    eligible: !accessBlocked && coreApproved && subjectApproved && agreementSatisfied && adminApproved && (approvalExempt || Boolean(profile.isVerified)),
    grandfatherBypassActive,
    coreApproved,
    subjectApproved,
    agreementSatisfied,
    accessBlocked,
    blockingReasons,
  };
}