import mongoose, { Types } from "mongoose";
import { Response } from "express";
import { AuthRequest } from "../types";
import Bid from "../models/Bid.model";
import Request from "../models/Request.model";
import Booking from "../models/Booking.model";
import OfferNegotiation from "../models/OfferNegotiation.model";
import TutorProfile from "../models/TutorProfile.model";
import { checkSubjectEligibility } from "../services/subjectEligibility.service";
import { assertSchoolOfferingActive } from "../services/schoolOfferingAvailability.service";
import { isMarketplaceEligible, isHomeTuitionEligible } from "../services/tracking.service";
import { resolveMarketplaceFees } from "../services/pricing.service";
import { assertParentBookingPolicy } from "../services/parentBookingPolicy.service";
import { reserveOffer, releaseFailedOfferReservation } from "../services/offerReservation.service";
import { containsContactInfo } from "../utils/contentFilter";
import { sendNotification } from "../utils/socket";
import { logAudit } from "../utils/logAudit";
import User from "../models/User.model";
import sendEmail from "../utils/sendEmail";
import { escapeHtml } from "../utils/escapeHtml";
import { calculateMatchScore, sortMarketplaceOffers } from "../utils/marketplaceRules";
import { paymentProvider } from "../services/paymentProvider.service";
import { releaseExpiredPaymentHold } from "./request.controller";
import { MatchingService } from "../services/matching.service";
import MatchLog from "../models/MatchLog.model";
import { assertAcceptanceAvailable, assertMarketFeature } from "../services/market.service";
import { convertAmount } from "../services/exchangeRate.service";
import PromoCode from "../models/PromoCode.model";
import PromoCodeRedemption from "../models/PromoCodeRedemption.model";

const ACTIVE_REQUEST_STATES = ["open", "published", "receiving_offers", "negotiating"] as const;
const ACTIVE_OFFER_STATES = ["pending", "submitted", "viewed", "countered"] as const;
const expiry = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const terminalOfferStates = ["accepted", "rejected", "withdrawn", "expired", "not_selected"];
const PAYMENT_HOLD_MINUTES = 30;
const OFFER_PROFILE_FIELDS = "isVerified averageRating totalReviews experience education subjects qualifications languages teachingMode availability videoIntro demoVideoStatus cnicVerificationStatus degreeVerificationStatus policeVerificationStatus homeTuitionEligible";

function moderationReasons(message = "", amount?: number, baseline?: number) {
  const reasons: string[] = [];
  if (containsContactInfo(message)) reasons.push("external_contact");
  if (amount && baseline && (amount < baseline * 0.35 || amount > baseline * 3)) reasons.push("unusual_price");
  return reasons;
}
async function offerEmail(userId: string, subject: string, message: string) { try { const user = await User.findById(userId).select("name email").lean(); if (user?.email) await sendEmail({ to: user.email, subject, html: `<h2>${escapeHtml(subject)}</h2><p>Hello ${escapeHtml(user.name)},</p><p>${escapeHtml(message)}</p><p><a href="https://tutorera.ac.pk/offers">Review your offers</a></p>` }); } catch (error) { console.error("Offer email failed:", error); } }

async function assertTutorCanOffer(request: { schoolOfferingId?: string; subject: string; level: string }, tutorId: Types.ObjectId, session?: mongoose.ClientSession) {
  await assertSchoolOfferingActive(request.schoolOfferingId, session);
  const query = TutorProfile.findOne({ user: tutorId }).select("subjectEligibility schoolOfferingIds");
  if (session) query.session(session);
  const profile = await query.lean();
  const eligibility = profile ? checkSubjectEligibility(profile, request.subject, request.level) : { eligible: false, message: "Tutor profile not found." };
  if (!eligibility.eligible) throw Object.assign(new Error(eligibility.message), { statusCode: 403, code: "SUBJECT_NOT_APPROVED" });
  if (request.schoolOfferingId && !(profile?.schoolOfferingIds || []).includes(request.schoolOfferingId)) throw Object.assign(new Error("This board and qualification is not in the tutor's teaching preferences."), { statusCode: 403, code: "SCHOOL_OFFERING_NOT_SELECTED" });
}

async function context(offerId: string) {
  const offer = await Bid.findById(offerId);
  if (!offer) return null;
  const request = await Request.findById(offer.request);
  return request ? { offer, request } : null;
}

export const getOfferHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await context(req.params.id as string);
  if (!data) { res.status(404).json({ success: false, message: "Offer not found." }); return; }
  const userId = req.user?._id?.toString();
  if (data.request.student.toString() !== userId && data.offer.tutor.toString() !== userId && req.user?.role !== "admin") { res.status(403).json({ success: false, message: "Not authorized." }); return; }
  const history = await OfferNegotiation.find({ offer: data.offer._id }).sort("sequenceNumber");
  res.json({ success: true, offer: data.offer, history, finalAgreedRate: data.request.finalAgreedRate });
};

