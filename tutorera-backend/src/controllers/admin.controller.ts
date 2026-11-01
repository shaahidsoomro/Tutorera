import { Response } from "express";
import { AuthRequest } from "../types";
import TutorProfile from "../models/TutorProfile.model";
import StudentProfile from "../models/StudentProfile.model";
import User from "../models/User.model";
import { Types } from "mongoose";
import Booking from "../models/Booking.model";
import { assertParentBookingPolicy } from "../services/parentBookingPolicy.service";
import PaymentLedger from "../models/PaymentLedger.model";
import mongoose from "mongoose";
import BookedSlot from "../models/BookedSlot.model";
import { syncStudentTutorRelationship } from "../services/relationship.service";
import Contact from "../models/Contact.model";
import { sendNotification } from "../utils/socket";
import { GST_PERCENT, PLATFORM_FEE_PERCENT } from "../config/constants";
import { hasPermission } from "../config/rbac";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import Request from "../models/Request.model";
import Review from "../models/Review.model";
import { creditReferrerOnFirstBooking } from "../controllers/referral.controller";
import { logAudit } from "../utils/logAudit";
import AuditLog from "../models/AuditLog.model";
import EmailLog from "../models/EmailLog.model";
import Broadcast from "../models/Broadcast.model";
import Notification from "../models/Notification.model";
import sendEmail from "../utils/sendEmail";
import { EMAIL_EVENTS } from "../utils/emailEvents";
import { tutorApprovedEmail, tutorRejectedEmail, paymentConfirmedEmail, reviewRequestEmail } from "../utils/emailTemplates";
import { getSignedViewUrl } from "../utils/uploadToCloudinary";
import {
  isMarketplaceEligible,
  isHomeTuitionEligible,
  recordStatusEvent,
} from "../services/tracking.service";
import {
  marketplaceActivatedEmail,
  marketplaceDeactivatedEmail,
  homeTuitionActivatedEmail,
  homeTuitionDeactivatedEmail,
} from "../utils/trackingEmails";
import { generateTutorPayoutReport, resolvePayoutReportPeriod } from "../services/payoutReport.service";


// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private (admin)
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const [
    totalUsers, totalTutors, totalStudents,
    pendingVerifications, approvedTutors,
    totalBookings, totalContacts,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "tutor" }),
    User.countDocuments({ role: "student" }),
    TutorProfile.countDocuments({ verificationStatus: "pending" }),
    TutorProfile.countDocuments({ verificationStatus: "approved" }),
    Booking.countDocuments(),
    Contact.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      totalTutors,
      totalStudents,
      pendingVerifications,
      approvedTutors,
      totalBookings,
      totalContacts,
    },
  });
};

// @desc    Get all verifications with full data
// @route   GET /api/admin/verifications
// @access  Private (admin)
export const getPendingVerifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const status = (req.query.status as string) || "pending";
  const { page = "1", limit = "20" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const skip = (pageNum - 1) * limitNum;

  const total = await TutorProfile.countDocuments({
    verificationStatus: status as "pending" | "approved" | "rejected",
  });

  const tutors = await TutorProfile.find({
    verificationStatus: status as "pending" | "approved" | "rejected",
  })
    .populate("user", "name email phone city createdAt")
    .sort("-createdAt")
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({
    success: true,
    total,
    tutors,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
};

// @desc    Get single tutor full data
// @route   GET /api/admin/tutors/:id
// @access  Private (admin)
export const getTutorFullData = async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await TutorProfile.findById(req.params.id)
    .populate("user", "name email phone city createdAt isActive");

  if (!profile) {
    res.status(404).json({ success: false, message: "Tutor not found" });
    return;
  }

  res.status(200).json({ success: true, profile });
};

// @desc    Approve or reject tutor (legacy bulk endpoint — delegates to the
//          per-component tracking system so canonical status, history rows,
//          and marketplace / home-tuition eligibility stay in sync).
// @route   PATCH /api/admin/verify/:id
// @access  Private (admin)
export const verifyTutor = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, reason } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    res.status(400).json({ success: false, message: "Status must be approved or rejected" });
    return;
  }

  const profile = await TutorProfile.findById(req.params.id);
  if (!profile) {
    res.status(404).json({ success: false, message: "Tutor profile not found" });
    return;
  }

  const tutorUser = await User.findById(profile.user).select("name email applicationId");
  if (!tutorUser) {
    res.status(404).json({ success: false, message: "Tutor user not found" });
    return;
  }

  const actor = {
    name: req.user?.name || "Admin",
    role: "admin" as const,
    id: req.user?._id?.toString(),
  };
  const io = req.app.get("io");
  const now = new Date();

  const component = (kind: "cnic" | "degree" | "demoVideo" | "police") => {
    (profile as any)[`${kind}VerificationStatus`] = status;
    (profile as any)[`${kind}RejectionReason`] = status === "rejected" ? (reason || "") : "";
    (profile as any)[`${kind}ReviewedAt`] = now;
  };
  component("cnic");
  component("degree");
  component("demoVideo");
  if (profile.policeVerificationStatus !== "not_required") {
    component("police");
  }

  profile.verificationStatus = status;
  profile.isVerified = status === "approved";
  profile.adminApprovalExempt = status === "approved";
  profile.adminApprovalExemptAt = status === "approved" ? now : undefined;
  profile.adminApprovalExemptBy = status === "approved" ? req.user?._id : undefined;
  profile.rejectionReason = status === "rejected" ? (reason || "") : "";
  profile.lastStatusChangeAt = now;
  // Some applications pre-date the expanded level enum (for example
  // "Matric" and "O-Level"). A verification decision must not revalidate and
  // reject unrelated legacy application data. The decision fields are
  // explicitly validated above, so persist this administrative state change
  // without running whole-document validation.
  await profile.save({ validateBeforeSave: false });

  await recordStatusEvent({
    tutorId: tutorUser._id.toString(),
    tutorProfileId: profile._id.toString(),
    actor,
    event: status === "approved" ? "PROFILE_APPROVED" : "PROFILE_REJECTED",
    message:
      status === "approved"
        ? "Tutor profile approved (bulk verify)"
        : `Tutor profile rejected (bulk verify)${reason ? `: ${reason}` : ""}`,
    statusAfter: status,
  });

  try {
    const { subject, html } = status === "approved"
      ? tutorApprovedEmail(tutorUser.name)
      : tutorRejectedEmail(tutorUser.name, reason);
    await sendEmail({ to: tutorUser.email, subject, html });
  } catch (err) {
    console.error("Failed to send tutor verification email:", err);
  }

  await logAudit({
    action: status === "approved" ? "tutor_approved" : "tutor_rejected",
    actor: actor.name,
    actorId: actor.id,
    entity: "TutorProfile",
    targetId: profile._id.toString(),
    targetName: tutorUser.name,
    metadata: status === "rejected" ? { reason } : undefined,
  });

  await sendNotification(io, tutorUser._id.toString(), {
    title: status === "approved" ? "🎉 Profile Approved!" : "❌ Profile Rejected",
    message: status === "approved"
      ? "Congratulations! Your tutor profile has been approved. You are now visible to students."
      : `Your profile was rejected. Reason: ${reason || "Please contact support."}`,
    type: "verification",
    link: "/tutor/application-status",
  });

  // Sync marketplace + home-tuition eligibility through the same path the
  // per-component endpoints use, so the tutor sees accurate status on their
  // application-tracking page.
  const mpEligible = isMarketplaceEligible(profile);
  const htEligible = isHomeTuitionEligible(profile);
  const cta = { applicationId: tutorUser.applicationId || "TUT-PENDING" };
  if (mpEligible && !profile.marketplaceEligible) {
    profile.marketplaceEligible = true;
    profile.marketplaceEligibleAt = now;
    await profile.save({ validateBeforeSave: false });
    await recordStatusEvent({ tutorId: tutorUser._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "MARKETPLACE_ACTIVATED", message: "Marketplace profile activated after bulk approval" });
    try {
      const { subject, html } = marketplaceActivatedEmail(tutorUser.name, cta);
      await sendEmail({ to: tutorUser.email, subject, html });
    } catch (err) { console.error("marketplaceActivatedEmail failed:", err); }
    await sendNotification(io, tutorUser._id.toString(), { title: "🎉 You're live on TUTORERA", message: "Your profile is now active on the marketplace.", type: "verification", link: "/tutor/application-status" });
  } else if (!mpEligible && profile.marketplaceEligible) {
    profile.marketplaceEligible = false;
    profile.marketplaceEligibleAt = undefined as any;
    await profile.save({ validateBeforeSave: false });
    await recordStatusEvent({ tutorId: tutorUser._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "MARKETPLACE_DEACTIVATED", message: "Marketplace profile deactivated after bulk rejection" });
    try {
      const { subject, html } = marketplaceDeactivatedEmail(tutorUser.name, "Your marketplace access was paused because a verification requirement is no longer met.", cta);
      await sendEmail({ to: tutorUser.email, subject, html });
    } catch (err) { console.error("marketplaceDeactivatedEmail failed:", err); }
    await sendNotification(io, tutorUser._id.toString(), { title: "Marketplace visibility paused", message: "Your marketplace access was paused because a verification requirement is no longer met.", type: "verification", link: "/tutor/application-status" });
  }
  if (htEligible && !profile.homeTuitionEligible) {
    profile.homeTuitionEligible = true;
    profile.homeTuitionEligibleAt = now;
    await profile.save({ validateBeforeSave: false });
    await recordStatusEvent({ tutorId: tutorUser._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "HOME_TUITION_ACTIVATED", message: "Home tuition eligibility activated after bulk approval" });
    try {
      const { subject, html } = homeTuitionActivatedEmail(tutorUser.name, cta);
      await sendEmail({ to: tutorUser.email, subject, html });
    } catch (err) { console.error("homeTuitionActivatedEmail failed:", err); }
    await sendNotification(io, tutorUser._id.toString(), { title: "Home tuition approved 🏠", message: "You are eligible to respond to Home and In-Person Tuition opportunities.", type: "verification", link: "/tutor/application-status" });
  } else if (!htEligible && profile.homeTuitionEligible) {
    profile.homeTuitionEligible = false;
    profile.homeTuitionEligibleAt = undefined as any;
    await profile.save({ validateBeforeSave: false });
    await recordStatusEvent({ tutorId: tutorUser._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "HOME_TUITION_DEACTIVATED", message: "Home tuition eligibility deactivated after bulk rejection" });
    try {
      const { subject, html } = homeTuitionDeactivatedEmail(tutorUser.name, "Your home tuition access was paused because a verification requirement is no longer met.", cta);
      await sendEmail({ to: tutorUser.email, subject, html });
    } catch (err) { console.error("homeTuitionDeactivatedEmail failed:", err); }
    await sendNotification(io, tutorUser._id.toString(), { title: "Home tuition paused", message: "Your home tuition access was paused because a verification requirement is no longer met.", type: "verification", link: "/tutor/application-status" });
  }

   res.status(200).json({
    success: true,
    message: `Tutor ${status} successfully`,
    profile,
  });
};

