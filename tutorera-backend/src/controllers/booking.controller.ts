import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types";
import Booking from "../models/Booking.model";
import BookedSlot from "../models/BookedSlot.model";
import Bid from "../models/Bid.model";
import RequestModel from "../models/Request.model";
import SafetyCase from "../models/SafetyCase.model";
import { creditReferrerOnFirstBooking } from "../controllers/referral.controller";
import sendEmail from "../utils/sendEmail";
import { bookingCancelledEmail } from "../utils/emailTemplates";
import User from "../models/User.model";
import { logAudit } from "../utils/logAudit";
import { sendNotification } from "../utils/socket";
import AbandonedJourney from "../models/AbandonedJourney.model";
import { syncStudentTutorRelationship } from "../services/relationship.service";
import { computeNextOccurrence } from "../utils/scheduleOccurrences";

// @desc    Get my bookings
// @route   GET /api/bookings
// @access  Private
export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const role = req.user?.role;
  const { page = "1", limit = "20" } = req.query;

  const filter = role === "student"
    ? { student: userId }
    : role === "parent"
      ? { parent: userId }
      : { tutor: userId };

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
  const skip = (pageNum - 1) * limitNum;

  const total = await Booking.countDocuments(filter);

  const bookings = await Booking.find(filter)
  .populate("student", "name avatar")
  .populate("tutor", "name avatar")
  .populate("request", "subject level status")
  .select("_id student tutor request amount finalAgreedRate currency pricingUnit status paymentStatus createdAt schedule teachingMode sessionCount")
  .sort("-createdAt")
  .skip(skip)
  .limit(limitNum)
  .lean();

  // Attach a computed real next-occurrence date/time alongside the raw
  // schedule string. Bookings created before this fix have no structured
  // recurrence data (preferredDays/preferredStartTime), so
  // computeNextOccurrence() correctly returns null for them — the frontend
  // falls back to displaying the existing `schedule` text as before, no
  // crash, no special-casing needed per booking.
  const bookingsWithOccurrence = bookings.map((booking) => {
    const nextOccurrence = computeNextOccurrence({
      preferredDays: booking.preferredDays,
      preferredStartTime: booking.preferredStartTime,
      sessionDurationMinutes: booking.sessionDurationMinutes,
      expectedStartDate: booking.expectedStartDate,
      scheduleTimezone: booking.scheduleTimezone,
    });

    return {
      ...booking.toObject(),
      nextOccurrence, // { startAt, endAt, dayLabel, dateLabel, timeLabel } or null
    };
  });

  res.status(200).json({
    success: true,
    total,
    bookings: bookingsWithOccurrence,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
};

// @desc    Update booking status (student/tutor — limited, safe transitions only)
// @route   PATCH /api/bookings/:id/status
// @access  Private
export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, cancelReason } = req.body;
  const userId = req.user?._id;
  const isStudent = req.user?.role === "student";
  const isTutor = req.user?.role === "tutor";
  const isParent = req.user?.role === "parent";

  const booking = await Booking.findOne({
    _id: req.params.id,
    $or: [{ student: userId }, { tutor: userId }, { parent: userId }],
  });

  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found" });
    return;
  }

  // ── Explicit, role-restricted state machine ──
  // Students and parents may only cancel an upcoming booking.
  // Tutors may only start (mark ongoing) an upcoming booking, or cancel it.
  // Nobody but admin can mark a booking "completed" — that's a payment-sensitive transition.
  const allowedTransitions: Record<string, string[]> = {
    student: ["cancelled"],
    parent: ["cancelled"],
    tutor: ["ongoing", "cancelled"],
  };

  const actorRole = isStudent ? "student" : isTutor ? "tutor" : isParent ? "parent" : null;
  if (!actorRole || !allowedTransitions[actorRole].includes(status)) {
    res.status(403).json({
      success: false,
      message: "You are not allowed to set this booking status. Completion must be confirmed by an admin.",
    });
    return;
  }

  if (isParent && status === "cancelled") {
    const studentExists = await User.exists({ _id: booking.student, role: "student" });
    if (!studentExists) {
      res.status(403).json({ success: false, code: "STUDENT_NOT_FOUND", message: "Cannot modify booking for invalid student." });
      return;
    }
    const parentAuthorized = await ParentProfile.exists({ user: req.user._id, "children.studentUser": booking.student });
    if (!parentAuthorized) {
      res.status(403).json({ success: false, code: "GUARDIAN_NOT_AUTHORIZED", message: "You are not an authorized guardian for this student." });
      return;
    }
  }

  if (booking.status !== "upcoming") {
    res.status(400).json({
      success: false,
      message: `Booking is already "${booking.status}" and cannot be changed from here.`,
    });
    return;
  }

  if (status === "ongoing" && booking.paymentStatus !== "confirmed") {
    res.status(409).json({ success: false, code: "PAYMENT_REQUIRED", message: "The student must complete verified payment before starting a lesson." });
    return;
  }

  if (!booking.bid || !booking.request) {
    res.status(409).json({ success: false, code: "DATA_INTEGRITY_ERROR", message: "This booking is missing critical references. Contact support to resolve." });
    return;
  }

  const VALID_PAYMENT_TRANSITIONS: Record<string, string[]> = {
    pending: ["confirmed", "failed"],
    failed: ["confirmed"],
    confirmed: ["refunded", "partially_refunded", "disputed"],
    refunded: [],
    partially_refunded: ["refunded"],
    disputed: ["confirmed", "refunded"],
    received: ["confirmed"],
    chargeback: ["disputed"],
  };

  const currentPaymentStatus = booking.paymentStatus || "pending";
  const allowedNextStates = VALID_PAYMENT_TRANSITIONS[currentPaymentStatus] || [];
  if (status === "cancelled" && !["pending", "failed"].includes(currentPaymentStatus)) {
    res.status(409).json({
      success: false,
      code: "INVALID_PAYMENT_STATE_FOR_CANCELLATION",
      message: `Cannot cancel a booking with payment status "${currentPaymentStatus}". Contact support if you need to refund this booking.`
    });
    return;
  }
  const direct = status === "cancelled" && ["pending", "failed"].includes(booking.paymentStatus) && booking.request
    ? await RequestModel.findById(booking.request).select("isDirect status acceptedOffer").lean() : null;
  let updated: typeof booking | null = null;
  if (direct?.isDirect && direct.status === "awaiting_payment") {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const released = await Bid.updateOne({ _id: booking.bid, status: "payment_pending", paymentOutcomeUnknown: { $ne: true }, checkoutStartedAt: { $exists: false } }, { $set: { status: "withdrawn" }, $unset: { paymentPendingExpiresAt: "", paymentReservationId: "" } }, { session });
        if (!released.matchedCount) throw Object.assign(new Error("A payment is processing or needs review. Contact support before cancelling."), { statusCode: 409, code: "PAYMENT_RECONCILIATION_REQUIRED" });
        const changed = await RequestModel.updateOne({ _id: direct._id, status: "awaiting_payment", acceptedOffer: booking.bid }, { $set: { status: "cancelled" } }, { session });
        if (!changed.matchedCount) throw Object.assign(new Error("Booking changed. Refresh and try again."), { statusCode: 409, code: "BOOKING_CHANGED" });
        updated = await Booking.findOneAndUpdate({ _id: booking._id, status: "upcoming", paymentStatus: { $in: ["pending", "failed"] } }, { $set: { status: "cancelled", cancelReason: typeof cancelReason === "string" ? cancelReason.slice(0, 500) : "Cancelled by participant" } }, { new: true, session });
        if (!updated) throw Object.assign(new Error("Booking changed. Refresh and try again."), { statusCode: 409, code: "BOOKING_CHANGED" });
      });
    } catch (error: any) { res.status(error?.statusCode || 500).json({ success: false, code: error?.code, message: error?.statusCode ? error.message : "Unable to cancel this booking." }); return; }
    finally { await session.endSession(); }
  } else {
    updated = await Booking.findOneAndUpdate(
      { _id: booking._id, status: "upcoming", ...(status === "ongoing" ? { paymentStatus: "confirmed" } : {}) },
      { $set: { status, ...(status === "cancelled" ? { cancelReason: typeof cancelReason === "string" ? cancelReason.slice(0, 500) : "Cancelled by participant" } : {}) } },
      { new: true }
    );
  }
  if (!updated) { res.status(409).json({ success: false, code: "BOOKING_CHANGED", message: "Booking status changed. Refresh and retry." }); return; }
  if (status === "cancelled") await BookedSlot.deleteMany({ booking: booking._id });
  await logAudit({ action: status === "cancelled" ? "booking_cancelled" : "booking_started", actor: req.user?.name, actorId: req.user?._id?.toString(), entity: "Booking", targetId: booking.id, metadata: { status, cancelReason } });
  const recipient = booking.student.toString() === userId?.toString() ? booking.tutor.toString() : booking.student.toString();
  await sendNotification(req.app.get("io"), recipient, { title: status === "cancelled" ? "Booking Cancelled" : "Booking Started", message: status === "cancelled" ? "The booking was cancelled. Review the cancellation policy or contact support if needed." : "Your tutoring booking is now in progress.", type: "booking", link: "/dashboard" });

  if (status === "cancelled") {
    try {
      const [studentUser, tutorUser] = await Promise.all([
        User.findById(booking.student).select("name email"),
        User.findById(booking.tutor).select("name email"),
      ]);
      if (studentUser && tutorUser) {
        const studentMail = bookingCancelledEmail(studentUser.name, tutorUser.name);
        const tutorMail = bookingCancelledEmail(tutorUser.name, studentUser.name);
        await Promise.all([
          sendEmail({ to: studentUser.email, subject: studentMail.subject, html: studentMail.html }),
          sendEmail({ to: tutorUser.email, subject: tutorMail.subject, html: tutorMail.html }),
        ]);
      }
    } catch (err) {
      console.error("Failed to send cancellation emails:", err);
    }
  }

  res.status(200).json({ success: true, message: "Booking status updated", booking: updated });
};

