import { Response } from "express";
import { AuthRequest } from "../types";
import LearningProgress from "../models/LearningProgress.model";
import Booking from "../models/Booking.model";
import { logAudit } from "../utils/logAudit";
import { sendNotification } from "../utils/socket";

// @desc    Tutor submits a progress report for a booking session
// @route   POST /api/bookings/:id/progress-reports
// @access  Private (tutor)
export const submitProgressReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const { topicsCovered, homework, attendanceStatus, tutorNotes, studentMood, nextSessionGoals, sessionDate } = req.body;
  const tutorId = req.user?._id;

  if (!topicsCovered || !Array.isArray(topicsCovered) || topicsCovered.length === 0) {
    res.status(400).json({ success: false, message: "At least one topic covered is required." });
    return;
  }

  const booking = await Booking.findOne({ _id: req.params.id, tutor: tutorId });
  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found or you are not the tutor." });
    return;
  }

  if (!["ongoing", "completed", "upcoming"].includes(booking.status)) {
    res.status(400).json({ success: false, message: "Progress reports can only be filed for active or completed bookings." });
    return;
  }

  const existingCount = await LearningProgress.countDocuments({ booking: booking._id });

  const report = await LearningProgress.create({
    booking: booking._id,
    tutor: tutorId,
    student: booking.student,
    sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
    sessionNumber: existingCount + 1,
    topicsCovered: topicsCovered.map((t: string) => t.trim().slice(0, 200)).filter(Boolean),
    homework: homework?.trim().slice(0, 1000),
    attendanceStatus: attendanceStatus || "present",
    tutorNotes: tutorNotes?.trim().slice(0, 2000),
    studentMood,
    nextSessionGoals: nextSessionGoals?.trim().slice(0, 500),
  });

  await logAudit({
    action: "progress_report_submitted",
    actor: req.user?.name,
    actorId: tutorId?.toString(),
    entity: "Booking",
    targetId: booking._id.toString(),
    metadata: { reportId: report._id.toString(), sessionNumber: report.sessionNumber },
  });

  await sendNotification(req.app.get("io"), booking.student.toString(), {
    title: "Session Report Available",
    message: `Your tutor filed a progress report for session #${report.sessionNumber}.`,
    type: "booking",
    link: `/dashboard?tab=bookings`,
  });

  res.status(201).json({ success: true, report });
};

// @desc    Get all progress reports for a booking
// @route   GET /api/bookings/:id/progress-reports
// @access  Private (student, tutor, or parent of booking)
export const getProgressReports = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const role = req.user?.role;

  const booking = await Booking.findOne({
    _id: req.params.id,
    $or: [{ student: userId }, { tutor: userId }, { parent: userId }],
  });

  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found." });
    return;
  }

  const reports = await LearningProgress.find({ booking: booking._id })
    .populate("tutor", "name avatar")
    .sort("sessionDate");

  // Tutors see their own full notes; students/parents get redacted tutor-only internal notes
  const sanitized = reports.map(r => {
    const obj = r.toObject() as unknown as Record<string, unknown>;
    if (role !== "tutor") delete obj.tutorNotes;
    return obj;
  });

  res.status(200).json({
    success: true,
    total: reports.length,
    reports: sanitized,
    summary: {
      totalSessions: reports.length,
      attended: reports.filter(r => r.attendanceStatus === "present").length,
      absent: reports.filter(r => r.attendanceStatus === "absent").length,
      allTopics: [...new Set(reports.flatMap(r => r.topicsCovered))],
    },
  });
};

// @desc    Student rates a session report (mood feedback)
// @route   PATCH /api/bookings/:bookingId/progress-reports/:reportId/mood
// @access  Private (student)
export const setStudentMood = async (req: AuthRequest, res: Response): Promise<void> => {
  const { mood } = req.body;
  const validMoods = ["great", "good", "okay", "struggling"];
  if (!mood || !validMoods.includes(mood)) {
    res.status(400).json({ success: false, message: `mood must be one of: ${validMoods.join(", ")}` });
    return;
  }

  const userId = req.user?._id;
  const booking = await Booking.findOne({ _id: req.params.bookingId, student: userId });
  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found." });
    return;
  }

  const report = await LearningProgress.findOneAndUpdate(
    { _id: req.params.reportId, booking: booking._id },
    { $set: { studentMood: mood } },
    { new: true }
  );

  if (!report) {
    res.status(404).json({ success: false, message: "Report not found." });
    return;
  }

  res.status(200).json({ success: true, report });
};