export const counterOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const amount = typeof req.body.amount === "number" ? req.body.amount : NaN;
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ success: false, code: "INVALID_AMOUNT", message: "Counter-offer amount must be a positive number." });
    return;
  }
  if (amount > 999999) {
    res.status(400).json({ success: false, code: "AMOUNT_EXCEEDS_LIMIT", message: "Counter-offer amount exceeds maximum allowed (999,999)." });
    return;
  }
  if (message.length > 500) {
    res.status(400).json({ success: false, code: "MESSAGE_TOO_LONG", message: "Message must be 500 characters or less." });
    return;
  }

  const session = await mongoose.startSession(); let negotiation: any; let savedOffer: any; let recipient = ""; let role: "student" | "tutor" = "student"; let finalCounterOffer = false;
  try { await session.withTransaction(async () => {
    const offer = await Bid.findById(req.params.id).session(session); if (!offer) throw { statusCode: 404, message: "Offer not found." };
    const request = await Request.findById(offer.request).session(session); if (!request) throw { statusCode: 404, message: "Request not found." };
    try { await assertMarketFeature(request.countryCode, "negotiation"); } catch (error: any) { throw { statusCode: error.statusCode || 422, code: error.code, message: error.message }; }
    if (!(ACTIVE_REQUEST_STATES as readonly string[]).includes(request.status) || !(ACTIVE_OFFER_STATES as readonly string[]).includes(offer.status)) throw { statusCode: 409, message: "Negotiation is closed." };
    if (offer.expiresAt.getTime() <= Date.now()) { offer.status = "expired"; await offer.save({ session }); throw { statusCode: 410, message: "This offer has expired." }; }

    const MIN_AMOUNT = offer.initialStudentRate * 0.25;
    const MAX_AMOUNT = offer.initialStudentRate * 4;
    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      throw { statusCode: 422, code: "AMOUNT_OUT_OF_RANGE", message: `Counter-offer must be between ${offer.currency} ${MIN_AMOUNT.toLocaleString()} and ${offer.currency} ${MAX_AMOUNT.toLocaleString()}.` };
    }
    const userId = req.user?._id?.toString(); const isStudent = request.student.toString() === userId; const isTutor = offer.tutor.toString() === userId;
    if (!isStudent && !isTutor) throw { statusCode: 403, message: "Not authorized." };
    await assertTutorCanOffer(request, offer.tutor as Types.ObjectId, session);
    if (!request.allowCounterOffers) throw { statusCode: 409, message: "Counter-offers are disabled for this request." };
    role = isStudent ? "student" : "tutor";
    const [roleCount, last] = await Promise.all([OfferNegotiation.countDocuments({ offer: offer._id, senderRole: role, sequenceNumber: { $gt: 1 } }).session(session), OfferNegotiation.findOne({ offer: offer._id }).sort("-sequenceNumber").session(session)]);
    if (roleCount >= 3) throw { statusCode: 409, message: "The maximum of three counter-offers for your side has been reached." };
    if (last?.senderRole === role) throw { statusCode: 409, message: "Wait for the other party to respond." };
    await OfferNegotiation.updateMany({ offer: offer._id, status: "active" }, { status: "superseded" }, { session });
    const expiresAt = expiry(); const reasons = moderationReasons(req.body.message, req.body.amount, offer.initialStudentRate);
    let amountUSD: number | undefined;
    try { amountUSD = await convertAmount(req.body.amount, offer.currency || "PKR", "USD"); } catch { /* non-critical */ }
    [negotiation] = await OfferNegotiation.create([{ offer: offer._id, senderUser: req.user?._id, senderRole: role, amount: req.body.amount, currency: offer.currency || "PKR", amountUSD, message: req.body.message, sequenceNumber: (last?.sequenceNumber || 0) + 1, expiresAt, flaggedForModeration: reasons.length > 0 }], { session });
    offer.amount = req.body.amount; offer.status = "countered"; offer.expiresAt = expiresAt; if (reasons.length) { offer.flaggedForModeration = true; offer.moderationReasons = [...new Set([...(offer.moderationReasons || []), ...reasons])]; } await offer.save({ session });
    request.status = "negotiating"; await request.save({ session }); savedOffer = offer; recipient = isStudent ? offer.tutor.toString() : request.student.toString(); finalCounterOffer = roleCount === 2;
  }); } catch (error: any) { if (error?.statusCode === 410) await Bid.updateOne({ _id: req.params.id, status: { $in: [...ACTIVE_OFFER_STATES] } }, { status: "expired" }); res.status(error.statusCode || (error?.code === 11000 ? 409 : 500)).json({ success: false, code: typeof error?.code === "string" ? error.code : undefined, message: error?.code === 11000 ? "Another counter-offer was submitted first. Refresh and try again." : error.message || "Unable to send counter offer." }); return; } finally { await session.endSession(); }
  await sendNotification(req.app.get("io"), recipient, { title: "Counter Offer Received", message: `${role === "student" ? "The student" : "The tutor"} proposed ${savedOffer.currency} ${req.body.amount.toLocaleString()}/${savedOffer.pricingUnit}.`, type: "bid", link: "/offers" });
  await offerEmail(recipient, "Counter Offer Received", `${role === "student" ? "The student" : "The tutor"} proposed ${savedOffer.currency} ${req.body.amount.toLocaleString()} per ${savedOffer.pricingUnit}.`);
  await logAudit({ action: "offer_countered", actor: req.user?.name, actorId: req.user?._id?.toString(), entity: "Bid", targetId: savedOffer.id, metadata: { amount: req.body.amount, role, sequenceNumber: negotiation.sequenceNumber, flaggedForModeration: negotiation.flaggedForModeration } });
  res.status(201).json({ success: true, message: "Counter offer sent.", offer: savedOffer, negotiation, finalCounterOffer });
};

