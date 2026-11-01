import mongoose from "mongoose";
import { Response } from "express";
import { AuthRequest } from "../types";
import ParentProfile from "../models/ParentProfile.model";
import User from "../models/User.model";
import StudentProfile from "../models/StudentProfile.model";
import Booking from "../models/Booking.model";
import { advanceAccountStatus } from "../services/accountLifecycle.service";
import ParentLinkRequest from "../models/ParentLinkRequest.model";
import ParentBookingApproval from "../models/ParentBookingApproval.model";
import Bid from "../models/Bid.model";
import RequestModel from "../models/Request.model";
import sendEmail from "../utils/sendEmail";
import crypto from "crypto";
import mongoose from "mongoose";
import { escapeHtml } from "../utils/escapeHtml";
import GuardianConsent from "../models/GuardianConsent.model";
import { resolveMarketplaceFees } from "../services/pricing.service";

const LINK_CODE_TTL_MS = 15 * 60 * 1000;
const MAX_LINK_ATTEMPTS = 5;

function linkCodeHash(code: string) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET || "parent-link-fallback")
    .update(code)
    .digest("hex");
}

export const getMyParentProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== "parent") {
    res.status(403).json({ success: false, message: "Access denied." });
    return;
  }

  let profile = await ParentProfile.findOne({ user: req.user._id }).lean();

  if (!profile) {
    profile = await ParentProfile.create({ user: req.user._id, children: [] });
  }

  const childUserIds = (profile as any).children.map((c: any) => c.studentUser);

  const childBookings = childUserIds.length > 0
    ? await Booking.find({ student: { $in: childUserIds } })
        .populate("tutor", "name")
        .populate("request", "subject")
        .sort("-createdAt")
        .limit(20)
        .lean()
    : [];

  const childProfiles = await StudentProfile.find({ user: { $in: childUserIds } }).lean();
  const childMap: Record<string, any> = {};
  for (const cp of childProfiles) childMap[cp.user.toString()] = cp;

  res.status(200).json({
    success: true,
    profile: {
      ...profile,
      children: (profile as any).children.map((c: any) => ({
        ...c,
        studentProfile: childMap[c.studentUser?.toString()] || null,
      })),
    },
    recentBookings: childBookings.map((b: any) => ({
      _id: b._id,
      studentName: (b.student as any)?.name || "Student",
      tutorName: (b.tutor as any)?.name || "Tutor",
      subject: (b.request as any)?.subject || "Tutoring",
      amount: b.amount,
      status: b.status,
      teachingMode: b.teachingMode,
      createdAt: b.createdAt,
    })),
  });
};

export const addChildAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== "parent") {
    res.status(403).json({ success: false, message: "Access denied." });
    return;
  }

  const { studentEmail, name, level, subjects, relationship } = req.body;

  if (!studentEmail || !name) {
    res.status(400).json({ success: false, message: "Student email and name are required." });
    return;
  }

  const normalizedEmail = String(studentEmail).trim().toLowerCase();
  const student = await User.findOne({ email: normalizedEmail });
  if (!student || student.role !== "student") {
    res.status(404).json({ success: false, message: "Student account not found." });
    return;
  }
  // The legacy link flow verifies control of the STUDENT mailbox. That
  // cannot grant supervisory access to an underage student's account; their
  // separate parent mailbox must complete the adult-consent workflow.
  if (student.isMinor) {
    res.status(403).json({ success: false, code: "GUARDIAN_CONSENT_FLOW_REQUIRED",
      message: "An underage student must be linked through verified guardian consent." });
    return;
  }

  let profile = await ParentProfile.findOne({ user: req.user._id });
  if (!profile) {
    profile = await ParentProfile.create({ user: req.user._id, children: [] });
  }

  const alreadyLinked = profile.children.some(
    (c) => c.studentUser?.toString() === student._id.toString()
  );
  if (alreadyLinked) {
    res.status(409).json({ success: false, message: "This student account is already linked." });
    return;
  }

  await ParentLinkRequest.updateMany(
    { parent: req.user._id, student: student._id, status: "pending" },
    { status: "cancelled" }
  );

  const code = crypto.randomInt(100000, 1000000).toString();
  const linkRequest = await ParentLinkRequest.create({
    parent: req.user._id,
    student: student._id,
    codeHash: linkCodeHash(code),
    name: String(name).trim().slice(0, 100),
    level: String(level || "").trim().slice(0, 100),
    subjects: Array.isArray(subjects) ? subjects.map((item) => String(item).trim()).filter(Boolean).slice(0, 12) : [],
    relationship: ["child", "sibling", "other"].includes(relationship) ? relationship : "child",
    expiresAt: new Date(Date.now() + LINK_CODE_TTL_MS),
  });

  try {
    await sendEmail({
      to: student.email,
      userId: student._id.toString(),
      eventType: "account.parent_link_verification_requested",
      templateId: "parent_link_verification_code",
      relatedEntityType: "ParentLinkRequest",
      relatedEntityId: linkRequest._id.toString(),
      subject: "TUTORERA® — Confirm parent account access",
      preheader: "Use this code only if you approve parent access to your tutoring account.",
      html: `<h2>Confirm parent account access</h2><p>Hello ${escapeHtml(student.name)},</p><p>A parent account requested access to view and manage your TUTORERA tutoring activity.</p><p style="font-size:28px;font-weight:800;letter-spacing:6px">${code}</p><p>This code expires in 15 minutes. Share it only if you approve this access. If you did not expect this request, do not share the code.</p>`,
    });
  } catch (error) {
    await ParentLinkRequest.findByIdAndUpdate(linkRequest._id, { status: "cancelled" });
    throw error;
  }

  res.status(202).json({ success: true, message: "A verification code was sent to the student.", requestId: linkRequest._id, expiresInSeconds: LINK_CODE_TTL_MS / 1000 });
};