// @desc    Build a prefilled repeat-booking request from a completed booking
// @route   POST /api/bookings/:id/book-again
// @access  Private (student or booking parent)
export const bookAgainFromBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== "student" && req.user?.role !== "parent") {
    res.status(403).json({ success: false, message: "Only students or the linked parent can rebook a tutor from a completed booking." });
    return;
  }

  const booking = await Booking.findOne({
    _id: req.params.id,
    ...(req.user?.role === "parent" ? { parent: req.user._id } : { student: req.user._id }),
  })
    .populate("tutor", "name")
    .populate("request", "subject level description curriculum classGrade examType learningObjectives countryCode countryName city area schedule teachingMode currency pricingUnit preferredDays preferredStartTime sessionDurationMinutes sessionsPerWeek");

  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found." });
    return;
  }

  if (booking.status !== "completed") {
    res.status(400).json({
      success: false,
      code: "BOOKING_NOT_COMPLETED",
      message: "Book Again becomes available after a session is completed.",
    });
    return;
  }

  const request = booking.request as any;
  const tutor = booking.tutor as any;
  const prefill = {
    tutorId: tutor?._id?.toString?.() || booking.tutor.toString(),
    tutorName: tutor?.name || "Tutor",
    subject: request?.subject || "Tutoring",
    level: request?.level || "Other",
    description: request?.description || request?.learningObjectives || `Continue learning with ${tutor?.name || "this tutor"}.`,
    curriculum: request?.curriculum || "",
    classGrade: request?.classGrade || "",
    examType: request?.examType || "",
    learningObjectives: request?.learningObjectives || "",
    teachingMode: booking.teachingMode || request?.teachingMode || "online",
    countryCode: request?.countryCode || "PK",
    countryName: request?.countryName || "Pakistan",
    city: request?.city || "",
    area: request?.area || "",
    schedule: request?.schedule || booking.schedule || "",
    preferredDays: request?.preferredDays || [],
    preferredStartTime: request?.preferredStartTime || "",
    sessionDurationMinutes: request?.sessionDurationMinutes || 60,
    sessionsPerWeek: request?.sessionsPerWeek || 1,
    budget: booking.finalAgreedRate || booking.amount,
    currency: request?.currency || "USD",
    pricingUnit: booking.pricingUnit || request?.pricingUnit || "hour",
    allowCounterOffers: true,
    sourceBookingId: booking._id.toString(),
    rebooking: true,
  };

  await AbandonedJourney.findOneAndUpdate(
    { user: req.user._id, type: "direct_booking", completedAt: { $exists: false } },
    { $set: { data: prefill }, $setOnInsert: { user: req.user._id, type: "direct_booking", remindersSent: [] } },
    { upsert: true }
  );

  await syncStudentTutorRelationship(booking as any);
  await logAudit({
    action: "book_again_started",
    actor: req.user.name,
    actorId: req.user._id?.toString(),
    entity: "Booking",
    targetId: booking.id,
    metadata: { tutor: prefill.tutorId, subject: prefill.subject },
  });

  res.status(200).json({
    success: true,
    message: "Repeat booking details prepared.",
    prefill,
    redirectTo: "/post-tuition-request",
  });
};

