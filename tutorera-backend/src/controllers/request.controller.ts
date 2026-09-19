import mongoose, { Types } from "mongoose";
import { Response } from "express";
import { Request as ExpressRequest } from "express"; 
import { AuthRequest } from "../types";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import Booking from "../models/Booking.model";
import User from "../models/User.model";
import { sendNotification } from "../utils/socket";
import { calculateMarketplaceFees } from "../config/constants";
import OfferNegotiation from "../models/OfferNegotiation.model";
import { containsContactInfo } from "../utils/contentFilter";
import { logAudit } from "../utils/logAudit";
import BookedSlot from "../models/BookedSlot.model";
import { isMarketplaceEligible, isHomeTuitionEligible } from "../services/tracking.service";
import sendEmail from "../utils/sendEmail";
import { bookingConfirmedEmail, bidAcceptedEmail, newBidEmail, directBookingRequestEmail, directBookingAcceptedEmail, directBookingDeclinedEmail, adminNewTuitionRequestEmail } from "../utils/emailTemplates";
import { convertToPKR } from "../config/countries";
import { paymentProvider } from "../services/paymentProvider.service";
import AbandonedJourney from "../models/AbandonedJourney.model";
import { MatchingService } from "../services/matching.service";
import { syncStudentTutorRelationship } from "../services/relationship.service";
import { computeAndStoreTutorResponseTime } from "../services/tutorStats.service";
import { classifyRequestLoss } from "../services/requestLoss.service";
import { assertAcceptanceAvailable, assertMarketFeature, resolveMarket } from "../services/market.service";
import { isValidIanaTimezone, zonedDateTimeToUtc } from "../utils/timezone";
import { convertAmount } from "../services/exchangeRate.service";
import {
  MARKETPLACE_REQUEST_EXPIRY_DAYS,
  MAX_REQUEST_EXTENSIONS,
  REQUEST_EXTENSION_DAYS,
} from "../config/marketplace";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// @desc    Create tuition request
// @route   POST /api/requests
// @access  Private (student)
export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  const market = await resolveMarket(req.body.countryCode || user.countryCode || "PK");
  if (!market || !market.isActive || !market.studentRegistration) {
    res.status(422).json({ success: false, code: "MARKET_UNAVAILABLE", message: "Tuition requests are not available in the selected market." });
    return;
  }
  try { await assertMarketFeature(market.countryCode, "requests"); } catch (error: any) {
    res.status(error.statusCode || 422).json({ success: false, code: error.code, message: error.message }); return;
  }
  if (req.body.teachingMode === "online" && !market.onlineEnabled) {
    res.status(422).json({ success: false, code: "ONLINE_TUITION_UNAVAILABLE", message: "Online tuition is not available in the selected market." });
    return;
  }
  if (["in-person", "both"].includes(req.body.teachingMode) && !market.homeTuitionEnabled) {
    res.status(422).json({ success: false, code: "HOME_TUITION_UNAVAILABLE", message: "Home tuition is not available in the selected market." });
    return;
  }

  // ── Create request ──
  const now = new Date();
  const expiresAt = new Date(now.getTime() + MARKETPLACE_REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const scheduleTimezone = isValidIanaTimezone(req.body.timezone) ? req.body.timezone : market.timezone;
  let scheduledStartAt: Date | undefined;
  let scheduledEndAt: Date | undefined;
  if (req.body.selectedDate && req.body.selectedStartTime) {
    try {
      scheduledStartAt = zonedDateTimeToUtc(req.body.selectedDate, req.body.selectedStartTime, scheduleTimezone);
      if (req.body.selectedEndTime) scheduledEndAt = zonedDateTimeToUtc(req.body.selectedDate, req.body.selectedEndTime, scheduleTimezone);
    } catch { res.status(422).json({ success: false, message: "Please provide a valid IANA timezone and local lesson time." }); return; }
  }
  const request = await Request.create({
    student: req.user?._id,
    ...req.body,
    countryCode: market.countryCode,
    countryName: market.countryName,
    currency: market.currency,
    timezone: scheduleTimezone,
    scheduleTimezone,
    scheduledStartAt,
    scheduledEndAt,
    status: req.body.status || "open",
    publishedAt: now,
    expiresAt,
    extensionCount: 0,
    maxExtensions: MAX_REQUEST_EXTENSIONS,
  });
  await AbandonedJourney.updateMany(
    { user: req.user?._id, type: "student_request", completedAt: { $exists: false } },
    { $set: { completedAt: new Date() } }
  );

  // Progressive Tiered Notification Dispatch via Smart Matching Engine
  const { notifiedCount, tier1Count } = await MatchingService.dispatchProgressiveNotifications(request, req.app.get("io"));
  await logAudit({
    action: "tuition_request_published",
    actor: req.user?.name,
    actorId: req.user?._id?.toString(),
    entity: "Request",
    targetId: request.id,
    metadata: {
      subject: request.subject,
      level: request.level,
      teachingMode: request.teachingMode,
      currency: request.currency,
      countryCode: request.countryCode,
      notifiedTutors: notifiedCount,
      tier1Matches: tier1Count,
    },
  });

  try {
    const { amountPKR } = convertToPKR(request.budget, request.currency);
    const adminAlert = adminNewTuitionRequestEmail({
      studentName: user.name || req.user?.name || "Student",
      studentEmail: user.email || req.user?.email || "",
      studentPhone: user.phone || req.user?.phone,
      subject: request.subject,
      level: request.level,
      teachingMode: request.teachingMode,
      countryName: request.countryName,
      countryCode: request.countryCode,
      city: request.city,
      area: request.area,
      budget: request.budget,
      currency: request.currency || "PKR",
      budgetPKR: amountPKR,
      pricingUnit: request.pricingUnit || "hour",
      schedule: request.schedule,
      description: request.description || request.learningObjectives,
      curriculum: request.curriculum,
    });
    await sendEmail({ to: "mentiserapk@gmail.com", subject: adminAlert.subject, html: adminAlert.html });
  } catch (alertErr) {
    console.error("Failed to send admin tuition request alert email:", alertErr);
  }

  res.status(201).json({ success: true, message: "Request created", request });
};

// @desc    Save private in-progress tuition request for abandoned-request recovery emails
// @route   POST /api/requests/draft
// @access  Private (student)
export const saveRequestDraftProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const allowed = [
    "subject", "level", "description", "budget", "teachingMode", "city", "schedule",
    "pricingUnit", "classGrade", "curriculum", "examType", "preferredDays", "preferredStartTime",
    "sessionDurationMinutes", "sessionsPerWeek", "expectedStartDate",
    "tutorId", "tutorName", "selectedDate", "selectedStartTime", "selectedEndTime",
  ];
  const type = req.body?.type === "direct_booking" ? "direct_booking" : "student_request";
  const data = Object.fromEntries(
    allowed
      .filter((key) => req.body?.[key] !== undefined && req.body?.[key] !== "")
      .map((key) => [key, req.body[key]])
  );

  if (Object.keys(data).length === 0) {
    res.status(200).json({ success: true, tracked: false });
    return;
  }

  const journey = await AbandonedJourney.findOneAndUpdate(
    { user: req.user?._id, type, completedAt: { $exists: false } },
    { $set: { data }, $setOnInsert: { user: req.user?._id, type, remindersSent: [] } },
    { new: true, upsert: true }
  );

  res.status(200).json({ success: true, tracked: true, journeyId: journey._id });
};