export const confirmChildAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== "parent") {
    res.status(403).json({ success: false, message: "Access denied." });
    return;
  }

  const { requestId, code } = req.body;
  if (!mongoose.isValidObjectId(requestId) || !/^\d{6}$/.test(String(code || ""))) {
    res.status(400).json({ success: false, message: "A valid request and six-digit code are required." });
    return;
  }

  const linkRequest = await ParentLinkRequest.findOne({
    _id: requestId,
    parent: req.user._id,
    status: "pending",
  }).select("+codeHash");

  if (!linkRequest || linkRequest.expiresAt <= new Date() || linkRequest.attempts >= MAX_LINK_ATTEMPTS) {
    res.status(410).json({ success: false, message: "This verification request has expired. Request a new code." });
    return;
  }
  // Recheck during confirmation too: a request sent while an account was
  // marked adult may outlive its later classification as a minor.
  const studentForLink = await User.findById(linkRequest.student).select("role isMinor");
  if (!studentForLink || studentForLink.role !== "student" || studentForLink.isMinor) {
    res.status(403).json({ success: false, code: "GUARDIAN_CONSENT_FLOW_REQUIRED",
      message: "This link cannot be confirmed through the student-email pathway." });
    return;
  }

  const suppliedHash = linkCodeHash(String(code));
  const matches = crypto.timingSafeEqual(Buffer.from(linkRequest.codeHash, "hex"), Buffer.from(suppliedHash, "hex"));
  if (!matches) {
    linkRequest.attempts += 1;
    await linkRequest.save();
    res.status(400).json({ success: false, message: "The verification code is incorrect.", attemptsRemaining: Math.max(0, MAX_LINK_ATTEMPTS - linkRequest.attempts) });
    return;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const currentStudent = await User.findById(linkRequest.student).select("role isMinor").session(session);
      if (!currentStudent || currentStudent.role !== "student" || currentStudent.isMinor) {
        throw Object.assign(new Error("Underage student link requires verified guardian consent."), {
          statusCode: 403, code: "GUARDIAN_CONSENT_FLOW_REQUIRED",
        });
      }
      const profile = await ParentProfile.findOneAndUpdate(
        { user: req.user?._id, "children.studentUser": { $ne: linkRequest.student } },
        { $push: { children: { studentUser: linkRequest.student, name: linkRequest.name, level: linkRequest.level, subjects: linkRequest.subjects, relationship: linkRequest.relationship } } },
        { new: true, upsert: true, session }
      );
      if (!profile) throw Object.assign(new Error("This student account is already linked."), { statusCode: 409 });
      linkRequest.status = "confirmed";
      linkRequest.confirmedAt = new Date();
      await linkRequest.save({ session });
    });
  } catch (error: any) {
    res.status(error?.statusCode || 500).json({ success: false,
      code: error?.code || "PARENT_LINK_CONFIRMATION_FAILED",
      message: error?.statusCode ? error.message : "Unable to safely confirm this student link." });
    return;
  } finally {
    await session.endSession();
  }

  res.status(200).json({ success: true, message: "Student consent confirmed. The account is now linked." });
};

