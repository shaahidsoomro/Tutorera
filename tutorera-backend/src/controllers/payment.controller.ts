// src/controllers/payment.controller.ts
import { Response, Request } from "express";
import crypto from "crypto";
import PaymentWebhookEvent from "../models/PaymentWebhookEvent.model";
import { AuthRequest } from "../types";
import Booking from "../models/Booking.model";
import ParentProfile from "../models/ParentProfile.model";
import { assertParentBookingPolicy, ParentBookingPolicyError } from "../services/parentBookingPolicy.service";
import User from "../models/User.model";
import Bid from "../models/Bid.model";
import RequestModel from "../models/Request.model";
import PaymentLedger from "../models/PaymentLedger.model";
import { paymentProvider, recordPaymentLedger } from "../services/paymentProvider.service";
import { finalizeBidAcceptance, confirmExistingBookingPayment } from "./request.controller";
import sendEmail from "../utils/sendEmail";
import { paymentConfirmedEmail, paymentFailedEmail, paymentFailedNotifyTutorEmail } from "../utils/emailTemplates";
import { sendNotification } from "../utils/socket";
import logger from "../config/logger";
import { isValidObjectId } from "mongoose";

const FRONTEND_URL = process.env.CLIENT_URL as string;

// @desc    Create an authorized payment checkout session for an EXISTING booking.
//          (Retained for any booking that already exists without payment —
//          the primary path now is initiateAcceptBid, which pays BEFORE the
//          booking is created.)
// @route   POST /api/v1/payments/booking/:bookingId/checkout
// @access  Private (student who owns the booking)
export const createBookingCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  const isParent = req.user?.role === "parent";
  // A booking's optional parent field is not reliably set for existing rows.
  // Use the explicit student-consented ParentProfile link as the authorization
  // source of truth, and re-check it on every checkout/status request.
  const booking = isParent
    ? await Booking.findById(req.params.bookingId)
    : await Booking.findOne({ _id: req.params.bookingId, student: req.user?._id });
  if (isParent && booking) {
    const linked = await ParentProfile.exists({ user: req.user?._id, "children.studentUser": booking.student });
    if (!linked) { res.status(404).json({ success: false, message: "Booking not found" }); return; }
  }

  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found" });
    return;
  }

  if (booking.status !== "upcoming" || !["pending", "failed"].includes(booking.paymentStatus)) {
    res.status(409).json({ success: false, code: "BOOKING_NOT_PAYABLE", message: "This booking is cancelled, completed or has already been paid." });
    return;
  }
  // Direct booking approval is a timed reservation, not a completed lesson.
  // Do not generate a new checkout after its offer hold has expired.
  const directRequest = booking.request ? await RequestModel.findById(booking.request).select("isDirect status acceptedOffer") : null;
  if (directRequest?.isDirect) {
    const activeBid = await Bid.findOne({ _id: booking.bid, status: "payment_pending", paymentPendingExpiresAt: { $gt: new Date() } }).select("_id");
    if (!activeBid || directRequest.status !== "awaiting_payment" || directRequest.acceptedOffer?.toString() !== activeBid._id.toString()) {
      res.status(409).json({ success: false, code: "PAYMENT_HOLD_EXPIRED", message: "This direct-booking reservation expired. Request another tutor confirmation." });
      return;
    }
  }

  if (booking.bid && booking.request) {
    try {
      await assertParentBookingPolicy({
        student: booking.student, request: booking.request, bid: booking.bid,
        amount: booking.studentTotal, currency: booking.currency || "PKR", queueApprovals: true,
      });
    } catch (err: any) {
      res.status(err.statusCode || 409).json({ success: false, code: err.code || "PARENT_POLICY_BLOCKED", message: err.message });
      return;
    }
  }

  const student = await User.findById(isParent ? booking.student : req.user?._id).select("name email phone");
  if (!student) {
    res.status(404).json({ success: false, message: "Student not found" });
    return;
  }

  const payer = isParent ? await User.findById(req.user?._id).select("name email phone") : student;

  if (!payer?.phone?.trim()) { res.status(422).json({ success: false, code: "PHONE_REQUIRED", message: "Add a contact phone number to your profile before starting payment." }); return; }

  const basketId = booking._id.toString();
  let directAttempt: { paymentReservationId?: string; checkoutStartedAt?: Date } | null = null;
  if (directRequest?.isDirect) {
    directAttempt = await Bid.findOneAndUpdate(
      { _id: booking.bid, status: "payment_pending", paymentReservationId: { $exists: true, $ne: "" }, paymentOutcomeUnknown: { $ne: true }, checkoutStartedAt: { $exists: false }, paymentPendingExpiresAt: { $gt: new Date() } },
      { $set: { checkoutStartedAt: new Date() } }, { returnDocument: "after" },
    ).select("paymentReservationId checkoutStartedAt").lean();
    if (!directAttempt) { res.status(409).json({ success: false, code: "PAYMENT_ATTEMPT_BLOCKED", message: "A checkout has already started or needs review. Contact support before retrying." }); return; }
  }

  try {
    const checkout = await paymentProvider.createCheckout({
      amount: booking.studentTotal,
      currency: booking.currency || "",
      marketCountryCode: booking.countryCode,
      feeSnapshot: { subtotal: booking.subtotal, studentFee: booking.studentFee, tutorFee: booking.tutorFee,
        tax: booking.tax, studentTotal: booking.studentTotal, tutorNet: booking.tutorNet,
        currency: booking.currency || "PKR", feeConfig: booking.feeConfig },
      customerMobileNo: payer.phone!,
      customerEmail: payer?.email || student.email,
      basketId,
      bookingId: booking._id.toString(),
      studentId: booking.student.toString(),
      payerId: req.user?._id?.toString(),
      tutorId: booking.tutor.toString(),
      description: `TUTORERA booking ${basketId}`,
      successUrl: `${FRONTEND_URL}/dashboard?payment=success&booking=${basketId}`,
      failureUrl: `${FRONTEND_URL}/dashboard?payment=failed&booking=${basketId}`,
      checkoutUrl: `${FRONTEND_URL}/dashboard?payment=processing&booking=${basketId}`,
    });

    if (directAttempt) {
      const [held, selected] = await Promise.all([
        Bid.exists({ _id: booking.bid, status: "payment_pending", paymentReservationId: directAttempt.paymentReservationId, checkoutStartedAt: directAttempt.checkoutStartedAt }),
        RequestModel.exists({ _id: booking.request, status: "awaiting_payment", acceptedOffer: booking.bid }),
      ]);
      if (!held || !selected) { res.status(409).json({ success: false, code: "PAYMENT_RESERVATION_CHANGED", message: "The payment reservation changed. Contact support before retrying." }); return; }
    }
    res.status(200).json({ success: true, checkoutUrl: checkout.checkoutUrl });
  } catch (err: any) {
    const knownPreDispatch = ["PHONE_REQUIRED", "PAYMENT_CURRENCY_REQUIRED", "RAPIDPAY_MARKET_OR_CURRENCY_UNSUPPORTED", "PAYMENT_GATEWAY_NOT_CONFIGURED", "INVALID_PAYMENT_AMOUNT"].includes(err?.code);
    if (directAttempt) await Bid.updateOne({ _id: booking.bid, status: "payment_pending", paymentReservationId: directAttempt.paymentReservationId, checkoutStartedAt: directAttempt.checkoutStartedAt }, knownPreDispatch ? { $unset: { checkoutStartedAt: "" } } : { $set: { paymentOutcomeUnknown: true } });
    logger.error({ requestId: req.id, code: err?.code }, "Failed to create payment checkout session");
    res.status(knownPreDispatch ? (err.statusCode || 422) : (directAttempt ? 503 : (err?.statusCode || 502))).json({ success: false, code: knownPreDispatch ? err.code : (directAttempt ? "PAYMENT_OUTCOME_UNKNOWN" : undefined), message: knownPreDispatch ? err.message : "Payment status needs review before another attempt. Contact support." });
  }
};