// @desc    Bulk verify tutors
// @route   PATCH /api/admin/verify/bulk
// @access  Private (admin)
export const bulkVerifyTutors = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tutorIds, status, reason } = req.body;

  if (!Array.isArray(tutorIds) || tutorIds.length === 0) {
    res.status(400).json({ success: false, message: "tutorIds must be a non-empty array" });
    return;
  }

  if (!["approved", "rejected"].includes(status)) {
    res.status(400).json({ success: false, message: "Status must be approved or rejected" });
    return;
  }

  const actor = {
    name: req.user?.name || "Admin",
    role: "admin" as const,
    id: req.user?._id?.toString(),
  };
  const io = req.app.get("io");
  const now = new Date();

  const results = { approved: 0, rejected: 0, failed: 0, errors: [] as string[] };

  for (const tutorId of tutorIds) {
    try {
      const profile = await TutorProfile.findById(tutorId);
      if (!profile) {
        results.failed++;
        results.errors.push(`Profile not found: ${tutorId}`);
        continue;
      }

      const tutorUser = await User.findById(profile.user).select("name email applicationId");
      if (!tutorUser) {
        results.failed++;
        results.errors.push(`User not found: ${profile.user}`);
        continue;
      }

      const component = (kind: "cnic" | "degree" | "demoVideo" | "police") => {
        (profile as any)[`${kind}VerificationStatus`] = status;
        (profile as any)[`${kind}RejectionReason`] = status === "rejected" ? (reason || "") : "";
        (profile as any)[`${kind}ReviewedAt`] = now;
      };
      component("cnic");
      component("degree");
      component("demoVideo");
      if (profile.policeVerificationStatus !== "not_required") {
        component("police");
      }

      profile.verificationStatus = status;
      profile.isVerified = status === "approved";
      profile.adminApprovalExempt = status === "approved";
      profile.adminApprovalExemptAt = status === "approved" ? now : undefined;
      profile.adminApprovalExemptBy = status === "approved" ? req.user?._id : undefined;
      profile.rejectionReason = status === "rejected" ? (reason || "") : "";
      profile.lastStatusChangeAt = now;
      // See verifyTutor: verification is an administrative state transition,
      // not an edit of legacy application content.
      await profile.save({ validateBeforeSave: false });

      await recordStatusEvent({
        tutorId: tutorUser._id.toString(),
        tutorProfileId: profile._id.toString(),
        actor,
        event: status === "approved" ? "PROFILE_APPROVED" : "PROFILE_REJECTED",
        message:
          status === "approved"
            ? "Tutor profile approved (bulk verify)"
            : `Tutor profile rejected (bulk verify)${reason ? `: ${reason}` : ""}`,
        statusAfter: status,
      });

      try {
        const { subject, html } = status === "approved"
          ? tutorApprovedEmail(tutorUser.name)
          : tutorRejectedEmail(tutorUser.name, reason);
        await sendEmail({ to: tutorUser.email, subject, html });
      } catch (err) {
        console.error(`Failed to send verification email to ${tutorUser.email}:`, err);
      }

      await logAudit({
        action: status === "approved" ? "tutor_approved" : "tutor_rejected",
        actor: actor.name,
        actorId: actor.id,
        entity: "TutorProfile",
        targetId: profile._id.toString(),
        targetName: tutorUser.name,
        metadata: status === "rejected" ? { reason } : undefined,
      });

      await sendNotification(io, tutorUser._id.toString(), {
        title: status === "approved" ? "🎉 Profile Approved!" : "❌ Profile Rejected",
        message:
          status === "approved"
            ? "Congratulations! Your tutor profile has been approved. You are now visible to students."
            : `Your profile was rejected. Reason: ${reason || "Please contact support."}`,
        type: "verification",
        link: "/tutor/application-status",
      });

      const mpEligible = isMarketplaceEligible(profile);
      const htEligible = isHomeTuitionEligible(profile);
      const cta = { applicationId: tutorUser.applicationId || "TUT-PENDING" };
      if (mpEligible && !profile.marketplaceEligible) {
        profile.marketplaceEligible = true;
        profile.marketplaceEligibleAt = now;
        await profile.save({ validateBeforeSave: false });
        await recordStatusEvent({ tutorId: tutorUser._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "MARKETPLACE_ACTIVATED", message: "Marketplace profile activated after bulk approval" });
        try {
          const { subject, html } = marketplaceActivatedEmail(tutorUser.name, cta);
          await sendEmail({ to: tutorUser.email, subject, html });
        } catch (err) { console.error("marketplaceActivatedEmail failed:", err); }
        await sendNotification(io, tutorUser._id.toString(), { title: "Marketplace active 🚀", message: "You are now visible in the TUTORERA marketplace.", type: "verification", link: "/tutor/application-status" });
      } else if (!mpEligible && profile.marketplaceEligible) {
        profile.marketplaceEligible = false;
        profile.marketplaceEligibleAt = undefined as any;
        await profile.save({ validateBeforeSave: false });
        await recordStatusEvent({ tutorId: tutorUser._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "MARKETPLACE_DEACTIVATED", message: "Marketplace profile deactivated after bulk rejection" });
        try {
          const { subject, html } = marketplaceDeactivatedEmail(tutorUser.name, "Your marketplace access was paused because a verification requirement is no longer met.", cta);
          await sendEmail({ to: tutorUser.email, subject, html });
        } catch (err) { console.error("marketplaceDeactivatedEmail failed:", err); }
        await sendNotification(io, tutorUser._id.toString(), { title: "Marketplace visibility paused", message: "Your marketplace access was paused because a verification requirement is no longer met.", type: "verification", link: "/tutor/application-status" });
      }
      if (htEligible && !profile.homeTuitionEligible) {
        profile.homeTuitionEligible = true;
        profile.homeTuitionEligibleAt = now;
        await profile.save({ validateBeforeSave: false });
        await recordStatusEvent({ tutorId: tutorUser._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "HOME_TUITION_ACTIVATED", message: "Home tuition eligibility activated after bulk approval" });
        try {
          const { subject, html } = homeTuitionActivatedEmail(tutorUser.name, cta);
          await sendEmail({ to: tutorUser.email, subject, html });
        } catch (err) { console.error("homeTuitionActivatedEmail failed:", err); }
        await sendNotification(io, tutorUser._id.toString(), { title: "Home tuition approved 🏠", message: "You are eligible to respond to Home and In-Person Tuition opportunities.", type: "verification", link: "/tutor/application-status" });
      } else if (!htEligible && profile.homeTuitionEligible) {
        profile.homeTuitionEligible = false;
        profile.homeTuitionEligibleAt = undefined as any;
        await profile.save({ validateBeforeSave: false });
        await recordStatusEvent({ tutorId: tutorUser._id.toString(), tutorProfileId: profile._id.toString(), actor, event: "HOME_TUITION_DEACTIVATED", message: "Home tuition eligibility deactivated after bulk rejection" });
        try {
          const { subject, html } = homeTuitionDeactivatedEmail(tutorUser.name, "Your home tuition access was paused because a verification requirement is no longer met.", cta);
          await sendEmail({ to: tutorUser.email, subject, html });
        } catch (err) { console.error("homeTuitionDeactivatedEmail failed:", err); }
        await sendNotification(io, tutorUser._id.toString(), { title: "Home tuition paused", message: "Your home tuition access was paused because a verification requirement is no longer met.", type: "verification", link: "/tutor/application-status" });
      }

      if (status === "approved") {
        results.approved++;
      } else {
        results.rejected++;
      }
    } catch (err: any) {
      results.failed++;
      results.errors.push(`Failed to process ${tutorId}: ${err?.message || "unknown error"}`);
      console.error(`Bulk verify error for ${tutorId}:`, err);
    }
  }

  res.status(200).json({
    success: true,
    message: `Bulk verification complete: ${results.approved} approved, ${results.rejected} rejected, ${results.failed} failed`,
    results,
  });
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (admin)
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, search, page = "1", limit = "20" } = req.query;
  const filter: Record<string, unknown> = {};
  if (role && role !== "all") filter.role = role;

  if (search && (search as string).trim()) {
    const searchRegex = new RegExp((search as string).trim(), "i");
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const skip = (pageNum - 1) * limitNum;

  const total = await User.countDocuments(filter);
  const users = await User.find(filter).skip(skip).limit(limitNum).sort("-createdAt");

  res.status(200).json({ success: true, total, page: pageNum, pages: Math.ceil(total / limitNum), users });
};