// @desc    Propose a new date/time for an upcoming booking
// @route   POST /api/bookings/:id/reschedule
// @access  Private (student or tutor party to the booking)
export const proposeReschedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const role = req.user?.role as "student" | "tutor" | "parent";
  const { proposedStartAt, proposedEndAt, note } = req.body;

  if (!proposedStartAt || !proposedEndAt) {
    res.status(400).json({ success: false, message: "proposedStartAt and proposedEndAt are required." });
    return;
  }
  const start = new Date(proposedStartAt);
  const end = new Date(proposedEndAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ success: false, message: "Invalid date values." });
    return;
  }

  const now = new Date();
  if (start <= now) {
    res.status(400).json({ success: false, message: "The proposed start time must be in the future." });
    return;
  }
  if (end <= start) {
    res.status(400).json({ success: false, message: "End time must be after start time." });
    return;
  }

  const durationMs = end.getTime() - start.getTime();
  const MIN_SESSION_MS = 15 * 60 * 1000;
  const MAX_SESSION_MS = 8 * 60 * 60 * 1000;
  if (durationMs < MIN_SESSION_MS) {
    res.status(400).json({ success: false, message: "Session must be at least 15 minutes." });
    return;
  }
  if (durationMs > MAX_SESSION_MS) {
    res.status(400).json({ success: false, message: "Session cannot exceed 8 hours." });
    return;
  }

  const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
  if (start.getTime() - now.getTime() > SIX_MONTHS_MS) {
    res.status(400).json({ success: false, message: "Reschedule cannot be more than 6 months in the future." });
    return;
  }

  const booking = await Booking.findOne({
    _id: req.params.id,
    $or: [{ student: userId }, { tutor: userId }],
    status: "upcoming",
    paymentStatus: "confirmed",
  });
  if (!booking) {
    res.status(404).json({ success: false, message: "Upcoming confirmed booking not found." });
    return;
  }

  const isStudent = booking.student.toString() === userId?.toString();
  const isTutor = booking.tutor.toString() === userId?.toString();
  if (!isStudent && !isTutor) {
    res.status(403).json({ success: false, message: "You are not a party to this booking." });
    return;
  }
  if (role !== "student" && role !== "tutor") {
    res.status(403).json({ success: false, message: "Only students and tutors can propose a reschedule." });
    return;
  }

  booking.rescheduleProposal = {
    proposedBy: userId!,
    proposedByRole: role,
    proposedStartAt: start,
    proposedEndAt: end,
    proposedAt: new Date(),
    note: typeof note === "string" ? note.slice(0, 500) : undefined,
  };
  await booking.save({ validateModifiedOnly: true });

  const recipientId = isStudent ? booking.tutor.toString() : booking.student.toString();
  await sendNotification(req.app.get("io"), recipientId, {
    title: "Reschedule Requested",
    message: `${req.user?.name} has proposed a new session time. Please accept or decline.`,
    type: "booking",
    link: "/dashboard",
  });

  await logAudit({
    action: "booking_reschedule_proposed",
    actor: req.user?.name,
    actorId: userId?.toString(),
    entity: "Booking",
    targetId: booking._id.toString(),
    metadata: { proposedStartAt: start, proposedEndAt: end, role },
  });

  res.status(200).json({ success: true, message: "Reschedule proposal sent to the other party.", booking });
};

