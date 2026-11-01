import { Response } from "express";
import { AuthRequest } from "../types";
import User from "../models/User.model";
import { IUser } from "../types";
import TutorProfile, { ITutorProfile } from "../models/TutorProfile.model";
import { prepareDegreeReplacement, degreeUploadIndex } from "../services/degreeReplacement.service";
import { flagPendingQualificationBookings } from "../services/qualificationBookingReview.service";
import TutorApplicationStatusHistory from "../models/TutorApplicationStatusHistory.model";
import AdminVerificationReview from "../models/AdminVerificationReview.model";
import TutorAgreement from "../models/TutorAgreement.model";
import { logAudit } from "../utils/logAudit";
import { publishReviewNotification } from "../services/reviewNotification.service";
import { loadReviewActivationSnapshot } from "../services/reviewActivationSnapshot.service";
import { issueReviewedTutorAgreement } from "../services/reviewAgreementIssuance.service";
import { synchronizeReviewVisibility } from "../services/reviewVisibility.service";
// All notifications here are downstream of persisted application changes.
const NotificationService = { publishEvent: publishReviewNotification };
import {
  buildAuthenticatedTrackingPayload,
  buildPublicTrackingPayload,
  generateTrackingToken,
  hashTrackingToken,
  isHomeTuitionEligible,
  isMarketplaceEligible,
  recordStatusEvent,
  policeIsRequired,
  computeCanonicalStatus,
} from "../services/tracking.service";
import { StatusEvent } from "../models/TutorApplicationStatusHistory.model";
import { setAccountStatus } from "../services/accountLifecycle.service";
import {
  applicationSubmittedEmail,
  cnicRejectedEmail,
  cnicVerifiedEmail,
  demoVideoApprovedEmail,
  demoVideoRejectedEmail,
  educationalDocumentsRejectedEmail,
  educationalDocumentsVerifiedEmail,
  homeTuitionActivatedEmail,
  homeTuitionDeactivatedEmail,
  marketplaceActivatedEmail,
  marketplaceDeactivatedEmail,
  policeRejectedEmail,
  policeVerifiedEmail,
  profileSuspendedEmail,
  reVerificationRequiredEmail,
  trackingWelcomeEmail,
} from "../utils/trackingEmails";
import { getSignedViewUrl, uploadToCloudinary } from "../utils/uploadToCloudinary";
import { verifyFileSignature } from "../middlewares/upload.middleware";
import { syncReviewQueueComponent } from "../services/verification.service";
import { commitQualificationDecision, qualificationReviewToken, QualificationDecisionError } from "../services/qualificationDecision.service";
import { commitSubjectDecision, subjectDecisionToken, SubjectDecisionError } from "../services/subjectDecision.service";
import { commitSubjectEvidenceDecision, EvidenceDecisionError } from "../services/subjectEvidenceDecision.service";

const TRACKING_BASE_URL = process.env.CLIENT_URL || "https://tutorera.ac.pk";
const APPLICATION_STATUS_URL = `${TRACKING_BASE_URL}/tutor/application-status`;

function ctaArgs(user: { applicationId?: string; name: string }) {
  return {
    applicationId: user.applicationId || "TUT-PENDING",
    statusUrl: APPLICATION_STATUS_URL,
  };
}

async function recordDocumentDecision(input: { userId: string; profileId: string; adminId?: string; component: "avatar" | "cnic" | "degree" | "demoVideo" | "police"; previousStatus?: string; status?: string; reason?: string }) {
  if (!input.adminId || (input.status !== "approved" && input.status !== "rejected")) return;
  await AdminVerificationReview.create({
    tutor: input.userId, tutorProfile: input.profileId, admin: input.adminId,
    component: input.component, decision: input.status,
    previousStatus: input.previousStatus, newStatus: input.status,
    rejectionReason: input.status === "rejected" ? (input.reason || "").trim() : undefined,
  });
}

function maskIp(ip: string | undefined): string {
  if (!ip) return "unknown";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  return "redacted";
}

// ─── Tutor-facing endpoints ───────────────────────────────────────────────────

export const getApplicationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }
  const payload = await buildAuthenticatedTrackingPayload(req.user._id.toString());
  if (!payload) {
    res.status(404).json({ success: false, message: "Tutor profile not found" });
    return;
  }
  res.status(200).json({ success: true, payload });
};

export const rotateTrackingToken = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  const profile = await TutorProfile.findOne({ user: user._id });
  const t = generateTrackingToken();
  user.trackingTokenHash = t.hash;
  user.trackingTokenCreatedAt = user.trackingTokenCreatedAt || new Date();
  user.trackingTokenRotatedAt = new Date();
  await user.save();

  await recordStatusEvent({
    tutorId: user._id.toString(),
    tutorProfileId: profile?._id.toString(),
    actor: { name: user.name, role: "tutor", id: user._id.toString() },
    event: "TOKEN_ROTATED",
    message: "Tracking link rotated",
    isPublic: false,
  });

  await logAudit({
    action: "tracking_token_rotated",
    actor: user.name,
    actorId: user._id.toString(),
    entity: "User",
    targetId: user._id.toString(),
    targetName: user.name,
  });

  res.status(200).json({
    success: true,
    message: "Tracking link rotated. Save the new URL — the old one no longer works.",
    trackingToken: t.plaintext,
    trackingUrl: `${TRACKING_BASE_URL}/track/tutor/${t.plaintext}`,
  });
};

export const acceptTutorAgreement = async (req: AuthRequest, res: Response): Promise<void> => {
  // Delegate directly to the authoritative legal agreement acceptance handler
  const { acceptTutorAgreement: legalAccept } = await import("./legalAgreement.controller");
  // Normalize legacy confirmation keys if passed by older frontend clients
  if (req.body?.confirmations) {
    if (req.body.confirmations.policiesAccepted && !req.body.confirmations.safeguardingAccepted) {
      req.body.confirmations.safeguardingAccepted = req.body.confirmations.policiesAccepted;
    }
    if (req.body.confirmations.feesUnderstood && !req.body.confirmations.feesTaxesUnderstood) {
      req.body.confirmations.feesTaxesUnderstood = req.body.confirmations.feesUnderstood;
    }
  }
  return legalAccept(req, res);
};

// ─── Public token endpoint ────────────────────────────────────────────────────

export const getPublicTracking = async (req: AuthRequest, res: Response): Promise<void> => {
  const token = String(req.params.token || "");
  if (!token) {
    res.status(404).json({ success: false, message: "Tracking link not found" });
    return;
  }
  const payload = await buildPublicTrackingPayload(token);
  if (!payload) {
    res.status(404).json({ success: false, message: "Tracking link not found" });
    return;
  }
  await logAudit({
    action: "tracking_view",
    actor: "Public",
    entity: "TutorProfile",
    targetId: payload.applicationId,
    targetName: payload.tutorName,
    metadata: { ip: maskIp(req.ip), ua: req.headers["user-agent"]?.toString().slice(0, 80) },
  });
  res.status(200).json({ success: true, payload });
};

// ─── Admin per-component endpoints ────────────────────────────────────────────

async function ensureAdmin(req: AuthRequest, res: Response): Promise<boolean> {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ success: false, message: "Admin access required" });
    return false;
  }
  return true;
}