export const declineOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  const userId = req.user?._id?.toString();
  let student = false; let recipient = ""; let offerId = "";
  try {
    await session.withTransaction(async () => {
      const offer = await Bid.findById(req.params.id).session(session);
      if (!offer) throw { statusCode: 404, message: "Offer not found." };
      const request = await Request.findById(offer.request).session(session);
      if (!request) throw { statusCode: 404, message: "Offer not found." };
      student = request.student.toString() === userId;
      if (!student && offer.tutor.toString() !== userId) throw { statusCode: 403, message: "Not authorized." };
      if (!(ACTIVE_REQUEST_STATES as readonly string[]).includes(request.status) || !(ACTIVE_OFFER_STATES as readonly string[]).includes(offer.status) || offer.expiresAt.getTime() <= Date.now()) throw { statusCode: 409, message: "This offer can no longer be changed." };
      const locked = await Request.updateOne({ _id: request._id, status: { $in: [...ACTIVE_REQUEST_STATES] } }, { $inc: { __v: 1 } }, { session });
      if (!locked.matchedCount) throw { statusCode: 409, message: "This offer can no longer be changed." };
      offer.status = student ? "rejected" : "withdrawn";
      await offer.save({ session });
      await OfferNegotiation.updateMany({ offer: offer._id, status: "active" }, { status: "declined" }, { session });
      recipient = student ? offer.tutor.toString() : request.student.toString(); offerId = offer.id;
    });
  } catch (error) {
    const e = error as { statusCode?: number; message?: string };
    res.status(e.statusCode || 500).json({ success: false, message: e.statusCode ? e.message : "Unable to update this offer. Please try again." }); return;
  } finally { await session.endSession(); }
  await logAudit({ action: student ? "offer_declined" : "offer_withdrawn", actor: req.user?.name, actorId: userId, entity: "Bid", targetId: offerId });
  await sendNotification(req.app.get("io"), recipient, { title: student ? "Offer Declined" : "Offer Withdrawn", message: student ? "The student declined your tutor offer." : "The tutor withdrew an offer from your request.", type: "bid", link: "/offers" }); await offerEmail(recipient, student ? "Offer Declined" : "Offer Withdrawn", student ? "The student declined your tutor offer." : "The tutor withdrew an offer from your request.");
  res.json({ success: true, message: student ? "Offer declined." : "Offer withdrawn." });
};

export const markOfferViewed = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await context(req.params.id as string); if (!data) { res.status(404).json({ success: false, message: "Offer not found." }); return; }
  if (data.request.student.toString() !== req.user?._id?.toString()) { res.status(403).json({ success: false, message: "Not authorized." }); return; }
  const viewed = await Bid.findOneAndUpdate({ _id: data.offer._id, status: "submitted", expiresAt: { $gt: new Date() } }, { $set: { status: "viewed", viewedAt: new Date() } }, { returnDocument: "after" });
  if (viewed) await Promise.all([sendNotification(req.app.get("io"), viewed.tutor.toString(), { title: "Offer Viewed", message: "The student viewed your tutor offer.", type: "bid", link: "/offers" }), offerEmail(viewed.tutor.toString(), "Offer Viewed", "The student viewed your tutor offer."), logAudit({ action: "offer_viewed", actor: req.user?.name, actorId: req.user?._id?.toString(), entity: "Bid", targetId: viewed.id })]);
  const current = viewed || await Bid.findById(data.offer._id);
  res.json({ success: true, offer: current });
};