// @desc    Toggle user status
// @route   PATCH /api/admin/users/:id/status
// @access  Private (admin)
export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  user.isActive = !user.isActive;
  await user.save();

  await logAudit({
    action: user.isActive ? "user_activated" : "user_deactivated",
    actor: req.user?.name || "Admin",
    actorId: req.user?._id?.toString(),
    entity: "User",
    targetId: user._id.toString(),
    targetName: user.name,
  });

  res.status(200).json({ success: true, message: `User ${user.isActive ? "activated" : "deactivated"}` });
};

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private (admin)
export const getAllBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = "1", limit = "20" } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const skip = (pageNum - 1) * limitNum;

  const total = await Booking.countDocuments(filter);
  const bookings = await Booking.find(filter)
    .populate("student", "name email phone")
    .populate("tutor", "name email phone")
    .sort("-createdAt")
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({ success: true, total, page: pageNum, bookings });
};

// @desc    Update booking payment status
// @route   PATCH /api/admin/bookings/:id/payment
// @access  Private (admin)
export const updatePaymentStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { paymentStatus, paymentNote, payoutStatus, payoutNote, payoutSettlementReference, payoutSettlementMethod, payoutEvidenceReference } = req.body;

  // A manual admin status change cannot substitute for money returned by a gateway.
  if (["refunded", "partially_refunded"].includes(paymentStatus)) {
    res.status(409).json({ success: false, code: "PROVIDER_REFUND_REQUIRED", message: "Refund settlement must be confirmed by the payment provider before changing booking payment status." });
    return;
  }

  // A transfer cannot be declared paid by changing a booking enum. A separate
  // second-finance-officer verification endpoint records the reviewed evidence.
  if (payoutStatus === "paid") {
    res.status(409).json({ success: false, code: "INDEPENDENT_PAYOUT_VERIFICATION_REQUIRED", message: "Only an independent finance reviewer can verify a documented external transfer." });
    return;
  }
  const requiredPermission = paymentStatus !== undefined ? "payment.manage" : payoutStatus === "approved" ? "payout.approve" : "payout.process";
  if (!hasPermission(req.user?.adminRole, req.user?.adminPermissions, requiredPermission)) {
    res.status(403).json({ success: false, code: "PERMISSION_DENIED", message: `You do not have permission to ${paymentStatus !== undefined ? "change payment state" : "process payouts"}.` });
    return;
  }

  const booking = await Booking.findById(req.params.id)
    .populate("student", "name")
    .populate("tutor", "name");
  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found" });
    return;
  }

  const paymentTransitions: Record<string, string[]> = {
    pending: ["received", "failed", "disputed"], received: ["confirmed", "failed", "disputed"],
    confirmed: ["partially_refunded", "refunded", "chargeback", "disputed"], failed: ["pending"],
    partially_refunded: ["refunded", "chargeback", "disputed"], disputed: ["confirmed", "refunded", "chargeback"],
    refunded: [], chargeback: [],
  };
  const payoutTransitions: Record<string, string[]> = {
    pending: ["approved", "held"], approved: ["processing", "held"], processing: ["paid", "failed", "held"],
    failed: ["approved", "processing", "held"], held: ["approved", "processing"], paid: [],
  };
  if (paymentStatus === booking.paymentStatus || payoutStatus === booking.payoutStatus) {
    res.status(409).json({ success: false, message: "The booking already has that financial status." });
    return;
  }
  if (paymentStatus !== undefined && paymentStatus !== booking.paymentStatus && !paymentTransitions[booking.paymentStatus]?.includes(paymentStatus)) {
    res.status(409).json({ success: false, message: `Payment cannot move from ${booking.paymentStatus} to ${paymentStatus}.` });
    return;
  }
  if (payoutStatus !== undefined && payoutStatus !== booking.payoutStatus && !payoutTransitions[booking.payoutStatus]?.includes(payoutStatus)) {
    res.status(409).json({ success: false, message: `Payout cannot move from ${booking.payoutStatus} to ${payoutStatus}.` });
    return;
  }
  if (payoutStatus !== undefined && (booking.paymentStatus !== "confirmed" || booking.status !== "completed")) {
    res.status(409).json({ success: false, message: "A payout cannot change until student payment is confirmed." });
    return;
  }

  if (paymentStatus === "confirmed" && booking.request && booking.bid) {
    try {
      await assertParentBookingPolicy({ student: (booking.student as any)._id || booking.student, request: booking.request,
        bid: booking.bid, amount: booking.studentTotal, currency: booking.currency || "PKR" });
    } catch (err: any) {
      res.status(err.statusCode || 409).json({ success: false, code: err.code || "PARENT_POLICY_BLOCKED", message: err.message });
      return;
    }
  }

  // Update only fields that are provided
  if (paymentStatus !== undefined) booking.paymentStatus = paymentStatus;
  if (paymentStatus === "confirmed") booking.paymentConfirmedAt = new Date();
  if (paymentNote !== undefined) booking.paymentNote = paymentNote;
  if (payoutStatus !== undefined) {
    booking.payoutStatus = payoutStatus;
    const changedAt = new Date();
    if (payoutStatus === "approved") booking.payoutApprovedAt = changedAt;
    if (payoutStatus === "processing") {
      booking.payoutProcessingAt = changedAt;
      booking.payoutSettlementMethod = payoutSettlementMethod;
      booking.payoutSettlementReference = payoutSettlementReference;
      booking.payoutEvidenceReference = payoutEvidenceReference;
      booking.payoutInitiatedBy = req.user?._id;
    }
    if (payoutStatus === "paid") booking.payoutPaidAt = changedAt;
    if (payoutStatus === "failed") booking.payoutFailedAt = changedAt;
  }
  if (payoutNote !== undefined) booking.payoutNote = payoutNote;

  // Handle booking status change from admin
  // Booking lifecycle changes use the dedicated status endpoint.

  // ← ADD: Auto-calculate fees with new 23% when payment confirmed
  await booking.save();

  if (paymentStatus === "confirmed") {
    await logAudit({
      action: "payment_confirmed",
      actor: req.user?.name || "Admin",
      actorId: req.user?._id?.toString(),
      entity: "Booking",
      targetId: booking._id.toString(),
      targetName: `${(booking.student as any)?.name || "Student"} → ${(booking.tutor as any)?.name || "Tutor"}`,
      metadata: { amount: booking.amount },
    });

    try {
      const studentUser = await User.findById(booking.student).select("email");
      if (studentUser) {
        const { subject, html } = paymentConfirmedEmail(
          (booking.student as any)?.name || "Student",
          (booking.tutor as any)?.name || "Tutor",
          booking.amount
        );
        await sendEmail({ to: studentUser.email, subject, html });
      }
    } catch (err) {
      console.error("Failed to send payment confirmation email:", err);
    }
  }
  if (payoutStatus === "paid") {
    await logAudit({
      action: "payout_marked_paid",
      actor: req.user?.name || "Admin",
      actorId: req.user?._id?.toString(),
      entity: "Booking",
      targetId: booking._id.toString(),
      targetName: `${(booking.student as any)?.name || "Student"} → ${(booking.tutor as any)?.name || "Tutor"}`,
      metadata: { tutorPayout: booking.tutorPayout },
    });
  }

  // ── trigger referral credit when admin marks booking completed ──
  res.status(200).json({
    success: true,
    message: "Updated successfully",
    booking,
  });
};