// @desc    Get SEO facet availability for active, public tuition demand
// @route   GET /api/requests/seo-facets
// @access  Public
export const getRequestSeoFacets = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  const match = {
    status: { $in: ["open", "published", "receiving_offers", "negotiating"] },
    isDirect: { $ne: true },
    expiresAt: { $gt: new Date() },
    countryCode: { $nin: [null, ""] },
    city: { $nin: [null, ""] },
  };

  const [result] = await Request.aggregate([
    { $match: match },
    {
      $facet: {
        citySubjects: [
          { $group: { _id: { countryCode: "$countryCode", city: "$city", subject: "$subject" }, count: { $sum: 1 } } },
        ],
        cityLevels: [
          { $group: { _id: { countryCode: "$countryCode", city: "$city", level: "$level" }, count: { $sum: 1 } } },
        ],
        cityCurriculaSubjects: [
          { $match: { curriculum: { $nin: [null, ""] }, subject: { $nin: [null, ""] } } },
          { $group: { _id: { countryCode: "$countryCode", city: "$city", curriculum: "$curriculum", subject: "$subject" }, count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  res.status(200).json({ success: true, ...result });
};

// @desc    Get all open requests (tutors browse)
// @route   GET /api/requests
// @access  Private
export const getAllRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  // Block unapproved tutors
  if (req.user?.role === "tutor") {
    const TutorProfile = (await import("../models/TutorProfile.model")).default;
    const profile = await TutorProfile.findOne({ user: req.user._id });
    if (!profile || !isMarketplaceEligible(profile)) {
      res.status(403).json({
        success: false,
        code: "TUTOR_NOT_APPROVED",
        message: "Your profile must be fully verified before you can browse requests.",
      });
      return;
    }
  }

  const { subject, level, city, country, teachingMode, currency, page = "1", limit = "10" } = req.query;
  const filter: Record<string, unknown> = {
    status: { $in: ["open", "published", "receiving_offers", "negotiating"] },
    isDirect: { $ne: true },
    expiresAt: { $gt: new Date() },
  };

  if (subject) filter.subject = new RegExp(subject as string, "i");
  if (level) filter.level = level;
  if (city) filter.city = new RegExp(city as string, "i");
  if (country) filter.countryCode = (country as string).toUpperCase();
  if (teachingMode && teachingMode !== "all") {
    if (teachingMode === "online") {
      filter.teachingMode = { $in: ["online", "both"] };
    } else if (teachingMode === "in_person" || teachingMode === "home") {
      filter.teachingMode = { $in: ["in_person", "home", "both"] };
    } else {
      filter.teachingMode = teachingMode;
    }
  }
  if (currency) filter.currency = (currency as string).toUpperCase();

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const total = await Request.countDocuments(filter);
  const requests = await Request.find(filter)
    .populate("student", "name city countryName countryCode avatar")
    .sort("-createdAt")
    .skip(skip)
    .limit(limitNum);

  if (req.user?.role === "tutor") {
    const requestsWithOffer = await Promise.all(
      requests.map(async (request) => {
        const [bid, offersCount] = await Promise.all([
          Bid.findOne({ request: request._id, tutor: req.user?._id }).select("amount currency status expiresAt pricingUnit createdAt").lean(),
          Bid.countDocuments({ request: request._id, status: { $nin: ["withdrawn", "rejected"] } }),
        ]);
        return { ...request.toObject(), bid, offersCount };
      })
    );
    res.status(200).json({ success: true, total, page: pageNum, requests: requestsWithOffer });
    return;
  }

  res.status(200).json({ success: true, total, page: pageNum, requests });
};

// @desc    Get my requests (student)
// @route   GET /api/requests/my
// @access  Private (student)
export const getMyRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  const requests = await Request.find({ student: req.user?._id }).sort("-createdAt");
  const now = Date.now();
  const enriched = await Promise.all(
    requests.map(async (r) => {
      const obj = r.toObject();
      const offersCount = await Bid.countDocuments({ request: r._id, status: { $nin: ["withdrawn", "rejected"] } });
      const isExpired = obj.status === "expired" || Boolean(obj.expiresAt && new Date(obj.expiresAt).getTime() <= now);
      const canExtend =
        ["open", "published", "receiving_offers"].includes(obj.status) &&
        Boolean(obj.expiresAt && new Date(obj.expiresAt).getTime() > now) &&
        (obj.extensionCount || 0) < (obj.maxExtensions || MAX_REQUEST_EXTENSIONS);
      const canRepost = obj.status === "expired" || obj.status === "cancelled" || Boolean(obj.expiresAt && new Date(obj.expiresAt).getTime() <= now);
      const secondsRemaining = obj.expiresAt ? Math.max(0, Math.floor((new Date(obj.expiresAt).getTime() - now) / 1000)) : 0;
      return {
        ...obj,
        offersCount,
        isExpired,
        canExtend,
        canRepost,
        secondsRemaining,
      };
    })
  );
  res.status(200).json({ success: true, requests: enriched });
};

// @desc    Cancel request
// @route   PATCH /api/requests/:id/cancel
// @access  Private (student)
export const cancelRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await Request.findOne({ _id: req.params.id, student: req.user?._id });
  if (!request) {
    res.status(404).json({ success: false, message: "Request not found" });
    return;
  }
  request.status = "cancelled";
  await request.save();
  await classifyRequestLoss({
    requestId: request._id,
    explicitReason: "student_cancelled",
    detail: typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : undefined,
    signals: { source: "student_cancel_request" },
  });
  res.status(200).json({ success: true, message: "Request cancelled" });
};

// @desc    Place a bid on a request
// @route   POST /api/requests/:id/bids
// @access  Private (tutor)
export const placeBid = async (req: AuthRequest, res: Response): Promise<void> => {
  const TutorProfile = (await import("../models/TutorProfile.model")).default;
  const tutorProfile = await TutorProfile.findOne({ user: req.user?._id });
  if (!tutorProfile || !isMarketplaceEligible(tutorProfile)) {
    res.status(403).json({
      success: false,
      code: "TUTOR_NOT_APPROVED",
      message: "Your profile must be fully verified before you can send offers.",
    });
    return;
  }

  const requested = await Request.findById(req.params.id).select("student subject level teachingMode city countryCode countryName currency status budget pricingUnit allowCounterOffers isDirect targetTutor preferredTutorCountries isWorldwideEligible expiresAt");
  if (!requested) {
    res.status(404).json({ success: false, message: "Request not found." });
    return;
  }
  try { await assertMarketFeature(requested.countryCode, "offers"); } catch (error: any) {
    res.status(error.statusCode || 422).json({ success: false, code: error.code, message: error.message }); return;
  }

  if (!isHomeTuitionEligible(tutorProfile) && requested.teachingMode === "in-person") {
    res.status(403).json({
      success: false,
      code: "HOME_TUITION_POLICE_REQUIRED",
      message: "Home tuition requests require an approved background and safety verification. Please submit the required local safety document to offer in-person tuition.",
    });
    return;
  }
  if (requested.status === "expired" || (requested.expiresAt && requested.expiresAt.getTime() <= Date.now())) {
    res.status(410).json({
      success: false,
      code: "REQUEST_EXPIRED",
      message: "This tuition request has expired and is no longer accepting tutor offers.",
    });
    return;
  }
  if (!["open", "published", "receiving_offers", "negotiating"].includes(requested.status)) {
    res.status(400).json({ success: false, message: "Request is not accepting offers" });
    return;
  }
  
  // Online tutoring uses standard identity, education and demo verification.
  // Home tuition additionally requires the market's approved safety verification.
  if (requested.teachingMode === "in-person") {
    if (tutorProfile.policeVerificationStatus !== "approved") {
      res.status(403).json({
        success: false,
        code: "POLICE_VERIFICATION_REQUIRED",
        message: "Home tuition requests require an approved Police Verification Report. Please submit your police clearance certificate to offer in-person tuition.",
      });
      return;
    }
  }

  const subjectMatches = tutorProfile.subjects.some(subject => subject.toLowerCase() === requested.subject.toLowerCase());
  const levelMatches = tutorProfile.levels.includes(requested.level as any);
  const modeMatches = tutorProfile.teachingMode === "both" || requested.teachingMode === "both" || tutorProfile.teachingMode === requested.teachingMode;
  
  // Dual location matching model:
  // - Online tutoring: Borderless worldwide matching (unless student specified country preferences).
  // - In-Person / Home tuition: Strictly matches tutors in the same country and city/service area.
  let locationMatches = false;
  if (requested.teachingMode === "online" || tutorProfile.teachingMode === "online") {
    if (requested.preferredTutorCountries && requested.preferredTutorCountries.length > 0) {
      locationMatches = requested.preferredTutorCountries.includes(tutorProfile.countryCode || "PK");
    } else {
      locationMatches = true; // Borderless
    }
  } else {
    // In-person / home tuition
    const countryMatch = !requested.countryCode || (tutorProfile.countryCode || "PK") === requested.countryCode;
    const cityMatch = !requested.city || Boolean(tutorProfile.city && tutorProfile.city.toLowerCase() === requested.city.toLowerCase());
    locationMatches = Boolean(countryMatch && cityMatch);
  }

  if (!subjectMatches || !levelMatches || !modeMatches || !locationMatches) {
    res.status(403).json({ success: false, code: "OFFER_NOT_RELEVANT", message: "This request does not match your approved subject, level, mode, or service location." });
    return;
  }

  const currency = requested.currency || "PKR";
  if (!requested.allowCounterOffers && req.body.amount !== requested.budget) {
    res.status(409).json({ success: false, code: "COUNTERS_DISABLED", message: `This request only accepts the proposed rate of ${currency} ${requested.budget.toLocaleString()}.` });
    return;
  }

  const request = requested;
  if (!request || request.status === "expired" || (request.expiresAt && request.expiresAt.getTime() <= Date.now())) {
    res.status(410).json({
      success: false,
      code: "REQUEST_EXPIRED",
      message: "This tuition request has expired and is no longer accepting tutor offers.",
    });
    return;
  }
  if (!["open", "published", "receiving_offers", "negotiating"].includes(request.status)) {
    res.status(400).json({ success: false, message: "Request is not accepting offers" });
    return;
  }

  // Block bidding on direct requests not targeted at this tutor
  if (request.isDirect && request.targetTutor?.toString() !== req.user?._id?.toString()) {
    res.status(403).json({ success: false, message: "This is a private booking request." });
    return;
  }

  // Check if tutor already bid
  const existingBid = await Bid.findOne({ request: req.params.id, tutor: req.user?._id });
  if (existingBid) {
    res.status(400).json({ success: false, message: "You already sent an offer for this request" });
    return;
  }

  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const offersToday = await Bid.countDocuments({ tutor: req.user?._id, createdAt: { $gte: dayStart } });
  if (offersToday >= 25) { res.status(429).json({ success: false, code: "DAILY_OFFER_LIMIT", message: "You have reached today's offer limit. Try again tomorrow." }); return; }
  const normalizedMessage = String(req.body.message || "").trim().toLowerCase();
  if (normalizedMessage) {
    const recent = await Bid.find({ tutor: req.user?._id, createdAt: { $gte: dayStart } }).select("message").lean();
    if (recent.filter(item => item.message.trim().toLowerCase() === normalizedMessage).length >= 5) { res.status(429).json({ success: false, code: "DUPLICATE_OFFER_CONTENT", message: "Please personalize your offer for this student instead of repeating the same message." }); return; }
  }

  const moderationReasons = [containsContactInfo(req.body.message || "") ? "external_contact" : "", req.body.amount < request.budget * 0.35 || req.body.amount > request.budget * 3 ? "unusual_price" : ""].filter(Boolean);
  const bid = await Bid.create({
    request: new Types.ObjectId(req.params.id as string),
    tutor: req.user?._id,
    amount: req.body.amount,
    currency: request.currency || tutorProfile.currency || "PKR",
    originalAmount: req.body.amount,
    originalCurrency: request.currency || tutorProfile.currency || "PKR",
    convertedRequestAmount: req.body.amount,
    exchangeRate: 1,
    message: req.body.message,
    availability: req.body.availability,
    initialStudentRate: request.budget,
    pricingUnit: request.pricingUnit,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    flaggedForModeration: moderationReasons.length > 0,
    moderationReasons,
  });

  await OfferNegotiation.create({
    offer: bid._id,
    senderUser: req.user?._id,
    senderRole: "tutor",
    amount: bid.amount,
    currency: bid.currency,
    message: bid.message,
    sequenceNumber: 1,
    expiresAt: bid.expiresAt,
    flaggedForModeration: containsContactInfo(bid.message),
  });

  await logAudit({
    action: "offer_created",
    actor: req.user?.name,
    actorId: req.user?._id?.toString(),
    entity: "Bid",
    targetId: bid.id,
    metadata: {
      requestId: request.id,
      amount: bid.amount,
      currency: bid.currency,
      pricingUnit: bid.pricingUnit,
      flaggedForModeration: containsContactInfo(bid.message),
    },
  });

  await Request.updateOne({ _id: request._id, status: { $in: ["open", "published"] } }, { status: "receiving_offers" });
  computeAndStoreTutorResponseTime(req.user?._id?.toString() || "").catch(() => {});

  // Notify student
  const io = req.app.get("io");
  await sendNotification(io, request.student.toString(), {
    title: "📬 New Tutor Offer",
    message: `A verified tutor sent an offer of ${currency} ${req.body.amount.toLocaleString()} on your tuition request.`,
    type: "bid",
    link: "/dashboard",
  });

  try {
    const studentUser = await User.findById(request.student).select("name email");
    if (studentUser) {
      const { subject, html } = newBidEmail(studentUser.name, req.body.amount);
      await sendEmail({ to: studentUser.email, subject, html });
    }
  } catch (err) {
    console.error("Failed to send new bid email:", err);
  }

  res.status(201).json({ success: true, message: "Offer sent successfully", bid });
};

// @desc    Get all bids for a request
// @route   GET /api/requests/:id/bids
// @access  Private (student who owns the request)
export const getBidsForRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await Request.findOne({ _id: req.params.id, student: req.user?._id });
  if (!request) {
    res.status(404).json({ success: false, message: "Request not found" });
    return;
  }

  const bids = await Bid.find({ request: req.params.id })
    .populate("tutor", "name avatar city")
    .sort("-createdAt");

  res.status(200).json({ success: true, total: bids.length, bids });
};

// If a previous accept attempt's payment reservation has expired (student
// abandoned checkout), revert the request/bid back to an acceptable state
// so the bid isn't stuck in limbo forever. Called defensively at the start
// of the accept flow.
export async function releaseExpiredPaymentHold(requestId: Types.ObjectId): Promise<void> {
  const staleBid = await Bid.findOne({
    request: requestId,
    status: "payment_pending",
    paymentPendingExpiresAt: { $lte: new Date() },
  });

  if (!staleBid) return;

  // Best-effort revert — not wrapped in the caller's transaction since this
  // is cleanup for a PAST abandoned attempt, not part of the current one.
  await Bid.updateOne(
    { _id: staleBid._id, status: "payment_pending" },
    { status: "submitted", $unset: { paymentPendingExpiresAt: "" } }
  );
  await Request.updateOne(
    { _id: requestId, status: "awaiting_payment" },
    { status: "open" }
  );
}


const PAYMENT_HOLD_MINUTES = 30;

// @desc    Accept an offer — reserves it and starts payment checkout.
//          The booking is NOT created here; it's created by
//          finalizeBidAcceptance once payment is confirmed via webhook.
// @route   PATCH /api/requests/:id/bids/:bidId/accept
// @access  Private (student or direct tutor)
export const initiateAcceptBid = async (req: AuthRequest, res: Response): Promise<void> => {
  const requestId = new Types.ObjectId(req.params.id as string);
  const bidId = new Types.ObjectId(req.params.bidId as string);

  await releaseExpiredPaymentHold(requestId);

  const request = await Request.findById(requestId);
  if (!request || !["open", "published", "receiving_offers", "negotiating"].includes(request.status)) {
    res.status(400).json({ success: false, message: "Request not available" });
    return;
  }
  try {
    await assertAcceptanceAvailable(request.countryCode);
  } catch (marketError: any) {
    res.status(marketError.statusCode || 409).json({ success: false, code: marketError.code, message: marketError.message, market: request.countryCode });
    return;
  }

  const bid = await Bid.findOne({
    _id: bidId,
    request: requestId,
    status: { $in: ["pending", "submitted", "viewed", "countered"] },
  });

  if (!bid) {
    res.status(404).json({ success: false, message: "Offer not found or does not belong to this request" });
    return;
  }

  if (bid.expiresAt && bid.expiresAt.getTime() <= Date.now()) {
    res.status(410).json({ success: false, message: "This offer has expired." });
    return;
  }

  const isOwner = request.student.toString() === req.user?._id?.toString();
  const isDirectTutorAccept = request.isDirect && bid.tutor.toString() === req.user?._id?.toString();
  if (!isOwner && !isDirectTutorAccept) {
    res.status(403).json({ success: false, message: "Not authorized to accept this offer" });
    return;
  }

  // ─── Direct Booking Tutor Acceptance ──────────────────────────────────────────
  if (isDirectTutorAccept) {
    const existingBookingsCount = await Booking.countDocuments({
      student: request.student,
      tutor: bid.tutor,
    });
    const fees = calculateMarketplaceFees(bid.amount);
    const bookingArr = await Booking.create([{
      student: request.student,
      tutor: bid.tutor,
      request: request._id,
      bid: bid._id,
      amount: bid.amount,
      finalAgreedRate: bid.amount,
      currency: bid.currency || request.currency,
      countryCode: request.countryCode,
      timezone: request.timezone,
      scheduleTimezone: request.scheduleTimezone || request.timezone,
      scheduledStartAt: request.scheduledStartAt,
      scheduledEndAt: request.scheduledEndAt,
      pricingUnit: bid.pricingUnit || "hour",
      sessionCount: 1,
      ...fees,
      platformFee: fees.tutorFee + fees.tax,
      tutorPayout: fees.tutorNet,
      schedule: request.schedule,
      teachingMode: request.teachingMode,
      isFirstSession: existingBookingsCount === 0,
      paymentStatus: "pending",
      paymentNote: "Awaiting student checkout through authorized payment gateway",
    }]);
    const booking = bookingArr[0];
    await syncStudentTutorRelationship(booking as any);

    if (request.selectedDate && request.selectedStartTime && request.selectedEndTime) {
      await BookedSlot.create([{
        tutor: bid.tutor,
        student: request.student,
        booking: booking._id,
        date: new Date(request.selectedDate),
        startTime: request.selectedStartTime,
        endTime: request.selectedEndTime,
        timezone: request.scheduleTimezone || request.timezone,
        startAt: request.scheduledStartAt,
        endAt: request.scheduledEndAt,
      }]);
    }

    bid.status = "accepted";
    request.status = "closed";
    request.acceptedOffer = bid._id;
    request.finalAgreedRate = bid.amount;
    await Promise.all([bid.save(), request.save()]);

    const io = req.app.get("io");
    if (io) {
      await sendNotification(io, request.student.toString(), {
        title: "✅ Direct Booking Accepted!",
        message: `${req.user?.name || "Your tutor"} has accepted your booking request for ${request.subject}. Please complete payment on your dashboard to confirm.`,
        type: "booking",
        link: "/dashboard",
      });
    }

    try {
      const studentUser = await User.findById(request.student).select("name email");
      if (studentUser) {
        const { subject: emailSubject, html } = directBookingAcceptedEmail(
          studentUser.name,
          req.user?.name || "Your tutor",
          request.subject
        );
        await sendEmail({ to: studentUser.email, subject: emailSubject, html });
      }
    } catch (emailErr) {
      console.error("[DirectBooking] Failed to send acceptance email to student:", emailErr);
    }

    res.status(200).json({
      success: true,
      message: "Direct booking accepted successfully. The booking has been scheduled and the student notified to pay.",
      bookingId: booking._id,
    });
    return;
  }

  // Atomic guard — only one accept attempt can win this transition
  const reservedRequest = await Request.findOneAndUpdate(
    { _id: requestId, status: { $in: ["open", "published", "receiving_offers", "negotiating"] } },
    { status: "awaiting_payment" },
    { new: true }
  );

  if (!reservedRequest) {
    res.status(409).json({ success: false, message: "This request was just accepted or is no longer available." });
    return;
  }

  const paymentPendingExpiresAt = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000);
  bid.status = "payment_pending";
  bid.paymentPendingExpiresAt = paymentPendingExpiresAt;
  await bid.save();

  try {
    const student = await User.findById(request.student).select("name email phone");
    const checkoutUrl = await paymentProvider.createCheckout({
      amount: bid.amount,
      currency: bid.currency || "PKR",
      customerMobileNo: student?.phone || "03000000000",
      customerEmail: student?.email || "",
      basketId: `BID-${bid._id.toString()}`,
      bidId: bid._id.toString(),
      studentId: request.student.toString(),
      tutorId: bid.tutor.toString(),
      description: `TUTORERA offer acceptance ${bid._id.toString()}`,
      successUrl: `${process.env.CLIENT_URL}/dashboard?payment=success&bid=${bid._id}`,
      failureUrl: `${process.env.CLIENT_URL}/dashboard?payment=failed&bid=${bid._id}`,
      checkoutUrl: `${process.env.CLIENT_URL}/dashboard?payment=processing&bid=${bid._id}`,
    });

    res.status(200).json({
      success: true,
      message: "Redirecting to payment. Your offer will be confirmed once payment completes.",
      checkoutUrl,
    });
  } catch (err: any) {
    await Request.updateOne({ _id: requestId, status: "awaiting_payment" }, { status: "open" });
    await Bid.updateOne(
      { _id: bid._id, status: "payment_pending" },
      { status: "submitted", $unset: { paymentPendingExpiresAt: "" } }
    );

    console.error("Failed to create payment checkout for offer acceptance:", err);
    res.status(502).json({ success: false, message: "Unable to start payment. Please try again." });
  }
};

// Called ONLY by the payment webhook (payment.controller.ts) once the
// authorized payment gateway confirms payment for a "BID-<id>" checkout. Runs the same
// transactional booking-creation logic the old acceptBid used to run
// synchronously — atomic accept guard, reject other bids, create the
// booking (now with paymentStatus already "confirmed"), lock the slot.
export async function finalizeBidAcceptance(bidId: string, io: any): Promise<void> {
  const session = await mongoose.startSession();

  try {
    let responseBooking: any = null;
    let responsePayload: {
      bidTutor: string;
      requestStudent: string;
      isDirect: boolean;
      selectedDate?: string;
      selectedStartTime?: string;
      selectedEndTime?: string;
      subject: string;
      amount: number;
    } | null = null;

    await session.withTransaction(async () => {
      // Atomic guard — only proceeds if this bid is still awaiting payment
        // confirmation. Protects against documented at-least-once
      // at-least-once webhook delivery calling this twice for the same
      // event; the second call finds status already "accepted" and no-ops.
      const bid = await Bid.findOneAndUpdate(
        { _id: new Types.ObjectId(bidId), status: "payment_pending" },
        { status: "accepted" },
        { new: true, session }
      );

      if (!bid) {
        // Already finalized by a prior webhook delivery, or the hold expired
        // and was reverted before payment confirmed — nothing to do.
        return;
      }

      const request = await Request.findById(bid.request).session(session);
      if (!request) return;

      request.status = "closed";
      await request.save({ session });

      await Bid.updateMany(
        { request: request._id, _id: { $ne: bid._id } },
        { status: "not_selected" },
        { session }
      );

      const existingBookingsCount = await Booking.countDocuments({
        student: request.student,
        tutor: bid.tutor,
      }).session(session);

      const fees = calculateMarketplaceFees(bid.amount);

      const bookingArr = await Booking.create([{
        student: request.student,
        tutor: bid.tutor,
        request: request._id,
        bid: bid._id,
        amount: bid.amount,
        finalAgreedRate: bid.amount,
        currency: bid.currency || request.currency,
        countryCode: request.countryCode,
        timezone: request.timezone,
        scheduleTimezone: request.scheduleTimezone || request.timezone,
        scheduledStartAt: request.scheduledStartAt,
        scheduledEndAt: request.scheduledEndAt,
        pricingUnit: bid.pricingUnit || "hour",
        sessionCount: 1,
        ...fees,
        platformFee: fees.tutorFee + fees.tax,
        tutorPayout: fees.tutorNet,
        schedule: request.schedule,
        teachingMode: request.teachingMode,
        isFirstSession: existingBookingsCount === 0,
        // Payment already succeeded via the authorized payment gateway before this booking
        // was ever created — no manual confirmation step needed.
        paymentStatus: "confirmed",
        paymentNote: "Paid via authorized payment gateway before booking creation",
      }], { session });
      const booking = bookingArr[0];
      await syncStudentTutorRelationship(booking as any, session);

      await OfferNegotiation.updateMany({ offer: bid._id, status: "active" }, { status: "accepted" }, { session });

      if (request.isDirect && request.selectedDate && request.selectedStartTime && request.selectedEndTime) {
        await BookedSlot.create([{
          tutor: bid.tutor,
          student: request.student,
          booking: booking._id,
          date: new Date(request.selectedDate),
        startTime: request.selectedStartTime,
        endTime: request.selectedEndTime,
        timezone: request.scheduleTimezone || request.timezone,
        startAt: request.scheduledStartAt,
        endAt: request.scheduledEndAt,
        }], { session });
      }

      responseBooking = booking;
      responsePayload = {
        bidTutor: bid.tutor.toString(),
        requestStudent: request.student.toString(),
        isDirect: !!request.isDirect,
        selectedDate: request.selectedDate,
        selectedStartTime: request.selectedStartTime,
        selectedEndTime: request.selectedEndTime,
        subject: request.subject,
        amount: bid.amount,
      };
    });

    if (responsePayload && responseBooking) {
      const payload = responsePayload as {
        bidTutor: string;
        requestStudent: string;
        isDirect: boolean;
        selectedDate?: string;
        selectedStartTime?: string;
        selectedEndTime?: string;
        subject: string;
        amount: number;
      };

      // Notifications/emails are best-effort — same as the original flow.
      if (io) {
        await sendNotification(io, payload.bidTutor, {
          title: "✅ Offer Accepted & Paid!",
          message: "The student has completed payment. A booking has been created.",
          type: "booking",
          link: "/dashboard",
        });
        await sendNotification(io, payload.requestStudent, {
          title: "📅 Booking Confirmed",
          message: `Your payment was received and your booking for ${payload.subject} is confirmed.`,
          type: "booking",
          link: "/dashboard",
        });
      }

      try {
        const [tutorUser, studentUser] = await Promise.all([
          User.findById(payload.bidTutor).select("name email"),
          User.findById(payload.requestStudent).select("name email"),
        ]);

        if (tutorUser && studentUser) {
          const bidEmail = bidAcceptedEmail(tutorUser.name, studentUser.name, payload.amount);
          const bookingEmail = bookingConfirmedEmail(studentUser.name, tutorUser.name, payload.amount);
          await Promise.all([
            sendEmail({ to: tutorUser.email, subject: bidEmail.subject, html: bidEmail.html }),
            sendEmail({ to: studentUser.email, subject: bookingEmail.subject, html: bookingEmail.html }),
          ]);
        }
      } catch (err) {
        console.error("Failed to send booking/offer emails after payment:", err);
      }
    }
  } finally {
    await session.endSession();
  }
}

// @desc    Create a direct booking request targeted at a specific tutor
// @route   POST /api/requests/direct
// @access  Private (student)
export const createDirectBookingRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tutorId, subject, level, description, teachingMode, city, schedule, selectedDate, selectedStartTime, selectedEndTime } = req.body;

  if (!tutorId || !subject || !level || !description || !schedule) {
    res.status(400).json({ success: false, message: "Missing required fields." });
    return;
  }

  const TutorProfile = (await import("../models/TutorProfile.model")).default;
  const tutorProfile = await TutorProfile.findOne({ user: tutorId });
  if (!tutorProfile || !isMarketplaceEligible(tutorProfile)) {
    res.status(404).json({ success: false, message: "Tutor not found or not available for booking." });
    return;
  }

  // ── Police Verification Distinction: Online vs Home Tuition ──
  // Online Tuition: No Police Verification required.
  // In-Person / Home Tuition: Tutor MUST have an approved Police Verification Report.
  const requestedMode = teachingMode || tutorProfile.teachingMode;
  const market = await resolveMarket(req.body.countryCode || (req.user as any)?.countryCode || tutorProfile.countryCode || "PK");
  if (!market || !market.isActive || !market.studentRegistration) {
    res.status(422).json({ success: false, code: "MARKET_UNAVAILABLE", message: "Direct booking is not available in the selected market." });
    return;
  }
  try { await assertMarketFeature(market.countryCode, "requests"); } catch (error: any) {
    res.status(error.statusCode || 422).json({ success: false, code: error.code, message: error.message }); return;
  }
  if (requestedMode === "online" && !market.onlineEnabled) {
    res.status(422).json({ success: false, code: "ONLINE_TUITION_UNAVAILABLE", message: "Online tuition is not available in the selected market." });
    return;
  }
  if (requestedMode === "in-person" && !market.homeTuitionEnabled) {
    res.status(422).json({ success: false, code: "HOME_TUITION_UNAVAILABLE", message: "Home tuition is not available in the selected market." });
    return;
  }
  if (requestedMode === "in-person" && !isHomeTuitionEligible(tutorProfile)) {
    res.status(400).json({
      success: false,
      code: "HOME_TUITION_POLICE_REQUIRED",
      message: "This tutor is currently approved for online tuition only. Home tuition requires approved background and safety verification.",
    });
    return;
  }

  // Prevent duplicate direct requests to the same tutor while one is still pending
  const existingPending = await Request.findOne({
    student: req.user?._id,
    targetTutor: tutorId,
    status: "open",
  });
  if (existingPending) {
    res.status(400).json({
      success: false,
      message: "You already have a pending booking request with this tutor.",
    });
    return;
  }

  const scheduleTimezone = isValidIanaTimezone(req.body.timezone) ? req.body.timezone : market.timezone;
  let scheduledStartAt: Date | undefined;
  let scheduledEndAt: Date | undefined;
  if (selectedDate && selectedStartTime) {
    try {
      scheduledStartAt = zonedDateTimeToUtc(selectedDate, selectedStartTime, scheduleTimezone);
      if (selectedEndTime) scheduledEndAt = zonedDateTimeToUtc(selectedDate, selectedEndTime, scheduleTimezone);
    } catch { res.status(422).json({ success: false, message: "Please provide a valid IANA timezone and local lesson time." }); return; }
  }

  // A tutor can be discovered across borders for online teaching. The request,
  // offer and eventual booking still use the student's selected market currency;
  // keep the tutor's stored rate as an informational source snapshot only.
  const tutorCurrency = tutorProfile.currency || market.currency;
  let requestCurrencyRate = tutorProfile.hourlyRate;
  try {
    requestCurrencyRate = Math.round(await convertAmount(tutorProfile.hourlyRate, tutorCurrency, market.currency));
  } catch {
    if (tutorCurrency !== market.currency) {
      res.status(422).json({ success: false, code: "CURRENCY_CONVERSION_UNAVAILABLE", message: "This tutor's rate cannot be converted to the request currency right now. Please try again shortly." });
      return;
    }
  }
  const request = await Request.create({
    student: req.user?._id,
    subject,
    level,
    description,
    budget: requestCurrencyRate,
    currency: market.currency,
    countryCode: market.countryCode,
    countryName: market.countryName,
    timezone: scheduleTimezone,
    scheduleTimezone,
    scheduledStartAt,
    scheduledEndAt,
    teachingMode: teachingMode || tutorProfile.teachingMode,
    city: city || tutorProfile.city,
    schedule: selectedDate && selectedStartTime
      ? `${selectedDate} ${selectedStartTime}–${selectedEndTime}`
      : schedule,
    targetTutor: tutorId,
    isDirect: true,
    selectedDate: selectedDate || "",
    selectedStartTime: selectedStartTime || "",
    selectedEndTime: selectedEndTime || "",
  });

  const bid = await Bid.create({
    request: request._id,
    tutor: tutorId,
    amount: requestCurrencyRate,
    currency: market.currency,
    // The request's market currency is authoritative for a direct booking.
    // The original rate remains an informational snapshot, never a payment amount.
    originalAmount: tutorProfile.hourlyRate,
    originalCurrency: tutorCurrency,
    convertedRequestAmount: requestCurrencyRate,
    exchangeRate: tutorProfile.hourlyRate ? requestCurrencyRate / tutorProfile.hourlyRate : 1,
    initialStudentRate: requestCurrencyRate,
    pricingUnit: "hour",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    message: "Direct booking request",
    isDirect: true,
  });

  await AbandonedJourney.updateMany(
    { user: req.user?._id, type: "direct_booking", completedAt: { $exists: false } },
    { $set: { completedAt: new Date() } }
  );
  computeAndStoreTutorResponseTime(tutorId).catch(() => {});

  const io = req.app.get("io");
  await sendNotification(io, tutorId, {
    title: "📩 New Direct Booking Request",
    message: `${req.user?.name} wants to book a session with you for ${subject}.`,
    type: "booking",
    link: "/dashboard?tab=browse",
  });

   try {
    const tutorUser = await User.findById(tutorId).select("name email");
    if (tutorUser) {
      const { subject: emailSubject, html } = directBookingRequestEmail(tutorUser.name, req.user?.name || "A student", subject);
      await sendEmail({ to: tutorUser.email, subject: emailSubject, html });
    }

    const { amountPKR } = convertToPKR(request.budget, request.currency);
    const adminAlert = adminNewTuitionRequestEmail({
      studentName: req.user?.name || "Student",
      studentEmail: req.user?.email || "",
      studentPhone: req.user?.phone,
      subject: request.subject,
      level: request.level || "Standard",
      teachingMode: request.teachingMode || "direct",
      countryName: request.countryName,
      countryCode: request.countryCode,
      city: request.city,
      area: request.area,
      budget: request.budget,
      currency: request.currency || "PKR",
      budgetPKR: amountPKR,
      pricingUnit: request.pricingUnit || "hour",
      schedule: request.schedule,
      description: `Direct booking with tutor ID: ${tutorId}`,
      curriculum: request.curriculum,
    });
    await sendEmail({ to: "mentiserapk@gmail.com", subject: adminAlert.subject, html: adminAlert.html });
  } catch (err) {
    console.error("Failed to send direct booking request email / admin alert:", err);
  }

  res.status(201).json({
    success: true,
    message: "Booking request sent to the tutor. You'll be notified once they respond.",
    request,
    bid,
  });
};

