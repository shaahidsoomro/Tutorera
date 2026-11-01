import mongoose, { ClientSession, Types } from "mongoose";
import User from "../models/User.model";
import TutorProfile, { ITutorProfile, TutorStatus } from "../models/TutorProfile.model";
import TutorAgreementAcceptance from "../models/TutorAgreementAcceptance.model";
import AuditLog from "../models/AuditLog.model";
import TutorApplicationStatusHistory from "../models/TutorApplicationStatusHistory.model";
import { getApplicableAgreement } from "./legalAgreement.service";
import { setAccountStatus } from "./accountLifecycle.service";
import {
  evaluateMarketplaceAccess,
  hasApprovedTeachingSubject,
  hasCoreDocumentsApproved,
  isApprovalExempt,
} from "./eligibility.service";

export interface ActivationEvaluationResult {
  isEligible: boolean;
  tutorStatus: TutorStatus;
  reasons: string[];
  missingCriteria: string[];
  checks: {
    profileComplete: boolean;
    documentsSubmitted: boolean;
    mandatoryDocumentsVerified: boolean;
    identityVerified: boolean;
    adminApproved: boolean;
    subjectEligibilityApproved: boolean;
    currentAgreementAccepted: boolean;
    mandatoryConsentsAccepted: boolean;
    accountNotSuspended: boolean;
    accountNotTerminated: boolean;
  };
  agreementAcceptanceId?: string;
  agreementVersion?: string;
}

export function policeIsRequired(profile: ITutorProfile): boolean {
  const inPerson = profile.teachingMode === "in-person" || profile.teachingMode === "both";
  const homeCountries = ["PK", "SA", "AE", "IN", "GB"];
  const country = profile.countryCode || "PK";
  return inPerson && homeCountries.includes(country);
}

export function isProfileMarketplaceEligible(profile: ITutorProfile): boolean {
  return evaluateMarketplaceAccess(profile).eligible;
}

/**
 * Authoritative central evaluator determining whether a tutor has satisfied
 * ALL mandatory requirements to receive marketplace activation.
 *
 * Rule: ADMIN APPROVAL != TUTOR ACTIVATION.
 * Activation requires ALL:
 * profile_complete AND mandatory_documents_verified AND identity_verified AND
 * admin_approved AND current_agreement_accepted AND mandatory_consents_accepted AND
 * account_not_suspended AND account_not_terminated = ACTIVE.
 */