// @desc    Accept a pending reschedule proposal
// @route   POST /api/bookings/:id/reschedule/accept
// @access  Private (the party who did NOT propose)
export const acceptReschedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;

  const booking = await Booking.findOne({
    _id: req.params.id,
    $or: [{ student: userId }, { tutor: userId }],
    status: "upcoming",
    "rescheduleProposal.proposedBy": { $exists: true },
  });
  if (!booking?.rescheduleProposal) {
    res.status(404).json({ success: false, message: "No pending reschedule proposal found for this booking." });
    return;
  }

  if (booking.rescheduleProposal.proposedBy.toString() === userId?.toString()) {
    res.status(400).json({ success: false, message: "You cannot accept your own reschedule proposal." });
    return;
  }

  const { proposedStartAt, proposedEndAt, proposedBy } = booking.rescheduleProposal;
  const proposerId = proposedBy?.toString() ??
    (booking.student.toString() === userId?.toString() ? booking.tutor.toString() : booking.student.toString());
  booking.scheduledStartAt = proposedStartAt;
  booking.scheduledEndAt = proposedEndAt;
  booking.rescheduleProposal = undefined;
  await booking.save({ validateModifiedOnly: true });
  await sendNotification(req.app.get("io"), proposerId, {
    title: "Reschedule Accepted",
    message: `Your reschedule proposal was accepted. The session is now rescheduled.`,
    type: "booking",
    link: "/dashboard",
  });

  await logAudit({
    action: "booking_reschedule_accepted",
    actor: req.user?.name,
    actorId: userId?.toString(),
    entity: "Booking",
    targetId: booking._id.toString(),
    metadata: { newStartAt: proposedStartAt, newEndAt: proposedEndAt },
  });

  res.status(200).json({ success: true, message: "Session rescheduled successfully.", booking });
};