async function loadProfileOr404(req: AuthRequest, res: Response): Promise<{ user: IUser; profile: ITutorProfile } | null> {
  if (!(await ensureAdmin(req, res))) return null;
  const profile = await TutorProfile.findById(req.params.id);
  if (!profile) {
    res.status(404).json({ success: false, message: "Tutor profile not found" });
    return null;
  }
  const user = await User.findById(profile.user);
  if (!user) {
    res.status(404).json({ success: false, message: "Tutor user not found" });
    return null;
  }
  // Audit P0-3: country-scope guard. enforceCountryScope has already
  // validated that req.countryScopeCode is one of the acting admin's
  // allowedCountryCodes, so if it's set it defines the ceiling for the
  // profiles this request may touch. A profile whose own country
  // doesn't match that scope must look like a 404 (same convention as
  // other IDOR surfaces — do not reveal existence to a wrong-country
  // operator). super_admin requests pass through with req.countryScopeCode
  // left unset by the middleware.
  if (req.countryScopeCode) {
    const profileCountry = (profile.countryCode || user.countryCode || "").toUpperCase();
    if (profileCountry !== req.countryScopeCode) {
      res.status(404).json({ success: false, message: "Tutor profile not found" });
      return null;
    }
  }
  return { user, profile };
}

function actorFromReq(req: AuthRequest) {
  return {
    name: req.user?.name || "Admin",
    role: "admin" as const,
    id: req.user?._id?.toString(),
  };
}

export const listApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!(await ensureAdmin(req, res))) return;
  const { status, marketplace, homeTuition, search, from, to, page = "1", limit = "20" } = req.query;
  const filter: Record<string, unknown> = {};
  const profileFilter: Record<string, unknown> = {};

  if (status && status !== "all") {
    const map: Record<string, Record<string, unknown>> = {
      APPLICATION_STARTED: { onboardingStep: 1, onboardingComplete: false },
      DOCUMENTS_REQUIRED: { onboardingComplete: false, onboardingStep: { $gt: 1 } },
      APPLICATION_SUBMITTED: { onboardingComplete: true, verificationStatus: "pending" },
      UNDER_REVIEW: { verificationStatus: "pending" },
      ACTION_REQUIRED: { $or: [
        { cnicVerificationStatus: "rejected" },
        { degreeVerificationStatus: "rejected" },
        { demoVideoStatus: "rejected" },
        { policeVerificationStatus: "rejected" },
      ] },
      VERIFICATION_IN_PROGRESS: { $or: [
        { cnicVerificationStatus: "pending" },
        { degreeVerificationStatus: "pending" },
        { demoVideoStatus: "pending" },
        { policeVerificationStatus: "pending" },
      ] },
      APPROVED_FOR_MARKETPLACE: { verificationStatus: "approved" },
      HOME_TUITION_VERIFICATION_REQUIRED: { verificationStatus: "approved", policeVerificationStatus: { $in: ["not_submitted", "pending", "rejected"] } },
      HOME_TUITION_ELIGIBLE: { policeVerificationStatus: "approved" },
      REJECTED: { verificationStatus: "rejected" },
      SUSPENDED: { suspendedAt: { $exists: true, $ne: null } },
      RE_VERIFICATION_REQUIRED: { reVerificationRequired: true },
    };
    Object.assign(profileFilter, map[String(status)] || {});
  }
  if (marketplace === "eligible") Object.assign(profileFilter, { demoVideoStatus: "approved", cnicVerificationStatus: "approved", verificationStatus: "approved" });
  if (marketplace === "blocked") Object.assign(profileFilter, { $or: [{ demoVideoStatus: { $ne: "approved" } }, { cnicVerificationStatus: { $ne: "approved" } }, { verificationStatus: { $ne: "approved" } }] });
  if (homeTuition === "eligible") Object.assign(profileFilter, { policeVerificationStatus: "approved" });
  if (homeTuition === "blocked") Object.assign(profileFilter, { policeVerificationStatus: { $ne: "approved" }, teachingMode: { $in: ["in-person", "both"] } });

  if (from) Object.assign(profileFilter, { createdAt: { ...((profileFilter.createdAt as object) || {}), $gte: new Date(String(from)) } });
  if (to) Object.assign(profileFilter, { createdAt: { ...((profileFilter.createdAt as object) || {}), $lte: new Date(String(to)) } });

  // Audit P0-3: for a country-scoped admin, every row in the result
  // must belong to their country. enforceCountryScope has already set
  // req.countryScopeCode to the UPPERCASE allowed country code; a
  // super_admin leaves it unset and gets the global list.
  if (req.countryScopeCode) {
    Object.assign(profileFilter, { countryCode: req.countryScopeCode });
  }

  const pageNum = Math.max(1, parseInt(String(page)) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
  const skip = (pageNum - 1) * limitNum;

  let userQuery: Record<string, unknown> = { role: "tutor" };
  if (search) {
    const pattern = new RegExp(String(search), "i");
    const matchingUsers = await User.find({ $or: [{ name: pattern }, { applicationId: String(search).toUpperCase() }] }).select("_id");
    userQuery = { ...userQuery, _id: { $in: matchingUsers.map(u => u._id) } };
  }

  const userIds = (await User.find(userQuery).select("_id applicationId name createdAt").lean()).map(u => u._id);
  const finalFilter = { ...profileFilter, user: { $in: userIds } };

  // Calculate summary across ALL matching tutors for the UI chips
  const allProfiles = await TutorProfile.find({ user: { $in: userIds } }).lean();
  const summary: Record<string, number> = {};
  for (const p of allProfiles) {
    const st = computeCanonicalStatus(p);
    summary[st] = (summary[st] || 0) + 1;
  }

  const [total, profiles] = await Promise.all([
    TutorProfile.countDocuments(finalFilter),
    TutorProfile.find(finalFilter)
      .populate("user", "name email phone city applicationId createdAt isActive")
      .sort("-updatedAt")
      .skip(skip)
      .limit(limitNum),
  ]);

  const rows = profiles.map(p => {
    const user = p.user as unknown as IUser;
    return {
      _id: p._id,
      applicationId: user?.applicationId,
      tutorName: user?.name,
      tutorEmail: user?.email,
      tutorUserId: user?._id,
      profile: {
        _id: p._id,
        cnicFront: p.cnicFront,
        cnicBack: p.cnicBack,
        videoIntro: p.videoIntro,
        policeCertificate: p.policeCertificate,
        teachingMode: p.teachingMode,
      },
      verificationComponents: {
        cnic: {
          status: p.cnicVerificationStatus || "not_submitted",
          rejectionReason: p.cnicRejectionReason || null,
          submittedAt: p.cnicSubmittedAt?.toISOString() || null,
          reviewedAt: p.cnicReviewedAt?.toISOString() || null,
        },
        degree: {
          status: p.degreeVerificationStatus || "not_submitted",
          rejectionReason: p.degreeRejectionReason || null,
          submittedAt: p.degreeSubmittedAt?.toISOString() || null,
          reviewedAt: p.degreeReviewedAt?.toISOString() || null,
        },
        demoVideo: {
          status: p.demoVideoStatus || "not_submitted",
          rejectionReason: p.demoVideoRejectionReason || null,
          submittedAt: p.demoVideoSubmittedAt?.toISOString() || null,
          reviewedAt: p.demoVideoReviewedAt?.toISOString() || null,
        },
        police: {
          status: p.policeVerificationStatus || "not_required",
          rejectionReason: p.policeRejectionReason || null,
          submittedAt: p.policeSubmittedAt?.toISOString() || null,
          reviewedAt: p.policeReviewedAt?.toISOString() || null,
        },
      },
      canonicalStatus: computeCanonicalStatus(p),
      submittedAt: p.createdAt,
      lastUpdated: p.updatedAt,
      progress: computeSimpleProgress(p),
      marketplaceEligible: isMarketplaceEligible(p),
      homeTuitionEligible: isHomeTuitionEligible(p),
      teachingMode: p.teachingMode,
    };
  });

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    summary,
    applications: rows,
  });
};

