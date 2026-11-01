import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import TutorProfile, { ITutorProfile } from "../models/TutorProfile.model";
import User from "../models/User.model";
import TutorAvailability from "../models/TutorAvailability.model";
import Bid from "../models/Bid.model";
import Request from "../models/Request.model";
import { computeAndStoreTutorResponseTime, formatResponseTime } from "../services/tutorStats.service";
import { advanceAccountStatus } from "../services/accountLifecycle.service";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadToCloudinary";
import { MatchingService } from "../services/matching.service";
import { verifyFileSignature } from "../middlewares/upload.middleware";
import { allocateApplicationId, generateTrackingToken, isMarketplaceEligible, recordStatusEvent } from "../services/tracking.service";
import sendEmail from "../utils/sendEmail";
import { applicationSubmittedEmail, documentResubmittedEmail } from "../utils/trackingEmails";
import { sendNotification } from "../utils/socket";
import { NotificationService } from "../services/notification.service";
import { normalizeEducationLevels } from "../config/educationLevels";
import { preserveQualificationReviews } from "../services/qualificationReview.service";
import { prepareDegreeReplacement, degreeUploadIndex } from "../services/degreeReplacement.service";
import { reconcileQualificationSubjects } from "../services/qualificationSubjectReconciliation.service";
import { flagPendingQualificationBookings } from "../services/qualificationBookingReview.service";
import { resolveLocationReferences } from "../services/locationReference.service";
import { resolveMarket } from "../services/market.service";
import { syncReviewQueueForProfile } from "../services/verification.service";
import { syncMarketplaceAndHomeTuition } from "./tracking.controller";
import { calculateMarketplaceFees } from "../services/pricing.service";
import { requestSubjectEligibility, syncApprovedSubjects } from "../services/subjectEligibility.service";
import SchoolOffering from "../models/SchoolOffering.model";
import { assignUniqueTutorSlug } from "../services/tutorSlug.service";
import { logAudit } from "../utils/logAudit";
import { persistTutorEducationEdit } from "../services/educationEditPersistence.service";

const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4"];

/** Preview the authoritative booking fee calculation while a tutor chooses an
 * asking rate. This never creates a fee commitment; every accepted offer
 * retains its own immutable fee snapshot. */
export const getOnboardingFinancialPreview = async (req: AuthRequest, res: Response): Promise<void> => {
  const rate = Number(req.query.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    res.status(400).json({ success: false, message: "A positive hourly rate is required." });
    return;
  }
  const profile = await TutorProfile.findOne({ user: req.user?._id }).select("countryCode currency teachingMode").lean();
  const fees = await calculateMarketplaceFees(rate, profile?.countryCode || req.user?.countryCode || "PK");
  res.status(200).json({ success: true, fees });
};

/** Uploads supporting evidence for a conditional subject request. It does not
 * approve the subject; an authorised reviewer must still decide it. */
export const uploadSubjectEligibilityEvidence = async (req: AuthRequest, res: Response): Promise<void> => {
  const subject = String(req.params.subject || "").trim();
  if (!subject || !req.file) { res.status(400).json({ success: false, message: "A subject and supporting evidence file are required." }); return; }
  if (!DOCUMENT_TYPES.includes(req.file.mimetype)) { res.status(400).json({ success: false, message: "Upload a valid PDF, JPEG, or PNG document." }); return; }
  const signature = await verifyFileSignature(req.file.buffer, DOCUMENT_TYPES);
  if (!signature.valid) { res.status(400).json({ success: false, message: "Upload a valid PDF, JPEG, or PNG document." }); return; }
  const profile = await TutorProfile.findOne({ user: req.user?._id });
  const entry = profile?.subjectEligibility?.find((item) => item.subject.trim().toLowerCase() === subject.toLowerCase());
  if (!profile || !entry) { res.status(404).json({ success: false, message: "Subject eligibility request not found." }); return; }
  if (["approved", "revoked", "suspended"].includes(entry.status)) { res.status(409).json({ success: false, message: "This subject request cannot accept further evidence in its current status." }); return; }
  try {
    const uploaded = await safeUploadToCloudinary(req.file.buffer, "tutorera/verification/subject-evidence", "raw", true);
    entry.evidence = [...(entry.evidence || []), { url: uploaded.secure_url, publicId: uploaded.public_id, label: String(req.body.label || req.file.originalname).slice(0, 160), uploadedAt: new Date(), status: "pending" }];
    entry.status = "pending";
    await profile.save();
    await recordStatusEvent({ tutorId: req.user!._id.toString(), tutorProfileId: profile._id.toString(), actor: { name: req.user?.name || profile.fullName, role: "tutor", id: req.user?._id.toString() }, event: "SUBJECT_EVIDENCE_SUBMITTED", message: `Supporting evidence submitted for ${subject}`, isPublic: true });
    await logAudit({ action: "subject_eligibility_evidence_uploaded", actor: req.user?.name, actorId: req.user?._id?.toString(), entity: "TutorProfile", targetId: profile._id.toString(), targetName: profile.fullName, metadata: { subject, evidenceCount: entry.evidence.length } });
    await NotificationService.publishEvent("system_admin", "admin.subject_eligibility_evidence_submitted", {
      tutorName: profile.fullName, subject, title: "Subject evidence submitted", message: `${profile.fullName} submitted supporting evidence for ${subject}.`, type: "verification", link: "/admin/academic-framework/tutor-approvals",
    }).catch((error) => console.error("[SubjectEligibility] Admin evidence notification failed", error));
    res.status(201).json({ success: true, message: "Supporting evidence submitted for admin review.", subjectEligibility: entry });
  } catch (error) { console.error("[SubjectEligibility] Evidence upload failed", error); res.status(502).json({ success: false, message: "We couldn't upload your evidence right now. Please try again." }); }
};

// Cloudinary outages/misconfig used to bubble up as an uncaught rejection,
// which the global error handler renders as an opaque "Something went wrong"
// with no indication a file upload was the cause. Give onboarding submitters
// a clear, actionable message instead.
async function safeUploadToCloudinary(
  ...args: Parameters<typeof uploadToCloudinary>
): Promise<ReturnType<typeof uploadToCloudinary>> {
  try {
    return await uploadToCloudinary(...args);
  } catch (err) {
    console.error("[TutorOnboarding] Cloudinary upload failed:", err);
    throw Object.assign(new Error("We couldn't upload your file right now. Please try again in a moment."), { statusCode: 502 });
  }
}

// Online tuition never needs a police check; in-person and both do. Reused
// wherever teachingMode can change (initial onboarding step 4 and later
// self-service profile edits) so the two paths can't drift out of sync.
function computeNextPoliceStatus(
  currentStatus: string | undefined,
  hasPoliceCertificateOnFile: boolean,
  teachingMode: string | undefined
): "not_required" | "not_submitted" | "pending" | "approved" | "rejected" {
  if (teachingMode === "online") return "not_required";
  if (!hasPoliceCertificateOnFile) return "not_submitted";
  // A certificate is already on file - keep its current review status unless
  // it was previously marked not_required (switching away from online with
  // an old certificate on file still needs a fresh review).
  return currentStatus && currentStatus !== "not_required" ? (currentStatus as any) : "pending";
}

