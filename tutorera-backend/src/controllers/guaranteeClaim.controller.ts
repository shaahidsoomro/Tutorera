import { Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../types";
import GuaranteeClaim from "../models/GuaranteeClaim.model";
import Booking from "../models/Booking.model";
import User from "../models/User.model";
import sendEmail from "../utils/sendEmail";
import { renderTransactionalEmail } from "../utils/emailBrand";
import { formatMoney } from "../utils/emailTemplates";
import { LEGAL_CONFIG } from "../config/legal";

// @desc    Submit a first session guarantee claim
// @route   POST /api/guarantee/claim
// @access  Private (student)
export const submitClaim = async (req: AuthRequest, res: Response): Promise<void> => {
  const { bookingId, reason, details } = req.body;

  if (!bookingId || !reason) {
    res.status(400).json({ success: false, message: "Booking ID and reason are required." });
    return;
  }

  // Verify booking exists, belongs to this student, is completed, and is first session
  const booking = await Booking.findOne({
    _id: bookingId,
    student: req.user?._id,
    status: "completed",
    isFirstSession: true,
  }).populate("tutor", "name email");

  if (!booking) {
    res.status(404).json({
      success: false,
      message: "Booking not found or not eligible for guarantee claim.",
    });
    return;
  }

  // Check if claim already submitted for this booking
  const existing = await GuaranteeClaim.findOne({ booking: bookingId });
  if (existing) {
    res.status(400).json({
      success: false,
      message: "A guarantee claim has already been submitted for this session.",
    });
    return;
  }

  const tutor = booking.tutor as unknown as { _id: Types.ObjectId; name: string; email: string };

  const claim = await GuaranteeClaim.create({
    student: req.user?._id,
    booking: bookingId,
    tutor: tutor._id,
    reason,
    details: details || "",
  });

  const formattedAmount = formatMoney(booking.amount, booking.currency || "USD");
  const adminRecipient = process.env.EMAIL_USER || LEGAL_CONFIG.PLATFORM_SUPER_ADMIN_EMAIL;

  // Email to admin
  const adminSubject = `[TUTORERA Guarantee] New Claim: ${req.user?.name}`;
  const adminHtml = renderTransactionalEmail({
    subject: adminSubject,
    emailCategory: "Guarantee Claim",
    emailHeading: "First Session Guarantee Claim",
    emailSubheading: `Submitted by ${req.user?.name} for booking ${bookingId}.`,
    firstName: "Trust & Safety Team",
    openingMessage: "A student has filed a First Session Satisfaction Guarantee claim requesting review and remedy.",
    mainMessage: details ? `Student Statement:\n"${details}"` : "Please review the session details and determine whether to grant session credit or refund.",
    detailsCard: {
      title: "Claim Summary",
      rows: [
        { label: "Student", value: `${req.user?.name} (${req.user?.email})`, highlight: true },
        { label: "Tutor", value: `${tutor.name} (${tutor.email})` },
        { label: "Booking ID", value: bookingId, highlight: true },
        { label: "Session Amount", value: formattedAmount },
        { label: "Claim Reason", value: reason },
        { label: "Status", value: "Under Review", isStatus: true, statusVariant: "warning" },
      ],
    },
    cta: { label: "Review Claim in Admin Panel", url: "https://tutorera.ac.pk/admin" },
    includeSecurityNotice: false,
    deliverability: "Administrative dispatch for satisfaction guarantee management.",
  });

  await sendEmail({
    to: adminRecipient,
    subject: adminSubject,
    html: adminHtml,
    eventType: "safety.case_created",
  });

  // Confirmation email to student
  const studentSubject = "Your Guarantee Claim Has Been Received — TUTORERA";
  const studentHtml = renderTransactionalEmail({
    subject: studentSubject,
    emailCategory: "Guarantee Update",
    emailHeading: `Claim Received, ${req.user?.name}`,
    emailSubheading: "Our student satisfaction team is reviewing your claim.",
    firstName: req.user?.name,
    openingMessage: "We have received your First Session Satisfaction Guarantee claim. Our team will review the session records and contact you within 24–48 hours.",
    mainMessage: "If approved, TUTORERA will provide a session credit to try another verified educator or process a complete refund to your original payment method.",
    detailsCard: {
      title: "Claim Reference",
      rows: [
        { label: "Claim Reference", value: `CLM-${bookingId.slice(-8).toUpperCase()}`, highlight: true },
        { label: "Reason", value: reason },
        { label: "Resolution SLA", value: "24–48 Hours" },
        { label: "Status", value: "Under Review", isStatus: true, statusVariant: "info" },
      ],
    },
    cta: { label: "View Booking Details", url: "https://tutorera.ac.pk/dashboard" },
    includeSecurityNotice: false,
    deliverability: "This transactional notification was sent regarding your TUTORERA guarantee claim.",
  });

  await sendEmail({
    to: req.user?.email as string,
    subject: studentSubject,
    html: studentHtml,
    eventType: "safety.case_created",
  });

  res.status(201).json({
    success: true,
    message: "Your guarantee claim has been submitted. We'll review it within 24–48 hours.",
    claim,
  });
};

// @desc    Get all guarantee claims (admin)
// @route   GET /api/guarantee/claims
// @access  Private (admin)
export const getClaims = async (req: AuthRequest, res: Response): Promise<void> => {
  const claims = await GuaranteeClaim.find()
    .populate("student", "name email")
    .populate("tutor", "name email")
    .populate("booking")
    .sort("-createdAt");

  res.status(200).json({ success: true, count: claims.length, claims });
};

export const getAllClaims = getClaims;

// @desc    Update claim status (admin)
// @route   PATCH /api/guarantee/claims/:id
// @access  Private (admin)
export const updateClaimStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, adminNote } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'." });
    return;
  }

  const claim = await GuaranteeClaim.findByIdAndUpdate(
    req.params.id,
    { status, adminNote, resolvedAt: new Date() },
    { returnDocument: "after" }
  ).populate("student", "name email");

  if (!claim) {
    res.status(404).json({ success: false, message: "Claim not found" });
    return;
  }

  // Email student about the decision
  const student = claim.student as unknown as { name: string; email: string };
  if (status === "approved") {
    const approvedSubject = "Your Guarantee Claim Was Approved — TUTORERA";
    const approvedHtml = renderTransactionalEmail({
      subject: approvedSubject,
      emailCategory: "Guarantee Resolution",
      emailHeading: "Claim Approved",
      emailSubheading: "Your first session satisfaction guarantee claim has been approved.",
      firstName: student.name,
      openingMessage: "Great news! Your First Session Guarantee claim has been reviewed and approved by our satisfaction team.",
      mainMessage: adminNote ? `Advisory Note:\n"${adminNote}"` : "Our support desk will coordinate your replacement session credit or process your refund to your original payment method.",
      detailsCard: {
        title: "Resolution Details",
        rows: [
          { label: "Decision", value: "Approved", isStatus: true, statusVariant: "success" },
          { label: "Next Step", value: "Credit or Refund Processing" },
          { label: "Resolution Date", value: new Date().toLocaleDateString("en-US") },
        ],
      },
      cta: { label: "Visit Dashboard", url: "https://tutorera.ac.pk/dashboard" },
      includeSecurityNotice: false,
      deliverability: "This transactional message was sent regarding your TUTORERA claim resolution.",
    });

    await sendEmail({
      to: student.email,
      subject: approvedSubject,
      html: approvedHtml,
      eventType: "safety.case_resolved",
    });
  } else if (status === "rejected") {
    const rejectedSubject = "Update on Your Guarantee Claim — TUTORERA";
    const rejectedHtml = renderTransactionalEmail({
      subject: rejectedSubject,
      emailCategory: "Guarantee Resolution",
      emailHeading: "Claim Review Update",
      emailSubheading: "We were unable to approve your guarantee claim at this time.",
      firstName: student.name,
      openingMessage: "Our team has reviewed your First Session Guarantee claim along with the lesson records and was unable to approve it under platform guarantee guidelines.",
      mainMessage: adminNote ? `Review Reason:\n"${adminNote}"` : "If you have questions or additional details to share, please reply to this email to speak with a senior supervisor.",
      detailsCard: {
        title: "Claim Status",
        rows: [
          { label: "Decision", value: "Not Approved", isStatus: true, statusVariant: "neutral" },
          { label: "Reason", value: adminNote || "Does not meet guarantee terms" },
        ],
      },
      cta: { label: "Contact Support", url: "mailto:hello@mentisera.pk" },
      includeSecurityNotice: false,
      deliverability: "This message was sent regarding your TUTORERA claim decision.",
    });

    await sendEmail({
      to: student.email,
      subject: rejectedSubject,
      html: rejectedHtml,
      eventType: "safety.case_resolved",
    });
  }

  res.status(200).json({ success: true, claim });
};