function computeSimpleProgress(profile: ITutorProfile): number {
  // Once a profile has cleared marketplace approval, every document below
  // has necessarily already passed review - report 100% rather than
  // letting raw field-presence checks keep the admin list showing a
  // partially-complete bar for an already-approved application.
  if (isMarketplaceEligible(profile)) return 100;
  let done = 0;
  let total = 5;
  if (profile.fullName && profile.fullName.trim() !== "") done++;
  if (profile.education && profile.education.length > 0 && profile.education[0].degree) done++;
  if (profile.cnicFront && profile.cnicBack) done++;
  if (profile.videoIntro) done++;
  if (profile.policeCertificate) { total++; done++; }
  return Math.round((done / total) * 100);
}

export const getApplicationDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { user, profile } = data;
  const [history, reviewHistory] = await Promise.all([
    TutorApplicationStatusHistory.find({ tutor: user._id }).sort({ createdAt: -1 }).limit(50),
    AdminVerificationReview.find({ tutorProfile: profile._id }).populate("admin", "name email").sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  res.status(200).json({
    success: true,
    application: {
      applicationId: user.applicationId,
      tutorUserId: user._id,
      tutorName: user.name,
      tutorEmail: user.email,
      tutorAvatar: user.avatar,
      isActive: user.isActive,
      profile,
      history: history.map(h => ({
        id: h._id,
        at: h.createdAt,
        event: h.event,
        message: h.message,
        actor: h.actor,
        actorRole: h.actorRole,
      })),
      reviewHistory: reviewHistory.map((review) => ({
        id: review._id.toString(), component: review.component, decision: review.decision,
        previousStatus: review.previousStatus || null, newStatus: review.newStatus,
        rejectionReason: review.rejectionReason || null, internalNotes: review.internalNotes || null,
        reviewedAt: review.createdAt, reviewedBy: (review.admin as unknown as { name?: string })?.name || "System",
      })),
    },
  });
};

export const updateCnic = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { status, reason } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    res.status(400).json({ success: false, message: "Invalid status" });
    return;
  }
  if (status === "rejected" && !String(reason || "").trim()) {
    res.status(400).json({ success: false, message: "A rejection reason is required so the tutor can correct the document." });
    return;
  }
  const { user, profile } = data;
  const previousDocumentStatus = profile.cnicVerificationStatus;
  profile.cnicVerificationStatus = status;
  profile.cnicRejectionReason = status === "rejected" ? (reason || "") : "";
  profile.cnicReviewedAt = new Date();
  profile.lastStatusChangeAt = new Date();
  await profile.save({ validateModifiedOnly: true });

  const actor = actorFromReq(req);
  await recordDocumentDecision({ userId: user._id.toString(), profileId: profile._id.toString(), adminId: actor.id, component: "cnic", previousStatus: previousDocumentStatus, status, reason });
  await syncReviewQueueComponent(profile._id.toString(), "cnic", status, reason);
  if (status === "approved") {
    await recordStatusEvent({
      tutorId: user._id.toString(),
      tutorProfileId: profile._id.toString(),
      actor,
      event: "CNIC_VERIFIED",
      message: "CNIC verified",
      statusAfter: "approved",
    });
    await NotificationService.publishEvent(user._id.toString(), "verification.approved", {
      document: "CNIC", ctaArgs: ctaArgs(user), title: "🛡️ CNIC verified", message: "Your ID verification is complete.", link: "/tutor/application-status", type: "verification"
    });
  } else if (status === "rejected") {
    await recordStatusEvent({
      tutorId: user._id.toString(),
      tutorProfileId: profile._id.toString(),
      actor,
      event: "CNIC_REJECTED",
      message: `CNIC rejected${reason ? `: ${reason}` : ""}`,
      statusAfter: "rejected",
    });
    await setAccountStatus(user._id.toString(), "submitted");
    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", {
      document: "CNIC", reason: reason || "", ctaArgs: ctaArgs(user), title: "Action required: CNIC re-upload", message: reason || "Please re-upload your CNIC.", link: "/tutor/application-status", type: "verification"
    });
  } else if (status === "pending") {
    await recordStatusEvent({
      tutorId: user._id.toString(),
      tutorProfileId: profile._id.toString(),
      actor,
      event: "CNIC_PENDING",
      message: `CNIC marked as pending for review`,
      statusAfter: "pending",
    });
    await NotificationService.publishEvent(user._id.toString(), "verification.pending", { 
      title: "📄 Document Pending", message: "Your CNIC has been reset to pending review.", link: "/tutor/application-status", type: "verification"
    });
  }
  await logAudit({
    action: `cnic_${status}`,
    actor: actor.name,
    actorId: actor.id,
    entity: "TutorProfile",
    targetId: profile._id.toString(),
    targetName: user.name,
    metadata: reason ? { reason } : undefined,
  });
  await syncMarketplaceAndHomeTuition(actorFromReq(req), user, profile);
  res.status(200).json({ success: true, profile });
};

export const updateAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { status, reason } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    res.status(400).json({ success: false, message: "Invalid status" });
    return;
  }
  if (status === "rejected" && !String(reason || "").trim()) {
    res.status(400).json({ success: false, message: "A rejection reason is required so the tutor can correct the photo." });
    return;
  }
  const { user, profile } = data;
  const previousDocumentStatus = profile.avatarVerificationStatus;
  profile.avatarVerificationStatus = status;
  profile.avatarRejectionReason = status === "rejected" ? (reason || "") : "";
  profile.avatarReviewedAt = new Date();
  profile.lastStatusChangeAt = new Date();
  await profile.save({ validateModifiedOnly: true });

  const actor = actorFromReq(req);
  await recordDocumentDecision({ userId: user._id.toString(), profileId: profile._id.toString(), adminId: actor.id, component: "avatar", previousStatus: previousDocumentStatus, status, reason });
  if (status === "approved") {
    await recordStatusEvent({
      tutorId: user._id.toString(),
      tutorProfileId: profile._id.toString(),
      actor,
      event: "AVATAR_VERIFIED",
      message: "Profile photo verified",
      statusAfter: "approved",
    });
    await NotificationService.publishEvent(user._id.toString(), "verification.approved", {
      document: "Profile photo", ctaArgs: ctaArgs(user), title: "🛡️ Profile photo verified", message: "Your profile photo is approved.", link: "/tutor/application-status", type: "verification"
    });
  } else if (status === "rejected") {
    await recordStatusEvent({
      tutorId: user._id.toString(),
      tutorProfileId: profile._id.toString(),
      actor,
      event: "AVATAR_REJECTED",
      message: `Profile photo rejected${reason ? `: ${reason}` : ""}`,
      statusAfter: "rejected",
    });
    await setAccountStatus(user._id.toString(), "submitted");
    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", {
      document: "Profile photo", reason: reason || "", ctaArgs: ctaArgs(user), title: "Action required: profile photo re-upload", message: reason || "Please re-upload your profile photo.", link: "/tutor/application-status", type: "verification"
    });
  } else if (status === "pending") {
    await recordStatusEvent({
      tutorId: user._id.toString(),
      tutorProfileId: profile._id.toString(),
      actor,
      event: "AVATAR_PENDING",
      message: `Profile photo marked as pending for review`,
      statusAfter: "pending",
    });
    await NotificationService.publishEvent(user._id.toString(), "verification.pending", {
      title: "📄 Document Pending", message: "Your profile photo has been reset to pending review.", link: "/tutor/application-status", type: "verification"
    });
  }
  await logAudit({
    action: `avatar_${status}`,
    actor: actor.name,
    actorId: actor.id,
    entity: "TutorProfile",
    targetId: profile._id.toString(),
    targetName: user.name,
    metadata: reason ? { reason } : undefined,
  });
  await syncMarketplaceAndHomeTuition(actorFromReq(req), user, profile);
  res.status(200).json({ success: true, profile });
};