// @desc    Get all contacts
// @route   GET /api/admin/contacts
// @access  Private (admin)
export const getAllContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, page = "1", limit = "30" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 30));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};
  if (type && type !== "all") {
    if (type === "support") {
      filter.type = "support";
    } else if (type === "general") {
      filter.type = { $ne: "support" };
    }
  }

  const total = await Contact.countDocuments(filter);

  const contacts = await Contact.find(filter)
    .sort("-createdAt")
    .skip(skip)
    .limit(limitNum);

  // Counts for tab badges — computed across ALL contacts, not just current page
  const supportOpenCount = await Contact.countDocuments({ type: "support", status: "open" });
  const generalCount = await Contact.countDocuments({ type: { $ne: "support" } });
  const allCount = await Contact.countDocuments();

  res.status(200).json({
    success: true,
    total,
    contacts,
    counts: { all: allCount, support: supportOpenCount, general: generalCount },
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
};

// @desc    Update contact/support request status
// @route   PATCH /api/admin/contacts/:id
// @access  Private (admin)
export const updateContactStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { status, isRead: true },
    { new: true }
  );
  if (!contact) {
    res.status(404).json({ success: false, message: "Contact not found" });
    return;
  }
  res.status(200).json({ success: true, contact });
};

// Review of an EXTERNAL bank/wallet transfer. This does NOT move funds.
// Two distinct finance actors must attest to transaction evidence and a
// matching transfer reference before a booking can become 'paid'.
export const verifyExternalPayout = async (req: AuthRequest, res: Response): Promise<void> => {
  const actor = req.user?._id;
  if (!hasPermission(req.user?.adminRole, req.user?.adminPermissions, "payout.process")) {
    res.status(403).json({ success: false, code: "PERMISSION_DENIED" }); return;
  }
  const { settlementReference, verificationEvidence, note } = req.body || {};
  if (typeof settlementReference !== "string" || settlementReference.trim().length < 8 ||
      typeof verificationEvidence !== "string" || verificationEvidence.trim().length < 8 ||
      typeof note !== "string" || note.trim().length < 12) {
    res.status(400).json({ success: false, code: "PAYOUT_EVIDENCE_REQUIRED", message: "External transaction reference, independently checked statement reference and verification note are required." });
    return;
  }
  const booking = await Booking.findById(req.params.id);
  if (!booking) { res.status(404).json({ success: false, code: "BOOKING_NOT_FOUND" }); return; }
  if (booking.status !== "completed" || booking.paymentStatus !== "confirmed" || booking.payoutStatus !== "processing") {
    res.status(409).json({ success: false, code: "PAYOUT_NOT_READY", message: "Only a completed, paid booking with a recorded external transfer can be verified." }); return;
  }
  if (!booking.payoutInitiatedBy || booking.payoutInitiatedBy.toString() === actor?.toString()) {
    res.status(403).json({ success: false, code: "SECOND_REVIEWER_REQUIRED", message: "Verification must be performed by another authorized finance reviewer." }); return;
  }
  if (booking.payoutSettlementReference !== settlementReference.trim()) {
    res.status(409).json({ success: false, code: "PAYOUT_REFERENCE_MISMATCH", message: "Evidence reference must match the initiated transfer." }); return;
  }
  // A partial database write must not label a transfer 'paid' without its
  // corresponding immutable manual-settlement ledger event.
  const session = await mongoose.startSession();
  let claimedId: string | undefined;
  try {
    await session.withTransaction(async () => {
      const changed = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "completed", paymentStatus: "confirmed", payoutStatus: "processing",
          payoutSettlementReference: settlementReference.trim(), payoutInitiatedBy: { $ne: actor } },
        { $set: { payoutStatus: "paid", payoutPaidAt: new Date(), payoutVerifiedBy: actor,
          payoutNote: `Manually reconciled external transfer; ${note.trim().slice(0, 250)}`,
          payoutEvidenceReference: verificationEvidence.trim().slice(0, 300) } },
        { new: true, session }
      );
      if (!changed) throw Object.assign(new Error("Payout was already reconciled or changed."), { statusCode: 409 });
      await PaymentLedger.findOneAndUpdate(
        { provider: "external_transfer", providerEventId: `payout-${changed._id}` },
        { $setOnInsert: {
          provider: "external_transfer", providerEventId: `payout-${changed._id}`,
          providerTransactionId: settlementReference.trim(), booking: changed._id,
          student: changed.student, tutor: changed.tutor,
          eventType: "payout.completed", status: "succeeded", currency: changed.currency || "PKR",
          grossAmount: changed.tutorPayout, studentPayment: 0, studentFee: 0, tutorFee: 0,
          tax: 0, gatewayFee: 0, refundAmount: 0, tutorPayable: changed.tutorPayout,
          platformNet: 0, settlementStatus: "reconciled",
          metadata: { settlementMethod: changed.payoutSettlementMethod, evidenceReference: verificationEvidence.trim(),
            initiatedBy: changed.payoutInitiatedBy?.toString(), reviewedBy: actor?.toString(),
            verificationMode: "two_person_external_statement_review", note: note.trim().slice(0, 250) },
        } }, { upsert: true, new: true, session }
      );
      claimedId = changed._id.toString();
    });
  } catch (err: any) {
    res.status(err?.statusCode || 500).json({ success: false, code: "PAYOUT_RECONCILIATION_FAILED", message: err?.message || "Unable to verify transfer." });
    return;
  } finally { await session.endSession(); }
  if (!claimedId) { res.status(409).json({ success: false, code: "PAYOUT_RECONCILIATION_FAILED" }); return; }
  const claimed = await Booking.findById(claimedId);
  if (!claimed) { res.status(409).json({ success: false, code: "PAYOUT_RECONCILIATION_FAILED" }); return; }
  await logAudit({ action: "external_payout_verified", actor: req.user?.name || "Finance", actorId: actor?.toString(),
    entity: "Booking", targetId: claimed._id.toString(),
    metadata: { reference: settlementReference.trim(), reviewer: actor?.toString(), evidence: verificationEvidence.trim() } });
  res.status(200).json({ success: true, message: "External transfer independently reconciled; payout recorded as paid.", booking: claimed });
};