// @desc    Receive payment confirmation webhooks from the authorized payment gateway
// @route   POST /api/v1/payments/webhook
// @access  Public (verified via HMAC signature, not auth middleware)
export const handleRapidGatewayWebhook = async (req: Request, res: Response): Promise<void> => {
  const rawBody: Buffer | undefined = (req as any).rawBody;

  if (!rawBody) {
    logger.error({ requestId: (req as any).id }, "Webhook received with no raw body captured");
    res.status(500).json({ success: false });
    return;
  }

  const signature = req.header("X-RapidGateway-Signature");
  const timestamp = req.header("X-RapidGateway-Timestamp");

  const isValid = paymentProvider.verifyWebhookSignature(rawBody, signature, timestamp);
  if (!isValid) {
    logger.warn({ requestId: (req as any).id }, "Rejected payment webhook — invalid or stale signature");
    res.status(401).json({ success: false, message: "Invalid signature" });
    return;
  }

  const event = paymentProvider.normalizeWebhook(req.body as {
    eventId: string;
    eventType: string;
    merchantTransactionId: string; // == our BASKET_ID
    status: string;
    amount: number;
    currency?: string;
  });

  if (typeof event.merchantTransactionId !== "string" || !event.merchantTransactionId || event.merchantTransactionId.length > 200 || typeof event.eventType !== "string" || !event.eventType || event.eventType.length > 100 || (event.eventId !== undefined && (typeof event.eventId !== "string" || event.eventId.length > 160))) {
    res.status(400).json({ success: false, code: "INVALID_PAYMENT_EVENT", message: "Invalid payment event." }); return;
  }
  // Do not infer a missing transaction currency when reconciling a payment.
  event.currency = typeof req.body?.currency === "string" ? req.body.currency : "";
  const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const durableId = `rapidpay:${event.eventId || payloadHash}`;
  try {
    const stored = await PaymentWebhookEvent.findOneAndUpdate({ _id: durableId }, { $setOnInsert: { provider: "rapidpay", providerEventId: event.eventId || undefined, payloadHash, reference: event.merchantTransactionId, eventType: event.eventType, status: typeof event.status === "string" ? event.status.slice(0, 100) : undefined, amount: event.amount, currency: event.currency ? event.currency.slice(0, 16) : undefined, state: "pending", verifiedAt: new Date() } }, { upsert: true, returnDocument: "after" }).lean();
    if (!stored || stored.payloadHash !== payloadHash) { res.status(409).json({ success: false, code: "PAYMENT_EVENT_CONFLICT", message: "Event identifier was reused with different content." }); return; }
    if (stored.state === "processed") { res.status(200).json({ success: true, code: "ALREADY_CONFIRMED" }); return; }
  } catch (error) {
    logger.error({ requestId: (req as any).id }, "Could not persist verified payment event");
    res.status(503).json({ success: false, message: "Unable to record payment event. Retry later." }); return;
  }
  res.once("finish", () => {
    const state = res.locals.paymentReconciliationRequired ? "exception" : res.statusCode >= 500 ? "exception" : res.statusCode >= 400 ? "unmatched" : "processed";
    const reviewReason = state === "processed" ? undefined : (res.locals.paymentEventReason || (state === "exception" ? "PROCESSING_ERROR" : "UNMATCHED_EVENT"));
    void PaymentWebhookEvent.updateOne({ _id: durableId, state: { $ne: "processed" } }, { $set: { state, ...(reviewReason ? { reviewReason } : {}) }, ...(!reviewReason ? { $unset: { reviewReason: "" } } : {}) }).catch(() => undefined);
  });

  try {
    // Match every settlement to an initiated checkout: an authenticated webhook
    // can still contain the wrong amount, currency or basket ID.
    if (event.eventType === "transaction.completed") {
      if (typeof event.status === "string" && ["failed", "failure", "cancelled", "canceled"].includes(event.status.trim().toLowerCase())) { res.locals.paymentEventReason = "CONTRADICTORY_STATUS"; res.status(409).json({ success: false, code: "PAYMENT_EVENT_CONFLICT" }); return; }
      const quote = await PaymentLedger.findOne({ provider: "rapidpay", providerTransactionId: event.merchantTransactionId, eventType: "checkout.created" }).sort("-createdAt");
      const paidAmount = Number(event.amount);
      if (!quote || !Number.isFinite(paidAmount) || paidAmount <= 0 || Math.abs(quote.grossAmount - paidAmount) > 0.01 || quote.currency.toUpperCase() !== String(event.currency || "").toUpperCase()) {
        res.locals.paymentEventReason = !quote ? "CHECKOUT_LEDGER_MISSING" : "PAYMENT_DETAILS_MISMATCH";
        logger.error({ basketId: event.merchantTransactionId, amount: event.amount, currency: event.currency }, "Payment webhook failed checkout reconciliation");
        res.status(409).json({ success: false, code: "PAYMENT_RECONCILIATION_FAILED" });
        return;
      }
      // Multiple provider events for one basket must never repeat receipts or
      // re-apply an already-settled booking state.
      const previouslySettled = await PaymentLedger.findOne({ provider: "rapidpay", providerTransactionId: event.merchantTransactionId, eventType: "payment.succeeded" }).select("settlementStatus").lean();
      if (previouslySettled) {
        if (previouslySettled.settlementStatus === "exception") { res.locals.paymentReconciliationRequired = true; res.locals.paymentEventReason = "SETTLEMENT_EXCEPTION"; }
        res.status(200).json({ success: true, code: previouslySettled.settlementStatus === "exception" ? "PAYMENT_RECONCILIATION_REQUIRED" : "ALREADY_CONFIRMED" });
        return;
      }
      if (event.merchantTransactionId.startsWith("BID-")) {
        const bidId = event.merchantTransactionId.slice("BID-".length);
        const io = req.app.get("io");
        try {
          await finalizeBidAcceptance(bidId, io);
        } catch (err: any) {
          if (!["BOOKING_SLOT_TAKEN", "INVALID_SCHEDULE", "BOOKING_REQUEST_UNAVAILABLE"].includes(err?.code) && !(err instanceof ParentBookingPolicyError) && err?.code !== 11000) throw err;
          logger.error({ err, bidId }, "Paid offer cannot reserve tutor slot; finance reconciliation required");
        }

        // A late payment can arrive after the 30-minute offer hold expired.
        // Never send a booking-confirmed receipt when booking creation failed;
        // preserve the money movement as an exception for finance reconciliation.
        const completedBooking = await Booking.findOne({ bid: bidId, paymentStatus: "confirmed" });
        if (!completedBooking) {
          const exception = await recordPaymentLedger({
            providerTransactionId: event.merchantTransactionId,
            providerEventId: event.eventId,
            eventType: "payment.succeeded", status: "succeeded", amount: event.amount,
            currency: event.currency, bidId,
            metadata: { settlementException: "Gateway settled but booking could not be finalized" },
          });
          await PaymentLedger.updateOne({ _id: exception._id }, { $set: { settlementStatus: "exception" } });
          logger.error({ bidId, providerEventId: event.eventId }, "Payment settled without a completed booking — manual reconciliation required");
          res.locals.paymentReconciliationRequired = true; res.locals.paymentEventReason = "SETTLEMENT_EXCEPTION"; res.status(200).json({ success: true, code: "PAYMENT_RECONCILIATION_REQUIRED" });
          return;
        }

        const bid = await Bid.findById(bidId);
        if (bid) {
          const request = await RequestModel.findById(bid.request).select("student");
          const student = request ? await User.findById(request.student).select("name email") : null;
          const tutor = await User.findById(bid.tutor).select("name email");
          await recordPaymentLedger({
            providerTransactionId: event.merchantTransactionId,
            providerEventId: event.eventId,
            eventType: "payment.succeeded",
            status: "succeeded",
            amount: event.amount,
            currency: event.currency,
            bidId,
            studentId: request?.student?.toString(),
            tutorId: bid.tutor.toString(),
            metadata: { gatewayStatus: event.status },
          });
          try {
            if (student && tutor) {
              const booking = await Booking.findOne({ bid: bid._id }).populate("request");
              const receipt = paymentConfirmedEmail(student.name, tutor.name, event.amount, {
                bookingId: booking?._id?.toString() || `BID-${bidId}`,
                subject: (booking?.request as any)?.subject,
                schedule: booking?.schedule,
                teachingMode: booking?.teachingMode,
                sessionCount: booking?.sessionCount,
              });
              await sendEmail({ to: student.email, subject: receipt.subject, html: receipt.html, eventType: "payment_successful" });
            }
          } catch (err) {
            logger.error({ err, bidId }, "Failed to send payment receipt email");
          }
        }
      } else {
        const booking = await Booking.findById(event.merchantTransactionId);

        if (!booking) {
          const exception = await recordPaymentLedger({
            providerTransactionId: event.merchantTransactionId, providerEventId: event.eventId,
            eventType: "payment.succeeded", status: "succeeded", amount: event.amount,
            currency: event.currency, metadata: { reconciliationReason: "BOOKING_NOT_FOUND" },
          });
          await PaymentLedger.updateOne({ _id: exception._id }, { $set: { settlementStatus: "exception" } });
          logger.error({ basketId: event.merchantTransactionId }, "Gateway settled against unknown booking");
          res.locals.paymentReconciliationRequired = true; res.status(200).json({ success: true, code: "PAYMENT_RECONCILIATION_REQUIRED" });
          return;
        }

        let newlyConfirmed = false;
        try {
          const finalized = await confirmExistingBookingPayment(booking._id.toString());
          newlyConfirmed = !finalized.alreadyConfirmed;
        } catch (err: any) {
          // The gateway has taken money, but a cancelled/expired or conflicting
          // booking must NOT be presented as confirmed or reserve an occupied slot.
          if (!["BOOKING_SLOT_TAKEN", "INVALID_SCHEDULE", "BOOKING_NOT_PAYABLE", "BOOKING_HOLD_EXPIRED", "BOOKING_NOT_FOUND"].includes(err?.code) && !(err instanceof ParentBookingPolicyError) && err?.code !== 11000) throw err;
          const exception = await recordPaymentLedger({
            providerTransactionId: event.merchantTransactionId, providerEventId: event.eventId,
            eventType: "payment.succeeded", status: "succeeded", amount: event.amount,
            currency: event.currency, bookingId: booking._id.toString(),
            studentId: booking.student.toString(), tutorId: booking.tutor.toString(),
            metadata: { reconciliationReason: err?.code || "BOOKING_CONFLICT" },
          });
          await PaymentLedger.updateOne({ _id: exception._id }, { $set: { settlementStatus: "exception" } });
          logger.error({ err, bookingId: booking._id }, "Gateway settled against unavailable booking");
          res.locals.paymentReconciliationRequired = true; res.status(200).json({ success: true, code: "PAYMENT_RECONCILIATION_REQUIRED" });
          return;
        }
        await recordPaymentLedger({
          providerTransactionId: event.merchantTransactionId,
          providerEventId: event.eventId,
          eventType: "payment.succeeded",
          status: "succeeded",
          amount: event.amount,
          currency: event.currency,
          bookingId: booking._id.toString(),
          studentId: booking.student.toString(),
          tutorId: booking.tutor.toString(),
          metadata: { gatewayStatus: event.status },
        });

        try {
          if (!newlyConfirmed) { res.status(200).json({ success: true, code: "ALREADY_CONFIRMED" }); return; }
          const student = await User.findById(booking.student).select("name email");
          const tutor = await User.findById(booking.tutor).select("name email");
          const populatedBooking = await Booking.findById(booking._id).populate("request");
          if (student && tutor) {
            const receipt = paymentConfirmedEmail(student.name, tutor.name, event.amount, {
              bookingId: booking._id.toString(),
              subject: (populatedBooking?.request as any)?.subject,
              schedule: booking.schedule,
              teachingMode: booking.teachingMode,
              sessionCount: booking.sessionCount,
            });
            await sendEmail({ to: student.email, subject: receipt.subject, html: receipt.html, eventType: "payment_successful" });
          }
        } catch (err) {
          logger.error({ err, bookingId: booking._id }, "Failed to send payment receipt email");
        }
      }
    } else if (event.eventType === "transaction.failed") {
      const quote = await PaymentLedger.findOne({ provider: "rapidpay", providerTransactionId: event.merchantTransactionId, eventType: "checkout.created" }).sort("-createdAt");
      const failedAmount = Number(event.amount);
      if (!quote || !Number.isFinite(failedAmount) || failedAmount <= 0 || Math.abs(quote.grossAmount - failedAmount) > 0.01 || quote.currency.toUpperCase() !== String(event.currency || "").toUpperCase()) {
        res.locals.paymentEventReason = !quote ? "CHECKOUT_LEDGER_MISSING" : "PAYMENT_DETAILS_MISMATCH";
        res.status(409).json({ success: false, code: "PAYMENT_RECONCILIATION_FAILED" }); return;
      }
      const targetId = event.merchantTransactionId.startsWith("BID-") ? event.merchantTransactionId.slice(4) : event.merchantTransactionId;
      const targetExists = isValidObjectId(targetId) && (event.merchantTransactionId.startsWith("BID-") ? await Bid.exists({ _id: targetId }) : await Booking.exists({ _id: targetId }));
      if (!targetExists) { res.locals.paymentReconciliationRequired = true; res.status(200).json({ success: true, code: "PAYMENT_RECONCILIATION_REQUIRED" }); return; }
      logger.info({ requestId: (req as any).id, basketId: event.merchantTransactionId }, "Payment gateway reported a failed transaction");

      if (event.merchantTransactionId.startsWith("BID-")) {
        const bidId = event.merchantTransactionId.slice("BID-".length);
        const bid = await Bid.findById(bidId);
        if (bid) {
        const request = await RequestModel.findById(bid.request).select("student subject");
          const student = request ? await User.findById(request.student).select("name email") : null;
          const tutor = await User.findById(bid.tutor).select("name email");
          await recordPaymentLedger({
            providerTransactionId: event.merchantTransactionId,
            providerEventId: event.eventId,
            eventType: "payment.failed",
            status: "failed",
            amount: event.amount,
            currency: event.currency,
            bidId,
            studentId: request?.student?.toString(),
            tutorId: bid.tutor.toString(),
            metadata: { gatewayStatus: event.status },
          });
          const bookingDetails = { bookingId: `BID-${bidId}`, subject: request?.subject };
          try {
            if (student) {
              const failEmail = paymentFailedEmail(student.name, tutor?.name || "the tutor", event.amount, bookingDetails);
              await sendEmail({ to: student.email, subject: failEmail.subject, html: failEmail.html, eventType: "payment_failed" });
              const io = req.app.get("io");
              if (io) {
                await sendNotification(io, student._id.toString(), {
                  title: "Payment Failed",
                  message: "Your payment could not be processed. Please try again or contact support.",
                  type: "general",
                  link: "/dashboard",
                });
              }
            }
            if (tutor) {
              const tutorEmail = paymentFailedNotifyTutorEmail(tutor.name, student?.name || "the student", event.amount, bookingDetails);
              await sendEmail({ to: tutor.email, subject: tutorEmail.subject, html: tutorEmail.html, eventType: "payment_failed_tutor" });
            }
          } catch (err) {
            logger.error({ err, bidId }, "Failed to send payment failure notification");
          }
        }
      } else {
        const booking = await Booking.findById(event.merchantTransactionId);
        if (booking) {
          await recordPaymentLedger({
            providerTransactionId: event.merchantTransactionId,
            providerEventId: event.eventId,
            eventType: "payment.failed",
            status: "failed",
            amount: event.amount,
            currency: event.currency,
            bookingId: booking._id.toString(),
            studentId: booking.student.toString(),
            tutorId: booking.tutor.toString(),
            metadata: { gatewayStatus: event.status },
          });
          const requestDoc = booking.request ? await RequestModel.findById(booking.request).select("subject") : null;
          const bookingDetails = { bookingId: booking._id.toString(), subject: requestDoc?.subject, schedule: booking.schedule, teachingMode: booking.teachingMode, sessionCount: booking.sessionCount };
          const student = await User.findById(booking.student).select("name email");
          const tutor = await User.findById(booking.tutor).select("name email");
          try {
            if (student) {
              const failEmail = paymentFailedEmail(student.name, tutor?.name || "the tutor", event.amount, bookingDetails);
              await sendEmail({ to: student.email, subject: failEmail.subject, html: failEmail.html, eventType: "payment_failed" });
              const io = req.app.get("io");
              if (io) {
                await sendNotification(io, student._id.toString(), {
                  title: "Payment Failed",
                  message: "Your payment could not be processed. Please try again or contact support.",
                  type: "general",
                  link: "/dashboard",
                });
              }
            }
            if (tutor) {
              const tutorEmail = paymentFailedNotifyTutorEmail(tutor.name, student?.name || "the student", event.amount, bookingDetails);
              await sendEmail({ to: tutor.email, subject: tutorEmail.subject, html: tutorEmail.html, eventType: "payment_failed_tutor" });
            }
          } catch (err) {
            logger.error({ err, bookingId: booking._id }, "Failed to send payment failure notification");
          }
        }
      }
    }

    if (!["transaction.completed", "transaction.failed"].includes(event.eventType)) { res.locals.paymentReconciliationRequired = true; res.locals.paymentEventReason = "UNSUPPORTED_EVENT_TYPE"; }
    res.status(200).json({ success: true });
  } catch (err) {
    logger.error({ requestId: (req as any).id, err }, "Error processing payment gateway webhook");
    res.status(500).json({ success: false });
  }
};