export const updateDegree = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { status, reason } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    res.status(400).json({ success: false, message: "Invalid status" });
    return;
  }
  if (status === "rejected" && !String(reason || "").trim()) {
    res.status(400).json({ success: false, message: "A rejection reason is required so the tutor can correct the document." });
    return;
  }
  const { user } = data;
  const qualificationIndex = req.body.qualificationIndex ?? 0;
  if (!Number.isInteger(qualificationIndex) || qualificationIndex < 0 || !data.profile.education[qualificationIndex]) {
    res.status(422).json({ success: false, message: "Choose an existing qualification to review." });
    return;
  }
  const actor = actorFromReq(req);
  let profile;
  try {
    profile = await commitQualificationDecision({ profileId: data.profile._id.toString(), index: qualificationIndex,
      status, reason: String(reason || ""), degreeLevel: req.body.verifiedDegreeLevel,
      expectedToken: qualificationReviewToken(data.profile.education[qualificationIndex]), actor: { id: req.user!._id.toString(), name: actor.name } });
  } catch (error) {
    res.status(error instanceof QualificationDecisionError ? error.statusCode : 503).json({ success: false,
      message: error instanceof QualificationDecisionError ? error.message : "Review could not be committed. Reload before retrying." });
    return;
  }
  if (!profile) { res.status(503).json({ success: false, message: "Reload the application before retrying." }); return; }
  if (status === "approved") {
    await NotificationService.publishEvent(user._id.toString(), "verification.approved", {
      document: "Degree", ctaArgs: ctaArgs(user), title: "Qualification verified", message: `Qualification ${qualificationIndex + 1} has been verified. Overall educational review: ${profile.degreeVerificationStatus}.`, link: "/tutor/application-status", type: "verification"
    });
  } else if (status === "rejected") {
    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", {
      document: "Degree", reason: reason || "", ctaArgs: ctaArgs(user), title: "Action required: Educational documents", message: reason || "Please re-upload your documents.", link: "/tutor/application-status", type: "verification"
    });
    await setAccountStatus(user._id.toString(), "submitted");
  } else if (status === "pending") {
    await NotificationService.publishEvent(user._id.toString(), "verification.pending", { 
      title: "📄 Document Pending", message: "Your educational documents have been reset to pending review.", link: "/tutor/application-status", type: "verification"
    });
  }
  await syncMarketplaceAndHomeTuition(actorFromReq(req), user, profile);
  res.status(200).json({ success: true, profile });
};

export const updateDemoVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { status, reason } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    res.status(400).json({ success: false, message: "Invalid status" });
    return;
  }
  if (status === "rejected" && !String(reason || "").trim()) {
    res.status(400).json({ success: false, message: "A rejection reason is required so the tutor can correct the document." });
    return;
  }
  const { user, profile } = data;
  const previousDocumentStatus = profile.demoVideoStatus;
  profile.demoVideoStatus = status;
  profile.demoVideoRejectionReason = status === "rejected" ? (reason || "") : "";
  profile.demoVideoReviewedAt = new Date();
  profile.lastStatusChangeAt = new Date();
  await profile.save({ validateModifiedOnly: true });

  const actor = actorFromReq(req);
  await recordDocumentDecision({ userId: user._id.toString(), profileId: profile._id.toString(), adminId: actor.id, component: "demoVideo", previousStatus: previousDocumentStatus, status, reason });
  await syncReviewQueueComponent(profile._id.toString(), "demoVideo", status, reason);
  if (status === "approved") {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "DEMO_VIDEO_APPROVED", message: "Demo video approved", statusAfter: "approved" });
    await NotificationService.publishEvent(user._id.toString(), "verification.approved", {
      document: "DemoVideo", ctaArgs: ctaArgs(user), title: "Demo video approved 🎬", message: "Your demo video is live on your public profile.", link: "/tutor/application-status", type: "verification"
    });
  } else if (status === "rejected") {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "DEMO_VIDEO_REJECTED", message: `Demo video rejected${reason ? `: ${reason}` : ""}`, statusAfter: "rejected" });
    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", {
      document: "DemoVideo", reason: reason || "", ctaArgs: ctaArgs(user), title: "Action required: Demo video", message: reason || "Please re-record your demo video.", link: "/tutor/application-status", type: "verification"
    });
    await setAccountStatus(user._id.toString(), "submitted");
  } else if (status === "pending") {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "DEMO_VIDEO_PENDING", message: `Demo video marked as pending for review`, statusAfter: "pending" });
    await NotificationService.publishEvent(user._id.toString(), "verification.pending", { 
      title: "🎥 Video Pending", message: "Your demo video has been reset to pending review.", link: "/tutor/application-status", type: "verification"
    });
  }
  await logAudit({ action: `demo_video_${status}`, actor: actor.name, actorId: actor.id, entity: "TutorProfile", targetId: profile._id.toString(), targetName: user.name, metadata: reason ? { reason } : undefined });
  await syncMarketplaceAndHomeTuition(actorFromReq(req), user, profile);
  res.status(200).json({ success: true, profile });
};