// @desc    Update booking status
// @route   PATCH /api/admin/bookings/:id/status
// @access  Private (admin)
export const updateBookingStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { status } = req.body;

  if (!["upcoming", "ongoing", "completed", "cancelled"].includes(status)) {
    res.status(400).json({ success: false, message: "Invalid status" });
    return;
  }

  const booking = await Booking.findById(req.params.id)
    .populate("student", "name email")
    .populate("tutor", "name email")
    .populate("request", "subject");
  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found" });
    return;
  }

  const previousStatus = booking.status;
  const allowedTransitions: Record<string, string[]> = {
    upcoming: ["ongoing", "cancelled"],
    ongoing: ["completed", "cancelled"],
    completed: [], cancelled: [],
  };
  if (!allowedTransitions[previousStatus]?.includes(status)) {
    res.status(409).json({ success: false, code: "INVALID_BOOKING_TRANSITION", message: `Cannot transition booking from ${previousStatus} to ${status}.` });
    return;
  }
  if (["ongoing", "completed"].includes(status) && booking.paymentStatus !== "confirmed") {
    res.status(409).json({ success: false, code: "PAYMENT_REQUIRED", message: "The verified student payment is required before starting or completing tuition." });
    return;
  }
  // Compare-and-set protects referral credits, emails and certificates from
  // duplicated/admin-concurrent completion commands.
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: previousStatus, ...(status === "completed" || status === "ongoing" ? { paymentStatus: "confirmed" } : {}) },
    { $set: { status, ...(status === "completed" ? { completedAt: new Date() } : {}),
      ...(status === "cancelled" ? { cancelReason: typeof req.body.cancelReason === "string" ? req.body.cancelReason.slice(0, 500) : "Cancelled by admin" } : {}) } },
    { new: true }
  ).populate("student", "name email").populate("tutor", "name email").populate("request", "subject");
  if (!updated) {
    res.status(409).json({ success: false, code: "BOOKING_CHANGED", message: "Booking or payment status changed; please refresh before retrying." });
    return;
  }
  // Populate existing variable for the remainder of the notification/report path.
  booking.status = updated.status;
  booking.completedAt = updated.completedAt;
  if (status === "cancelled") await BookedSlot.deleteMany({ booking: booking._id });
  if (status === "completed") {
    try { await syncStudentTutorRelationship(updated as any); }
    catch (err) { console.error("[Booking] Could not update completed student-tutor relationship", err); }
  }

  await logAudit({
    action: `booking_${status}`,   // booking_completed, booking_cancelled, etc.
    actor: req.user?.name || "Admin",
    actorId: req.user?._id?.toString(),
    entity: "Booking",
    targetId: booking._id.toString(),
    targetName: `${(booking.student as any)?.name || "Student"} → ${(booking.tutor as any)?.name || "Tutor"}`,
    metadata: { previousStatus },
  });

   // ── Trigger referral credit when admin marks booking as completed ──
   if (status === "completed" && previousStatus !== "completed" && booking.isFirstSession) {
     await creditReferrerOnFirstBooking(booking.student.toString());
   }

  // The lifecycle worker sends one delayed, idempotent review invitation
  // using completedAt and reviewRequestSentAt; no immediate duplicate email.

  // Notify both parties
  const io = req.app.get("io");
  const statusMessages: Record<string, string> = {
    ongoing: "Your session has started.",
    completed: "Your session has been marked as completed.",
    cancelled: "Your booking has been cancelled.",
  };

  if (statusMessages[status]) {
    await sendNotification(io, booking.student.toString(), {
      title: "📅 Booking Update",
      message: statusMessages[status],
      type: "booking",
      link: "/dashboard",
    });
    await sendNotification(io, booking.tutor.toString(), {
      title: "📅 Booking Update",
      message: statusMessages[status],
      type: "booking",
      link: "/dashboard",
    });
  }

  res.status(200).json({
    success: true,
    message: `Booking status updated to ${status}`,
    booking,
  });
};

// @desc    Get all payouts (bookings where student payment is confirmed)
// @route   GET /api/admin/payouts
// @access  Private (admin)
export const getPayouts = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.query; // "pending" (action queue) | "paid" | undefined (all)

  // Only show bookings where the student has already paid — those are the ones
  // that need a tutor payout. Unconfirmed payments haven't earned a payout yet.
  const filter: Record<string, unknown> = {
    paymentStatus: "confirmed", status: "completed",
  };

  if (status && status !== "all") {
    filter.payoutStatus = status === "pending" ? { $in: ["pending", "approved", "processing", "held", "failed"] } : status;
  }

  const bookings = await Booking.find(filter)
    .populate("student", "name email")
    .populate("tutor", "name email phone city")
    .sort("-createdAt");

  // ── Summary stats across ALL confirmed bookings (ignore status filter for stats) ──
  const allConfirmed = await Booking.find({ paymentStatus: "confirmed", status: "completed" });
  const pendingOnes  = allConfirmed.filter(b => b.payoutStatus !== "paid");
  const paidOnes     = allConfirmed.filter(b => b.payoutStatus === "paid");

  const totalPendingAmount = pendingOnes.reduce((sum, b) => sum + (b.tutorPayout || 0), 0);
  const totalPaidAmount    = paidOnes.reduce((sum, b) => sum + (b.tutorPayout || 0), 0);

  res.status(200).json({
    success: true,
    stats: {
      pendingCount:        pendingOnes.length,
      paidCount:           paidOnes.length,
      totalPendingAmount,
      totalPaidAmount,
    },
    total: bookings.length,
    bookings,
  });
};

