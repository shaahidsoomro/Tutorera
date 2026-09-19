import { Response } from "express";
import { AuthRequest } from "../types";
import TutorProfile from "../models/TutorProfile.model";
import User from "../models/User.model";
import TutorAvailability from "../models/TutorAvailability.model";
import Bid from "../models/Bid.model";
import Request from "../models/Request.model";
import { computeAndStoreTutorResponseTime, formatResponseTime } from "../services/tutorStats.service";
import { advanceAccountStatus } from "../services/accountLifecycle.service";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadToCloudinary";
import { MatchingService } from "../services/matching.service";
import { verifyFileSignature } from "../middlewares/upload.middleware";
import { allocateApplicationId, generateTrackingToken, recordStatusEvent } from "../services/tracking.service";
import sendEmail from "../utils/sendEmail";
import { applicationSubmittedEmail, documentResubmittedEmail } from "../utils/trackingEmails";
import { sendNotification } from "../utils/socket";

const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const VIDEO_TYPES = ["video/mp4"];

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
    // Update existing profile
    profile = await TutorProfile.findOneAndUpdate(
      { user: userId },
      { ...req.body },
      { new: true, runValidators: true }
    ).populate("user", "name email avatar phone city countryCode countryName timezone currency");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile,
    });
    return;
  }

  // Create new profile
  profile = await TutorProfile.create({
    user: userId,
    ...req.body,
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
export const getTutorById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const id = extractObjectId(String(req.params.id || ""));
  const profile =
    (await TutorProfile.findById(id).populate(
      "user",
      "name email avatar phone city countryCode countryName timezone currency"
    )) ??
    (await TutorProfile.findOne({ user: id }).populate(
      "user",
      "name email avatar phone city countryCode countryName timezone currency"
    ));

  if (!profile) {
    res.status(404).json({ success: false, message: "Tutor not found" });
    return;
  }

  let responseMinutes = profile.averageResponseMinutes;
  if (!responseMinutes) {
    responseMinutes = await computeAndStoreTutorResponseTime((profile.user as any)._id?.toString() || profile.user.toString());
  }

  res.status(200).json({
    success: true,
    profile: {
      ...profile.toObject(),
      averageResponseMinutes: responseMinutes,
      responseTimeFormatted: formatResponseTime(responseMinutes),
    },
  });
};

function extractObjectId(value: string): string {
  return value.match(/[a-f\d]{24}/i)?.[0] || value;
}

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
  } = req.query;

  // Build filter object
  const filter: Record<string, unknown> = {
    verificationStatus: "approved",
  };

  const andClauses: Record<string, unknown>[] = [];

  if (search) {
    const pattern = new RegExp(search as string, "i");
    andClauses.push({
      $or: [
        { fullName: pattern },
        { subjects: pattern },
        { bio: pattern },
        { city: pattern },
        { countryName: pattern },
        { curricula: pattern },
      ],
    });
  }

  if (subject) {
    filter.subjects = { $in: [new RegExp(subject as string, "i")] };
  }

  if (level) {
    filter.levels = { $in: [level] };
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

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const total = await TutorProfile.countDocuments(filter);
  const tutors = await TutorProfile.find(filter)
    .select("user fullName city countryName countryCode subjects levels hourlyRate currency teachingMode averageRating totalReviews averageResponseMinutes lastActiveAt isVerified verificationStatus")
    .populate("user", "name email avatar city countryCode countryName timezone currency")
    .sort(sort as string)
    .skip(skip)
    .limit(limitNum);

  const tutorsWithResponse = tutors.map((t) => {
    const obj = t.toObject() as any;
    obj.responseTimeFormatted = formatResponseTime(obj.averageResponseMinutes || 0);
    return obj;
  });

  if (matchRequestId && typeof matchRequestId === "string") {
    const matchRequest = await Request.findById(matchRequestId).lean();
    if (matchRequest) {
      const ranked = await MatchingService.rankTutors(matchRequest as any, tutorsWithResponse as any[]);
      const scoreMap = new Map(ranked.map((s) => [s.tutor._id.toString(), s.matchScore]));
      tutorsWithResponse.forEach((t: any) => {
        t.matchScore = scoreMap.get(t._id.toString()) ?? null;
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
  res: Response
): Promise<void> => {
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
    updateData = {
      fullName: parsedData.fullName,
      phone: parsedData.phone,
      countryCode: parsedData.countryCode || "PK",
      countryName: parsedData.countryName || "Pakistan",
      city: parsedData.city,
      timezone: parsedData.timezone || "Asia/Karachi",
      currency: parsedData.currency || "PKR",
      gender: parsedData.gender,
      dateOfBirth: parsedData.dateOfBirth,
      languages: parsedData.languages || [{ language: "English", proficiency: "Fluent" }],
      onboardingStep: 2,
    };
    await User.findByIdAndUpdate(req.user?._id, {
      name: parsedData.fullName,
      phone: parsedData.phone,
      countryCode: parsedData.countryCode || "PK",
      countryName: parsedData.countryName || "Pakistan",
      city: parsedData.city,
      timezone: parsedData.timezone || "Asia/Karachi",
      currency: parsedData.currency || "PKR",
    });
  }

  else if (stepNum === 2) {
    // Education
    let degreeDocUrl = "";
    let degreeDocPublicId = "";

    if (files?.degreeDoc?.[0]) {
      const { valid, detectedType } = await verifyFileSignature(files.degreeDoc[0].buffer, DOCUMENT_TYPES);
      if (!valid) {
        res.status(400).json({ success: false, message: `Degree document is invalid (detected: ${detectedType || "unknown"})` });
        return;
      }

      const oldPublicId = profile.education?.[0]?.degreeDocPublicId;
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId).catch(() => {});
      }

      const result = await uploadToCloudinary(
        files.degreeDoc[0].buffer,
        "tutorera/degrees",
        "auto",
        true
      );
      degreeDocUrl = result.secure_url;
      degreeDocPublicId = result.public_id;
    }

    const education = [{
      degree: parsedData.degree,
      institution: parsedData.institution,
      year: parseInt(parsedData.year),
      degreeDoc: degreeDocUrl || profile.education?.[0]?.degreeDoc || "",
      degreeDocPublicId: degreeDocPublicId || profile.education?.[0]?.degreeDocPublicId || "",
    }];

    const wasSubmitted = !!(profile.education?.[0]?.degreeDoc);
    const resubmitDegree = Boolean(degreeDocUrl) && (profile.degreeVerificationStatus === "rejected" || profile.degreeVerificationStatus === "approved");
    updateData = {
      education,
      onboardingStep: 3,
      ...(degreeDocUrl && { degreeVerificationStatus: "pending" as const, degreeSubmittedAt: new Date() }),
      ...(resubmitDegree && { degreeRejectionReason: "" }),
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
      }
    }
  }

  else if (stepNum === 3) {
    // Experience & Curricula
    updateData = {
      experience: parseInt(parsedData.experience),
      previousInstitutions: parsedData.previousInstitutions || [],
      subjects: parsedData.subjects || [],
      levels: parsedData.levels || [],
      curricula: parsedData.curricula || [],
      onboardingStep: 4,
    };
  }

  else if (stepNum === 4) {
    // Online Tuition: No Police Verification required.
    // In-Person / Both: Police report required for home tuition.
    const isOnlineOnly = parsedData.teachingMode === "online";
    const nextPoliceStatus = isOnlineOnly
      ? ("not_required" as const)
      : profile.policeCertificate
        ? (profile.policeVerificationStatus && profile.policeVerificationStatus !== "not_required" ? profile.policeVerificationStatus : ("pending" as const))
        : ("not_submitted" as const);

    updateData = {
      bio: parsedData.bio,
      hourlyRate: parseInt(parsedData.hourlyRate),
      currency: parsedData.currency || "PKR",
      teachingMode: parsedData.teachingMode,
      policeVerificationStatus: nextPoliceStatus,
      serviceAreas: parsedData.serviceAreas || [],
      travelRadiusKm: parsedData.travelRadiusKm ? parseInt(parsedData.travelRadiusKm) : 10,
      availability: parsedData.availability || [],
      onboardingStep: 5,
    };
    await User.findByIdAndUpdate(req.user?._id, { currency: parsedData.currency || "PKR" });

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
        { upsert: true, new: true }
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
      const result = await uploadToCloudinary(files.cnicFront[0].buffer, "tutorera/cnic", "auto", true);
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
      const result = await uploadToCloudinary(files.cnicBack[0].buffer, "tutorera/cnic", "auto", true);
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
      const result = await uploadToCloudinary(files.policeCertificate[0].buffer, "tutorera/police-certificates", "auto", true);
      policeCertificateUrl = result.secure_url;
      policeCertificatePublicId = result.public_id;
    }

    // Validation: Home tuition (in-person) tutors MUST provide a Police Verification Report.
    // For online-only tutors, NO police verification is required.
    const teachingMode = profile.teachingMode;
    if (teachingMode === "in-person" && !policeCertificateUrl && !profile.policeCertificate) {
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
        if (resubmitCnic) {
          const { subject, html } = documentResubmittedEmail(tutorUser.name, "CNIC", cta);
          await sendEmail({ to: tutorUser.email, subject, html }).catch((emailErr) => {
            console.error("[TutorApplicationTracking] CNIC resubmission email failed:", emailErr);
          });
        }
        if (resubmitDemo) {
          const { subject, html } = documentResubmittedEmail(tutorUser.name, "Demo video", cta);
          await sendEmail({ to: tutorUser.email, subject, html }).catch((emailErr) => {
            console.error("[TutorApplicationTracking] Demo resubmission email failed:", emailErr);
          });
        }
        if (resubmitPolice) {
          const { subject, html } = documentResubmittedEmail(tutorUser.name, "Police verification", cta);
          await sendEmail({ to: tutorUser.email, subject, html }).catch((emailErr) => {
            console.error("[TutorApplicationTracking] Police-document resubmission email failed:", emailErr);
          });
        }
      }
    }
  }

  // Save to DB
  const updated = await TutorProfile.findOneAndUpdate(
    { user: req.user?._id },
    updateData,
    { new: true }
  );
  if (!updated) {
    res.status(404).json({ success: false, message: "Tutor profile no longer exists. Please refresh and try again." });
    return;
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
        }
        const profileForEvents = updated;
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
};