export const updatePolice = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { status, reason } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    res.status(400).json({ success: false, message: "Invalid status" });
    return;
  }
  if (status === "rejected" && !String(reason || "").trim()) {
    res.status(400).json({ success: false, message: "A rejection reason is required so the tutor can correct the document." });
    return;
  }
  const { user, profile } = data;
  const previousDocumentStatus = profile.policeVerificationStatus;
  profile.policeVerificationStatus = status;
  profile.policeRejectionReason = status === "rejected" ? (reason || "") : "";
  profile.policeReviewedAt = new Date();
  profile.lastStatusChangeAt = new Date();
  await profile.save({ validateModifiedOnly: true });

  const actor = actorFromReq(req);
  await recordDocumentDecision({ userId: user._id.toString(), profileId: profile._id.toString(), adminId: actor.id, component: "police", previousStatus: previousDocumentStatus, status, reason });
  await syncReviewQueueComponent(profile._id.toString(), "police", status, reason);
  if (status === "approved") {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "POLICE_VERIFICATION_APPROVED", message: "Police verification approved", statusAfter: "approved" });
    await NotificationService.publishEvent(user._id.toString(), "home_tuition.eligibility_granted", {
      document: "Police", ctaArgs: ctaArgs(user), title: "Police verification approved 🛡️", message: "You can now offer Home and In-Person Tuition.", link: "/tutor/application-status", type: "verification"
    });
  } else if (status === "rejected") {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "POLICE_VERIFICATION_REJECTED", message: `Police verification rejected${reason ? `: ${reason}` : ""}`, statusAfter: "rejected" });
    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", {
      document: "Police", reason: reason || "", ctaArgs: ctaArgs(user), title: "Action required: Police verification", message: reason || "Please re-submit your police certificate.", link: "/tutor/application-status", type: "verification"
    });
    await setAccountStatus(user._id.toString(), "submitted");
  } else if (status === "pending") {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "POLICE_VERIFICATION_PENDING", message: `Police verification marked as pending for review`, statusAfter: "pending" });
    await NotificationService.publishEvent(user._id.toString(), "verification.pending", {
      title: "👮 Verification Pending", message: "Your police certificate has been reset to pending review.", link: "/tutor/application-status", type: "verification"
    });
  }
  await logAudit({ action: `police_${status}`, actor: actor.name, actorId: actor.id, entity: "TutorProfile", targetId: profile._id.toString(), targetName: user.name, metadata: reason ? { reason } : undefined });
  await syncMarketplaceAndHomeTuition(actorFromReq(req), user, profile);
  res.status(200).json({ success: true, profile });
};

export const setMarketplaceEligibility = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { eligible, reason } = req.body;
  if (typeof eligible !== "boolean") {
    res.status(400).json({ success: false, message: "eligible must be boolean" });
    return;
  }
  const { user, profile } = data;
  if (eligible && !isMarketplaceEligible(profile)) {
    res.status(409).json({ success: false, message: "Marketplace access cannot be enabled until all required verification checks are approved." });
    return;
  }
  const wasEligible = profile.marketplaceEligible;
  profile.marketplaceEligible = eligible;
  if (eligible) {
    profile.marketplaceEligibleAt = profile.marketplaceEligibleAt || new Date();
  } else {
    profile.marketplaceEligibleAt = undefined;
  }
  profile.lastStatusChangeAt = new Date();
  await profile.save({ validateModifiedOnly: true });

  const actor = actorFromReq(req);
  if (eligible && !wasEligible) {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "MARKETPLACE_ACTIVATED", message: "Marketplace profile activated" });
    await NotificationService.publishEvent(user._id.toString(), "verification.approved", {
      document: "Marketplace", ctaArgs: ctaArgs(user), title: "🎉 You're live on TUTORERA", message: "Your profile is now active on the marketplace.", link: "/tutor/application-status", type: "verification"
    });
    if (profile.isVerified) await setAccountStatus(user._id.toString(), "verified");
  } else if (!eligible && wasEligible) {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "MARKETPLACE_DEACTIVATED", message: `Marketplace profile deactivated${reason ? `: ${reason}` : ""}` });
    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", {
      document: "Marketplace", reason: reason || "", ctaArgs: ctaArgs(user), title: "Marketplace visibility paused", message: reason || "Your marketplace visibility has been paused.", link: "/tutor/application-status", type: "verification"
    });
  }
  await logAudit({ action: `marketplace_${eligible ? "activated" : "deactivated"}`, actor: actor.name, actorId: actor.id, entity: "TutorProfile", targetId: profile._id.toString(), targetName: user.name, metadata: reason ? { reason } : undefined });
  res.status(200).json({ success: true, profile });
};

export const setHomeTuitionEligibility = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { eligible, reason } = req.body;
  if (typeof eligible !== "boolean") {
    res.status(400).json({ success: false, message: "eligible must be boolean" });
    return;
  }
  const { user, profile } = data;
  const wasEligible = profile.homeTuitionEligible;
  profile.homeTuitionEligible = eligible;
  if (eligible) {
    profile.homeTuitionEligibleAt = profile.homeTuitionEligibleAt || new Date();
  } else {
    profile.homeTuitionEligibleAt = undefined;
  }
  profile.lastStatusChangeAt = new Date();
  await profile.save({ validateModifiedOnly: true });

  const actor = actorFromReq(req);
  if (eligible && !wasEligible) {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "HOME_TUITION_ACTIVATED", message: "Home tuition eligibility activated" });
    await NotificationService.publishEvent(user._id.toString(), "home_tuition.eligibility_granted", {
      ctaArgs: ctaArgs(user), title: "Home tuition approved 🏠", message: "You are eligible to respond to Home and In-Person Tuition opportunities.", link: "/tutor/application-status", type: "verification"
    });
  }
  if (!eligible && wasEligible) {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "HOME_TUITION_DEACTIVATED", message: `Home tuition eligibility deactivated${reason ? `: ${reason}` : ""}` });
    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", { // Fallback to rejected for home tuition pause
      reason: reason || "", ctaArgs: ctaArgs(user), title: "Home tuition paused", message: reason || "Your Home and In-Person Tuition eligibility has been paused.", link: "/tutor/application-status", type: "verification"
    });
  }
  await logAudit({ action: `home_tuition_${eligible ? "activated" : "deactivated"}`, actor: actor.name, actorId: actor.id, entity: "TutorProfile", targetId: profile._id.toString(), targetName: user.name, metadata: reason ? { reason } : undefined });
  res.status(200).json({ success: true, profile });
};

export const setSuspended = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { suspended, reason } = req.body;
  if (typeof suspended !== "boolean") {
    res.status(400).json({ success: false, message: "suspended must be boolean" });
    return;
  }
  const { user, profile } = data;
  const wasSuspended = Boolean(profile.suspendedAt);
  if (suspended) {
    profile.suspendedAt = new Date();
    profile.suspendedReason = reason || "";
    profile.marketplaceEligible = false;
    profile.homeTuitionEligible = false;
  } else {
    profile.suspendedAt = undefined;
    profile.suspendedReason = "";
  }
  profile.lastStatusChangeAt = new Date();
  await profile.save({ validateModifiedOnly: true });

  const actor = actorFromReq(req);
  if (suspended && !wasSuspended) {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "PROFILE_SUSPENDED", message: `Profile suspended${reason ? `: ${reason}` : ""}` });
    await NotificationService.publishEvent(user._id.toString(), "account.suspended", {
      reason: reason || "", ctaArgs: ctaArgs(user), title: "Profile suspended", message: reason || "Your profile has been suspended.", link: "/tutor/application-status", type: "verification"
    });
  } else if (!suspended && wasSuspended) {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "PROFILE_UNSUSPENDED", message: "Profile re-instated" });
    await NotificationService.publishEvent(user._id.toString(), "account.reactivated", {
      title: "Profile re-instated", message: "Your profile is active again.", link: "/tutor/application-status", type: "verification"
    });
  }
  await logAudit({ action: suspended ? "profile_suspended" : "profile_unsuspended", actor: actor.name, actorId: actor.id, entity: "TutorProfile", targetId: profile._id.toString(), targetName: user.name, metadata: reason ? { reason } : undefined });
  res.status(200).json({ success: true, profile });
};