export async function evaluateTutorActivation(
  tutorUserId: string | Types.ObjectId,
  opts: { session?: ClientSession } = {}
): Promise<ActivationEvaluationResult> {
  const user = await User.findById(tutorUserId).session(opts.session || null);
  const profile = await TutorProfile.findOne({ user: tutorUserId }).session(opts.session || null);

  if (!user || !profile) {
    return {
      isEligible: false,
      tutorStatus: "registered",
      reasons: ["User or tutor profile does not exist."],
      missingCriteria: ["user_exists", "profile_exists"],
      checks: {
        profileComplete: false,
        documentsSubmitted: false,
        mandatoryDocumentsVerified: false,
        identityVerified: false,
        adminApproved: false,
        subjectEligibilityApproved: false,
        currentAgreementAccepted: false,
        mandatoryConsentsAccepted: false,
        accountNotSuspended: false,
        accountNotTerminated: false,
      },
    };
  }

  const missing: string[] = [];
  const reasons: string[] = [];
  const approvalExempt = isApprovalExempt(profile);

  // 1. Account status checks (suspension / termination)
  const accountNotSuspended =
    !profile.suspendedAt &&
    !user.suspendedAt &&
    user.moderationStatus !== "suspended";
  if (!accountNotSuspended) {
    missing.push("account_not_suspended");
    reasons.push("Account or tutor profile is suspended.");
  }

  const accountNotTerminated =
    !user.isDeleted &&
    user.moderationStatus !== "banned" &&
    user.moderationStatus !== "deleted";
  if (!accountNotTerminated) {
    missing.push("account_not_terminated");
    reasons.push("Account is deleted or permanently banned.");
  }

  // 2. Profile completion
  const profileComplete = Boolean(
    profile.onboardingComplete &&
    profile.fullName?.trim() &&
    profile.hourlyRate > 0 &&
    profile.subjects &&
    profile.subjects.length > 0
  );
  if (!profileComplete) {
    missing.push("profile_complete");
    reasons.push("Profile onboarding is incomplete.");
  }

// A tutor may select subjects during onboarding, but no subject becomes
  // teachable until an administrator approves its precise levels. This is a
  // separate trust gate from document verification.
  const subjectEligibilityApproved = approvalExempt || hasApprovedTeachingSubject(profile);
  if (!subjectEligibilityApproved) {
    missing.push("subject_eligibility_approved");
    reasons.push("At least one teaching subject and level must be approved by an administrator.");
  }

  // 3. Document submission
  const documentsSubmitted = approvalExempt || Boolean(
    profile.cnicFront &&
    profile.videoIntro &&
    profile.education &&
    profile.education.length > 0 &&
    (!policeIsRequired(profile) || Boolean(profile.policeCertificate))
  );
  if (!documentsSubmitted) {
    missing.push("documents_submitted");
    reasons.push("Mandatory verification documents are not fully submitted.");
  }

  // 4. Mandatory documents verified
  const mandatoryDocumentsVerified = approvalExempt || Boolean(
    hasCoreDocumentsApproved(profile) &&
    (!policeIsRequired(profile) || profile.policeVerificationStatus === "approved" || profile.policeVerificationStatus === "not_required")
  );
  if (!mandatoryDocumentsVerified) {
    missing.push("mandatory_documents_verified");
    reasons.push("One or more required documents have not been verified.");
  }

  // 5. Identity verified
  const identityVerified = approvalExempt || profile.cnicVerificationStatus === "approved";
  if (!identityVerified) {
    missing.push("identity_verified");
    reasons.push("Government identity has not been verified.");
  }

  // 6. Admin approved
  const adminApproved = approvalExempt || profile.verificationStatus === "approved";
  if (!adminApproved) {
    missing.push("admin_approved");
    reasons.push("Application has not been approved by an administrator.");
  }

  // 7. Applicable Legal Agreement Acceptance & Consents
  const applicableAgreement = await getApplicableAgreement("TUTOR_AGREEMENT", profile.countryCode || "PK", "en", opts);
  let currentAgreementAccepted = approvalExempt;
  let mandatoryConsentsAccepted = approvalExempt;
  let acceptanceRecord = null;

  if (applicableAgreement) {
    acceptanceRecord = await TutorAgreementAcceptance.findOne({
      tutor: user._id,
      legalAgreement: applicableAgreement._id,
      acceptanceStatus: "active",
    }).session(opts.session || null).sort({ acceptedAt: -1 });

    if (acceptanceRecord) {
      currentAgreementAccepted = true;
      const c = acceptanceRecord.consents;
      mandatoryConsentsAccepted = Boolean(
        c.consentAgreement &&
        c.consentInformationAccuracy &&
        c.consentSafeguarding &&
        c.consentIndependentContractor &&
        c.consentFeesTaxes &&
        c.consentElectronicRecords
      );
    }
  }

  // Grandfathering check for legacy tutors: if marked legacy accepted
  if (!currentAgreementAccepted && profile.legacyAgreementStatus === "accepted" && profile.agreementAcceptedAt) {
    currentAgreementAccepted = true;
    mandatoryConsentsAccepted = true;
  }

  if (!currentAgreementAccepted) {
    missing.push("current_agreement_accepted");
    reasons.push("TUTORERA Tutor Marketplace Agreement has not been accepted.");
  } else if (!mandatoryConsentsAccepted) {
    missing.push("mandatory_consents_accepted");
    reasons.push("Mandatory agreement consents are incomplete.");
  }

  // Determine State Machine Stage
  let derivedStatus: TutorStatus = "registered";

  if (!accountNotTerminated) {
    derivedStatus = "terminated";
  } else if (!accountNotSuspended) {
    derivedStatus = "suspended";
  } else if (profile.reVerificationRequired) {
    derivedStatus = "reverification_required";
  } else if (profile.verificationStatus === "rejected") {
    derivedStatus = "rejected";
  } else if (!profileComplete) {
    derivedStatus = (profile.onboardingStep || 1) <= 1 ? "profile_incomplete" : "profile_incomplete";
  } else if (!documentsSubmitted) {
    derivedStatus = "documents_pending";
  } else if (!mandatoryDocumentsVerified) {
    derivedStatus = "under_verification";
  } else if (!adminApproved) {
    derivedStatus = "admin_review";
  } else if (!subjectEligibilityApproved) {
    derivedStatus = "approved_pending_subject_approval";
  } else if (!currentAgreementAccepted || !mandatoryConsentsAccepted) {
    derivedStatus = "approved_pending_agreement";
  } else {
    derivedStatus = "active";
  }

  // The status ladder above is stricter than the access rule (it also requires a
  // complete profile, submitted documents and all agreement consents), so
  // "active" is confirmed against the shared access evaluator rather than
  // assumed from the ladder. This is the same function the TutorProfile save
  // hook and the tracking read paths use.
  const access = evaluateMarketplaceAccess(profile);
  const isEligible = derivedStatus === "active" && access.eligible;

  return {
    isEligible,
    tutorStatus: derivedStatus,
    reasons,
    missingCriteria: missing,
    checks: {
      profileComplete,
      documentsSubmitted,
      mandatoryDocumentsVerified,
      identityVerified,
      adminApproved,
      subjectEligibilityApproved,
      currentAgreementAccepted,
      mandatoryConsentsAccepted,
      accountNotSuspended,
      accountNotTerminated,
    },
    agreementAcceptanceId: acceptanceRecord?._id?.toString(),
    agreementVersion: acceptanceRecord?.agreementVersion || applicableAgreement?.version,
  };
}