// @desc    Get direct booking requests for the logged-in tutor
// @route   GET /api/requests/direct/my
// @access  Private (tutor)
export const getMyDirectRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  const requests = await Request.find({
    targetTutor: req.user?._id,
    isDirect: true,
    status: "open",
  })
    .populate("student", "name city avatar")
    .sort("-createdAt");

  const requestsWithBid = await Promise.all(
    requests.map(async (r) => {
      const bid = await Bid.findOne({ request: r._id, tutor: req.user?._id });
      return { ...r.toObject(), bid };
    })
  );

  res.status(200).json({ success: true, total: requestsWithBid.length, requests: requestsWithBid });
};

// @desc    Reject a bid
// @route   PATCH /api/requests/:id/bids/:bidId/reject
// @access  Private (student who owns the request, OR the tutor on a direct request)
export const rejectBid = async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await Request.findById(req.params.id);
  if (!request) {
    res.status(404).json({ success: false, message: "Request not found" });
    return;
  }

  const bid = await Bid.findOne({
    _id: req.params.bidId,
    request: req.params.id,
  });
  if (!bid) {
    res.status(404).json({ success: false, message: "Offer not found or does not belong to this request" });
    return;
  }

  if (["accepted", "rejected", "withdrawn", "expired", "not_selected"].includes(bid.status)) {
    res.status(409).json({ success: false, message: "This offer can no longer be changed." });
    return;
  }

  const isOwner = request.student.toString() === req.user?._id?.toString();
  const isTargetTutorDecline = request.isDirect && bid.tutor.toString() === req.user?._id?.toString();

  if (!isOwner && !isTargetTutorDecline) {
    res.status(403).json({ success: false, message: "Not authorized to reject this offer" });
    return;
  }

  bid.status = "rejected";
  await bid.save();

  if (request.isDirect && isTargetTutorDecline) {
    request.status = "cancelled";
    await request.save();

    const io = req.app.get("io");
    await sendNotification(io, request.student.toString(), {
      title: "Booking Request Declined",
      message: `The tutor was unable to accept your booking request for ${request.subject}.`,
      type: "booking",
      link: "/dashboard",
    });

   try {
      const studentUser = await User.findById(request.student).select("name email");
      if (studentUser) {
        const { subject, html } = directBookingDeclinedEmail(studentUser.name, request.subject);
        await sendEmail({ to: studentUser.email, subject, html });
      }
    } catch (err) {
      console.error("Failed to send booking decline email:", err);
    }
  }

  res.status(200).json({ success: true, message: "Offer declined", bid });
};