export const setReverification = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { required, reason } = req.body;
  if (typeof required !== "boolean") {
    res.status(400).json({ success: false, message: "required must be boolean" });
    return;
  }
  const { user, profile } = data;
  profile.reVerificationRequired = required;
  profile.reVerificationReason = required ? (reason || "") : "";
  profile.lastStatusChangeAt = new Date();
  await profile.save({ validateModifiedOnly: true });

  const actor = actorFromReq(req);
  if (required) {
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "RE_VERIFICATION_REQUESTED", message: `Re-verification requested${reason ? `: ${reason}` : ""}` });
    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", { // Or a specific reverification event
      reason: reason || "", ctaArgs: ctaArgs(user), title: "Re-verification required", message: reason || "Please re-submit your verification.", link: "/tutor/application-status", type: "verification"
    });
  }
  await logAudit({ action: `re_verification_${required ? "requested" : "cleared"}`, actor: actor.name, actorId: actor.id, entity: "TutorProfile", targetId: profile._id.toString(), targetName: user.name, metadata: reason ? { reason } : undefined });
  res.status(200).json({ success: true, profile });
};

export const setAdminExempt = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { exempt, reason } = req.body;
  if (typeof exempt !== "boolean") {
    res.status(400).json({ success: false, message: "exempt must be boolean" });
    return;
  }
  const { user, profile } = data;
  const actor = actorFromReq(req);
  profile.adminApprovalExempt = exempt;
  profile.adminApprovalExemptAt = exempt ? new Date() : undefined;
  profile.adminApprovalExemptBy = exempt ? req.user?._id : undefined;
  profile.lastStatusChangeAt = new Date();
  await profile.save({ validateModifiedOnly: true });
  await logAudit({ action: `admin_approval_exempt_${exempt ? "granted" : "revoked"}`, actor: actor.name, actorId: actor.id, entity: "TutorProfile", targetId: profile._id.toString(), targetName: user.name, metadata: reason ? { reason } : undefined });
  await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: exempt ? "ADMIN_APPROVAL_EXEMPT_GRANTED" : "ADMIN_APPROVAL_EXEMPT_REVOKED", message: `Admin approval exemption ${exempt ? "granted" : "revoked"}${reason ? `: ${reason}` : ""}` });
  res.status(200).json({ success: true, profile });
};

export const setPoliceNotRequired = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { notRequired, reason } = req.body;
  if (typeof notRequired !== "boolean") {
    res.status(400).json({ success: false, message: "notRequired must be boolean" });
    return;
  }
  const { user, profile } = data;
  const actor = actorFromReq(req);
  if (notRequired) {
    profile.policeVerificationStatus = "not_required";
    profile.policeRejectionReason = "";
    profile.policeReviewedAt = new Date();
  } else {
    profile.policeVerificationStatus = profile.policeCertificate ? "pending" : "not_submitted";
  }
  profile.lastStatusChangeAt = new Date();
  await profile.save({ validateModifiedOnly: true });
  await logAudit({ action: `police_verification_${notRequired ? "exempted" : "re_enabled"}`, actor: actor.name, actorId: actor.id, entity: "TutorProfile", targetId: profile._id.toString(), targetName: user.name, metadata: reason ? { reason } : undefined });
  await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: notRequired ? "POLICE_EXEMPTED" : "POLICE_REQUIREMENT_RESTORED", message: `Police verification ${notRequired ? "marked not required" : "re-enabled"}${reason ? `: ${reason}` : ""}` });
  res.status(200).json({ success: true, profile });
};

export const getApplicationHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { user } = data;
  const history = await TutorApplicationStatusHistory.find({ tutor: user._id }).sort({ createdAt: -1 }).limit(100);
  res.status(200).json({ success: true, history });
};

export async function syncMarketplaceAndHomeTuition(actor: { name: string; role: "system" | "tutor" | "admin"; id?: string }, user: IUser, profile: ITutorProfile) {
  const responseProfile = profile;
  const current = await loadReviewActivationSnapshot(profile._id.toString());
  user = current.user;
  profile = current.profile;
  const now = new Date();
  const accountNotBlocked = !user.isDeleted && !user.suspendedAt &&
    !["suspended", "banned", "deleted"].includes(user.moderationStatus ?? "");
  // Individual document decisions must be able to complete the application;
  // previously `isMarketplaceEligible()` required an already-approved profile,
  // making automatic completion impossible after the final document approval.
  const coreDocumentsApproved = accountNotBlocked && profile.onboardingComplete &&
    profile.cnicVerificationStatus === "approved" &&
    profile.degreeVerificationStatus === "approved" &&
    profile.demoVideoStatus === "approved" &&
    !profile.suspendedAt && !profile.reVerificationRequired;
  const hasApprovedTeachingSubject = Array.isArray(profile.subjectEligibility) && profile.subjectEligibility.some((entry) =>
    entry?.status === "approved" && Array.isArray(entry.levels) && entry.levels.length > 0
  );
  if (coreDocumentsApproved && profile.verificationStatus !== "approved") {
    profile.verificationStatus = "approved";
    profile.isVerified = true;
    profile.lastStatusChangeAt = now;
    await profile.save({ validateModifiedOnly: true });
    await recordStatusEvent({ tutorId: user._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "PROFILE_APPROVED", message: "Tutor application approved after all mandatory marketplace documents were verified", statusAfter: "approved" });
    if (!hasApprovedTeachingSubject) {
      await NotificationService.publishEvent(user._id.toString(), "verification.pending", {
        ctaArgs: ctaArgs(user),
        title: "Teaching subject approval required",
        message: "Your documents are verified. Select teaching subjects and levels; an administrator must approve at least one before an agreement and marketplace activation can proceed.",
        link: "/onboarding/tutor?step=3",
        type: "verification",
      });
    }
  }
  // A subject decision can arrive after document approval. Create the
  // agreement at that later point as well, rather than requiring an admin to
  // re-save a document to unblock the tutor.
  if (coreDocumentsApproved && profile.verificationStatus === "approved" && hasApprovedTeachingSubject) {
    const issuance = await issueReviewedTutorAgreement(profile._id.toString(), actor);
    if (!issuance) throw new Error("Agreement issuance could not be completed.");
    profile = issuance.profile;
    if (issuance.issued) {
      await NotificationService.publishEvent(user._id.toString(), "verification.approved", {
        document: "All", hourlyRate: profile.hourlyRate, currency: profile.currency,
        ctaArgs: ctaArgs(user), title: "Tutor application approved", message: "Your Tutor Marketplace Agreement and approved rate are ready.", link: "/tutor/application-status", type: "verification",
      });
    }
  }
  const visibility = await synchronizeReviewVisibility(profile._id.toString(), actor);
  if (!visibility) throw new Error("Visibility synchronization could not be completed.");
  profile = visibility.profile;
  const mpEligible = visibility.marketplace;
  const htEligible = visibility.home;
  if (mpEligible && visibility.marketplaceChanged) {
    await NotificationService.publishEvent(user._id.toString(), "verification.approved", {
      document: "Marketplace", ctaArgs: ctaArgs(user), title: "🎉 You're live on TUTORERA", message: "Your profile is now active on the marketplace.", link: "/tutor/application-status", type: "verification"
    });
  } else if (!mpEligible && visibility.marketplaceChanged) {
    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", {
      document: "Marketplace", reason: "Your marketplace access was paused because a verification requirement is no longer met.", ctaArgs: ctaArgs(user), title: "Marketplace visibility paused", message: "Your marketplace access was paused because a verification requirement is no longer met.", link: "/tutor/application-status", type: "verification"
    });
  }
  if (htEligible && visibility.homeChanged) {
    await NotificationService.publishEvent(user._id.toString(), "home_tuition.eligibility_granted", {
      ctaArgs: ctaArgs(user), title: "Home tuition approved 🏠", message: "You are eligible to respond to Home and In-Person Tuition opportunities.", link: "/tutor/application-status", type: "verification"
    });
  } else if (!htEligible && visibility.homeChanged) {
    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", {
      reason: "Your home tuition access was paused because a verification requirement is no longer met.", ctaArgs: ctaArgs(user), title: "Home tuition paused", message: "Your home tuition access was paused because a verification requirement is no longer met.", link: "/tutor/application-status", type: "verification"
    });
  }
  // Keep the caller's response in sync without writing the stale document back.
  if (typeof responseProfile.set === "function") responseProfile.set(profile.toObject());
}