/**
 * Synchronizes the tutor's actual database state with the authoritative evaluation.
 * MUST be called upon:
 * - Admin approval / rejection
 * - Agreement acceptance
 * - Document verification
 * - Suspension / unsuspension
 */
export async function syncTutorActivation(
  tutorUserId: string | Types.ObjectId,
  opts: { session?: ClientSession } = {}
): Promise<{ profile: ITutorProfile; activated: boolean; status: TutorStatus }> {
  if (!opts.session) {
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(() => syncTutorActivation(tutorUserId, { session }));
      if (!result) throw new Error("Activation transaction did not complete.");
      return result;
    } finally { await session.endSession(); }
  }
  const evalResult = await evaluateTutorActivation(tutorUserId, opts);
  const now = new Date();

  const query = TutorProfile.findOne({ user: tutorUserId });
  if (opts.session) query.session(opts.session);
  const profile = await query;

  if (!profile) {
    throw new Error(`TutorProfile not found for user ${tutorUserId}`);
  }

  const previousStatus = profile.tutorStatus;
  const previousMarketplace = Boolean(profile.marketplaceEligible);
  const previousHome = Boolean(profile.homeTuitionEligible);
  profile.tutorStatus = evalResult.tutorStatus;

  if (evalResult.isEligible) {
    profile.marketplaceEligible = true;
    profile.marketplaceEligibleAt = profile.marketplaceEligibleAt || now;
    profile.isVerified = true;
    profile.lastStatusChangeAt = now;
    if (opts.session) {
      await profile.save({ session: opts.session, validateBeforeSave: false });
    } else {
      await profile.save({ validateBeforeSave: false });
    }
    await setAccountStatus(tutorUserId.toString(), "verified", opts);
  } else {
    profile.marketplaceEligible = false;
    profile.lastStatusChangeAt = now;
    if (opts.session) {
      await profile.save({ session: opts.session, validateBeforeSave: false });
    } else {
      await profile.save({ validateBeforeSave: false });
    }
    if (evalResult.tutorStatus === "approved_pending_agreement") {
      profile.agreementAcceptanceRequired = true;
      if (opts.session) {
        await profile.save({ session: opts.session, validateBeforeSave: false });
      } else {
        await profile.save({ validateBeforeSave: false });
      }
      await setAccountStatus(tutorUserId.toString(), "submitted", opts);
    } else if (evalResult.tutorStatus === "approved_pending_subject_approval") {
      profile.agreementAcceptanceRequired = false;
      if (opts.session) {
        await profile.save({ session: opts.session, validateBeforeSave: false });
      } else {
        await profile.save({ validateBeforeSave: false });
      }
      await setAccountStatus(tutorUserId.toString(), "submitted", opts);
    } else if (evalResult.tutorStatus === "rejected") {
      await setAccountStatus(tutorUserId.toString(), "rejected", opts);
    }
  }

  const homeEligible = evalResult.isEligible && policeIsRequired(profile) && profile.policeVerificationStatus === "approved";
  profile.marketplaceEligible = evalResult.isEligible;
  profile.homeTuitionEligible = homeEligible;
  profile.set("marketplaceEligibleAt", evalResult.isEligible ? profile.marketplaceEligibleAt || now : undefined);
  profile.set("homeTuitionEligibleAt", homeEligible ? profile.homeTuitionEligibleAt || now : undefined);
  // Explicit flags avoid legacy save-hook grandfathering and clear stale dates.
  await TutorProfile.updateOne({ _id: profile._id }, { $set: {
    marketplaceEligible: evalResult.isEligible, homeTuitionEligible: homeEligible,
    ...(evalResult.isEligible ? { marketplaceEligibleAt: profile.marketplaceEligibleAt } : {}),
    ...(homeEligible ? { homeTuitionEligibleAt: profile.homeTuitionEligibleAt } : {}),
  }, ...(!evalResult.isEligible || !homeEligible ? { $unset: {
    ...(!evalResult.isEligible ? { marketplaceEligibleAt: 1 } : {}), ...(!homeEligible ? { homeTuitionEligibleAt: 1 } : {}),
  } } : {}) }, { session: opts.session });
  if (!evalResult.isEligible) {
    await User.updateOne({ _id: tutorUserId, accountStatus: "verified" }, { $set: { accountStatus: "submitted" } }, { session: opts.session });
  }
  for (const change of [
    { before: previousMarketplace, after: evalResult.isEligible, event: evalResult.isEligible ? "MARKETPLACE_ACTIVATED" as const : "MARKETPLACE_DEACTIVATED" as const },
    { before: previousHome, after: homeEligible, event: homeEligible ? "HOME_TUITION_ACTIVATED" as const : "HOME_TUITION_DEACTIVATED" as const },
  ]) {
    if (change.before === change.after) continue;
    await TutorApplicationStatusHistory.create([{ tutor: tutorUserId, tutorProfile: profile._id, actor: "Activation service",
      actorRole: "system", event: change.event, isPublic: false, statusBefore: change.before ? "active" : "inactive",
      statusAfter: change.after ? "active" : "inactive", message: `${change.event.replace(/_/g, " ").toLowerCase()} after eligibility evaluation` }], { session: opts.session });
  }
  if (previousStatus !== profile.tutorStatus || previousMarketplace !== evalResult.isEligible || previousHome !== homeEligible) {
    await AuditLog.create([{ action: "tutor_activation_synchronized", actor: "Activation service", entity: "TutorProfile",
      targetId: profile._id.toString(), targetName: profile.fullName, metadata: {
        previousStatus, status: profile.tutorStatus, previousMarketplace, marketplace: evalResult.isEligible,
        previousHome, home: homeEligible, missingCriteria: evalResult.missingCriteria,
      } }], { session: opts.session });
  }
  return {
    profile,
    activated: evalResult.isEligible,
    status: evalResult.tutorStatus,
  };
}