// @desc    Get a preview of open requests for public homepage (no auth required)
// @route   GET /api/requests/public/preview
// @access  Public
export const getPublicRequestsPreview = async (req: ExpressRequest, res: Response): Promise<void> => {
  const { page = "1", limit = "12", country, city, subject, level, teachingMode, currency } = req.query;
  const filter: Record<string, unknown> = { 
    status: { $in: ["open", "published", "receiving_offers", "negotiating"] }, 
    isDirect: { $ne: true },
    expiresAt: { $gt: new Date() },
  };

  if (country) filter.countryCode = String(country).toUpperCase();
  if (city) {
    const cityTerms = String(city)
      .replace(/-/g, " ")
      .split(/\s*(?:&|and)\s*/i)
      .map((term) => term.trim())
      .filter(Boolean);
    filter.city = cityTerms.length > 1
      ? { $in: cityTerms.map((term) => new RegExp(`^${escapeRegExp(term)}$`, "i")) }
      : new RegExp(`^${escapeRegExp(cityTerms[0] || String(city).replace(/-/g, " "))}$`, "i");
  }

  if (subject) filter.subject = new RegExp(`^${escapeRegExp(String(subject).replace(/-/g, " "))}$`, "i");
  if (level) filter.level = String(level);
  if (currency) filter.currency = String(currency).toUpperCase();
  if (teachingMode && teachingMode !== "all") {
    if (teachingMode === "online") {
      filter.teachingMode = { $in: ["online", "both"] };
    } else if (teachingMode === "in_person" || teachingMode === "home") {
      filter.teachingMode = { $in: ["in_person", "home", "both"] };
    } else {
      filter.teachingMode = String(teachingMode);
    }
  }

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 12));
  const skip = (pageNum - 1) * limitNum;

  const total = await Request.countDocuments(filter);
  const requests = await Request.find(filter)
    .populate("student", "name city countryCode countryName")
    .sort("-createdAt")
    .skip(skip)
    .limit(limitNum)
    .select("subject level budget maximumBudget pricingUnit currency teachingMode city countryCode countryName schedule description status createdAt expiresAt student sessionDurationMinutes sessionsPerWeek");

  const Bid = (await import("../models/Bid.model")).default;
  const sanitizedRequests = await Promise.all(
    requests.map(async (r) => {
      const offersCount = await Bid.countDocuments({ 
        request: r._id, 
        status: { $nin: ["withdrawn", "rejected"] } 
      });
      const rawName = (r.student as any)?.name || "Student";
      const nameParts = rawName.trim().split(" ");
      const sanitizedName = nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[1].charAt(0)}.`
        : nameParts[0] || "Verified Student";

      return {
        _id: r._id,
        subject: r.subject,
        level: r.level,
        budget: r.budget,
        pricingUnit: r.pricingUnit || "hour",
        currency: r.currency || "PKR",
        teachingMode: r.teachingMode,
        city: r.city || (r.student as any)?.city || "",
        countryCode: r.countryCode || (r.student as any)?.countryCode || "PK",
        countryName: r.countryName || (r.student as any)?.countryName || "Pakistan",
        schedule: r.schedule,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        offersCount,
        sessionDurationMinutes: r.sessionDurationMinutes,
        sessionsPerWeek: r.sessionsPerWeek,
        student: {
          displayTitle: `${sanitizedName} in ${r.city || r.countryName || "Online"}`,
          name: sanitizedName,
          city: r.city || "",
          countryName: r.countryName || "Pakistan",
        },
      };
    })
  );

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    requests: sanitizedRequests,
  });
};

// @desc    Extend active tuition request by 7 days
// @route   POST /api/requests/:id/extend
// @access  Private (student)
export const extendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await Request.findOne({ _id: req.params.id, student: req.user?._id });
  if (!request) {
    res.status(404).json({ success: false, message: "Request not found." });
    return;
  }

  const now = new Date();
  if (!["open", "published", "receiving_offers"].includes(request.status)) {
    res.status(400).json({
      success: false,
      code: "CANNOT_EXTEND_STATUS",
      message: "Only active requests currently seeking tutors can be extended.",
    });
    return;
  }

  if (request.expiresAt && request.expiresAt.getTime() <= now.getTime()) {
    res.status(400).json({
      success: false,
      code: "ALREADY_EXPIRED",
      message: "This request has already expired. Please repost your requirement instead.",
    });
    return;
  }

  const currentExtensions = request.extensionCount || 0;
  const maxAllowed = request.maxExtensions || MAX_REQUEST_EXTENSIONS;
  if (currentExtensions >= maxAllowed) {
    res.status(400).json({
      success: false,
      code: "MAX_EXTENSIONS_REACHED",
      message: `Requests can only be extended up to ${maxAllowed} times (${maxAllowed * REQUEST_EXTENSION_DAYS} extra days). Please repost when expired.`,
    });
    return;
  }

  const baseExpiry = request.expiresAt && request.expiresAt.getTime() > now.getTime() ? request.expiresAt : now;
  const newExpiresAt = new Date(baseExpiry.getTime() + REQUEST_EXTENSION_DAYS * 24 * 60 * 60 * 1000);

  request.expiresAt = newExpiresAt;
  request.extensionCount = currentExtensions + 1;
  request.expiryWarningSentAt = undefined; // reset so next warning triggers appropriately
  await request.save();

  await logAudit({
    action: "tuition_request_extended",
    actor: req.user?.name,
    actorId: req.user?._id?.toString(),
    entity: "Request",
    targetId: request.id,
    metadata: {
      extensionCount: request.extensionCount,
      newExpiresAt,
    },
  });

  res.status(200).json({
    success: true,
    message: `Your request has been extended by ${REQUEST_EXTENSION_DAYS} days.`,
    expiresAt: newExpiresAt,
    extensionCount: request.extensionCount,
    maxExtensions: maxAllowed,
  });
};

// @desc    Repost an expired or closed tuition request (creates a fresh request document)
// @route   POST /api/requests/:id/repost
// @access  Private (student)
export const repostRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const oldRequest = await Request.findOne({ _id: req.params.id, student: req.user?._id });
  if (!oldRequest) {
    res.status(404).json({ success: false, message: "Original request not found." });
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + MARKETPLACE_REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Create fresh request document, preserving old request for analytics
  const newRequest = await Request.create({
    student: oldRequest.student,
    subject: oldRequest.subject,
    level: oldRequest.level,
    description: req.body?.description || oldRequest.description,
    budget: req.body?.budget !== undefined ? Number(req.body.budget) : oldRequest.budget,
    maximumBudget: oldRequest.maximumBudget,
    pricingUnit: oldRequest.pricingUnit,
    currency: oldRequest.currency,
    allowCounterOffers: req.body?.allowCounterOffers !== undefined ? Boolean(req.body.allowCounterOffers) : oldRequest.allowCounterOffers,
    classGrade: oldRequest.classGrade,
    curriculum: oldRequest.curriculum,
    examType: oldRequest.examType,
    studentLevel: oldRequest.studentLevel,
    learningObjectives: oldRequest.learningObjectives,
    countryCode: oldRequest.countryCode,
    countryName: oldRequest.countryName,
    city: req.body?.city || oldRequest.city,
    timezone: oldRequest.timezone,
    area: req.body?.area || oldRequest.area,
    travelRadiusKm: oldRequest.travelRadiusKm,
    isWorldwideEligible: oldRequest.isWorldwideEligible,
    preferredTutorCountries: oldRequest.preferredTutorCountries,
    tutorGenderPreference: oldRequest.tutorGenderPreference,
    minimumQualification: oldRequest.minimumQualification,
    minimumExperience: oldRequest.minimumExperience,
    preferredLanguage: oldRequest.preferredLanguage,
    preferredTutorRating: oldRequest.preferredTutorRating,
    preferredDays: oldRequest.preferredDays,
    preferredStartTime: oldRequest.preferredStartTime,
    sessionDurationMinutes: oldRequest.sessionDurationMinutes,
    sessionsPerWeek: oldRequest.sessionsPerWeek,
    expectedStartDate: oldRequest.expectedStartDate,
    teachingMode: req.body?.teachingMode || oldRequest.teachingMode,
    schedule: req.body?.schedule || oldRequest.schedule,
    status: "published",
    publishedAt: now,
    expiresAt,
    extensionCount: 0,
    maxExtensions: MAX_REQUEST_EXTENSIONS,
    repostedFromRequestId: oldRequest._id,
  });

  // Dispatch progressive notifications via Smart Matching Engine
  await MatchingService.dispatchProgressiveNotifications(newRequest, req.app.get("io"));

  await logAudit({
    action: "tuition_request_reposted",
    actor: req.user?.name,
    actorId: req.user?._id?.toString(),
    entity: "Request",
    targetId: newRequest.id,
    metadata: {
      repostedFromRequestId: oldRequest.id,
      subject: newRequest.subject,
      budget: newRequest.budget,
    },
  });

  res.status(201).json({
    success: true,
    message: "Your tuition request has been reposted as fresh demand.",
    request: newRequest,
  });
};

// @desc    Close active tuition request before 7 days (stops receiving new offers)
// @route   PATCH /api/requests/:id/close
// @access  Private (student)
export const closeRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await Request.findOne({ _id: req.params.id, student: req.user?._id });
  if (!request) {
    res.status(404).json({ success: false, message: "Request not found." });
    return;
  }

  if (["completed", "booked"].includes(request.status)) {
    res.status(400).json({ success: false, message: "Cannot close a completed or booked request." });
    return;
  }

  request.status = "cancelled";
  await request.save();
  await classifyRequestLoss({
    requestId: request._id,
    explicitReason: "student_cancelled",
    detail: typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : undefined,
    signals: { source: "student_close_request" },
  });

  // Close unfinalized bids
  await Bid.updateMany(
    { request: request._id, status: { $in: ["pending", "submitted", "viewed"] } },
    { $set: { status: "not_selected" } }
  );

  await logAudit({
    action: "tuition_request_closed_by_student",
    actor: req.user?.name,
    actorId: req.user?._id?.toString(),
    entity: "Request",
    targetId: request.id,
  });

  res.status(200).json({ success: true, message: "Tuition request closed successfully." });
};

// Backwards-compatible controller export for legacy integrations/tests. The
// transactional implementation is now named initiateAcceptBid because the
// first step may create a payment hold before final booking confirmation.
export const acceptBid = initiateAcceptBid;