// @desc    Get analytics data for admin analytics page
// @route   GET /api/admin/analytics
// @access  Private (admin)
export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();

  // ── Date boundaries ──
  const weekStart   = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);
  const eightWeeksAgo = new Date(now); eightWeeksAgo.setDate(now.getDate() - 56);

  // ── Parallel fetches ──
  const [
    totalUsers,
    newUsersThisWeek,
    newUsersThisMonth,
    totalBookings,
    allBookings,
    monthBookings,
    recentSignups,
    pendingPayoutBookings,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: weekStart } }),
    User.countDocuments({ createdAt: { $gte: monthStart } }),
    Booking.countDocuments(),
    Booking.find()
      .select("status paymentStatus amount platformFee tutorPayout tutor createdAt")
      .populate("tutor", "name"),
    Booking.find({ createdAt: { $gte: monthStart }, paymentStatus: "confirmed" })
      .select("amount platformFee tutorPayout"),
    User.find({ createdAt: { $gte: eightWeeksAgo } }).select("createdAt"),
    Booking.find({ paymentStatus: "confirmed", payoutStatus: "pending" }).select("tutorPayout"),
  ]);

  // ── Revenue ──
  const revenueThisMonth     = monthBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  const platformFeeThisMonth = monthBookings.reduce((sum, b) => sum + (b.platformFee || 0), 0);
  const pendingPayouts       = pendingPayoutBookings.reduce((sum, b) => sum + (b.tutorPayout || 0), 0);

  // ── Plan breakdown ──
  // ── Booking status breakdown ──
  const bookingStatusBreakdown = {
    upcoming:  allBookings.filter(b => b.status === "upcoming").length,
    ongoing:   allBookings.filter(b => b.status === "ongoing").length,
    completed: allBookings.filter(b => b.status === "completed").length,
    cancelled: allBookings.filter(b => b.status === "cancelled").length,
  };

  // ── Signup trend — last 8 weeks ──
  const signupTrend = [];
  for (let i = 7; i >= 0; i--) {
    const weekEnd   = new Date(now); weekEnd.setDate(now.getDate() - i * 7);
    const weekBegin = new Date(weekEnd); weekBegin.setDate(weekEnd.getDate() - 7);
    const count = recentSignups.filter(u => {
      const d = new Date(u.createdAt as unknown as string);
      return d >= weekBegin && d < weekEnd;
    }).length;
    signupTrend.push({
      week:  `W${8 - i}`,
      label: weekEnd.toLocaleDateString("en-PK", { month: "short", day: "numeric" }),
      count,
    });
  }

  // ── Top 5 tutors by bookings ──
  const tutorMap: Record<string, { name: string; count: number; revenue: number }> = {};
  allBookings.forEach(b => {
    if (!b.tutor) return;
    const tutor = b.tutor as unknown as { _id: { toString(): string }; name: string };
    const id = tutor._id.toString();
    if (!tutorMap[id]) tutorMap[id] = { name: tutor.name, count: 0, revenue: 0 };
    tutorMap[id].count++;
    tutorMap[id].revenue += b.amount || 0;
  });
  const topTutors = Object.values(tutorMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Recent confirmed payments ──
  const recentPayments = await Booking.find({ paymentStatus: "confirmed" })
    .populate("student", "name")
    .populate("tutor", "name")
    .sort("-updatedAt")
    .limit(5)
    .select("amount student tutor status createdAt");

  res.status(200).json({
    success: true,
    overview: {
      totalUsers,
      newUsersThisWeek,
      newUsersThisMonth,
      totalBookings,
      revenueThisMonth,
      platformFeeThisMonth,
      pendingPayouts,
    },
    signupTrend,
    bookingStatusBreakdown,
    topTutors,
    recentPayments,
  });
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (admin)
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { action, entity, page = "1", limit = "50" } = req.query;

  const filter: Record<string, unknown> = {};
  if (action && action !== "all") filter.action = action;
  if (entity && entity !== "all") filter.entity = entity;

  const pageNum  = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
  const skip     = (pageNum - 1) * limitNum;

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
  ]);

  const [actions, entities] = await Promise.all([
    AuditLog.distinct("action"),
    AuditLog.distinct("entity"),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    logs,
    filters: { actions, entities },
  });
};

// @desc    Get transactional email logs
// @route   GET /api/admin/email-logs
// @access  Private (admin)
export const getEmailLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, eventType, recipient, page = "1", limit = "50" } = req.query;

  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  if (eventType && eventType !== "all") filter.eventType = eventType;
  if (recipient) filter.recipientEmail = { $regex: String(recipient), $options: "i" };

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [total, logs, statusCounts, eventTypes] = await Promise.all([
    EmailLog.countDocuments(filter),
    EmailLog.find(filter)
      .populate("user", "name role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    EmailLog.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    EmailLog.distinct("eventType"),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    logs,
    filters: {
      eventTypes: eventTypes.sort(),
      plannedEvents: EMAIL_EVENTS,
      statusCounts: statusCounts.reduce((acc: Record<string, number>, row: { _id: string; count: number }) => {
        acc[row._id] = row.count;
        return acc;
      }, {}),
    },
  });
};

// @desc    Send a broadcast notification to a group of users
// @route   POST /api/admin/broadcasts
// @access  Private (admin)
export const sendBroadcast = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, message, audience } = req.body;
 
  if (!title?.trim() || !message?.trim() || !audience) {
    res.status(400).json({ success: false, message: "Title, message and audience are required." });
    return;
  }
 
  // Build the user filter based on audience
  const filter: Record<string, unknown> = { isActive: true };
  switch (audience) {
    case "students": filter.role = "student"; break;
    case "tutors":   filter.role = "tutor";   break;
    default:         filter.role = { $in: ["student", "tutor"] }; // "all" excludes admins
  }
 
  const users = await User.find(filter).select("_id");
 
  if (users.length === 0) {
    res.status(400).json({ success: false, message: "No active users found for this audience." });
    return;
  }
 
  // ── Send real-time notification to every matched user ──
  const io = req.app.get("io");
  const notificationDocs = users.map(u => ({
    user:    u._id,
    title,
    message,
    type:    "broadcast",
    link:    "/notifications",
    isRead:  false,
  }));
 
  // Bulk insert into Notification collection (saves to DB for users who are offline)
  await Notification.insertMany(notificationDocs);
 
  // Also emit real-time socket event for online users
  for (const user of users) {
    await sendNotification(io, user._id.toString(), {
      title,
      message,
      type: "broadcast",
      link: "/notifications",
    });
  }
 
  // ── Save broadcast record ──
  const broadcast = await Broadcast.create({
    title,
    message,
    audience,
    sentCount:  users.length,
    sentBy:     req.user?._id,
    sentByName: req.user?.name || "Admin",
  });
 
  // ── Audit log ──
  await logAudit({
    action:     "broadcast_sent",
    actor:      req.user?.name || "Admin",
    actorId:    req.user?._id?.toString(),
    entity:     "Broadcast",
    targetId:   broadcast._id.toString(),
    targetName: title,
    metadata:   { audience, sentCount: users.length },
  });
 
  res.status(201).json({
    success: true,
    message: `Broadcast sent to ${users.length} user${users.length !== 1 ? "s" : ""}.`,
    broadcast,
  });
};
 
// @desc    Get broadcast history
// @route   GET /api/admin/broadcasts
// @access  Private (admin)
export const getBroadcasts = async (req: AuthRequest, res: Response): Promise<void> => {
  const broadcasts = await Broadcast.find()
    .sort({ createdAt: -1 })
    .limit(50);
 
  const totalSent = broadcasts.reduce((sum, b) => sum + b.sentCount, 0);
 
  res.status(200).json({ success: true, total: broadcasts.length, totalSent, broadcasts });
};