// @desc    Reject a pending reschedule proposal
// @route   POST /api/bookings/:id/reschedule/reject
// @access  Private (the party who did NOT propose)
export const rejectReschedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;

  const booking = await Booking.findOne({
    _id: req.params.id,
    $or: [{ student: userId }, { tutor: userId }],
    "rescheduleProposal.proposedBy": { $exists: true },
  });
  if (!booking?.rescheduleProposal) {
    res.status(404).json({ success: false, message: "No pending reschedule proposal found." });
    return;
  }
  if (booking.rescheduleProposal.proposedBy.toString() === userId?.toString()) {
    res.status(400).json({ success: false, message: "You cannot reject your own proposal. Cancel it instead by proposing a new time." });
    return;
  }

  const proposerId = booking.rescheduleProposal.proposedBy.toString();
  booking.rescheduleProposal = undefined;
  await booking.save({ validateModifiedOnly: true });

  await sendNotification(req.app.get("io"), proposerId, {
    title: "Reschedule Declined",
    message: `Your reschedule proposal was declined. The original session time remains.`,
    type: "booking",
    link: "/dashboard",
  });

  await logAudit({
    action: "booking_reschedule_rejected",
    actor: req.user?.name,
    actorId: userId?.toString(),
    entity: "Booking",
    targetId: booking._id.toString(),
  });

  res.status(200).json({ success: true, message: "Reschedule proposal declined. Original time stands." });
};

// @desc    Student raises a dispute on a booking
// @route   POST /api/bookings/:id/dispute
// @access  Private (student)
export const raiseBookingDispute = async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason, details } = req.body;
  const userId = req.user?._id;

  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    res.status(400).json({ success: false, message: "Please provide a reason for the dispute (min 5 characters)." });
    return;
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found." });
    return;
  }

  const isStudent = booking.student.toString() === userId?.toString();
  const isTutor = booking.tutor.toString() === userId?.toString();
  if (!isStudent && !isTutor) {
    res.status(403).json({ success: false, message: "You are not a party to this booking." });
    return;
  }

  if (["cancelled"].includes(booking.status)) {
    res.status(400).json({ success: false, message: "Disputes cannot be raised on cancelled bookings." });
    return;
  }

  const existingCase = await SafetyCase.findOne({ booking: booking._id });
  if (existingCase) {
    res.status(409).json({ success: false, message: "A dispute is already open for this booking.", caseId: existingCase.caseId });
    return;
  }

  const reportedUserId = isStudent ? booking.tutor : booking.student;
  const caseId = `SC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const safetyCase = await SafetyCase.create({
    caseId,
    reporter: userId,
    reportedUser: reportedUserId,
    booking: booking._id,
    category: "student_protection",
    severity: "medium",
    evidence: details ? [{ type: "message", note: details.slice(0, 2000), submittedAt: new Date() }] : [],
    internalNotes: [{ author: userId, text: `Dispute raised by ${isStudent ? "student" : "tutor"}: ${reason.trim()}`, createdAt: new Date() }],
  });

  await Booking.findByIdAndUpdate(booking._id, { $set: { paymentStatus: "disputed" } });

  await logAudit({
    action: "booking_dispute_raised",
    actor: req.user?.name ?? "Unknown",
    actorId: userId?.toString(),
    entity: "Booking",
    targetId: booking._id.toString(),
    metadata: { caseId, reason: reason.trim() },
  });

  res.status(201).json({
    success: true,
    message: "Dispute raised. Our team will review it within 24–48 hours.",
    caseId: safetyCase.caseId,
  });
};