export const renewOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  let renewed!: InstanceType<typeof Bid>;
  try {
    await session.withTransaction(async () => {
      const offer = await Bid.findOne({ _id: req.params.id, tutor: req.user?._id }).session(session);
      if (!offer) throw { statusCode: 404, message: "Offer not found." };
      const request = await Request.findById(offer.request).session(session);
      if (!request || !(ACTIVE_REQUEST_STATES as readonly string[]).includes(request.status) || (request.expiresAt && request.expiresAt.getTime() <= Date.now())) throw { statusCode: 409, message: "The request is no longer accepting offers." };
      await assertSchoolOfferingActive(request.schoolOfferingId, session);
      const expiredActive = (ACTIVE_OFFER_STATES as readonly string[]).includes(offer.status) && offer.expiresAt && offer.expiresAt.getTime() <= Date.now();
      if (offer.status !== "expired" && !expiredActive) throw { statusCode: 409, message: "Only an expired offer can be renewed." };
      if (!request.allowCounterOffers && req.body.amount !== request.budget) throw { statusCode: 409, message: "This request only accepts the proposed rate." };
      await assertMarketFeature(request.countryCode, "offers");
      const profile = await TutorProfile.findOne({ user: offer.tutor }).session(session);
      if (!profile || !isMarketplaceEligible(profile)) throw { statusCode: 403, code: "TUTOR_NOT_APPROVED", message: "Your profile must be fully verified before you can send offers." };
      if (request.teachingMode === "in-person" && !isHomeTuitionEligible(profile)) throw { statusCode: 403, code: "HOME_TUITION_POLICE_REQUIRED", message: "Home tuition requires approved safety verification." };
      const eligibility = checkSubjectEligibility(profile, request.subject, request.level);
      if (!eligibility.eligible) throw { statusCode: 403, code: "SUBJECT_NOT_APPROVED", message: eligibility.message };
      if (request.schoolOfferingId && !(profile.schoolOfferingIds || []).includes(request.schoolOfferingId)) throw { statusCode: 403, code: "SCHOOL_OFFERING_NOT_SELECTED", message: "This offering is not in your teaching preferences." };
      // Compete with acceptance/cancellation, which also write this request.
      const locked = await Request.updateOne({ _id: request._id, status: { $in: [...ACTIVE_REQUEST_STATES] } }, { $inc: { __v: 1 } }, { session });
      if (!locked.matchedCount) throw { statusCode: 409, message: "The request is no longer accepting offers." };
      const last = await OfferNegotiation.findOne({ offer: offer._id }).sort("-sequenceNumber").session(session);
      const reasons = moderationReasons(req.body.message, req.body.amount, request.budget); const expiresAt = expiry();
      await OfferNegotiation.updateMany({ offer: offer._id, status: "active" }, { status: "expired" }, { session });
      await OfferNegotiation.create([{ offer: offer._id, senderUser: req.user?._id, senderRole: "tutor", amount: req.body.amount, currency: offer.currency || request.currency, message: req.body.message, sequenceNumber: (last?.sequenceNumber || 0) + 1, expiresAt, flaggedForModeration: reasons.length > 0 }], { session });
      offer.amount = req.body.amount; offer.message = req.body.message || offer.message; offer.availability = req.body.availability || offer.availability; offer.status = "submitted"; offer.expiresAt = expiresAt; offer.renewedAt = new Date(); offer.renewalCount = (offer.renewalCount || 0) + 1; offer.viewedAt = undefined; if (reasons.length) { offer.flaggedForModeration = true; offer.moderationReasons = [...new Set([...(offer.moderationReasons || []), ...reasons])]; }
      await offer.save({ session }); renewed = offer;
    });
  } catch (error) {
    const e = error as { statusCode?: number; code?: string | number; message?: string };
    res.status(e.statusCode || (e.code === 11000 ? 409 : 500)).json({ success: false, code: typeof e.code === "string" ? e.code : undefined, message: e.statusCode ? e.message : "Unable to renew this offer. Please try again." });
    return;
  } finally { await session.endSession(); }
  await logAudit({ action: "offer_renewed", actor: req.user?.name, actorId: req.user?._id?.toString(), entity: "Bid", targetId: renewed.id, metadata: { renewalCount: renewed.renewalCount } });
  res.json({ success: true, message: "Offer renewed for 24 hours.", offer: renewed });
};