// ─── Admin document upload on tutor's behalf ──────────────────────────────────
export const uploadApplicationDocumentOnBehalf = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { user, profile } = data;
  const actor = actorFromReq(req);

  const documentType = String(req.body.documentType || "").trim();
  const qualificationIndex = documentType === "degree" ? degreeUploadIndex(profile, req.body.qualificationIndex) : 0;
  if (qualificationIndex === null) {
    res.status(422).json({ success: false, message: "Choose an existing qualification for this degree upload." });
    return;
  }
  const autoApprove = documentType !== "degree" && (req.body.autoApprove === true || req.body.autoApprove === "true");
  const videoUrl = String(req.body.videoUrl || "").trim();

  const validTypes = ["cnicFront", "cnicBack", "degree", "policeCertificate", "videoIntro"];
  if (!validTypes.includes(documentType)) {
    res.status(400).json({
      success: false,
      message: `Invalid documentType. Must be one of: ${validTypes.join(", ")}`,
    });
    return;
  }

  const files = (req.files as Record<string, Express.Multer.File[]>) || {};
  const uploadedFile =
    files.file?.[0] ||
    files[documentType]?.[0] ||
    (files.cnicFront?.[0] && documentType === "cnicFront" ? files.cnicFront[0] : undefined) ||
    (files.cnicBack?.[0] && documentType === "cnicBack" ? files.cnicBack[0] : undefined) ||
    (files.degree?.[0] && documentType === "degree" ? files.degree[0] : undefined) ||
    (files.policeCertificate?.[0] && documentType === "policeCertificate" ? files.policeCertificate[0] : undefined) ||
    (files.videoIntro?.[0] && documentType === "videoIntro" ? files.videoIntro[0] : undefined);

  if (!uploadedFile && documentType !== "videoIntro") {
    res.status(400).json({ success: false, message: "Please select a document file to upload." });
    return;
  }

  if (!uploadedFile && documentType === "videoIntro" && !videoUrl) {
    res.status(400).json({ success: false, message: "Please select an MP4 video or provide a video URL." });
    return;
  }

  try {
    let secureUrl = "";
    let publicId = "";

    if (uploadedFile) {
      const isVideo = documentType === "videoIntro";
      const allowedMimes = isVideo
        ? ["video/mp4"]
        : ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
      const { valid, detectedType } = await verifyFileSignature(uploadedFile.buffer, allowedMimes);
      if (!valid) {
        res.status(400).json({
          success: false,
          message: `File is invalid (detected: ${detectedType || "unknown"}). Allowed formats: ${allowedMimes.join(", ")}`,
        });
        return;
      }

      const folder =
        documentType === "cnicFront" || documentType === "cnicBack"
          ? "tutorera/verification/cnic"
          : documentType === "degree"
          ? "tutorera/verification/degrees"
          : documentType === "policeCertificate"
          ? "tutorera/verification/police"
          : "tutorera/verification/videos";

      const result = await uploadToCloudinary(
        uploadedFile.buffer,
        folder,
        isVideo ? "video" : "auto",
        !isVideo
      );
      secureUrl = result.secure_url;
      publicId = result.public_id;
    } else if (documentType === "videoIntro" && videoUrl) {
      secureUrl = videoUrl;
      publicId = "";
    }

    const now = new Date();
    profile.lastStatusChangeAt = now;
    const componentForDocument = documentType === "cnicFront" || documentType === "cnicBack"
      ? "cnic" as const
      : documentType === "degree"
      ? "degree" as const
      : documentType === "policeCertificate"
      ? "police" as const
      : "demoVideo" as const;
    const previousStatus = componentForDocument === "cnic"
      ? profile.cnicVerificationStatus
      : componentForDocument === "degree"
      ? profile.degreeVerificationStatus
      : componentForDocument === "police"
      ? profile.policeVerificationStatus
      : profile.demoVideoStatus;

    if (documentType === "cnicFront") {
      profile.cnicFront = secureUrl;
      profile.cnicFrontPublicId = publicId;
      profile.cnicSubmittedAt = now;
      profile.cnicVerificationStatus = autoApprove ? "approved" : "pending";
      profile.cnicRejectionReason = "";
      if (autoApprove) profile.cnicReviewedAt = now;
    } else if (documentType === "cnicBack") {
      profile.cnicBack = secureUrl;
      profile.cnicBackPublicId = publicId;
      profile.cnicSubmittedAt = now;
      profile.cnicVerificationStatus = autoApprove ? "approved" : "pending";
      profile.cnicRejectionReason = "";
      if (autoApprove) profile.cnicReviewedAt = now;
    } else if (documentType === "degree") {
      Object.assign(profile, prepareDegreeReplacement(profile, secureUrl, publicId, qualificationIndex));
      profile.degreeSubmittedAt = now;
    } else if (documentType === "policeCertificate") {
      profile.policeCertificate = secureUrl;
      profile.policeCertificatePublicId = publicId;
      profile.policeSubmittedAt = now;
      profile.policeVerificationStatus = autoApprove ? "approved" : "pending";
      profile.policeRejectionReason = "";
      if (autoApprove) profile.policeReviewedAt = now;
    } else if (documentType === "videoIntro") {
      profile.videoIntro = secureUrl;
      profile.videoIntroPublicId = publicId;
      profile.demoVideoSubmittedAt = now;
      profile.demoVideoStatus = autoApprove ? "approved" : "pending";
      profile.demoVideoRejectionReason = "";
      if (autoApprove) profile.demoVideoReviewedAt = now;
    }

    await profile.save({ validateModifiedOnly: true });

    // Uploading with immediate approval is still a review decision. Persist it
    await flagPendingQualificationBookings(profile);
    // in the same immutable decision stream as actions taken from the queue.
    if (autoApprove) {
      await recordDocumentDecision({
        userId: user._id.toString(),
        profileId: profile._id.toString(),
        adminId: actor.id,
        component: componentForDocument,
        previousStatus,
        status: "approved",
      });
    }
    await syncReviewQueueComponent(profile._id.toString(), componentForDocument, autoApprove ? "approved" : "pending");

    const eventName: StatusEvent =
      documentType === "cnicFront" || documentType === "cnicBack"
        ? (autoApprove ? "CNIC_VERIFIED" : "CNIC_SUBMITTED")
        : documentType === "degree"
        ? (autoApprove ? "EDUCATIONAL_DOCUMENTS_VERIFIED" : "EDUCATIONAL_DOCUMENTS_SUBMITTED")
        : documentType === "policeCertificate"
        ? (autoApprove ? "POLICE_VERIFICATION_APPROVED" : "POLICE_VERIFICATION_SUBMITTED")
        : (autoApprove ? "DEMO_VIDEO_APPROVED" : "DEMO_VIDEO_SUBMITTED");

    await recordStatusEvent({
      tutorId: user._id.toString(),
      tutorProfileId: profile._id.toString(),
      actor,
      event: eventName,
      message: `Document '${documentType}' uploaded on tutor's behalf by Admin ${actor.name}${autoApprove ? " (Approved immediately)" : " (Marked for review)"}`,
    });

    await logAudit({
      action: `admin_uploaded_${documentType}`,
      actor: actor.name,
      actorId: actor.id,
      entity: "TutorProfile",
      targetId: profile._id.toString(),
      targetName: user.name,
      metadata: { documentType, autoApprove, secureUrl },
    });

    await syncMarketplaceAndHomeTuition(actorFromReq(req), user, profile);

    await NotificationService.publishEvent(user._id.toString(), "verification.rejected", { // Fallback, just for the in-app notif
      title: "Document updated by Administration",
      message: `Your ${documentType} document was updated by platform support.`,
      link: "/tutor/application-status",
      type: "verification",
    });

    res.status(200).json({
      success: true,
      message: `Document uploaded successfully${autoApprove ? " and approved" : ""}.`,
      profile,
      document: { type: documentType, url: secureUrl },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload document.";
    console.error("[Tracking] uploadApplicationDocumentOnBehalf error:", err);
    res.status(500).json({ success: false, message });
  }
};

// @desc    Admin: approve a tutor's pending subject-eligibility request for
//          specific teaching levels. Tutor selections never grant this on
//          their own - this endpoint is the only place status flips to
//          "approved".
// @route   PATCH /api/tracking/admin/applications/:id/subject-eligibility
// @access  Private (admin)
export const reviewSubjectEligibility = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const { profile, user } = data;
  const { subject, action, levels, reason } = req.body as { subject?: string; action?: "approve" | "reject" | "revoke"; levels?: string[]; reason?: string };

  if (!subject || typeof subject !== "string") {
    res.status(400).json({ success: false, message: "A subject is required." });
    return;
  }
  if (!["approve", "reject", "revoke"].includes(action || "")) {
    res.status(400).json({ success: false, message: "action must be one of: approve, reject, revoke." });
    return;
  }

  const actor = actorFromReq(req);
  let result;
  try {
    result = await commitSubjectDecision({ profileId: profile._id.toString(), subject, action: action!,
      levels: Array.isArray(levels) ? levels : [], reason: typeof reason === "string" ? reason : "",
      expectedToken: subjectDecisionToken(profile, subject), actor: { id: req.user!._id.toString(), name: actor.name } });
  } catch (error) {
    res.status(error instanceof SubjectDecisionError ? error.statusCode : 503).json({ success: false,
      message: error instanceof SubjectDecisionError ? error.message : "Review could not be committed. Reload before retrying." });
    return;
  }
  if (!result) { res.status(503).json({ success: false, message: "Reload before retrying." }); return; }
  await syncMarketplaceAndHomeTuition(actor, user, result.profile);

  const eventCopy: Record<string, { title: string; message: string }> = {
    approve: { title: "Subject approved ✅", message: `You're now approved to teach ${subject}.` },
    reject: { title: "Subject request declined", message: `Your request to teach ${subject} was not approved.${reason ? ` Reason: ${reason}` : ""}` },
    revoke: { title: "Subject eligibility revoked", message: `Your approval to teach ${subject} has been revoked.${reason ? ` Reason: ${reason}` : ""}` },
  };
  const copy = eventCopy[action as string];
  await NotificationService.publishEvent(user._id.toString(), "verification.subject_eligibility", {
    title: copy.title,
    message: copy.message,
    link: "/tutor/application-status",
    type: "verification",
  });

  res.status(200).json({ success: true, message: copy.title, profile: result.profile, flaggedBookings: result.flaggedBookings });
};