// @desc    Create or update tutor profile
// @route   POST /api/tutors/profile
// @access  Private (tutor only)
export const createOrUpdateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user?._id;

  let profile = await TutorProfile.findOne({ user: userId });

  if (profile) {
    const updateData = { ...req.body };
    let resetTeachingSubjects: string[] = [];
    if (Array.isArray(updateData.education)) {
      updateData.education = preserveQualificationReviews(profile.education, updateData.education);
      resetTeachingSubjects = reconcileQualificationSubjects(profile, updateData.education);
      profile.education = updateData.education;
      updateData.subjectEligibility = profile.subjectEligibility;
      updateData.approvedSubjects = profile.approvedSubjects;
      updateData.degreeVerificationStatus = updateData.education.length && updateData.education.every((qualification: { verificationStatus?: string }) => qualification.verificationStatus === "approved") ? "approved" : "pending";
    }
    if (Array.isArray(updateData.levels)) {
      updateData.levels = normalizeEducationLevels(updateData.levels);
    }
    if (updateData.cnicFront || updateData.cnicBack) {
      updateData.cnicVerificationStatus = "pending";
    }
    if (updateData.videoIntro) {
      updateData.demoVideoStatus = "pending";
    }
    if (typeof updateData.lat === "number" && typeof updateData.lng === "number") {
      updateData.location = { type: "Point", coordinates: [updateData.lng, updateData.lat] };
    }

    // teachingMode drives whether a police check is required at all - unlike
    // every other field here, it's a business-rule trigger, not an inert
    // value. Changing it without recomputing policeVerificationStatus is how
    // a tutor could switch to "online" and keep home-tuition eligibility
    // (or switch to "in-person"/"both" and get stuck with no way to submit
    // the now-required certificate).
    if (updateData.teachingMode && updateData.teachingMode !== profile.teachingMode) {
      updateData.policeVerificationStatus = computeNextPoliceStatus(
        profile.policeVerificationStatus,
        Boolean(profile.policeCertificate),
        updateData.teachingMode
      );
    }

    if (Array.isArray(updateData.subjects)) {
      const selectedSubjects = Array.from(new Set(updateData.subjects.map((subject: unknown) => String(subject || "").trim()).filter(Boolean))) as string[];
      const disciplines = (profile.education || []).map((education) => education.discipline).filter(Boolean) as string[];
      for (const subject of selectedSubjects) {
        await requestSubjectEligibility(profile, subject, { disciplines });
      }
      syncApprovedSubjects(profile);
      updateData.subjects = selectedSubjects;
      updateData.subjectEligibility = profile.subjectEligibility;
      updateData.approvedSubjects = profile.approvedSubjects;
    }

    if (updateData.fullName || updateData.subjects || updateData.countryCode || updateData.nationalityCountryCode) {
      Object.assign(profile, updateData);
      await assignUniqueTutorSlug(profile);
      updateData.slug = profile.slug;
      updateData.countrySlug = profile.countrySlug;
    }

    // Update existing profile
    profile = await persistTutorEducationEdit({ profileId: profile._id.toString(), update: updateData,
      resetSubjects: resetTeachingSubjects, actor: { id: String(userId), name: req.user!.name } });
    if (profile) profile = await profile.populate("user", "name email avatar phone city countryCode countryName timezone currency");
    if ((updateData.teachingMode || Array.isArray(updateData.education)) && profile) {
      const tutorUser = await User.findById(userId);
      if (tutorUser) {
        await syncMarketplaceAndHomeTuition(
          { name: tutorUser.name, role: "tutor", id: tutorUser._id.toString() },
          tutorUser,
          profile
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile,
    });
    return;
  }

  const createData = { ...req.body };
  if (typeof createData.lat === "number" && typeof createData.lng === "number") {
    createData.location = { type: "Point", coordinates: [createData.lng, createData.lat] };
  }

  // Create new profile
  profile = await TutorProfile.create({
    user: userId,
    ...createData,
  });

  await profile.populate("user", "name email avatar phone city countryCode countryName timezone currency");

  res.status(201).json({
    success: true,
    message: "Profile created successfully",
    profile,
  });
};

// @desc    Get my tutor profile
// @route   GET /api/tutors/profile/me
// @access  Private (tutor only)
export const getMyProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const profile = await TutorProfile.findOne({ user: req.user?._id }).populate(
    "user",
    "name email avatar phone city countryCode countryName timezone currency"
  );

  if (!profile) {
    res.status(404).json({ success: false, message: "Profile not found" });
    return;
  }

  res.status(200).json({ success: true, profile });
};

// @desc    Get tutor by ID (public)
// @route   GET /api/tutors/:id
// @access  Public
const TUTOR_POPULATE_FIELDS = "name email avatar phone city countryCode countryName timezone currency";

// Shared by both the legacy ID-based lookup and the SEO-friendly slug
// lookup below - detail pages must apply the same public-visibility policy
// as listings. Unactivated tutors, unapproved applications, and those with
// unsigned agreements must NEVER appear publicly or be indexed by search
// engines.
async function respondWithPublicTutorProfile(res: Response, profile: ITutorProfile | null): Promise<void> {
  const user = profile?.user as unknown as { name?: string; email?: string; isActive?: boolean; isDeleted?: boolean; isTestAccount?: boolean } | undefined;
  const userLooksLikeTest = /\b(test|testing|demo|sample|placeholder|dummy)\b/i.test(
    `${user?.name || ""} ${user?.email || ""}`
  );
  const agreementSigned = Boolean(profile?.agreementAcceptedAt) || profile?.legacyAgreementStatus === "accepted" || profile?.marketplaceEligible === true;
  const isPublicProfile = Boolean(
    profile &&
      profile.verificationStatus === "approved" &&
      profile.isVerified === true &&
      isMarketplaceEligible(profile) &&
      agreementSigned &&
      profile.isTestAccount !== true &&
      !profile.suspendedAt &&
      profile.tutorStatus !== "suspended" &&
      profile.tutorStatus !== "terminated" &&
      user?.isActive !== false &&
      user?.isDeleted !== true &&
      user?.isTestAccount !== true &&
      !userLooksLikeTest
  );

  if (!isPublicProfile) {
    res.status(404).json({ success: false, message: "Tutor not found" });
    return;
  }

  const publicProfile = profile!;
  let responseMinutes = publicProfile.averageResponseMinutes;
  if (!responseMinutes) {
    responseMinutes = await computeAndStoreTutorResponseTime((publicProfile.user as any)._id?.toString() || publicProfile.user.toString());
  }

  res.status(200).json({
    success: true,
    profile: {
      ...publicProfile.toObject(),
      averageResponseMinutes: responseMinutes,
      responseTimeFormatted: formatResponseTime(responseMinutes),
    },
  });
}