// @desc    Accept an offer — reserves it and starts a Rapid Gateway checkout.
//          The booking is NOT created here anymore; it's created by
//          finalizeBidAcceptance (request.controller.ts) once payment is
//          confirmed via webhook. This is the REAL accept path the live
//          "Accept" button on the Offers page calls.
//
//          RACE CONDITION PREVENTION: Lock the request and offer status
//          atomically before proceeding. Prevents two concurrent tutors from
//          both passing validation and attempting dual acceptance.
export const acceptOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const offerId = new Types.ObjectId(req.params.id as string);
  const session = await mongoose.startSession();

  try {
    const offer = await Bid.findById(offerId);
    if (!offer) { res.status(404).json({ success: false, message: "Offer not found." }); return; }

    await releaseExpiredPaymentHold(offer.request as Types.ObjectId);

    let request = null as InstanceType<typeof Request> | null;
    await session.withTransaction(async () => {
      request = await Request.findOne({ _id: offer.request, status: { $in: [...ACTIVE_REQUEST_STATES] } }).session(session);
      if (!request) throw { statusCode: 409, message: "This request has already been matched with another tutor." };

      const lockedRequest = await Request.findOneAndUpdate(
        { _id: request._id, status: { $in: [...ACTIVE_REQUEST_STATES] } },
        { $inc: { __v: 1 } },
        { session, returnDocument: "before" }
      );
      if (!lockedRequest) throw { statusCode: 409, message: "This request was just matched with another tutor." };
    });
    if (!request) { res.status(409).json({ success: false, message: "This request has already been matched with another tutor." }); return; }

    try {
      await assertAcceptanceAvailable(request.countryCode);
    } catch (marketError: any) {
      res.status(marketError.statusCode || 409).json({
        success: false,
        code: marketError.code || "MARKET_DISCOVERY_ONLY",
        message: marketError.message,
        market: request.countryCode,
      });
      return;
    }

    const userId = req.user?._id?.toString();
    const isStudentOwner = request.student.toString() === userId;
    const isTutorOwner = offer.tutor.toString() === userId;
    const latestNegotiation = await OfferNegotiation.findOne({ offer: offer._id }).sort("-sequenceNumber");
    if (!isStudentOwner && !(isTutorOwner && latestNegotiation?.senderRole === "student")) {
      res.status(403).json({ success: false, message: "Only the student can accept a tutor offer, or the tutor can accept the student's latest counter." });
      return;
    }

    if (!(ACTIVE_OFFER_STATES as readonly string[]).includes(offer.status) || (offer.expiresAt && offer.expiresAt.getTime() <= Date.now())) {
      res.status(410).json({ success: false, message: "This offer is no longer available." });
      return;
    }

    await assertTutorCanOffer(request, offer.tutor as Types.ObjectId);
    const feeQuote = await resolveMarketplaceFees(offer.amount, request.countryCode || "PK", offer.currency || request.currency);

    // Optional promo code discount applied to studentTotal before checkout
    let promoDiscount = 0;
    let promoCodeDoc: InstanceType<typeof PromoCode> | null = null;
    const promoCodeInput = typeof req.body.promoCode === "string" ? req.body.promoCode.trim().toUpperCase() : null;
    if (promoCodeInput) {
      promoCodeDoc = await PromoCode.findOne({ code: promoCodeInput, isActive: true });
      if (promoCodeDoc) {
        const now = new Date();
        const roleOk = promoCodeDoc.applicableRoles.includes((req.user?.role || "") as "student" | "parent");
        const timingOk = promoCodeDoc.validFrom <= now && (!promoCodeDoc.validUntil || promoCodeDoc.validUntil >= now);
        const amountOk = feeQuote.studentTotal >= promoCodeDoc.minBookingAmount;
        const globalLimitOk = !promoCodeDoc.maxRedemptions || promoCodeDoc.redemptionCount < promoCodeDoc.maxRedemptions;
        const userRedemptions = await PromoCodeRedemption.countDocuments({ promoCode: promoCodeDoc._id, user: req.user?._id, status: { $ne: "cancelled" } });
        const userLimitOk = userRedemptions < promoCodeDoc.maxRedemptionsPerUser;
        if (roleOk && timingOk && amountOk && globalLimitOk && userLimitOk) {
          const raw = promoCodeDoc.discountType === "percentage"
            ? (feeQuote.studentTotal * promoCodeDoc.discountValue) / 100
            : promoCodeDoc.discountValue;
          promoDiscount = Math.min(
            promoCodeDoc.maxDiscountAmount ? Math.min(raw, promoCodeDoc.maxDiscountAmount) : raw,
            feeQuote.studentTotal
          );
          promoDiscount = Math.round(promoDiscount * 100) / 100;
        } else {
          promoCodeDoc = null; // invalid — ignore silently so accept still proceeds at full price
        }
      } else {
        promoCodeDoc = null;
      }
    }

    const checkoutAmount = Math.round((feeQuote.studentTotal - promoDiscount) * 100) / 100;

    if (checkoutAmount <= 0) {
      res.status(422).json({ success: false, code: "INVALID_CHECKOUT_AMOUNT", message: "Invalid booking amount after discounts. Contact support." }); return;
    }
    if (!Number.isFinite(checkoutAmount)) {
      res.status(422).json({ success: false, code: "CALCULATION_ERROR", message: "Amount calculation error. Please try again." }); return;
    }

    const payingStudent = await User.findById(request.student).select("name email phone");
    if (!payingStudent?.phone?.trim()) { res.status(422).json({ success: false, code: "PHONE_REQUIRED", message: "Add a contact phone number to your profile before starting payment." }); return; }


    await assertParentBookingPolicy({ student: request.student, request: request._id, bid: offer._id,
      amount: checkoutAmount, currency: offer.currency || request.currency || "PKR", queueApprovals: true });

    // Reserve the request and the unchanged offer in one transaction. The
    // reservation token fences late responses from an earlier attempt.
    const reservationId = await reserveOffer(request._id as Types.ObjectId, offer, false, undefined, feeQuote, !isTutorOwner);
    if (!reservationId) throw new Error("Payment reservation was not created.");

    if (isTutorOwner) {
      await sendNotification(req.app.get("io"), request.student.toString(), { title: "Counter-offer accepted", message: "Your tutor accepted the counter-offer. Complete payment to confirm the booking.", type: "booking", link: "/offers" });
      res.status(200).json({ success: true, message: "Counter-offer accepted. The student can now complete payment." });
      return;
    }

    try {
      const student = payingStudent;
      const checkout = await paymentProvider.createCheckout({
        amount: checkoutAmount,
        currency: offer.currency || request.currency || "PKR",
        marketCountryCode: request.countryCode,
        feeSnapshot: feeQuote,
        bidId: offer._id.toString(),
        studentId: request.student.toString(),
        tutorId: offer.tutor.toString(),
        customerMobileNo: student.phone!,  // no hardcoded fallback — let gateway handle gracefully
        customerEmail: student?.email || "",
        basketId: `BID-${offer._id.toString()}`,
        description: `TUTORERA offer acceptance ${offer._id.toString()}${promoDiscount > 0 ? ` (promo: ${promoCodeDoc?.code}, discount: ${promoDiscount})` : ""}`,
        successUrl: `${process.env.CLIENT_URL}/offers?payment=success&offer=${offer._id}`,
        failureUrl: `${process.env.CLIENT_URL}/offers?payment=failed&offer=${offer._id}`,
        checkoutUrl: `${process.env.CLIENT_URL}/offers?payment=processing&offer=${offer._id}`,
      });

      const [currentOffer, currentRequest] = await Promise.all([
        Bid.exists({ _id: offer._id, status: "payment_pending", paymentReservationId: reservationId }),
        Request.exists({ _id: request._id, status: "awaiting_payment", acceptedOffer: offer._id }),
      ]);
      if (!currentOffer || !currentRequest) { res.status(409).json({ success: false, code: "PAYMENT_RESERVATION_CHANGED", message: "This payment reservation changed. Contact support before retrying." }); return; }

      // Record promo redemption as "reserved" until booking is confirmed via webhook
      if (promoCodeDoc && promoDiscount > 0) {
        await PromoCodeRedemption.create({
          promoCode: promoCodeDoc._id,
          user: req.user?._id,
          originalAmount: feeQuote.studentTotal,
          discountAmount: promoDiscount,
          finalAmount: checkoutAmount,
          status: "reserved",
        });
        await PromoCode.updateOne({ _id: promoCodeDoc._id }, { $inc: { redemptionCount: 1 } });
      }

      await logAudit({
        action: "offer_accept_checkout_started",
        actor: req.user?.name,
        actorId: userId,
        entity: "Bid",
        targetId: offer.id,
        metadata: { finalAgreedRate: offer.amount },
      });

      res.status(200).json({
        success: true,
        message: "Redirecting to payment. Your booking will be created once payment completes.",
        checkoutUrl: checkout.checkoutUrl,
        promoDiscount: promoDiscount > 0 ? { code: promoCodeDoc?.code, discountAmount: promoDiscount, finalAmount: checkoutAmount } : undefined,
      });
    } catch (err: any) {
      // An error after a gateway request may mean the provider created a
      // session despite a timeout. Keep the hold for reconciliation instead
      // of silently permitting a second payment attempt.
      const knownPreDispatch = ["PHONE_REQUIRED", "PAYMENT_CURRENCY_REQUIRED", "RAPIDPAY_MARKET_OR_CURRENCY_UNSUPPORTED", "PAYMENT_GATEWAY_NOT_CONFIGURED", "INVALID_PAYMENT_AMOUNT"].includes(err?.code);
      if (knownPreDispatch) await releaseFailedOfferReservation(request._id as Types.ObjectId, offer._id as Types.ObjectId, reservationId);
      else await Bid.updateOne({ _id: offer._id, status: "payment_pending", paymentReservationId: reservationId }, { $set: { paymentOutcomeUnknown: true } });
      res.status(knownPreDispatch ? (err.statusCode || 422) : 503).json({ success: false, code: knownPreDispatch ? err.code : "PAYMENT_OUTCOME_UNKNOWN", message: knownPreDispatch ? err.message : "Payment status needs review before another attempt. Contact support." });
    }
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.message || "Unable to accept offer." });
  } finally {
    await session.endSession();
  }
};

