import { Response } from "express";
import { AuthRequest } from "../types";
import { verifyFileSignature } from "../middlewares/upload.middleware";
import User from "../models/User.model";
import TutorProfile from "../models/TutorProfile.model";
import { prepareDegreeReplacement, degreeUploadIndex } from "../services/degreeReplacement.service";
import { flagPendingQualificationBookings } from "../services/qualificationBookingReview.service";
import { uploadToCloudinary, deleteFromCloudinary, getSignedViewUrl } from "../utils/uploadToCloudinary";
import sendEmail from "../utils/sendEmail";
import { documentResubmittedEmail } from "../utils/trackingEmails";
import { recordStatusEvent } from "../services/tracking.service";
import { StatusEvent } from "../models/TutorApplicationStatusHistory.model";
import { logAudit } from "../utils/logAudit";
import { sendNotification } from "../utils/socket";
import { setAccountStatus } from "../services/accountLifecycle.service";
import { syncReviewQueueForProfile } from "../services/verification.service";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const VIDEO_TYPES = ["video/mp4"];

// @desc    Upload avatar
// @route   POST /api/upload/avatar
// @access  Private
export const uploadAvatar = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No file uploaded" });
    return;
  }

  const { valid, detectedType } = await verifyFileSignature(req.file.buffer, IMAGE_TYPES);
  if (!valid) {
    res.status(400).json({
      success: false,
      message: `File content is not a valid image (detected: ${detectedType || "unknown"})`,
    });
    return;
  }

  const result = await uploadToCloudinary(
    req.file.buffer,
    "tutorera/avatars"
  );

  await User.findByIdAndUpdate(req.user?._id, { avatar: result.secure_url });

  res.status(200).json({
    success: true,
    message: "Avatar uploaded successfully",
    url: result.secure_url,
  });
};

// @desc    Upload a blog post cover image
// @route   POST /api/upload/blog-cover
// @access  Private (admin)
// Deliberately just uploads and returns a URL rather than writing to a Blog
// document directly - the admin editor calls this before a post has an id
// (new post) as easily as when editing an existing one, and sets the
// returned URL into its own form state either way.
export const uploadBlogCoverImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No file uploaded" });
    return;
  }

  const { valid, detectedType } = await verifyFileSignature(req.file.buffer, IMAGE_TYPES);
  if (!valid) {
    res.status(400).json({
      success: false,
      message: `File content is not a valid image (detected: ${detectedType || "unknown"})`,
    });
    return;
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer, "tutorera/blog-covers");
    res.status(200).json({ success: true, message: "Cover image uploaded successfully", url: result.secure_url });
  } catch (err) {
    if (err instanceof Error && err.message?.includes("content policy")) {
      res.status(400).json({ success: false, message: "Image contains prohibited content and could not be uploaded." });
      return;
    }
    throw err;
  }
};