export const removeChildAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== "parent") {
    res.status(403).json({ success: false, message: "Access denied." }); return;
  }
  const childId = req.params.childId;
  if (!mongoose.isValidObjectId(childId)) {
    res.status(400).json({ success: false, message: "Invalid linked student reference." }); return;
  }
  const session = await mongoose.startSession();
  let revokedStudentId: string | null = null;
  try {
    await session.withTransaction(async () => {
      const profile = await ParentProfile.findOne({ user: req.user?._id }).session(session);
      if (!profile) throw Object.assign(new Error("Parent profile not found."), { statusCode: 404 });
      const removed = profile.children.find(child => child._id?.toString() === childId);
      if (!removed) throw Object.assign(new Error("Linked student not found."), { statusCode: 404 });
      profile.children = profile.children.filter(child => child._id?.toString() !== childId);
      await profile.save({ session });
      // Removing the account's verified supervising parent and revoking
      // that minor's authorization must be one indivisible operation.
      const child = await User.findOneAndUpdate({
        _id: removed.studentUser, role: "student", isMinor: true,
        parentGuardianEmail: req.user?.email.toLowerCase(),
      }, { $set: { parentConsentVerified: false }, $unset: { guardianConsentVerifiedAt: "" } },
        { session, new: true });
      if (child) {
        await GuardianConsent.updateOne({ student: child._id },
          { $set: { status: "expired" } }, { session });
        revokedStudentId = child._id.toString();
      }
    });
    // Existing sockets authenticated before revocation are also disconnected.
    // HTTP requests already reread the student record on each request.
    if (revokedStudentId) {
      try { req.app.get("io")?.in(revokedStudentId).disconnectSockets(true); }
      catch (error) { console.error("[Safeguarding] Could not disconnect revoked student realtime session:", error); }
    }
    res.status(200).json({ success: true, message: "Child account unlinked; supervised access revoked where applicable." });
  } catch (error: any) {
    res.status(error?.statusCode || 500).json({ success: false,
      message: error?.statusCode ? error.message : "Unable to safely remove the guardian link." });
  } finally { await session.endSession(); }
};

export const getPendingBookingApprovals = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== "parent") { res.status(403).json({ success: false, message: "Parent access required." }); return; }
  const profile = await ParentProfile.findOne({ user: req.user._id }).select("children.studentUser").lean();
  const childIds = profile?.children.map(child => child.studentUser) || [];
  const approvals = await ParentBookingApproval.find({
    parent: req.user._id,
    student: { $in: childIds },
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).populate("request", "subject schedule teachingMode currency").populate({ path: "bid", select: "amount currency tutor", populate: { path: "tutor", select: "name" } })
    .sort("-createdAt").limit(50).lean();
  const result = approvals.filter(item => item.bid && item.request).map(item => ({
    _id: item._id, studentId: item.student, bidId: item.bid?._id,
    subject: (item.request as any).subject, schedule: (item.request as any).schedule,
    teachingMode: (item.request as any).teachingMode, amount: item.amount, currency: item.currency,
    tutorId: (item.bid as any).tutor?._id, tutorName: (item.bid as any).tutor?.name || "Tutor", expiresAt: item.expiresAt,
    createdAt: item.createdAt, status: item.status,
  }));
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, approvals: result });
};