export const retryOfferPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  const offer = await Bid.findById(req.params.id);
  if (!offer) { res.status(404).json({ success: false, message: "Offer not found." }); return; }

  if (offer.paymentOutcomeUnknown) { res.status(409).json({ success: false, code: "PAYMENT_OUTCOME_UNKNOWN", message: "Payment status needs review before another attempt. Contact support." }); return; }

  if (offer.status !== "payment_pending") {
    res.status(409).json({ success: false, message: "This offer is not currently awaiting payment." });
    return;
  }

  const request = await Request.findById(offer.request);
  if (!request) { res.status(404).json({ success: false, message: "Request not found." }); return; }

  const userId = req.user?._id?.toString();
  if (request.student.toString() !== userId) {
    res.status(403).json({ success: false, message: "Only the student who accepted this offer can retry payment." });
    return;
  }

  if (request.status !== "awaiting_payment" || request.acceptedOffer?.toString() !== offer._id.toString() || !offer.paymentReservationId) { res.status(409).json({ success: false, code: "PAYMENT_RESERVATION_CHANGED", message: "This payment reservation needs review before another checkout can start." }); return; }

  // Reuse the originally quoted rates on retry (never recalculate a new fee).
  const feeQuote = offer.feeQuote || await resolveMarketplaceFees(offer.amount, request.countryCode || "PK", offer.currency || request.currency);
  offer.feeQuote = feeQuote;
  try {
    await assertParentBookingPolicy({ student: request.student, request: request._id, bid: offer._id,
      amount: feeQuote.studentTotal, currency: offer.currency || request.currency || "PKR", queueApprovals: true });
  } catch (error: any) {
    res.status(error?.statusCode || 409).json({ success: false, code: error?.code || "PARENT_POLICY_BLOCKED", message: error?.message });
    return;
  }

  const retryStudent = await User.findById(request.student).select("name email phone");
  if (!retryStudent?.phone?.trim()) { res.status(422).json({ success: false, code: "PHONE_REQUIRED", message: "Add a contact phone number to your profile before starting payment." }); return; }

  // RapidPay has no configured status reconciliation in this deployment.
  // A checkout already dispatched must be reviewed before creating another.
  const attempt = await Bid.findOneAndUpdate(
    { _id: offer._id, status: "payment_pending", paymentReservationId: offer.paymentReservationId, paymentOutcomeUnknown: { $ne: true }, checkoutStartedAt: { $exists: false } },
    { $set: { checkoutStartedAt: new Date(), paymentPendingExpiresAt: new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000), feeQuote } },
    { returnDocument: "after" },
  );
  if (!attempt) { res.status(409).json({ success: false, code: "PAYMENT_ATTEMPT_BLOCKED", message: "A checkout has already started or needs review. Contact support before retrying." }); return; }

  try {
    const student = retryStudent;
    const checkout = await paymentProvider.createCheckout({
      amount: feeQuote.studentTotal,
      currency: offer.currency || request.currency || "PKR",
      marketCountryCode: request.countryCode,
      feeSnapshot: feeQuote,
      bidId: offer._id.toString(),
      studentId: request.student.toString(),
      tutorId: offer.tutor.toString(),
      customerMobileNo: student.phone!,
      customerEmail: student?.email || "",
      basketId: `BID-${offer._id.toString()}`,
      description: `TUTORERA offer acceptance ${offer._id.toString()} (retry)`,
      successUrl: `${process.env.CLIENT_URL}/offers?payment=success&offer=${offer._id}`,
      failureUrl: `${process.env.CLIENT_URL}/offers?payment=failed&offer=${offer._id}`,
      checkoutUrl: `${process.env.CLIENT_URL}/offers?payment=processing&offer=${offer._id}`,
    });

    const [stillHeld, stillSelected] = await Promise.all([
      Bid.exists({ _id: offer._id, status: "payment_pending", paymentReservationId: attempt.paymentReservationId, checkoutStartedAt: attempt.checkoutStartedAt }),
      Request.exists({ _id: request._id, status: "awaiting_payment", acceptedOffer: offer._id }),
    ]);
    if (!stillHeld || !stillSelected) { res.status(409).json({ success: false, code: "PAYMENT_RESERVATION_CHANGED", message: "This payment reservation changed. Contact support before retrying." }); return; }
    res.status(200).json({ success: true, message: "Payment session created.", checkoutUrl: checkout.checkoutUrl });
  } catch (err: any) {
    const knownPreDispatch = ["PHONE_REQUIRED", "PAYMENT_CURRENCY_REQUIRED", "RAPIDPAY_MARKET_OR_CURRENCY_UNSUPPORTED", "PAYMENT_GATEWAY_NOT_CONFIGURED", "INVALID_PAYMENT_AMOUNT"].includes(err?.code);
    await Bid.updateOne({ _id: offer._id, status: "payment_pending", paymentReservationId: attempt.paymentReservationId, checkoutStartedAt: attempt.checkoutStartedAt }, knownPreDispatch ? { $unset: { checkoutStartedAt: "" } } : { $set: { paymentOutcomeUnknown: true } });
    res.status(knownPreDispatch ? (err.statusCode || 422) : 503).json({ success: false, code: knownPreDispatch ? err.code : "PAYMENT_OUTCOME_UNKNOWN", message: knownPreDispatch ? err.message : "Payment status needs review before another attempt. Contact support." });
  }
};