// @desc    Generate weekly or monthly report
// @route   GET /api/admin/reports
// @access  Private (admin)
export const generateReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const { period = "monthly", format = "excel" } = req.query;

  // ── Date range ──────────────────────────────────────────────────
  const now = new Date();
  let startDate: Date;
  const periodLabel = period === "weekly" ? "Weekly" : "Monthly";

  if (period === "weekly") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 1);
  }

  const dateFilter = { createdAt: { $gte: startDate, $lte: now } };
  const dateRangeLabel = `${startDate.toLocaleDateString("en-PK")} – ${now.toLocaleDateString("en-PK")}`;

  // ── Fetch all data in parallel ────────────────────────────────
  const [bookings, users, tutorProfiles, requests, reviews] = await Promise.all([
    Booking.find(dateFilter)
      .populate("student", "name email")
      .populate("tutor", "name email"),
    User.find(dateFilter),
    TutorProfile.find({
      verificationStatus: "approved",
    }).populate("user", "name email"),
    Request.find(dateFilter).populate("student", "name"),
    Review.find(dateFilter),
  ]);

  // ── Derived calculations ──────────────────────────────────────
  // Financial figures must come from confirmed bookings and their immutable fee snapshots.
  // Pending/failed/cancelled payment attempts are not revenue. Admin fee changes
  // must not silently rewrite the amounts charged in historical bookings.
  const paidBookings = bookings.filter(b => b.paymentStatus === "confirmed");
  const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.subtotal || 0), 0);
  const platformFeeTotal = paidBookings.reduce((sum, b) => sum + (b.studentFee || 0) + (b.tutorFee || 0), 0);
  const gstTotal = paidBookings.reduce((sum, b) => sum + (b.tax || 0), 0);
  const tutorPayoutTotal = paidBookings.reduce((sum, b) => sum + (b.tutorNet || 0), 0);

  const bookingsByStatus = {
    upcoming:  bookings.filter(b => b.status === "upcoming").length,
    ongoing:   bookings.filter(b => b.status === "ongoing").length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  const newStudents = users.filter(u => u.role === "student").length;
  const newTutors   = users.filter(u => u.role === "tutor").length;

  // Tutor performance map
  const tutorMap: Record<string, {
    name: string; email: string;
    bookings: number; earnings: number; avgRating: number; totalReviews: number;
  }> = {};

  for (const b of bookings) {
    const tutor = b.tutor as unknown as { _id: { toString(): string }; name: string; email: string } | null;
    if (!tutor) continue;
    const tid = tutor._id.toString();
    if (!tutorMap[tid]) {
      tutorMap[tid] = { name: tutor.name, email: tutor.email, bookings: 0, earnings: 0, avgRating: 0, totalReviews: 0 };
    }
    tutorMap[tid].bookings++;
    tutorMap[tid].earnings += b.paymentStatus === "confirmed" ? (b.tutorNet || 0) : 0;
  }

  // Add ratings from TutorProfile
  for (const tp of tutorProfiles) {
    const uid = (tp.user as unknown as { _id: { toString(): string } })._id.toString();
    if (tutorMap[uid]) {
      tutorMap[uid].avgRating = tp.averageRating || 0;
      tutorMap[uid].totalReviews = tp.totalReviews || 0;
    }
  }

  const tutorRows = Object.values(tutorMap).sort((a, b) => b.bookings - a.bookings);

  // Student activity map
  const studentMap: Record<string, {
    name: string; email: string; requests: number; bookings: number;
  }> = {};

  for (const r of requests) {
    const student = r.student as unknown as { _id: { toString(): string }; name: string } | null;
    if (!student) continue;
    const sid = student._id.toString();
    if (!studentMap[sid]) studentMap[sid] = { name: student.name, email: "", requests: 0, bookings: 0 };
    studentMap[sid].requests++;
  }

  for (const b of bookings) {
    const student = b.student as unknown as { _id: { toString(): string }; name: string; email: string } | null;
    if (!student) continue;
    const sid = student._id.toString();
    if (!studentMap[sid]) studentMap[sid] = { name: student.name, email: student.email, requests: 0, bookings: 0 };
    studentMap[sid].bookings++;
    studentMap[sid].email = student.email;
  }

  const studentRows = Object.values(studentMap).sort((a, b) => b.bookings - a.bookings);

  // ── EXCEL FORMAT ──────────────────────────────────────────────
  if (format === "excel") {
    const wb = new ExcelJS.Workbook();
    wb.creator = "TUTORERA®";
    wb.created = new Date();

    // ── Styles helpers ──
    const headerFill: ExcelJS.Fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: "FF1A1A2E" },
    };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const sectionFill: ExcelJS.Fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: "FFEFF6FF" },
    };
    const sectionFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FF2563EB" }, size: 11 };

    const styleHeader = (row: ExcelJS.Row) => {
      row.eachCell(cell => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FF2563EB" } },
        };
      });
      row.height = 22;
    };

    const styleSection = (row: ExcelJS.Row) => {
      row.eachCell(cell => {
        cell.fill = sectionFill;
        cell.font = sectionFont;
      });
    };

    // ════════════════════════════════════════
    // SHEET 1 — Summary
    // ════════════════════════════════════════
    const ws1 = wb.addWorksheet("Summary");
    ws1.columns = [
      { key: "a", width: 35 },
      { key: "b", width: 25 },
    ];

    ws1.addRow(["TUTORERA® Platform Report", ""]);
    ws1.mergeCells("A1:B1");
    const titleRow = ws1.getRow(1);
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: "FF1A1A2E" } };
    titleRow.getCell(1).alignment = { horizontal: "center" };
    titleRow.height = 32;

    ws1.addRow([`${periodLabel} Report · ${dateRangeLabel}`, ""]);
    ws1.mergeCells("A2:B2");
    ws1.getRow(2).getCell(1).font = { size: 11, color: { argb: "FF6B7280" } };
    ws1.getRow(2).getCell(1).alignment = { horizontal: "center" };

    ws1.addRow([]);

    // Bookings summary
    styleSection(ws1.addRow(["📋 BOOKINGS SUMMARY", ""]));
    styleHeader(ws1.addRow(["Metric", "Value"]));
    [
      ["Total Bookings", bookings.length],
      ["Upcoming", bookingsByStatus.upcoming],
      ["Ongoing", bookingsByStatus.ongoing],
      ["Completed", bookingsByStatus.completed],
      ["Cancelled", bookingsByStatus.cancelled],
      ["Total Requests Posted", requests.length],
    ].forEach(([k, v]) => ws1.addRow([k, v]));

    ws1.addRow([]);

    // Revenue summary
    styleSection(ws1.addRow(["💰 REVENUE SUMMARY", ""]));
    styleHeader(ws1.addRow(["Metric", "Amount (PKR)"]));
    [
      ["Confirmed Session Revenue", `Rs. ${totalRevenue.toLocaleString()}`],
      ["Platform Fees (confirmed payments)", `Rs. ${platformFeeTotal.toLocaleString()}`],
      ["Tax in Booking Snapshots", `Rs. ${gstTotal.toLocaleString()}`],
      ["Total Tutor Payouts", `Rs. ${tutorPayoutTotal.toLocaleString()}`],
    ].forEach(([k, v]) => ws1.addRow([k, v]));

    ws1.addRow([]);

    // User summary
    styleSection(ws1.addRow(["👥 USER SUMMARY", ""]));
    styleHeader(ws1.addRow(["Metric", "Count"]));
    [
      ["New Students This Period", newStudents],
      ["New Tutors This Period", newTutors],
      ["Total Reviews This Period", reviews.length],
    ].forEach(([k, v]) => ws1.addRow([k, v]));

    // ════════════════════════════════════════
    // SHEET 2 — Bookings Detail
    // ════════════════════════════════════════
    const ws2 = wb.addWorksheet("Bookings Detail");
    ws2.columns = [
      { header: "Booking ID", key: "id", width: 28 },
      { header: "Student", key: "student", width: 22 },
      { header: "Tutor", key: "tutor", width: 22 },
      { header: "Amount (PKR)", key: "amount", width: 16 },
      { header: "Platform Fee", key: "fee", width: 16 },
      { header: "Tutor Payout", key: "payout", width: 16 },
      { header: "Status", key: "status", width: 14 },
      { header: "Teaching Mode", key: "mode", width: 16 },
      { header: "Date", key: "date", width: 16 },
    ];
    styleHeader(ws2.getRow(1));

    for (const b of bookings) {
      const fee = Math.round((b.amount || 0) * 0.30);
      const payout = (b.amount || 0) - fee;
      const student = b.student as unknown as { name: string } | null;
      const tutor   = b.tutor   as unknown as { name: string } | null;
      ws2.addRow({
        id:      b._id.toString(),
        student: student?.name || "—",
        tutor:   tutor?.name   || "—",
        amount:  b.amount || 0,
        fee,
        payout,
        status:  b.status,
        mode:    b.teachingMode,
        date:    new Date(b.createdAt).toLocaleDateString("en-PK"),
      });
    }

    // ════════════════════════════════════════
    // SHEET 3 — Tutor Performance
    // ════════════════════════════════════════
    const ws3 = wb.addWorksheet("Tutor Performance");
    ws3.columns = [
      { header: "Tutor Name", key: "name", width: 24 },
      { header: "Email", key: "email", width: 28 },
      { header: "Bookings", key: "bookings", width: 14 },
      { header: "Earnings (PKR)", key: "earnings", width: 18 },
      { header: "Avg. Rating", key: "rating", width: 14 },
      { header: "Total Reviews", key: "reviews", width: 16 },
    ];
    styleHeader(ws3.getRow(1));
    tutorRows.forEach(t => ws3.addRow({
      name: t.name, email: t.email,
      bookings: t.bookings, earnings: t.earnings,
      rating: t.avgRating.toFixed(1), reviews: t.totalReviews,
    }));

    // ════════════════════════════════════════
    // SHEET 4 — Student Activity
    // ════════════════════════════════════════
    const ws4 = wb.addWorksheet("Student Activity");
    ws4.columns = [
      { header: "Student Name", key: "name", width: 24 },
      { header: "Email", key: "email", width: 28 },
      { header: "Requests Posted", key: "requests", width: 18 },
      { header: "Bookings Made", key: "bookings", width: 18 },
    ];
    styleHeader(ws4.getRow(1));
    studentRows.forEach(s => ws4.addRow({
      name: s.name, email: s.email,
      requests: s.requests, bookings: s.bookings,
    }));

    // ── Stream response ──
    const filename = `tutorera-${period}-report-${now.toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
    return;
  }

  // ── PDF FORMAT ────────────────────────────────────────────────
  if (format === "pdf") {
    const filename = `tutorera-${period}-report-${now.toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.pipe(res);

    // ── Helpers ──
    const COL_DARK = "#1a1a2e";
    const COL_ACCENT = "#2563eb";
    const COL_GRAY = "#6b7280";

    const drawSectionTitle = (title: string) => {
      doc.moveDown(0.5);
      doc.rect(50, doc.y, 495, 22).fill("#eff6ff");
      doc.fillColor(COL_ACCENT).fontSize(11).font("Helvetica-Bold")
        .text(title, 58, doc.y - 18);
      doc.moveDown(0.3);
      doc.fillColor(COL_DARK);
    };

    const drawTableRow = (
      cols: string[],
      widths: number[],
      isHeader = false,
      y?: number
    ) => {
      const rowY = y ?? doc.y;
      let x = 50;
      if (isHeader) {
        doc.rect(50, rowY, 495, 18).fill(COL_DARK);
      }
      cols.forEach((col, i) => {
        doc
          .fillColor(isHeader ? "#ffffff" : COL_DARK)
          .fontSize(9)
          .font(isHeader ? "Helvetica-Bold" : "Helvetica")
          .text(col, x + 4, rowY + 4, { width: widths[i] - 8, lineBreak: false });
        x += widths[i];
      });
      doc.moveDown(0.1);
      if (!isHeader) {
        doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2)
          .strokeColor("#e5e7eb").lineWidth(0.5).stroke();
      }
    };

    // ── Cover ──
    doc.rect(0, 0, 595, 120).fill(COL_DARK);
    doc.fillColor("white").fontSize(26).font("Helvetica-Bold")
      .text("TUTORERA®", 50, 35);
    doc.fillColor("#9ca3af").fontSize(13).font("Helvetica")
      .text(`${periodLabel} Platform Report`, 50, 68);
    doc.fillColor("#6b7280").fontSize(10)
      .text(dateRangeLabel, 50, 88);
    doc.fillColor("#e94560").fontSize(10)
      .text(`Generated: ${now.toLocaleDateString("en-PK")}`, 50, 104);
    doc.y = 140;

    // ── 1. Bookings Summary ──
    drawSectionTitle("📋  BOOKINGS SUMMARY");
    const bCols = ["Metric", "Value"];
    const bWidths = [350, 145];
    drawTableRow(bCols, bWidths, true);
    [
      ["Total Bookings", bookings.length],
      ["Upcoming", bookingsByStatus.upcoming],
      ["Ongoing", bookingsByStatus.ongoing],
      ["Completed", bookingsByStatus.completed],
      ["Cancelled", bookingsByStatus.cancelled],
      ["Total Requests Posted", requests.length],
    ].forEach(([k, v]) => drawTableRow([String(k), String(v)], bWidths));

    // ── 2. Revenue ──
    drawSectionTitle("💰  REVENUE & FEES");
    const rWidths = [350, 145];
    drawTableRow(["Metric", "Amount (PKR)"], rWidths, true);
    [
      ["Confirmed Session Revenue", `Rs. ${totalRevenue.toLocaleString()}`],
      ["Platform Fees (confirmed payments)", `Rs. ${platformFeeTotal.toLocaleString()}`],
      ["Tax in Booking Snapshots", `Rs. ${gstTotal.toLocaleString()}`],
      ["Total Tutor Payouts", `Rs. ${tutorPayoutTotal.toLocaleString()}`],
    ].forEach(([k, v]) => drawTableRow([k, v], rWidths));

    // ── 3. User Summary ──
    drawSectionTitle("👥  USER SUMMARY");
    drawTableRow(["Metric", "Count"], [350, 145], true);
    [
      ["New Students This Period", newStudents],
      ["New Tutors This Period", newTutors],
      ["Total Reviews This Period", reviews.length],
    ].forEach(([k, v]) => drawTableRow([String(k), String(v)], [350, 145]));

    // ── 4. Tutor Performance ──
    doc.addPage();
    drawSectionTitle("🎓  TUTOR PERFORMANCE");
    const tWidths = [160, 160, 60, 75, 40];
    drawTableRow(["Name", "Email", "Bookings", "Earnings", "Rating"], tWidths, true);
    tutorRows.slice(0, 40).forEach(t =>
      drawTableRow([
        t.name, t.email,
        String(t.bookings),
        `Rs.${t.earnings.toLocaleString()}`,
        t.avgRating.toFixed(1),
      ], tWidths)
    );

    // ── 5. Student Activity ──
    doc.addPage();
    drawSectionTitle("📚  STUDENT ACTIVITY");
    const sWidths = [190, 180, 65, 60];
    drawTableRow(["Name", "Email", "Requests", "Bookings"], sWidths, true);
    studentRows.slice(0, 40).forEach(s =>
      drawTableRow([s.name, s.email, String(s.requests), String(s.bookings)], sWidths)
    );

    doc.fontSize(8).fillColor(COL_GRAY)
      .text(`TUTORERA® — Confidential · Generated ${now.toLocaleDateString("en-PK")}`, 50, 780, { align: "center" });

    doc.end();
    return;
  }

  res.status(400).json({ success: false, message: "Invalid format. Use pdf or excel." });
};