// @desc    Get a tutor by their legacy ObjectId. Kept for backward
//          compatibility (old bookmarks/backlinks/admin tooling) - new
//          links should use getTutorBySlug below.
// @route   GET /api/tutors/:id
// @access  Public
export const getTutorById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const id = extractObjectId(String(req.params.id || ""));
  const profile =
    (await TutorProfile.findById(id).populate("user", TUTOR_POPULATE_FIELDS)) ??
    (await TutorProfile.findOne({ user: id }).populate("user", TUTOR_POPULATE_FIELDS));
  await respondWithPublicTutorProfile(res, profile);
};

// @desc    Get a tutor by their SEO-friendly slug - the canonical public
//          profile lookup. The ObjectId never appears in the URL.
// @route   GET /api/tutors/slug/:country/:slug
// @access  Public
export const getTutorBySlug = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const slug = String(req.params.slug || "").toLowerCase();
  if (!slug) {
    res.status(404).json({ success: false, message: "Tutor not found" });
    return;
  }
  const profile = await TutorProfile.findOne({ slug }).populate("user", TUTOR_POPULATE_FIELDS);
  await respondWithPublicTutorProfile(res, profile);
};

function extractObjectId(value: string): string {
  return value.match(/[a-f\d]{24}/i)?.[0] || value;
}

const escapeRegex = (value: unknown): string =>
  String(value || "").slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const TUTOR_SORTS = new Set([
  "-averageRating", "averageRating", "-hourlyRate", "hourlyRate",
  "-experience", "experience", "-totalReviews", "totalReviews",
  "-lastActiveAt", "lastActiveAt",
]);

// @desc    Get all tutors with global search & filter
// @route   GET /api/tutors
// @access  Public
export const getAllTutors = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const {
    search,
    subject,
    level,
    country,
    countryCode,
    city,
    teachingMode,
    currency,
    minPrice,
    maxPrice,
    minRating,
    language,
    curriculum,
    page = "1",
    limit = "10",
    sort = "-averageRating",
    matchRequestId,
    schoolOfferingId,
  } = req.query;

  // Build filter object: Strictly gate search results to active tutors who
  // cleared verification AND signed their legal agreement.
  const filter: Record<string, unknown> = {
    verificationStatus: "approved",
    isVerified: true,
    suspendedAt: { $exists: false },
    isTestAccount: { $ne: true },
    $or: [
      { agreementAcceptedAt: { $exists: true, $ne: null } },
      { legacyAgreementStatus: "accepted" },
    ],
  };

  // Older production records predate isTestAccount. Exclude only accounts
  // with unmistakable QA/demo markers while administrators migrate them to
  // the explicit flag; normal names are never filtered by this safeguard.
  const testUsers = await User.find({
    $or: [
      { isTestAccount: true },
      { name: /\b(test|testing|demo|sample|placeholder|dummy)\b/i },
      { email: /@(test|example)\.|\.(test|example)$/i },
    ],
  }).select("_id").lean();
  if (testUsers.length > 0) {
    filter.user = { $nin: testUsers.map((user) => user._id) };
  }

  const andClauses: Record<string, unknown>[] = [];

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    andClauses.push({
      $or: [
        { fullName: pattern },
        { approvedSubjects: pattern },
        { bio: pattern },
        { city: pattern },
        { countryName: pattern },
        { curricula: pattern },
      ],
    });
  }

  if (subject) {
    filter.approvedSubjects = { $in: [new RegExp(`^${escapeRegex(String(subject))}$`, "i")] };
  }

  if (level) {
    filter.subjectEligibility = { $elemMatch: { status: "approved", levels: String(level) } };
  }
  if (schoolOfferingId) {
    const offering = typeof schoolOfferingId === "string" && schoolOfferingId.length <= 200 ? await SchoolOffering.findOne({ _id: schoolOfferingId, status: "active" }).lean() : null;
    if (!offering) { res.json({ success: true, tutors: [], total: 0, page: 1, pages: 0 }); return; }
    filter.schoolOfferingIds = offering._id;
    filter.subjectEligibility = { $elemMatch: { status: "approved", subject: new RegExp(`^${escapeRegex(offering.subject)}$`, "i"), levels: offering.approvalLevel } };
  }

  const selectedCountry = countryCode || country;
  if (selectedCountry) {
    const codeUpper = String(selectedCountry).toUpperCase();
    andClauses.push({
      $or: [
        { countryCode: codeUpper },
        { countryName: new RegExp(String(selectedCountry), "i") },
      ],
    });
  }

  if (andClauses.length > 0) {
    filter.$and = andClauses;
  }

  if (city) {
    filter.city = new RegExp(city as string, "i");
  }

  if (teachingMode) {
    if (teachingMode === "online") {
      filter.teachingMode = { $in: ["online", "both"] };
    } else if (teachingMode === "in-person") {
      filter.teachingMode = { $in: ["in-person", "both"] };
    } else {
      filter.teachingMode = teachingMode;
    }
  }

  if (currency) {
    filter.currency = String(currency).toUpperCase();
  }

  if (language) {
    filter["languages.language"] = new RegExp(language as string, "i");
  }

  if (curriculum) {
    filter.curricula = { $in: [new RegExp(curriculum as string, "i")] };
  }

  if (minPrice || maxPrice) {
    filter.hourlyRate = {
      ...(minPrice ? { $gte: Number(minPrice) } : {}),
      ...(maxPrice ? { $lte: Number(maxPrice) } : {}),
    };
  }

  if (minRating) {
    filter.averageRating = { $gte: Number(minRating) };
  }

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
  const safeSort = TUTOR_SORTS.has(String(sort)) ? String(sort) : "-averageRating";
  const skip = (pageNum - 1) * limitNum;

  const total = await TutorProfile.countDocuments(filter);
  const tutors = await TutorProfile.find(filter)
    .select("user fullName city countryName countryCode approvedSubjects subjectEligibility hourlyRate currency teachingMode averageRating totalReviews averageResponseMinutes lastActiveAt isVerified verificationStatus bio experience videoIntro degreeVerificationStatus policeVerificationStatus")
    .populate("user", "name email avatar city countryCode countryName timezone currency")
    .sort(safeSort)
    .skip(skip)
    .limit(limitNum);

  const tutorsWithResponse = tutors.map((t) => {
    const obj = t.toObject() as any;
    const approvedEntries = (obj.subjectEligibility || []).filter((entry: { status: string; levels?: unknown[] }) => entry.status === "approved" && Array.isArray(entry.levels) && entry.levels.length > 0);
    obj.subjects = obj.approvedSubjects || [];
    obj.levels = Array.from(new Set(approvedEntries.flatMap((entry: { levels: unknown[] }) => entry.levels)));
    delete obj.subjectEligibility;
    obj.responseTimeFormatted = formatResponseTime(obj.averageResponseMinutes || 0);
    return obj;
  });

  if (matchRequestId && typeof matchRequestId === "string") {
    const matchRequest = await Request.findById(matchRequestId).lean();
    if (matchRequest) {
      const ranked = await MatchingService.rankTutors(matchRequest as any, tutorsWithResponse as any[]);
      const rankedMap = new Map(ranked.map((s) => [(s.tutor as { _id?: unknown })._id?.toString() ?? "", s]));
      tutorsWithResponse.forEach((t) => {
        const matchData = rankedMap.get(t._id.toString());
        if (matchData) {
          t.matchScore = matchData.matchScore;
          t.matchBreakdown = matchData.scoreBreakdown;
          t.matchReasons = matchData.reasons;
          t.matchTier = matchData.tier;
        } else {
          t.matchScore = null;
        }
      });
    }
  }

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    tutors: tutorsWithResponse,
  });
};

