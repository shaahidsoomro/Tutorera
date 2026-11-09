import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types";
import Booking from "../models/Booking.model";
import PDFDocument from "pdfkit";
import User from "../models/User.model";
import sendEmail from "../utils/sendEmail";
import { renderTransactionalEmail } from "../utils/emailBrand";
import { sendNotification } from "../utils/socket";
import logger from "../config/logger";
import StudentTutorRelationship from "../models/StudentTutorRelationship.model";
import { generateTutorPayoutReport, resolvePayoutReportPeriod } from "../services/payoutReport.service";

// @desc    Get my earnings (tutor) or progress (student)
// @route   GET /api/earnings
// @access  Private (student | tutor)
export const getMyEarnings = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const role   = req.user?.role;

  if (!["tutor", "student"].includes(role || "")) {
    res.status(403).json({ success: false, message: "Access denied." });
    return;
  }

  // ── TUTOR ─────────────────────────────────────────────────────────────────
  if (role === "tutor") {
    const completedBookings = await Booking.find({
      tutor: userId,
      status: "completed",
      paymentStatus: "confirmed",
    })
      .populate("student", "name avatar")
      .populate("request", "subject level")
      .sort("-createdAt");

    const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.tutorPayout || 0), 0);
    const sessionsCount = completedBookings.length;
    const hoursTaught   = sessionsCount; // 1 hr per session

    // ── On-hold payments: completed + payment confirmed, but not yet paid out ──
    const onHoldBookings = completedBookings.filter(b => b.payoutStatus === "pending");
    const onHoldAmount = onHoldBookings.reduce((sum, b) => sum + (b.tutorPayout || 0), 0);
    const onHoldCount = onHoldBookings.length;

    // Subjects taught breakdown
    const subjectMap: Record<string, number> = {};
    for (const b of completedBookings) {
      const req  = b.request as unknown as { subject?: string } | null;
      const subj = req?.subject || "General";
      subjectMap[subj] = (subjectMap[subj] || 0) + 1;
    }
    const subjectBreakdown = Object.entries(subjectMap)
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);

    // Monthly earnings — last 6 months
    const now = new Date();
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthBkgs  = completedBookings.filter(b => {
        const d = new Date(b.createdAt as unknown as string);
        return d >= monthStart && d < monthEnd;
      });
      monthlyData.push({
        month:    monthStart.toLocaleDateString("en-PK", { month: "short", year: "2-digit" }),
        earnings: monthBkgs.reduce((sum, b) => sum + (b.tutorPayout || 0), 0),
        sessions: monthBkgs.length,
      });
    }

    // Recent 5 sessions
    const recentSessions = completedBookings.slice(0, 5).map(b => ({
      _id:         b._id,
      studentName: (b.student as unknown as { name: string } | null)?.name || "Student",
      subject:     (b.request as unknown as { subject?: string } | null)?.subject || "General",
      amount:      b.amount,
      tutorPayout: b.tutorPayout,
      createdAt:   b.createdAt,
    }));

    // Tutor retention metrics — how many students rebook
    const tutorRelationships = await StudentTutorRelationship.find({ tutor: userId });
    const repeatStudents = tutorRelationships.filter(r => r.repeatBookingCount > 0);
    const rebookRate = tutorRelationships.length > 0
      ? Math.round((repeatStudents.length / tutorRelationships.length) * 100)
      : 0;
    const repeatStudentCount = repeatStudents.length;

    const tutorRetentionStats = {
      totalStudentsWorkedWith: tutorRelationships.length,
      repeatStudentCount,
      rebookRate,
    };

    res.status(200).json({
      success: true,
      role: "tutor",
      stats: {
        totalEarnings,
        sessionsCount,
        hoursTaught,
        subjectsCount: Object.keys(subjectMap).length,
        onHoldAmount,
        onHoldCount,
      },
      monthlyData,
      subjectBreakdown,
      recentSessions,
      tutorRetentionStats,
    });
    return;
  }

  // ── STUDENT ───────────────────────────────────────────────────────────────
  const completedBookings = await Booking.find({
    student: userId,
    status:  "completed",
  })
    .populate("tutor",   "name avatar")
    .populate("request", "subject level")
    .sort("-createdAt");

  const sessionsCount = completedBookings.length;
  const hoursLearned  = sessionsCount; // 1 hr per session
  const totalSpent    = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

  // Subjects learned
  const subjectMap: Record<string, number> = {};
  for (const b of completedBookings) {
    const req  = b.request as unknown as { subject?: string } | null;
    const subj = req?.subject || "General";
    subjectMap[subj] = (subjectMap[subj] || 0) + 1;
  }
  const subjectBreakdown = Object.entries(subjectMap)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);

  // Tutors worked with
  const tutorMap: Record<string, { name: string; sessions: number }> = {};
  for (const b of completedBookings) {
    const tutor = b.tutor as unknown as { _id: { toString(): string }; name: string } | null;
    if (!tutor) continue;
    const id = tutor._id.toString();
    if (!tutorMap[id]) tutorMap[id] = { name: tutor.name, sessions: 0 };
    tutorMap[id].sessions++;
  }
  const tutorsWorkedWith = Object.values(tutorMap).sort((a, b) => b.sessions - a.sessions);

  // Monthly sessions — last 6 months
  const now = new Date();
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthBkgs  = completedBookings.filter(b => {
      const d = new Date(b.createdAt as unknown as string);
      return d >= monthStart && d < monthEnd;
    });
    monthlyData.push({
      month:    monthStart.toLocaleDateString("en-PK", { month: "short", year: "2-digit" }),
      sessions: monthBkgs.length,
      spent:    monthBkgs.reduce((sum, b) => sum + (b.amount || 0), 0),
    });
  }

  // Recent 5 sessions
  const recentSessions = completedBookings.slice(0, 5).map(b => ({
    _id:       b._id,
    tutorName: (b.tutor as unknown as { name: string } | null)?.name || "Tutor",
    subject:   (b.request as unknown as { subject?: string } | null)?.subject || "General",
    amount:    b.amount,
    createdAt: b.createdAt,
  }));

  // Student retention metrics from relationship model
  const relationships = await StudentTutorRelationship.find({ student: userId });
  const repeatRelationships = relationships.filter(r => r.repeatBookingCount > 0);
  const retentionRate = relationships.length > 0
    ? Math.round((repeatRelationships.length / relationships.length) * 100)
    : 0;

  const retentionStats = {
    totalRelationships: relationships.length,
    repeatRelationships: repeatRelationships.length,
    retentionRate,
  };

  res.status(200).json({
    success: true,
    role: "student",
    stats: {
      sessionsCount,
      hoursLearned,
      subjectsCount:  Object.keys(subjectMap).length,
      tutorsCount:    Object.keys(tutorMap).length,
      totalSpent,
    },
    monthlyData,
    subjectBreakdown,
    tutorsWorkedWith,
    recentSessions,
    retentionStats,
  });
};