// @desc    Get a short-lived signed URL to view a tutor's private verification document
// @route   GET /api/admin/tutors/:id/document/:field
// @access  Private (admin)
export const getTutorDocumentUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id, field } = req.params as { id: string; field: string };
  const allowedFields = ["cnicFront", "cnicBack", "policeCertificate", "degreeDoc"];

  if (!allowedFields.includes(field)) {
    res.status(400).json({ success: false, message: "Invalid document field" });
    return;
  }

  const profile = await TutorProfile.findById(id);
  if (!profile) {
    res.status(404).json({ success: false, message: "Tutor profile not found" });
    return;
  }

  let publicId: string | undefined;
  if (field === "degreeDoc") {
    publicId = profile.education?.[0]?.degreeDocPublicId;
  } else {
    publicId = (profile as any)[`${field}PublicId`];
  }

  if (!publicId) {
    res.status(404).json({ success: false, message: "Document not found" });
    return;
  }

  const signedUrl = getSignedViewUrl(publicId, "image", 300);
  res.status(200).json({ success: true, url: signedUrl });
};

// @desc    Download tutor payout report as PDF (admin)
// @route   GET /api/admin/tutors/:tutorId/payout-report/pdf
// @access  Private (admin)
export const downloadTutorPayoutReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const tutorId = req.params.tutorId as string;

  try {
    const { periodStart, periodEnd } = resolvePayoutReportPeriod(req.query.from, req.query.to);

    const { data, pdfBuffer } = await generateTutorPayoutReport(tutorId, periodStart, periodEnd, { userId: req.user?._id?.toString(), role: "admin" });

    const filename = `tutorera-payout-report-${data.reportReference}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Failed to generate tutor payout report:", error);
    res.status(error?.statusCode || 500).json({ success: false, message: error?.statusCode ? error.message : "Failed to generate payout report." });
  }
};