export const decideBookingApproval = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== "parent") { res.status(403).json({ success: false, message: "Parent access required." }); return; }
  const { decision } = req.body || {};
  if (!["approved", "rejected"].includes(decision)) {
    res.status(400).json({ success: false, message: "Decision must be approved or rejected." }); return;
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: "Invalid approval identifier." }); return;
  }
  const approval = await ParentBookingApproval.findOne({
    _id: req.params.id, parent: req.user._id, status: "pending", expiresAt: { $gt: new Date() },
  });
  if (!approval) { res.status(409).json({ success: false, code: "APPROVAL_NOT_PENDING" }); return; }
  // Revoked guardian links must immediately revoke authority to approve.
  const linked = await ParentProfile.exists({ user: req.user._id, "children.studentUser": approval.student });
  if (!linked) { res.status(403).json({ success: false, code: "PARENT_LINK_REVOKED" }); return; }
  const [bid, request] = await Promise.all([
    Bid.findById(approval.bid).select("amount currency status expiresAt feeQuote request"),
    RequestModel.findById(approval.request).select("student status countryCode currency"),
  ]);
  if (!bid || !request || request.student.toString() !== approval.student.toString() ||
    !["open", "published", "receiving_offers", "negotiating", "awaiting_payment"].includes(request.status) ||
    !["pending", "submitted", "viewed", "countered", "payment_pending"].includes(bid.status) ||
    (bid.expiresAt && bid.expiresAt <= new Date())) {
    res.status(409).json({ success: false, code: "OFFER_NO_LONGER_AVAILABLE" }); return;
  }
  // Approval is consent for a specific checkout total, not merely a bid ID.
  // If the tutor changes the quote after the guardian opened this request,
  // invalidate the decision and require a fresh approval before settlement.
  // Parent requests are queued *before* checkout begins; at that point
  // Bid.feeQuote may not exist. Use the admin fee policy in that case, just
  // as the acceptance workflow does. Never quietly approve the raw bid rate
  // in place of the total the student will actually be charged.
  let currentTotal: number;
  try {
    currentTotal = bid.feeQuote?.studentTotal ??
      (await resolveMarketplaceFees(bid.amount, request.countryCode || "PK")).studentTotal;
  } catch {
    res.status(422).json({ success: false, code: "PARENT_APPROVAL_QUOTE_UNAVAILABLE",
      message: "The current checkout total cannot be verified. Try again later." });
    return;
  }
  const currentCurrency = (bid.currency || request.currency || "").toUpperCase();
  // A previously stored checkout quote belongs to one specific bid subtotal.
  // Do not let changing Bid.amount while leaving feeQuote untouched satisfy
  // the parent's old approval.
  const storedQuoteIsStale = !!bid.feeQuote &&
    (!Number.isFinite(bid.feeQuote.subtotal) ||
      Math.round(bid.feeQuote.subtotal * 100) !== Math.round(bid.amount * 100));
  if (bid.request?.toString() !== approval.request.toString() ||
      storedQuoteIsStale ||
      !Number.isFinite(currentTotal) ||
      Math.round(currentTotal * 100) !== Math.round(approval.amount * 100) ||
      currentCurrency !== approval.currency.toUpperCase() ||
      (request.currency && request.currency.toUpperCase() !== currentCurrency)) {
    res.status(409).json({ success: false, code: "PARENT_APPROVAL_QUOTE_CHANGED",
      message: "This offer's final amount or currency has changed. Request a new guardian approval." });
    return;
  }
  const updated = await ParentBookingApproval.findOneAndUpdate(
    { _id: approval._id, parent: req.user._id, status: "pending", expiresAt: { $gt: new Date() } },
    { $set: { status: decision, decidedAt: new Date() } },
    { new: true }
  );
  if (!updated) { res.status(409).json({ success: false, code: "APPROVAL_ALREADY_REVIEWED" }); return; }
  res.json({ success: true, approval: updated, message: decision === "approved"
    ? "Guardian approved this exact booking offer. The student may continue checkout."
    : "Guardian declined this booking offer." });
};