// @desc    Download tutor's earnings/progress report as PDF
// @route   GET /api/earnings/report/pdf
// @access  Private (tutor)
export const downloadEarningsPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;

  if (req.user?.role !== "tutor") {
    res.status(403).json({ success: false, message: "Only tutors can download this report." });
    return;
  }

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized." });
    return;
  }

  const tutorUser = await User.findById(userId).select("name email");
  if (!tutorUser) {
    res.status(404).json({ success: false, message: "Tutor not found." });
    return;
  }

  try {
    const { periodStart, periodEnd } = resolvePayoutReportPeriod(req.query.from, req.query.to);

    const { data: reportData, pdfBuffer } = await generateTutorPayoutReport(userId.toString(), periodStart, periodEnd, { userId: userId.toString(), role: "tutor" });

    const filename = `tutorera-payout-report-${reportData.reportId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Failed to generate payout report:", error);
    res.status(error?.statusCode || 500).json({ success: false, message: error?.statusCode ? error.message : "Failed to generate payout report." });
  }
};

// @desc    Tutor requests payout for a completed booking
// @route   POST /api/earnings/payouts/:bookingId/request
// @access  Private (tutor)
// @desc    List bookings eligible for payout request
// @route   GET /api/earnings/payouts/eligible
// @access  Private (tutor)
export const getEligiblePayouts = async (req: AuthRequest, res: Response): Promise<void> => {
  const tutorId = req.user?._id;
  const eligible = await Booking.find({
    tutor: tutorId, status: "completed", paymentStatus: "confirmed",
    payoutStatus: "pending", payoutRequestedAt: { $exists: false },
  })
    .populate("request", "subject")
    .select("_id tutorPayout tutorNet currency completedAt request student")
    .populate("student", "name")
    .sort("-completedAt")
    .limit(50)
    .lean();
  res.status(200).json({ success: true, bookings: eligible });
};

export const requestPayout = async (req: AuthRequest, res: Response): Promise<void> => {
  const { bookingId } = req.params;
  const tutorId = req.user?._id;
  if (!mongoose.isValidObjectId(bookingId)) { res.status(404).json({ success: false, message: "Booking not found." }); return; }

  const booking = await Booking.findOneAndUpdate({
    _id: bookingId, tutor: tutorId, status: "completed", paymentStatus: "confirmed",
    payoutStatus: "pending", payoutRequestedAt: { $exists: false },
  }, {
    $set: { payoutRequestedAt: new Date(), payoutNote: "Tutor submitted payout request; awaiting finance approval" },
  }, { new: true });

  if (!booking) {
    // Another tutor's (or a nonexistent) booking looks identical: 404, never a hint that it exists.
    const owned = await Booking.exists({ _id: bookingId, tutor: tutorId });
    if (!owned) { res.status(404).json({ success: false, message: "Booking not found." }); return; }
    res.status(409).json({ success: false, code: "PAYOUT_NOT_ELIGIBLE", message: "Payout was already requested or the session is not eligible." });
    return;
  }

  const tutorUser = await User.findById(tutorId).select("name email");
  if (tutorUser) {
    try {
      const html = renderTransactionalEmail({
        subject: "TUTORERA® — Payout Request Received", emailCategory: "Payout",
        emailHeading: "Payout Request Received", emailSubheading: "Awaiting finance review",
        firstName: tutorUser.name,
        openingMessage: `We received your payout request for ${booking.currency || "PKR"} ${booking.tutorPayout.toLocaleString()}.`,
        mainMessage: "No transfer has been initiated or completed. Finance will review your request and confirm settlement separately.",
        includeSecurityNotice: true,
      });
      await sendEmail({ to: tutorUser.email, subject: "TUTORERA® — Payout Request Received", html,
        eventType: "payout.requested", relatedEntityType: "Booking", relatedEntityId: booking._id.toString() });
    } catch (err) { logger.error({ err, bookingId: booking._id }, "Failed to send payout request email"); }
  }

  res.status(200).json({ success: true, message: "Payout request submitted successfully.", booking });
};

// @desc    Get my payout history (tutor)
// @route   GET /api/earnings/payouts
// @access  Private (tutor)
export const getMyPayouts = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== "tutor") {
    res.status(403).json({ success: false, message: "Only tutors can view payout history." });
    return;
  }
  const tutorId = req.user?._id;
  const { page = "1", limit = "20", status } = req.query;
  const allowedStatuses = new Set(["all", "pending", "approved", "processing", "paid", "failed", "held"]);
  if (status && !allowedStatuses.has(String(status))) {
    res.status(400).json({ success: false, message: "Invalid payout status." });
    return;
  }

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {
    tutor: tutorId,
    status: "completed",
    paymentStatus: "confirmed",
  };

  if (status && status !== "all") {
    filter.payoutStatus = status;
  }

  const [total, payouts, summaryRows] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
    .populate("student", "name")
    .populate("request", "subject level")
    .sort("-createdAt")
    .skip(skip)
    .limit(limitNum)
    .lean(),
    Booking.find(filter).select("payoutStatus tutorPayout").lean(),
  ]);

  const totalPayoutAmount = summaryRows.reduce((sum, b) => sum + (b.tutorPayout || 0), 0);
  const pendingAmount = summaryRows.filter(b => ["pending", "approved", "processing", "held"].includes(b.payoutStatus)).reduce((sum, b) => sum + (b.tutorPayout || 0), 0);
  const paidAmount = summaryRows.filter(b => b.payoutStatus === "paid").reduce((sum, b) => sum + (b.tutorPayout || 0), 0);

  res.status(200).json({
    success: true,
    stats: {
      totalPayouts: total,
      totalPayoutAmount,
      pendingAmount,
      paidAmount,
    },
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum },
    payouts: payouts.map(p => ({
      _id: p._id,
      studentName: (p.student as unknown as { name?: string } | null)?.name || "Student",
      subject: (p.request as unknown as { subject?: string } | null)?.subject || "General",
      amount: p.amount,
      currency: "PKR",
      subtotal: p.subtotal,
      tutorFee: p.tutorFee,
      tax: p.tax,
      tutorNet: p.tutorNet,
      tutorPayout: p.tutorPayout,
      payoutStatus: p.payoutStatus,
      payoutNote: p.payoutNote,
      payoutRequestedAt: p.payoutRequestedAt,
      payoutApprovedAt: p.payoutApprovedAt,
      payoutProcessingAt: p.payoutProcessingAt,
      payoutPaidAt: p.payoutPaidAt,
      payoutFailedAt: p.payoutFailedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  });
};