// @desc    Upload tutor verification docs
// @route   POST /api/upload/verification
// @access  Private (tutor only)
export const uploadVerificationDocs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files || Object.keys(files).length === 0) {
      res.status(400).json({ success: false, message: "No files uploaded" });
      return;
    }

    const existingProfile = await TutorProfile.findOne({ user: req.user?._id });
    if (!existingProfile) {
      res.status(404).json({ success: false, message: "Tutor profile not found. Please complete onboarding first." });
      return;
    }

  const updateData: Record<string, any> = {};
  const resubmittedDocs: string[] = [];
  const replacedAssets: { publicId: string; resourceType?: "video" }[] = [];

  // ── Identity document front (private — sensitive) ──
  if (files.cnicFront?.[0]) {
    const { valid, detectedType } = await verifyFileSignature(files.cnicFront[0].buffer, DOCUMENT_TYPES);
    if (!valid) {
      res.status(400).json({ success: false, message: `Identity document front file is invalid (detected: ${detectedType || "unknown"})` });
      return;
    }
    try {
      const result = await uploadToCloudinary(files.cnicFront[0].buffer, "tutorera/verification/cnic", "auto", true);
      updateData.cnicFront = result.secure_url;
      updateData.cnicFrontPublicId = result.public_id;
      updateData.cnicSubmittedAt = new Date();
      updateData.cnicVerificationStatus = "pending";
      updateData.cnicRejectionReason = "";
      resubmittedDocs.push("Identity document");
      if (existingProfile.cnicFrontPublicId) replacedAssets.push({ publicId: existingProfile.cnicFrontPublicId });
    } catch (err) {
      if (err instanceof Error && err.message?.includes("content policy")) {
        res.status(400).json({ success: false, message: "Identity document front image contains prohibited content and could not be uploaded." });
        return;
      }
      throw err;
    }
  }

  // ── Identity document back (private) ──
  if (files.cnicBack?.[0]) {
    const { valid, detectedType } = await verifyFileSignature(files.cnicBack[0].buffer, DOCUMENT_TYPES);
    if (!valid) {
      res.status(400).json({ success: false, message: `Identity document back file is invalid (detected: ${detectedType || "unknown"})` });
      return;
    }
    try {
      const result = await uploadToCloudinary(files.cnicBack[0].buffer, "tutorera/verification/cnic", "auto", true);
      updateData.cnicBack = result.secure_url;
      updateData.cnicBackPublicId = result.public_id;
      updateData.cnicVerificationStatus = "pending";
      updateData.cnicRejectionReason = "";
      if (!resubmittedDocs.includes("Identity document")) resubmittedDocs.push("Identity document");
      if (existingProfile.cnicBackPublicId) replacedAssets.push({ publicId: existingProfile.cnicBackPublicId });
    } catch (err) {
      if (err instanceof Error && err.message?.includes("content policy")) {
        res.status(400).json({ success: false, message: "Identity document back image contains prohibited content and could not be uploaded." });
        return;
      }
      throw err;
    }
  }

  // Degree / educational document (private)
  if (files.degree?.[0]) {
    const qualificationIndex = degreeUploadIndex(existingProfile, req.body?.qualificationIndex);
    if (qualificationIndex === null) {
      res.status(422).json({ success: false, message: "Choose an existing qualification for this degree upload." });
      return;
    }
    const { valid, detectedType } = await verifyFileSignature(files.degree[0].buffer, DOCUMENT_TYPES);
    if (!valid) {
      res.status(400).json({ success: false, message: `Degree document is invalid (detected: ${detectedType || "unknown"})` });
      return;
    }
    const result = await uploadToCloudinary(files.degree[0].buffer, "tutorera/verification/degrees", "auto", true);
    Object.assign(updateData, prepareDegreeReplacement(existingProfile, result.secure_url, result.public_id, qualificationIndex));
    updateData.degreeSubmittedAt = new Date();
    resubmittedDocs.push("Educational document");
  }

  // ── Background and safety certificate (private) ──
  if (files.policeCertificate?.[0]) {
    const { valid, detectedType } = await verifyFileSignature(files.policeCertificate[0].buffer, DOCUMENT_TYPES);
    if (!valid) {
      res.status(400).json({ success: false, message: `Background and safety certificate is invalid (detected: ${detectedType || "unknown"})` });
      return;
    }
    try {
      const result = await uploadToCloudinary(files.policeCertificate[0].buffer, "tutorera/verification/police", "auto", true);
      updateData.policeCertificate = result.secure_url;
      updateData.policeCertificatePublicId = result.public_id;
      updateData.policeSubmittedAt = new Date();
      updateData.policeVerificationStatus = "pending";
      updateData.policeRejectionReason = "";
      resubmittedDocs.push("Background and safety certificate");
      if (existingProfile.policeCertificatePublicId) replacedAssets.push({ publicId: existingProfile.policeCertificatePublicId });
    } catch (err) {
      if (err instanceof Error && err.message?.includes("content policy")) {
        res.status(400).json({ success: false, message: "Background and safety certificate contains prohibited content and could not be uploaded." });
        return;
      }
      throw err;
    }
  }

  // ── Video Intro (public — not sensitive, students need to view it) ──
  if (files.videoIntro?.[0]) {
    const { valid, detectedType } = await verifyFileSignature(files.videoIntro[0].buffer, VIDEO_TYPES);
    if (!valid) {
      res.status(400).json({ success: false, message: `Video file is invalid (detected: ${detectedType || "unknown"})` });
      return;
    }
    const result = await uploadToCloudinary(files.videoIntro[0].buffer, "tutorera/verification/videos", "video", false);
    updateData.videoIntro = result.secure_url;
    updateData.videoIntroPublicId = result.public_id;
    updateData.demoVideoSubmittedAt = new Date();
    updateData.demoVideoStatus = "pending";
    updateData.demoVideoRejectionReason = "";
    resubmittedDocs.push("Demo video");
    if (existingProfile.videoIntroPublicId) replacedAssets.push({ publicId: existingProfile.videoIntroPublicId, resourceType: "video" });
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ success: false, message: "No valid files were uploaded." });
    return;
  }

  updateData.verificationStatus = "pending";
  // A replacement document immediately pauses visibility. A previously verified
  // tutor must not remain searchable while the replacement is awaiting review.
  updateData.isVerified = false;
  updateData.marketplaceEligible = false;
  updateData.homeTuitionEligible = false;
  if (existingProfile.marketplaceEligible) updateData.marketplaceEligibleAt = null;
  if (existingProfile.homeTuitionEligible) updateData.homeTuitionEligibleAt = null;
  updateData.lastStatusChangeAt = new Date();

  const updated = await TutorProfile.findOneAndUpdate(
    { user: req.user?._id },
    updateData,
    { returnDocument: "after" }
  );

  if (!updated) {
    res.status(404).json({ success: false, message: "Tutor profile no longer exists." });
    return;
  }

  await Promise.all(replacedAssets.map(({ publicId, resourceType }) =>
    deleteFromCloudinary(publicId, resourceType).catch(() => undefined)
  ));

  await flagPendingQualificationBookings(updated);

  if (resubmittedDocs.length > 0) {
    const tutorUser = await User.findById(req.user?._id).select("name email applicationId");
    if (tutorUser) {
      const cta = {
        applicationId: tutorUser.applicationId || "TUT-PENDING",
        statusUrl: `${process.env.CLIENT_URL || "https://tutorera.ac.pk"}/tutor/application-status`,
      };

      try {
        await Promise.allSettled(resubmittedDocs.map(async (docType) => {
          const { subject, html } = documentResubmittedEmail(tutorUser.name, docType, cta);
          await sendEmail({ to: tutorUser.email, subject, html });
        }));

        const priorStatusFor: Record<string, string> = {
          "Identity document": existingProfile.cnicVerificationStatus || "not_submitted",
          "Educational document": existingProfile.degreeVerificationStatus || "not_submitted",
          "Demo video": existingProfile.demoVideoStatus || "not_submitted",
          "Background and safety certificate": existingProfile.policeVerificationStatus || "not_submitted",
        };
        const eventFor: Record<string, { submitted: StatusEvent; resubmitted: StatusEvent }> = {
          "Identity document": { submitted: "CNIC_SUBMITTED", resubmitted: "CNIC_RESUBMITTED" },
          "Educational document": { submitted: "EDUCATIONAL_DOCUMENTS_SUBMITTED", resubmitted: "EDUCATIONAL_DOCUMENTS_RESUBMITTED" },
          "Demo video": { submitted: "DEMO_VIDEO_SUBMITTED", resubmitted: "DEMO_VIDEO_RESUBMITTED" },
          "Background and safety certificate": { submitted: "POLICE_VERIFICATION_SUBMITTED", resubmitted: "POLICE_VERIFICATION_RESUBMITTED" },
        };
        await Promise.all(resubmittedDocs.map((docType) => recordStatusEvent({
          tutorId: tutorUser._id.toString(), tutorProfileId: updated._id.toString(),
          actor: { name: tutorUser.name, role: "tutor", id: tutorUser._id.toString() },
          event: eventFor[docType][priorStatusFor[docType] === "rejected" ? "resubmitted" : "submitted"],
          message: `${docType} ${priorStatusFor[docType] === "rejected" ? "resubmitted" : "submitted"} for review`,
          statusBefore: priorStatusFor[docType], statusAfter: "pending",
        })));
        if (existingProfile.marketplaceEligible) {
          await recordStatusEvent({
            tutorId: tutorUser._id.toString(), tutorProfileId: updated._id.toString(),
            actor: { name: "System", role: "system" }, event: "MARKETPLACE_DEACTIVATED",
            message: "Marketplace visibility paused while replacement documents are reviewed",
          });
        }
        if (existingProfile.homeTuitionEligible) {
          await recordStatusEvent({
            tutorId: tutorUser._id.toString(), tutorProfileId: updated._id.toString(),
            actor: { name: "System", role: "system" }, event: "HOME_TUITION_DEACTIVATED",
            message: "Home tuition eligibility paused while replacement documents are reviewed",
          });
        }
        await logAudit({
          action: "verification_documents_resubmitted", actor: tutorUser.name,
          actorId: tutorUser._id.toString(), entity: "TutorProfile", targetId: updated._id.toString(),
          targetName: tutorUser.name, metadata: { documents: resubmittedDocs },
        });
        await setAccountStatus(tutorUser._id.toString(), "submitted");
        const io = req.app.get("io");
        if (io) {
          await sendNotification(io, tutorUser._id.toString(), {
            title: "Documents resubmitted", message: "Your replacement documents are now under review.",
            type: "verification", link: "/tutor/application-status",
          });
        }
        
        await syncReviewQueueForProfile(updated._id.toString());
      } catch (postUploadErr) {
        console.error("Failed to execute post-upload operations (emails/logs/notifications):", postUploadErr);
        // Continue despite post-upload errors - documents are already saved
      }
    }
  }

    res.status(200).json({
      success: true,
      message: "Documents uploaded successfully. Pending admin review.",
      uploadedFields: Object.keys(updateData),
    });
  } catch (error) {
    console.error("Document upload error:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to upload documents. Please try again.";
    res.status(500).json({
      success: false,
      message: errMsg,
      error: process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
};

export const uploadSubjectEligibilityEvidence = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No evidence file uploaded." });
    return;
  }

  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
  if (!subject) {
    res.status(400).json({ success: false, message: "A subject is required." });
    return;
  }

  const { valid, detectedType } = await verifyFileSignature(req.file.buffer, DOCUMENT_TYPES);
  if (!valid) {
    res.status(400).json({ success: false, message: `Evidence file is invalid (detected: ${detectedType || "unknown"}).` });
    return;
  }

  const profile = await TutorProfile.findOne({ user: req.user?._id });
  const entry = profile?.subjectEligibility?.find((candidate) => candidate.subject.toLowerCase() === subject.toLowerCase());
  if (!profile || !entry) {
    res.status(404).json({ success: false, message: "Subject eligibility request not found. Save your subjects first." });
    return;
  }

  const result = await uploadToCloudinary(req.file.buffer, "tutorera/verification/subject-evidence", "auto", true);
  entry.evidence = entry.evidence || [];
  const evidence = {
    url: result.secure_url,
    publicId: result.public_id,
    label: typeof req.body?.label === "string" && req.body.label.trim() ? req.body.label.trim() : req.file.originalname,
    status: "pending" as const,
  };
  entry.evidence.push(evidence);
  entry.status = "needs_evidence";
  entry.evidenceRequired = true;
  await profile.save();

  res.status(201).json({
    success: true,
    message: "Subject evidence uploaded and sent for review.",
    subject,
    evidence: { label: evidence.label, status: evidence.status },
  });
};