// A gateway-return URL is NOT evidence of payment. This endpoint reads only
// server-owned booking state, scoped to the authenticated student or parent.
export const getVerifiedPaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { kind, id } = req.params;
  if (!isValidObjectId(id) || !["booking", "bid"].includes(String(kind))) {
    res.status(400).json({ success: false, message: "Invalid payment reference." });
    return;
  }
  const userId = req.user?._id;
  let booking;
  if (kind === "booking") {
    booking = req.user?.role === "parent" ? await Booking.findById(id)
      : await Booking.findOne({ _id: id, student: userId });
    if (req.user?.role === "parent" && booking) {
      const linked = await ParentProfile.exists({ user: userId, "children.studentUser": booking.student });
      if (!linked) { res.status(404).json({ success: false, message: "Payment reference not found." }); return; }
    }
    if (!booking) { res.status(404).json({ success: false, message: "Payment reference not found." }); return; }
  } else {
    const bid = await Bid.findById(id).select("request");
    const request = bid ? await RequestModel.findOne({ _id: bid.request, student: userId }).select("_id") : null;
    if (!request) { res.status(404).json({ success: false, message: "Payment reference not found." }); return; }
    booking = await Booking.findOne({ bid: id, student: userId });
    if (!booking) { res.json({ success: true, verified: false, paymentStatus: "pending", bookingStatus: "pending" }); return; }
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, verified: booking.paymentStatus === "confirmed", paymentStatus: booking.paymentStatus,
    bookingStatus: booking.status, bookingId: booking._id, currency: booking.currency, amount: booking.studentTotal });
};