// @desc    Get SEO facet availability for approved public tutor inventory
// @route   GET /api/tutors/seo-facets
// @access  Public
export const getTutorSeoFacets = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  const [result] = await TutorProfile.aggregate([
    { $match: { verificationStatus: "approved" } },
    {
      $facet: {
        countries: [
          { $match: { countryCode: { $nin: [null, ""] } } },
          { $group: { _id: "$countryCode", count: { $sum: 1 } } },
        ],
        cities: [
          { $match: { countryCode: { $nin: [null, ""] }, city: { $nin: [null, ""] } } },
          { $group: { _id: { countryCode: "$countryCode", city: "$city" }, count: { $sum: 1 } } },
        ],
        subjects: [
          { $unwind: "$subjects" },
          { $match: { subjects: { $nin: [null, ""] } } },
          { $group: { _id: { countryCode: "$countryCode", subject: "$subjects" }, count: { $sum: 1 } } },
        ],
        levels: [
          { $unwind: "$levels" },
          { $match: { levels: { $nin: [null, ""] } } },
          { $group: { _id: { countryCode: "$countryCode", level: "$levels" }, count: { $sum: 1 } } },
        ],
        citySubjects: [
          { $unwind: "$subjects" },
          { $match: { countryCode: { $nin: [null, ""] }, city: { $nin: [null, ""] }, subjects: { $nin: [null, ""] } } },
          { $group: { _id: { countryCode: "$countryCode", city: "$city", subject: "$subjects" }, count: { $sum: 1 } } },
        ],
        cityLevelSubjects: [
          { $unwind: "$subjects" },
          { $unwind: "$levels" },
          { $match: { countryCode: { $nin: [null, ""] }, city: { $nin: [null, ""] }, subjects: { $nin: [null, ""] }, levels: { $nin: [null, ""] } } },
          { $group: { _id: { countryCode: "$countryCode", city: "$city", level: "$levels", subject: "$subjects" }, count: { $sum: 1 } } },
        ],
        cityCurriculumSubjects: [
          { $unwind: "$subjects" },
          { $unwind: "$curricula" },
          { $match: { countryCode: { $nin: [null, ""] }, city: { $nin: [null, ""] }, subjects: { $nin: [null, ""] }, curricula: { $nin: [null, ""] } } },
          { $group: { _id: { countryCode: "$countryCode", city: "$city", curriculum: "$curricula", subject: "$subjects" }, count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  res.status(200).json({ success: true, ...result });
};

// @desc    Get onboarding status
// @route   GET /api/tutors/onboarding/status
// @access  Private (tutor)
export const getOnboardingStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  let profile = await TutorProfile.findOne({ user: req.user?._id });

  if (!profile) {
    profile = await TutorProfile.create({ user: req.user?._id });
  }

  res.status(200).json({
    success: true,
    onboardingStep: profile.onboardingStep,
    onboardingComplete: profile.onboardingComplete,
    verificationStatus: profile.verificationStatus,
    rejectionReason: profile.rejectionReason || "",
  });
};

// @desc    Save onboarding step data
// @route   POST /api/tutors/onboarding/step
// @access  Private (tutor)
export const saveOnboardingStep = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
  const { step, data } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  let profile = await TutorProfile.findOne({ user: req.user?._id });
  if (!profile) {
    profile = await TutorProfile.create({ user: req.user?._id });
    await advanceAccountStatus(req.user?._id?.toString() || "", "onboarding");
  }

  const stepNum = parseInt(step);
  let updateData: Record<string, unknown> = {};

  // Parse data
  let parsedData: Record<string, any>;
  try {
    parsedData = typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    res.status(400).json({ success: false, message: "The onboarding form data is invalid. Please refresh and try again." });
    return;
  }
  if (!parsedData || typeof parsedData !== "object" || !Number.isInteger(stepNum) || stepNum < 1 || stepNum > 5) {
    res.status(400).json({ success: false, message: "A valid onboarding step and form data are required." });
    return;
  }

  if (stepNum === 1) {
    // Personal Info & Global Location
    console.log("[TutorOnboarding] step1 start, userId:", req.user?._id, "countryCode:", parsedData.countryCode);
    const market = await resolveMarket(parsedData.countryCode || "PK");
    if (!market || !market.isActive || !market.tutorRegistration) {
      res.status(422).json({ success: false, code: "MARKET_UNAVAILABLE", message: "Tutor onboarding is not available in the selected market." });
      return;
    }
    const onlineCountryReach = Array.from(new Set(
      (Array.isArray(parsedData.onlineCountryReach) ? parsedData.onlineCountryReach : [])
        .map((code: unknown) => String(code || "").trim().toUpperCase())
        .filter((code: string) => code && code !== market.countryCode)
    ));
    const reachableMarkets = await Promise.all(onlineCountryReach.map((code) => resolveMarket(code)));
    if (reachableMarkets.some((reachable) => !reachable || !reachable.isActive || !reachable.onlineEnabled || !reachable.tutorRegistration)) {
      res.status(422).json({ success: false, code: "INVALID_ONLINE_MARKET", message: "Choose only active markets that currently support online tutoring and tutor registration." });
      return;
    }
    let locationReferences: Record<string, unknown>;
    try {
      locationReferences = await resolveLocationReferences(parsedData, market.countryCode);
    } catch (error) {
      res.status(422).json({ success: false, code: "INVALID_LOCATION_REFERENCE", message: error instanceof Error ? error.message : "Invalid location reference." });
      return;
    }

    // Profile photo is mandatory for every tutor still going through initial
    // onboarding - grandfathered tutors who already completed onboarding
    // before this requirement existed are never blocked by it (see the
    // pre-save hook in TutorProfile.model.ts for the matching allApproved
    // logic). A tutor re-visiting step 1 who already submitted a photo in a
    // prior attempt (avatarVerificationStatus !== "not_submitted") doesn't
    // need to re-upload every time.
    const needsAvatar = !profile.onboardingComplete && profile.avatarVerificationStatus === "not_submitted";
    let avatarUrl = "";
    if (files?.avatar?.[0]) {
      const { valid, detectedType } = await verifyFileSignature(files.avatar[0].buffer, IMAGE_TYPES);
      if (!valid) {
        res.status(400).json({ success: false, message: `Profile photo is invalid (detected: ${detectedType || "unknown"})` });
        return;
      }
      // Cloudinary public id isn't tracked on User yet (pre-existing gap on
      // the general avatar-upload path too), so it isn't captured here.
      const result = await safeUploadToCloudinary(files.avatar[0].buffer, "tutorera/avatars", "image", false);
      avatarUrl = result.secure_url;
    } else if (needsAvatar) {
      res.status(400).json({ success: false, message: "A profile photo is required to continue." });
      return;
    }

    const resubmitAvatar = Boolean(avatarUrl) && (profile.avatarVerificationStatus === "rejected" || profile.avatarVerificationStatus === "approved");
    const resolvedCity = (locationReferences.city as string | undefined) || parsedData.city;
    const resolvedTimezone = parsedData.timezone || (locationReferences.timezone as string | undefined) || market.timezone;
    updateData = {
      fullName: parsedData.fullName,
      phone: parsedData.phone,
      countryCode: market.countryCode,
      countryName: market.countryName,
      onlineCountryReach,
      city: resolvedCity,
      timezone: resolvedTimezone,
      currency: market.currency,
      ...locationReferences,
      gender: parsedData.gender,
      dateOfBirth: parsedData.dateOfBirth,
      languages: parsedData.languages || [{ language: "English", proficiency: "Fluent" }],
      onboardingStep: 2,
      ...(avatarUrl && { avatarVerificationStatus: "pending" as const, avatarSubmittedAt: new Date() }),
      ...(resubmitAvatar && { avatarRejectionReason: "" }),
    };
    Object.assign(profile, updateData);
    console.log("[TutorOnboarding] step1 slug assign start");
    await assignUniqueTutorSlug(profile);
    Object.assign(updateData, { slug: profile.slug, countrySlug: profile.countrySlug });
    console.log("[TutorOnboarding] step1 user update start, slug:", profile.slug);
    await User.findByIdAndUpdate(req.user?._id, {
      name: parsedData.fullName,
      phone: parsedData.phone,
      countryCode: market.countryCode,
      countryName: market.countryName,
      city: resolvedCity,
      timezone: resolvedTimezone,
      currency: market.currency,
      ...locationReferences,
      ...(avatarUrl && { avatar: avatarUrl }),
    });

    if (resubmitAvatar) {
      const tutorUser = await User.findById(req.user?._id).select("name email applicationId");
      if (tutorUser) {
        const { subject, html } = documentResubmittedEmail(tutorUser.name, "Profile photo", {
          applicationId: tutorUser.applicationId || "TUT-PENDING",
          statusUrl: `${process.env.CLIENT_URL || "https://tutorera.ac.pk"}/tutor/application-status`,
        });
        await sendEmail({ to: tutorUser.email, subject, html }).catch((emailErr) => {
          console.error("[TutorApplicationTracking] Avatar resubmission email failed:", emailErr);
        });
        await NotificationService.publishEvent("system_admin", "admin.tutor_document_resubmitted", {
          tutorName: tutorUser.name,
          tutorEmail: tutorUser.email,
          applicationId: tutorUser.applicationId,
          documentLabel: "Profile photo",
          title: "Document resubmitted",
          message: `${tutorUser.name} resubmitted their profile photo for re-review.`,
          type: "verification",
          link: "/admin/applications",
        }).catch((err) => console.error("[TutorApplicationTracking] Admin avatar-resubmission alert failed:", err));
      }
    }
  }

  else if (stepNum === 2) {
    // Education
    if (!String(parsedData.degree || "").trim() || !String(parsedData.institution || "").trim() || !Number.isInteger(parseInt(parsedData.year))) {
      res.status(400).json({ success: false, message: "Degree, institution, and graduation year are required." });
      return;
    }

    let degreeDocUrl = "";
    let degreeDocPublicId = "";

    if (files?.degreeDoc?.[0]) {
      const { valid, detectedType } = await verifyFileSignature(files.degreeDoc[0].buffer, DOCUMENT_TYPES);
      if (!valid) {
        res.status(400).json({ success: false, message: `Degree document is invalid (detected: ${detectedType || "unknown"})` });
        return;
      }

      const result = await safeUploadToCloudinary(
        files.degreeDoc[0].buffer,
        "tutorera/degrees",
        "auto",
        true
      );
      degreeDocUrl = result.secure_url;
      degreeDocPublicId = result.public_id;
    }
    const qualificationIndex = degreeUploadIndex(profile, parsedData.qualificationIndex, true);
    if (qualificationIndex === null) {
      res.status(400).json({ success: false, message: "Choose a valid qualification to update." });
      return;
    }
    if (!degreeDocUrl && !profile.education?.[qualificationIndex]?.degreeDoc) {
      res.status(400).json({ success: false, message: "A degree certificate or transcript is required for marketplace visibility." });
      return;
    }

    const previous = profile.education?.[qualificationIndex];
    const replacement = prepareDegreeReplacement(profile,
      degreeDocUrl || previous?.degreeDoc || "", degreeDocPublicId || previous?.degreeDocPublicId || "", qualificationIndex, true);
    const education = replacement.education;
    education[qualificationIndex].degree = parsedData.degree;
    education[qualificationIndex].institution = parsedData.institution;
    education[qualificationIndex].year = parseInt(parsedData.year);
    education[qualificationIndex].discipline = parsedData.discipline || previous?.discipline || "";
    education[qualificationIndex].disciplineRef = !parsedData.discipline || parsedData.discipline === previous?.discipline ? previous?.disciplineRef : undefined;
    const reconciled = preserveQualificationReviews(profile.education || [], education);
    reconcileQualificationSubjects(profile, reconciled);

    const wasSubmitted = !!previous?.degreeDoc;
    const resubmitDegree = Boolean(degreeDocUrl) && (profile.degreeVerificationStatus === "rejected" || profile.degreeVerificationStatus === "approved");
    updateData = {
      education: reconciled,
      subjectEligibility: profile.subjectEligibility,
      approvedSubjects: profile.approvedSubjects,
      degreeVerificationStatus: reconciled.some(item => item.verificationStatus === "rejected") ? "rejected"
        : reconciled.every(item => item.verificationStatus === "approved") ? "approved" : "pending",
      onboardingStep: 3,
      ...(degreeDocUrl && { degreeSubmittedAt: new Date() }),
      degreeRejectionReason: reconciled.filter(item => item.verificationStatus === "rejected").map(item => item.reviewReason).filter(Boolean).join("; "),
    };

    if (resubmitDegree) {
      const tutorUser = await User.findById(req.user?._id).select("name email applicationId");
      if (tutorUser) {
        const { subject, html } = documentResubmittedEmail(tutorUser.name, "Educational documents", {
          applicationId: tutorUser.applicationId || "TUT-PENDING",
          statusUrl: `${process.env.CLIENT_URL || "https://tutorera.ac.pk"}/tutor/application-status`,
        });
        await sendEmail({ to: tutorUser.email, subject, html }).catch((emailErr) => {
          console.error("[TutorApplicationTracking] Degree resubmission email failed:", emailErr);
        });
        await NotificationService.publishEvent("system_admin", "admin.tutor_document_resubmitted", {
          tutorName: tutorUser.name,
          tutorEmail: tutorUser.email,
          applicationId: tutorUser.applicationId,
          documentLabel: "Educational documents",
          title: "Document resubmitted",
          message: `${tutorUser.name} resubmitted their educational documents for re-review.`,
          type: "verification",
          link: "/admin/applications",
        }).catch((err) => console.error("[TutorApplicationTracking] Admin degree-resubmission alert failed:", err));
      }
    }
  }

  else if (stepNum === 3) {
    // Experience & Curricula. Selecting a subject here only creates a
    // "pending" eligibility request - it does not grant any marketplace
    // privilege on its own; an admin still has to approve it (see
    // services/subjectEligibility.service.ts).
    const selectedSubjects: string[] = parsedData.subjects || [];
    const disciplines = (profile.education || []).map((education) => education.discipline).filter(Boolean) as string[];
    for (const subject of selectedSubjects) {
      await requestSubjectEligibility(profile, subject, { disciplines });
    }
    syncApprovedSubjects(profile);
    // The primary subject feeds the public profile slug (e.g.
    // "...-mathematics-tutor-..."), so regenerate it now that subjects are known.
    profile.subjects = selectedSubjects;
    await assignUniqueTutorSlug(profile);
    updateData = {
      experience: parseInt(parsedData.experience),
      previousInstitutions: parsedData.previousInstitutions || [],
      subjects: selectedSubjects,
      levels: normalizeEducationLevels(parsedData.levels),
      curricula: parsedData.curricula || [],
      subjectEligibility: profile.subjectEligibility,
      approvedSubjects: profile.approvedSubjects,
      slug: profile.slug,
      countrySlug: profile.countrySlug,
      onboardingStep: 4,
    };
  }

  else if (stepNum === 4) {
    // Online Tuition: No Police Verification required.
    // In-Person / Both: Police report required for home tuition.
    const nextPoliceStatus = computeNextPoliceStatus(
      profile.policeVerificationStatus,
      Boolean(profile.policeCertificate),
      parsedData.teachingMode
    );

    // Currency is a market settlement rule, not a tutor-editable price-form
    // field. Step 1 resolves it from MarketConfig; retain that snapshot here
    // so a stale client payload cannot change a USD market back to PKR.
    const nextCurrency = profile.currency || "USD";
    updateData = {
      bio: parsedData.bio,
      hourlyRate: parseInt(parsedData.hourlyRate),
      currency: nextCurrency,
      teachingMode: parsedData.teachingMode,
      policeVerificationStatus: nextPoliceStatus,
      serviceAreas: parsedData.serviceAreas || [],
      travelRadiusKm: parsedData.travelRadiusKm ? parseInt(parsedData.travelRadiusKm) : 10,
      availability: parsedData.availability || [],
      onboardingStep: 5,
    };
    await User.findByIdAndUpdate(req.user?._id, { currency: nextCurrency });

    if (parsedData.availability?.length > 0) {
      const weeklySlots = (parsedData.availability as { day: string; slots: string[] }[])
        .flatMap(a =>
          a.slots.map(slot => {
            const parts = slot.split(" ");
            const period = parts[1];
            const [hourStr, minStr] = parts[0].split(":");
            let hour = parseInt(hourStr);

            if (period === "PM" && hour !== 12) hour += 12;
            if (period === "AM" && hour === 12) hour = 0;

            const startTime = `${String(hour).padStart(2, "0")}:${minStr}`;
            const endHour = hour + 1 > 23 ? 23 : hour + 1;
            const endTime = `${String(endHour).padStart(2, "0")}:${minStr}`;

            return { day: a.day, startTime, endTime };
          })
        );

      await TutorAvailability.findOneAndUpdate(
        { tutor: req.user?._id },
        { tutor: req.user?._id, weeklySlots },
        { upsert: true, returnDocument: "after" }
      );
    }
  }

  else if (stepNum === 5) {
    // Verification Docs
    let cnicFrontUrl = "";
    let cnicFrontPublicId = "";
    let cnicBackUrl = "";
    let cnicBackPublicId = "";
    let videoIntroUrl = "";
    let videoIntroPublicId = "";
    let policeCertificateUrl = "";
    let policeCertificatePublicId = "";

    if (files?.cnicFront?.[0]) {
      const { valid, detectedType } = await verifyFileSignature(files.cnicFront[0].buffer, DOCUMENT_TYPES);
      if (!valid) {
        res.status(400).json({ success: false, message: `CNIC front is invalid (detected: ${detectedType || "unknown"})` });
        return;
      }
      if (profile.cnicFrontPublicId) {
        await deleteFromCloudinary(profile.cnicFrontPublicId).catch(() => {});
      }
      const result = await safeUploadToCloudinary(files.cnicFront[0].buffer, "tutorera/cnic", "auto", true);
      cnicFrontUrl = result.secure_url;
      cnicFrontPublicId = result.public_id;
    }

    if (files?.cnicBack?.[0]) {
      const { valid, detectedType } = await verifyFileSignature(files.cnicBack[0].buffer, DOCUMENT_TYPES);
      if (!valid) {
        res.status(400).json({ success: false, message: `CNIC back is invalid (detected: ${detectedType || "unknown"})` });
        return;
      }
      if (profile.cnicBackPublicId) {
        await deleteFromCloudinary(profile.cnicBackPublicId).catch(() => {});
      }
      const result = await safeUploadToCloudinary(files.cnicBack[0].buffer, "tutorera/cnic", "auto", true);
      cnicBackUrl = result.secure_url;
      cnicBackPublicId = result.public_id;
    }

    const demoVideoUrl: string = parsedData?.demoVideoUrl || "";
    if (demoVideoUrl && typeof demoVideoUrl === "string") {
      videoIntroUrl = demoVideoUrl;
      videoIntroPublicId = "";
    }

    if (files?.policeCertificate?.[0]) {
      const { valid, detectedType } = await verifyFileSignature(files.policeCertificate[0].buffer, DOCUMENT_TYPES);
      if (!valid) {
        res.status(400).json({ success: false, message: `Police certificate is invalid (detected: ${detectedType || "unknown"})` });
        return;
      }
      if (profile.policeCertificatePublicId) {
        await deleteFromCloudinary(profile.policeCertificatePublicId).catch(() => {});
      }
      const result = await safeUploadToCloudinary(files.policeCertificate[0].buffer, "tutorera/police-certificates", "auto", true);
      policeCertificateUrl = result.secure_url;
      policeCertificatePublicId = result.public_id;
    }

    // Validation: CNIC front and back are always mandatory for marketplace approval,
    // regardless of teaching mode - enforce final presence (either just uploaded or
    // already on file from a prior submission), not just this request's files.
    const finalCnicFront = cnicFrontUrl || profile.cnicFront;
    const finalCnicBack = cnicBackUrl || profile.cnicBack;
    if (!finalCnicFront || !finalCnicBack) {
      res.status(400).json({
        success: false,
        message: "CNIC front and back images are required to complete your application.",
      });
      return;
    }
    if (!videoIntroUrl && !profile.videoIntro) {
      res.status(400).json({ success: false, message: "A demo video URL is required for marketplace visibility." });
      return;
    }

    // Validation: Home tuition (in-person or both) tutors MUST provide a Police
    // Verification Report. For online-only tutors, NO police verification is required.
    const teachingMode = profile.teachingMode;
    if ((teachingMode === "in-person" || teachingMode === "both") && !policeCertificateUrl && !profile.policeCertificate) {
      res.status(400).json({
        success: false,
        message: "Police Verification Report is mandatory to offer Home Tuition.",
      });
      return;
    }

    // On any re-submission, the prior rejection reason is no longer valid
    // and the component should return to "pending" so an admin re-reviews it.
    const resubmitCnic = Boolean(cnicFrontUrl) && (profile.cnicVerificationStatus === "rejected" || profile.cnicVerificationStatus === "approved");
    const resubmitDemo = Boolean(videoIntroUrl) && (profile.demoVideoStatus === "rejected" || profile.demoVideoStatus === "approved");
    const resubmitPolice = Boolean(policeCertificateUrl) && (profile.policeVerificationStatus === "rejected" || profile.policeVerificationStatus === "approved");

    const calculatedPoliceStatus = teachingMode === "online"
      ? ("not_required" as const)
      : policeCertificateUrl
        ? ("pending" as const)
        : (profile.policeVerificationStatus && profile.policeVerificationStatus !== "not_required" ? profile.policeVerificationStatus : ("not_submitted" as const));

    updateData = {
      ...(cnicFrontUrl && { cnicFront: cnicFrontUrl, cnicFrontPublicId, cnicVerificationStatus: "pending" as const, cnicSubmittedAt: new Date() }),
      ...(cnicBackUrl && { cnicBack: cnicBackUrl, cnicBackPublicId }),
      ...(resubmitCnic && { cnicRejectionReason: "" }),
      ...(videoIntroUrl && { videoIntro: videoIntroUrl, ...(videoIntroPublicId && { videoIntroPublicId }), demoVideoStatus: "pending" as const, demoVideoSubmittedAt: new Date() }),
      ...(resubmitDemo && { demoVideoRejectionReason: "" }),
      ...(policeCertificateUrl
        ? { policeCertificate: policeCertificateUrl, policeCertificatePublicId, policeVerificationStatus: "pending" as const, policeSubmittedAt: new Date() }
        : { policeVerificationStatus: calculatedPoliceStatus }),
      ...(resubmitPolice && { policeRejectionReason: "" }),
      onboardingStep: 5,
      onboardingComplete: true,
      verificationStatus: "pending",
      lastStatusChangeAt: new Date(),
    };

    if (resubmitCnic || resubmitDemo || resubmitPolice) {
      const tutorUser = await User.findById(req.user?._id).select("name email applicationId");
      if (tutorUser) {
        const cta = {
          applicationId: tutorUser.applicationId || "TUT-PENDING",
          statusUrl: `${process.env.CLIENT_URL || "https://tutorera.ac.pk"}/tutor/application-status`,
        };
        const notifyAdminOfResubmission = (documentLabel: string) =>
          NotificationService.publishEvent("system_admin", "admin.tutor_document_resubmitted", {
            tutorName: tutorUser.name,
            tutorEmail: tutorUser.email,
            applicationId: tutorUser.applicationId,
            documentLabel,
            title: "Document resubmitted",
            message: `${tutorUser.name} resubmitted their ${documentLabel.toLowerCase()} for re-review.`,
            type: "verification",
            link: "/admin/applications",
          }).catch((err) => console.error(`[TutorApplicationTracking] Admin ${documentLabel} resubmission alert failed:`, err));

        if (resubmitCnic) {
          const { subject, html } = documentResubmittedEmail(tutorUser.name, "CNIC", cta);
          await sendEmail({ to: tutorUser.email, subject, html }).catch((emailErr) => {
            console.error("[TutorApplicationTracking] CNIC resubmission email failed:", emailErr);
          });
          await notifyAdminOfResubmission("CNIC");
        }
        if (resubmitDemo) {
          const { subject, html } = documentResubmittedEmail(tutorUser.name, "Demo video", cta);
          await sendEmail({ to: tutorUser.email, subject, html }).catch((emailErr) => {
            console.error("[TutorApplicationTracking] Demo resubmission email failed:", emailErr);
          });
          await notifyAdminOfResubmission("Demo video");
        }
        if (resubmitPolice) {
          const { subject, html } = documentResubmittedEmail(tutorUser.name, "Police verification", cta);
          await sendEmail({ to: tutorUser.email, subject, html }).catch((emailErr) => {
            console.error("[TutorApplicationTracking] Police-document resubmission email failed:", emailErr);
          });
          await notifyAdminOfResubmission("Police verification");
        }
      }
    }
  }

  // Replacing a verification artefact pauses any existing visibility until it
  // has been reviewed again, regardless of whether the tutor used the wizard
  // or the dedicated resubmission screen.
  const verificationResubmitted = ["degreeVerificationStatus", "cnicVerificationStatus", "demoVideoStatus", "policeVerificationStatus"]
    .some((key) => (updateData as any)[key] === "pending");
  if (verificationResubmitted && (profile.marketplaceEligible || profile.homeTuitionEligible || profile.isVerified)) {
    Object.assign(updateData, {
      verificationStatus: "pending", isVerified: false,
      marketplaceEligible: false, homeTuitionEligible: false,
      marketplaceEligibleAt: null, homeTuitionEligibleAt: null,
    });
  }

  // Save to DB
  console.log("[TutorOnboarding] findOneAndUpdate start, step:", stepNum, "updateData keys:", Object.keys(updateData));
  const updated = await TutorProfile.findOneAndUpdate(
    { user: req.user?._id },
    updateData,
    { returnDocument: "after" }
  );
  if (!updated) {
    res.status(404).json({ success: false, message: "Tutor profile no longer exists. Please refresh and try again." });
    return;
  }

  // The verificationResubmitted block above only catches transitions *to*
  await flagPendingQualificationBookings(updated);
  // "pending" - switching teachingMode to "online" sets police status to
  // "not_required" instead, which that check misses entirely. Recompute
  // marketplace/home-tuition eligibility from the actual current state
  // (isMarketplaceEligible/isHomeTuitionEligible) rather than pattern-matching
  // on which field just changed, so every step keeps eligibility flags honest.
  if (stepNum === 2 || stepNum === 4 || stepNum === 5) {
    const tutorUserForSync = await User.findById(req.user?._id);
    if (tutorUserForSync) {
      await syncMarketplaceAndHomeTuition(
        { name: tutorUserForSync.name, role: "tutor", id: tutorUserForSync._id.toString() },
        tutorUserForSync,
        updated
      );
    }
  }

  // Sync verification review queue for any newly submitted documents
  if (stepNum === 2 || stepNum === 5) {
    try {
      await syncReviewQueueForProfile(updated._id.toString());
    } catch (err) {
      console.error("[VerificationWorkflow] Failed to sync review queue:", err);
    }
  }

  // ── Tutor Application Tracking: ensure applicationId + token exist ──
  try {
    const tutorUser = await User.findById(req.user?._id);
    if (tutorUser && tutorUser.role === "tutor") {
      if (!tutorUser.applicationId) {
        tutorUser.applicationId = await allocateApplicationId();
      }
      if (!tutorUser.trackingTokenHash) {
        const t = generateTrackingToken();
        tutorUser.trackingTokenHash = t.hash;
        tutorUser.trackingTokenCreatedAt = new Date();
      }
      const firstCompletedSubmission = !tutorUser.applicationSubmittedAt && Boolean(updated?.onboardingComplete);
      if (firstCompletedSubmission) {
        tutorUser.applicationSubmittedAt = new Date();
        await advanceAccountStatus(tutorUser._id.toString(), "submitted");
      }
      // A corrected application is reviewable again; "rejected" is not terminal
      // when the rejection concerns a resubmittable verification component.
      if (updated?.onboardingComplete && updated.verificationStatus !== "approved") {
        await User.findByIdAndUpdate(tutorUser._id, { accountStatus: "submitted" });
      }
      await tutorUser.save();

      if (updated?.onboardingComplete) {
        await recordStatusEvent({
          tutorId: tutorUser._id.toString(),
          tutorProfileId: updated._id.toString(),
          actor: { name: tutorUser.name, role: "tutor", id: tutorUser._id.toString() },
          event: "APPLICATION_SUBMITTED",
          message: "Tutor application submitted",
          isPublic: true,
        });
        if (firstCompletedSubmission) {
          try {
            const { subject, html } = applicationSubmittedEmail(tutorUser.name, {
              applicationId: tutorUser.applicationId,
              statusUrl: `${process.env.CLIENT_URL || "https://tutorera.ac.pk"}/tutor/application-status`,
            });
            await sendEmail({ to: tutorUser.email, subject, html });
          } catch (emailErr) {
            console.error("[TutorApplicationTracking] Failed to send application submitted email:", emailErr);
          }
          try {
            const io = req.app.get("io");
            await sendNotification(io, tutorUser._id.toString(), {
              title: "Application submitted",
              message: "Your tutor application is now in review. You can track every status update from your application page.",
              type: "verification",
              link: "/tutor/application-status",
            });
          } catch (notificationErr) {
            console.error("[TutorApplicationTracking] Failed to send application submitted notification:", notificationErr);
          }
          try {
            await NotificationService.publishEvent("system_admin", "admin.tutor_application_submitted", {
              tutorName: tutorUser.name,
              tutorEmail: tutorUser.email,
              applicationId: tutorUser.applicationId,
              teachingMode: updated?.teachingMode,
              title: "New tutor application",
              message: `${tutorUser.name} completed onboarding and is ready for review.`,
              type: "verification",
              link: "/admin/applications",
            });
          } catch (adminAlertErr) {
            console.error("[TutorApplicationTracking] Failed to send admin new-application alert:", adminAlertErr);
          }
        }
        const profileForEvents = updated;
        if (profileForEvents.avatarVerificationStatus !== "not_submitted") {
          await recordStatusEvent({
            tutorId: tutorUser._id.toString(),
            tutorProfileId: profileForEvents._id.toString(),
            actor: { name: tutorUser.name, role: "tutor", id: tutorUser._id.toString() },
            event: "AVATAR_SUBMITTED",
            message: "Profile photo submitted for review",
            isPublic: true,
          });
        }
        if (profileForEvents.education?.[0]?.degreeDoc) {
          await recordStatusEvent({
            tutorId: tutorUser._id.toString(),
            tutorProfileId: profileForEvents._id.toString(),
            actor: { name: tutorUser.name, role: "tutor", id: tutorUser._id.toString() },
            event: "EDUCATIONAL_DOCUMENTS_SUBMITTED",
            message: "Educational documents submitted",
            isPublic: true,
          });
        }
        if (profileForEvents.cnicFront && profileForEvents.cnicBack) {
          await recordStatusEvent({
            tutorId: tutorUser._id.toString(),
            tutorProfileId: profileForEvents._id.toString(),
            actor: { name: tutorUser.name, role: "tutor", id: tutorUser._id.toString() },
            event: "CNIC_SUBMITTED",
            message: "CNIC submitted for review",
            isPublic: true,
          });
        }
        if (profileForEvents.videoIntro) {
          await recordStatusEvent({
            tutorId: tutorUser._id.toString(),
            tutorProfileId: profileForEvents._id.toString(),
            actor: { name: tutorUser.name, role: "tutor", id: tutorUser._id.toString() },
            event: "DEMO_VIDEO_SUBMITTED",
            message: "Demo video submitted for review",
            isPublic: true,
          });
        }
        if (profileForEvents.policeCertificate) {
          await recordStatusEvent({
            tutorId: tutorUser._id.toString(),
            tutorProfileId: profileForEvents._id.toString(),
            actor: { name: tutorUser.name, role: "tutor", id: tutorUser._id.toString() },
            event: "POLICE_VERIFICATION_SUBMITTED",
            message: "Police verification submitted for review",
            isPublic: true,
          });
        }
      }
    }
  } catch (err) {
    console.error("[TutorApplicationTracking] Failed to record step 5 events:", err);
  }

  res.status(200).json({
    success: true,
    message: `Step ${stepNum} saved successfully`,
    profile: updated,
  });
  } catch (err) {
    console.error("[TutorOnboarding] saveOnboardingStep unhandled error:", err);
    next(err);
  }
};