/** Admin-only, short-lived viewing link for one private supporting-evidence
 * file. Evidence URLs are deliberately not returned in list responses. */
export const reviewSubjectEligibilityEvidence = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const subject = String(req.params.subject || "");
  const index = Number(req.params.index);
  const { status, reason } = req.body;
  if (!["approved", "rejected"].includes(status) || typeof reason !== "string" || !reason.trim()) {
    res.status(400).json({ success: false, message: "Choose approved or rejected and provide an evidence-specific reason." }); return;
  }
  let entry;
  try {
    entry = await commitSubjectEvidenceDecision({ profileId: data.profile._id.toString(), subject, index, status, reason,
      actor: { id: req.user!._id.toString(), name: req.user?.name || "Admin" } });
  } catch (error) {
    if (error instanceof EvidenceDecisionError) { res.status(error.statusCode).json({ success: false, message: error.message }); return; }
    console.error("[SubjectEvidence] Transaction failed", error);
    res.status(503).json({ success: false, message: "The evidence decision and audit could not be committed. Reload before retrying." }); return;
  }
  await NotificationService.publishEvent(data.user._id.toString(), status === "approved" ? "verification.approved" : "verification.rejected", {
    document: `${subject} supporting evidence`, reason: reason.trim(), ctaArgs: ctaArgs(data.user),
    title: `Subject evidence ${status}`, message: `${subject} evidence ${index + 1} ${status}: ${reason.trim()}. Subject and teaching-level approval remains a separate decision.`,
    link: "/tutor/application-status", type: "verification",
  }).catch((error) => console.error("[SubjectEvidence] Review notification failed", error));
  res.json({ success: true, subjectEligibility: entry });
};

export const getSubjectEligibilityEvidenceUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await loadProfileOr404(req, res);
  if (!data) return;
  const subject = String(req.params.subject || "").trim().toLowerCase();
  const index = Number(req.params.index);
  const entry = data.profile.subjectEligibility?.find((item) => item.subject.trim().toLowerCase() === subject);
  const evidence = Number.isInteger(index) && index >= 0 ? entry?.evidence?.[index] : undefined;
  if (!evidence?.publicId) { res.status(404).json({ success: false, message: "Supporting evidence is not available." }); return; }
  await logAudit({ action: "subject_eligibility_evidence_viewed", actor: req.user?.name, actorId: req.user?._id?.toString(), entity: "TutorProfile", targetId: data.profile._id.toString(), targetName: data.profile.fullName, metadata: { subject, index } });
  res.json({ success: true, url: getSignedViewUrl(evidence.publicId, "raw"), label: evidence.label || "Supporting evidence" });
};