export const getRequestOffers = async (req: AuthRequest, res: Response): Promise<void> => {
  const request = await Request.findOne({ _id: req.params.requestId, student: req.user?._id });
  if (!request) { res.status(404).json({ success: false, message: "Request not found." }); return; }
  await Bid.updateMany({ request: request._id, expiresAt: { $lte: new Date() }, status: { $in: [...ACTIVE_OFFER_STATES] } }, { status: "expired" });
  const offers = await Bid.find({ request: request._id }).populate("tutor", "name avatar city countryCode countryName").lean();

  const enriched = await Promise.all(offers.map(async offer => {
    const tutorId = (offer.tutor as any)._id;
    const [profile, completedSessions, offerStats, counterRows, latestNegotiation] = await Promise.all([
      TutorProfile.findOne({ user: tutorId }).select(OFFER_PROFILE_FIELDS).lean(),
      Booking.countDocuments({ tutor: tutorId, status: "completed" }),
      Bid.aggregate([
        { $match: { tutor: tutorId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            responded: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["viewed", "countered", "accepted", "rejected", "not_selected"]] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      OfferNegotiation.aggregate([
        { $match: { offer: offer._id, sequenceNumber: { $gt: 1 } } },
        { $group: { _id: "$senderRole", count: { $sum: 1 } } }
      ]),
      OfferNegotiation.findOne({ offer: offer._id }).sort("-sequenceNumber").lean(),
    ]);
    const responseRate = offerStats[0]?.total ? Math.round(offerStats[0].responded / offerStats[0].total * 100) : 100;
    const counterCounts = { student: 0, tutor: 0 };
    counterRows.forEach(row => {
      const key = row._id as "student" | "tutor";
      if (key === "student" || key === "tutor") counterCounts[key] = row.count;
    });

    const match = profile ? await MatchingService.calculateMatchScore(request, profile as any) : null;
    const matchScore = match?.score || 65;
    const matchTier = match?.tier || "good";
    const matchReasons = match?.reasons || [`Offer submitted for ${request.subject}`];
    const breakdown = match?.scoreBreakdown || {};

    const created = new Date((offer as any).createdAt).getTime();
    const responseSeconds = Math.max(0, Math.round((created - request.createdAt.getTime()) / 1000));

    // Update match log asynchronously
    MatchLog.updateOne({ request: request._id, tutor: tutorId }, { $set: { offerReceivedAt: new Date(), offerViewedAt: new Date() } }).exec().catch(() => undefined);

    return {
      ...offer,
      profile,
      completedSessions,
      responseRate,
      responseSeconds,
      matchScore,
      matchTier,
      matchReasons,
      matchScoreBreakdown: breakdown,
      counterCounts,
      latestSenderRole: latestNegotiation?.senderRole,
    };
  }));

  const sort = String(req.query.sort || "best_match");
  let sorted = enriched;
  if (sort === "best_match") {
    sorted = enriched.sort((a, b) => {
      const aPriceFit = a.amount <= request.budget ? 100 : Math.max(20, 100 - ((a.amount - request.budget) / request.budget) * 100);
      const bPriceFit = b.amount <= request.budget ? 100 : Math.max(20, 100 - ((b.amount - request.budget) / request.budget) * 100);
      const aRank = (a.matchScore * 0.6) + (aPriceFit * 0.25) + (Math.max(0, 100 - a.responseSeconds / 60) * 0.15);
      const bRank = (b.matchScore * 0.6) + (bPriceFit * 0.25) + (Math.max(0, 100 - b.responseSeconds / 60) * 0.15);
      return bRank - aRank;
    });
  } else {
    sorted = sortMarketplaceOffers(enriched, sort);
  }

  res.json({ success: true, total: sorted.length, sort, request, offers: sorted });
};

export const getMyOffers = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  await Bid.updateMany({ expiresAt: { $lte: new Date() }, status: { $in: [...ACTIVE_OFFER_STATES] } }, { status: "expired" });
  const filter = req.user?.role === "tutor" ? { tutor: userId } : { request: { $in: (await Request.find({ student: userId }).select("_id").lean()).map(item => item._id) } };
  const offers = await Bid.find(filter).populate("tutor", "name avatar city").populate("request", "subject level budget pricingUnit teachingMode city area schedule status allowCounterOffers student").sort("-updatedAt").lean();
  const result = await Promise.all(offers.map(async offer => {
    const tutorId = (offer.tutor as any)?._id;
    const request = offer.request as any;
    const [history, profile, completedSessions] = await Promise.all([
      OfferNegotiation.find({ offer: offer._id }).sort("sequenceNumber").lean(),
      tutorId ? TutorProfile.findOne({ user: tutorId }).select(OFFER_PROFILE_FIELDS).lean() : null,
      tutorId ? Booking.countDocuments({ tutor: tutorId, status: "completed" }) : 0,
    ]);
    const match = profile && request?._id
      ? await MatchingService.calculateMatchScore(request, profile as any)
      : null;
    return {
      ...offer,
      history,
      profile,
      completedSessions,
      matchScore: match?.score,
      matchTier: match?.tier,
      matchReasons: match?.reasons || [],
      matchScoreBreakdown: match?.scoreBreakdown || {},
    };
  }));
  res.json({ success: true, offers: result });
};

export const shortlistOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const offer = await Bid.findById(id).populate<{ request: { student: unknown } }>("request", "student").lean();
  if (!offer) { res.status(404).json({ success: false, message: "Offer not found" }); return; }
  const requestStudent = (offer.request as { student: unknown })?.student?.toString();
  if (requestStudent !== req.user?._id?.toString()) { res.status(403).json({ success: false, message: "Forbidden" }); return; }
  if (!["submitted", "viewed", "countered"].includes(offer.status)) {
    res.status(409).json({ success: false, message: "Offer cannot be shortlisted in its current state" }); return;
  }
  await Bid.findByIdAndUpdate(id, { shortlistedAt: new Date() });
  res.json({ success: true, message: "Offer shortlisted" });
};