export const updateParentSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== "parent") {
    res.status(403).json({ success: false, message: "Access denied." });
    return;
  }

  const { approvalRequiredForBookings, spendingLimitMonthly, spendingLimitCurrency, notificationsEnabled } = req.body;
  if ((approvalRequiredForBookings !== undefined && typeof approvalRequiredForBookings !== "boolean") ||
      (notificationsEnabled !== undefined && typeof notificationsEnabled !== "boolean") ||
      (spendingLimitMonthly != null && (typeof spendingLimitMonthly !== "number" || !Number.isFinite(spendingLimitMonthly) || spendingLimitMonthly < 0 || spendingLimitMonthly > 1e9)) ||
      (spendingLimitCurrency !== undefined && (typeof spendingLimitCurrency !== "string" || !/^[A-Za-z]{3}$/.test(spendingLimitCurrency)))) {
    res.status(400).json({ success: false, code: "INVALID_PARENT_SETTINGS", message: "Invalid approval, spending limit or currency settings." });
    return;
  }

  if (approvalRequiredForBookings === false) {
    const current = await ParentProfile.findOne({ user: req.user._id }).select("children").lean();
    const children = current?.children.map(child => child.studentUser) || [];
    if (children.length && await User.exists({ _id: { $in: children }, role: "student", isMinor: true })) {
      res.status(409).json({ success: false, code: "MINOR_BOOKING_APPROVAL_REQUIRED",
        message: "Per-booking guardian approval cannot be disabled while supervising an underage student." });
      return;
    }
  }
  const profile = await ParentProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        ...(approvalRequiredForBookings !== undefined && { approvalRequiredForBookings }),
        ...(spendingLimitMonthly !== undefined && { spendingLimitMonthly }),
        ...(spendingLimitCurrency !== undefined && { spendingLimitCurrency: spendingLimitCurrency.toUpperCase() }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled }),
      },
    },
    { new: true, upsert: true }
  );

  res.status(200).json({ success: true, profile });
};

// @desc    Save parent onboarding
// @route   POST /api/parent/onboarding
// @access  Private (parent)
export const saveParentOnboarding = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== "parent") {
    res.status(403).json({ success: false, message: "Access denied." });
    return;
  }

  const { name, phone, city, approvalRequiredForBookings, spendingLimitMonthly, spendingLimitCurrency, notificationsEnabled } = req.body;
  if ((spendingLimitMonthly != null && (typeof spendingLimitMonthly !== "number" || !Number.isFinite(spendingLimitMonthly) || spendingLimitMonthly < 0 || spendingLimitMonthly > 1e9)) ||
      (spendingLimitCurrency !== undefined && (typeof spendingLimitCurrency !== "string" || !/^[A-Za-z]{3}$/.test(spendingLimitCurrency))) ||
      (approvalRequiredForBookings !== undefined && typeof approvalRequiredForBookings !== "boolean")) {
    res.status(400).json({ success: false, code: "INVALID_PARENT_SETTINGS" }); return;
  }

  if (approvalRequiredForBookings === false) {
    const current = await ParentProfile.findOne({ user: req.user._id }).select("children").lean();
    const children = current?.children.map(child => child.studentUser) || [];
    if (children.length && await User.exists({ _id: { $in: children }, role: "student", isMinor: true })) {
      res.status(409).json({ success: false, code: "MINOR_BOOKING_APPROVAL_REQUIRED",
        message: "Per-booking guardian approval cannot be disabled while supervising an underage student." });
      return;
    }
  }
  await User.findByIdAndUpdate(req.user._id, {
    name: name || req.user.name,
    phone: phone || req.user.phone,
    city: city || req.user.city,
  });

  const profile = await ParentProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        ...(approvalRequiredForBookings !== undefined && { approvalRequiredForBookings }),
        ...(spendingLimitMonthly !== undefined && { spendingLimitMonthly }),
        ...(spendingLimitCurrency !== undefined && { spendingLimitCurrency: spendingLimitCurrency.toUpperCase() }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled }),
      },
    },
    { new: true, upsert: true }
  );

  await advanceAccountStatus(req.user._id.toString(), "profile_complete");

  res.status(200).json({
    success: true,
    message: "Parent onboarding completed successfully",
    profile,
  });
};

export const cancelChildLinkRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { requestId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(requestId)) { res.status(400).json({ success: false, message: "Invalid request ID" }); return; }
  const linkRequest = await ParentLinkRequest.findById(requestId);
  if (!linkRequest) { res.status(404).json({ success: false, message: "Link request not found" }); return; }
  if (linkRequest.parent.toString() !== req.user?._id?.toString()) { res.status(403).json({ success: false, message: "Forbidden" }); return; }
  if (linkRequest.status !== "pending") { res.status(409).json({ success: false, message: "Only pending link requests can be cancelled" }); return; }
  linkRequest.status = "cancelled";
  await linkRequest.save();
  res.json({ success: true, message: "Link request cancelled" });
};