// @desc    Get student's transaction history
// @route   GET /api/payments/history
// @access  Private (student or parent)
export const getTransactionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = "1" } = req.query;
  const limitNum = 20;
  const skip = (Number(page) - 1) * limitNum;

  const ledgerFilter: Record<string, unknown> = req.user?.role === "parent"
    ? { payer: req.user?._id } : { student: req.user?._id };
  if (status) ledgerFilter.status = status;

  const [transactions, total] = await Promise.all([
    PaymentLedger.find(ledgerFilter)
      .populate<{ booking: { schedule?: string; teachingMode?: string; status?: string } }>("booking", "schedule teachingMode status")
      .populate<{ tutor: { name: string } }>("tutor", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(limitNum)
      .lean(),
    PaymentLedger.countDocuments(ledgerFilter),
  ]);

  const bookingIds = transactions
    .map((t) => (t.booking as unknown as { _id: { toString: () => string } })?._id?.toString())
    .filter(Boolean);

  const bookings = bookingIds.length
    ? await Booking.find({ _id: { $in: bookingIds } }).select("student tutor request pricingUnit sessionCount").populate("request", "subject").lean()
    : [];

  const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));

  const enriched = transactions.map((t) => {
    const booking = t.booking as unknown as { _id: { toString: () => string }; schedule?: string; teachingMode?: string; status?: string };
    const bookingData = booking?._id ? bookingMap.get(booking._id.toString()) : null;
    const eventLabels: Record<string, string> = {
      "payment.succeeded": "Payment Received",
      "payment.refunded": "Refund Processed",
      "payment.failed": "Payment Failed",
      "checkout.created": "Checkout Initiated",
    };
    return {
      _id: t._id,
      type: t.eventType,
      typeLabel: eventLabels[t.eventType] || t.eventType,
      status: t.status,
      amount: t.grossAmount,
      currency: t.currency,
      refundAmount: t.refundAmount,
      createdAt: t.createdAt,
      booking: bookingData
        ? {
            id: (booking._id as unknown as { toString: () => string }).toString(),
            subject: (bookingData.request as unknown as { subject?: string })?.subject || "Tutoring",
            schedule: booking?.schedule || "",
            teachingMode: booking?.teachingMode || "online",
            bookingStatus: booking?.status || "",
            sessionCount: bookingData.sessionCount || 1,
            tutorName: t.tutor ? (t.tutor as unknown as { name: string }).name : "Tutor",
          }
        : null,
      providerTransactionId: t.providerTransactionId,
    };
  });

  res.status(200).json({
    success: true,
    transactions: enriched,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limitNum) },
  });
};
