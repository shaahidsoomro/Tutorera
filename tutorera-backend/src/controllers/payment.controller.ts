// src/controllers/payment.controller.ts
import { Response, Request } from "express";
import { AuthRequest } from "../types";
import Booking from "../models/Booking.model";
import User from "../models/User.model";
import Bid from "../models/Bid.model";
import RequestModel from "../models/Request.model";
import PaymentLedger from "../models/PaymentLedger.model";
import { paymentProvider, recordPaymentLedger } from "../services/paymentProvider.service";
import { finalizeBidAcceptance } from "./request.controller";
import { NotificationService } from "../services/notification.service";
import logger from "../config/logger";
import { calculateMarketplaceFees } from "../services/pricing.service";
import { assertAcceptanceAvailable } from "../services/market.service";
import { getAppliedPromoForBasket, previewPromoDiscount, finalizePromoRedemption, PromoCodeError } from "../services/promoCode.service";

const FRONTEND_URL = process.env.CLIENT_URL as string;

// @desc    Create an authorized payment checkout session for an EXISTING booking.
//          (Retained for any booking that already exists without payment —
//          the primary path now is initiateAcceptBid, which pays BEFORE the
//          booking is created.)
// @route   POST /api/v1/payments/booking/:bookingId/checkout
// @access  Private (student who owns the booking)
export const createBookingCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  const isParent = req.user?.role === "parent";
  const booking = isParent
    ? await Booking.findOne({ _id: req.params.bookingId, parent: req.user?._id })
    : await Booking.findOne({ _id: req.params.bookingId, student: req.user?._id });

  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found" });
    return;
  }

  if (booking.paymentStatus === "confirmed") {
    res.status(400).json({ success: false, message: "This booking has already been paid." });
    return;
  }

  try {
    await assertAcceptanceAvailable(booking.countryCode);
  } catch (marketError: any) {
    res.status(marketError.statusCode || 409).json({
      success: false,
      code: marketError.code || "MARKET_DISCOVERY_ONLY",
      message: marketError.message,
      market: booking.countryCode,
    });
    return;
  }

  const student = await User.findById(isParent ? booking.student : req.user?._id).select("name email phone");
  if (!student) {
    res.status(404).json({ success: false, message: "Student not found" });
    return;
  }

  const payer = isParent ? await User.findById(req.user?._id).select("name email phone") : student;

  const basketId = booking._id.toString();

  try {
    let appliedPromo: { promoCodeId: string; code: string; discountAmount: number } | undefined;
    const originalStudentTotal = booking.studentTotal || booking.amount;
    const promoCodeInput = req.body?.promoCode;
    if (promoCodeInput) {
      appliedPromo = await previewPromoDiscount(booking.student.toString(), req.user?.role, promoCodeInput, originalStudentTotal);
      // Persist the discount straight onto the booking - unlike the
      // bid-acceptance flow, this booking already exists, so there's no
      // separate finalization step to apply it to later.
      booking.studentFee = Math.max(0, (booking.studentFee || 0) - appliedPromo.discountAmount);
      booking.studentTotal = booking.subtotal + booking.studentFee;
      await booking.save();
    }

    // This booking's commission/tax were already fixed at creation time, but
    // gateway fee depends on the amount actually charged right now (which a
    // promo discount above may have just changed) - look up the current
    // active gateway rate and compute it fresh rather than assuming 0.
    const currentFeeConfig = await calculateMarketplaceFees(booking.subtotal, { currency: booking.currency, countryCode: booking.countryCode });
    const gatewayFee = Math.round(
      (booking.studentTotal || booking.amount) * currentFeeConfig.feeConfig.gatewayFeePercent / 100 + currentFeeConfig.feeConfig.gatewayFixedFee
    );

    const checkoutUrl = await paymentProvider.createCheckout({
      amount: booking.studentTotal || booking.amount,
      currency: booking.currency || "PKR",
      customerMobileNo: payer?.phone || "03000000000",
      customerEmail: payer?.email || student.email,
      basketId,
      bookingId: booking._id.toString(),
      studentId: booking.student.toString(),
      tutorId: booking.tutor.toString(),
      feeSnapshot: {
        subtotal: booking.subtotal,
        studentFee: booking.studentFee,
        tutorFee: booking.tutorFee,
        tax: booking.tax,
        studentTotal: booking.studentTotal,
        tutorNet: booking.tutorNet,
        platformFee: booking.platformFee,
        gatewayFee,
        feeConfig: booking.feeConfig,
      },
      description: `TUTORERA booking ${basketId}`,
      successUrl: `${FRONTEND_URL}/dashboard?payment=success&booking=${basketId}`,
      failureUrl: `${FRONTEND_URL}/dashboard?payment=failed&booking=${basketId}`,
      checkoutUrl: `${FRONTEND_URL}/dashboard?payment=processing&booking=${basketId}`,
      ...(appliedPromo && { metadata: { appliedPromo: { ...appliedPromo, originalAmount: originalStudentTotal } } }),
    });

    res.status(200).json({ success: true, checkoutUrl });
  } catch (err: any) {
    if (err instanceof PromoCodeError) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }
    logger.error({ requestId: req.id, err }, "Failed to create payment checkout session");
    const statusCode = err?.statusCode || 502;
    res.status(statusCode).json({ success: false, message: "Unable to start payment. Please try again." });
  }
};

// @desc    Receive payment confirmation webhooks from Rapid Gateway
// @route   POST /api/v1/payments/webhook
// @access  Public (verified via HMAC signature, not auth middleware)
export const handleRapidGatewayWebhook = async (req: Request, res: Response): Promise<void> => {
  const rawBody: Buffer | undefined = (req as any).rawBody;

  if (!rawBody) {
    logger.error({ requestId: (req as any).id }, "Webhook received with no raw body captured");
    res.status(500).json({ success: false });
    return;
  }

  // Prefer Rapid Gateway's current signed-webhook headers. RapidPay aliases
  // are accepted only for the provider's documented transition period; the
  // older X-RG-Signature format is supported for legacy deliveries.
  const signature =
    req.header("x-rapidgateway-signature") ||
    req.header("x-rapidpay-signature") ||
    req.header("x-rg-signature") ||
    "";
  const timestamp =
    req.header("x-rapidgateway-timestamp") ||
    req.header("x-rapidpay-timestamp") ||
    req.header("x-rg-timestamp") ||
    "";

  const isValid = paymentProvider.verifyWebhookSignature(rawBody, signature, timestamp);
  if (!isValid) {
    logger.warn({ requestId: (req as any).id }, "Rejected Rapid Gateway webhook — invalid or stale signature");
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

  try {
    if (event.eventType === "transaction.completed") {
      if (event.merchantTransactionId.startsWith("BID-")) {
        const bidId = event.merchantTransactionId.slice("BID-".length);
        const bid = await Bid.findById(bidId);
        const request = bid ? await RequestModel.findById(bid.request).select("student currency countryCode teachingMode") : null;
        // A promo code applied at checkout reduces the amount actually
        // charged below the full computed fee - without this, every
        // discounted payment would fail this check and never be finalized.
        const appliedPromo = await getAppliedPromoForBasket(event.merchantTransactionId);
        const baseExpectedAmount = bid
          ? (await calculateMarketplaceFees(bid.amount, {
              currency: bid.currency || request?.currency,
              countryCode: request?.countryCode,
              teachingMode: request?.teachingMode as "online" | "in-person" | "both" | undefined,
            })).studentTotal
          : undefined;
        const expectedAmount = baseExpectedAmount !== undefined && appliedPromo
          ? Math.round((baseExpectedAmount - appliedPromo.discountAmount) * 100) / 100
          : baseExpectedAmount;
        const expectedCurrency = (bid?.currency || request?.currency || "PKR").toUpperCase();
        if (!bid || !request || event.amount !== expectedAmount || event.currency.toUpperCase() !== expectedCurrency) {
          logger.error({ requestId: (req as any).id, bidId, expectedAmount, receivedAmount: event.amount, expectedCurrency, receivedCurrency: event.currency }, "Payment webhook amount or currency did not match the accepted offer");
          res.status(422).json({ success: false, message: "Payment amount or currency mismatch" });
          return;
        }
        const io = req.app.get("io");
        await finalizeBidAcceptance(bidId, io);

        const finalizedBid = await Bid.findById(bidId);
        if (finalizedBid) {
          const student = request ? await User.findById(request.student).select("name email") : null;
          const tutor = await User.findById(finalizedBid.tutor).select("name email");
          const finalizedBooking = await Booking.findOne({ bid: finalizedBid._id });
          await recordPaymentLedger({
            providerTransactionId: event.merchantTransactionId,
            providerEventId: event.eventId,
            eventType: "payment.succeeded",
            status: "succeeded",
            amount: event.amount,
            currency: event.currency,
            bidId,
            studentId: request?.student?.toString(),
            tutorId: finalizedBid.tutor.toString(),
            bookingId: finalizedBooking?._id?.toString(),
            feeSnapshot: finalizedBooking ? {
              subtotal: finalizedBooking.subtotal, studentFee: finalizedBooking.studentFee,
              tutorFee: finalizedBooking.tutorFee, tax: finalizedBooking.tax,
              studentTotal: finalizedBooking.studentTotal, tutorNet: finalizedBooking.tutorNet,
              platformFee: finalizedBooking.platformFee, feeConfig: finalizedBooking.feeConfig,
            } : undefined,
            metadata: { gatewayStatus: event.status },
          });
          try {
            if (student && tutor) {
              const booking = await Booking.findOne({ bid: bid._id }).populate("request");
              await NotificationService.publishEvent(student._id.toString(), "payment.succeeded", {
                amount: event.amount,
                bookingId: booking?._id?.toString() || `BID-${bidId}`,
                subject: (booking?.request as any)?.subject,
                schedule: booking?.schedule,
                teachingMode: booking?.teachingMode,
                sessionCount: booking?.sessionCount,
              });
            }
          } catch (err) {
            logger.error({ err, bidId }, "Failed to send payment receipt email");
          }
        }
      } else {
        const booking = await Booking.findById(event.merchantTransactionId);

        if (!booking) {
          logger.warn({ requestId: (req as any).id, basketId: event.merchantTransactionId }, "Webhook for unknown booking");
          res.status(200).json({ success: true });
          return;
        }

        const expectedAmount = booking.studentTotal || booking.amount;
        const expectedCurrency = (booking.currency || "PKR").toUpperCase();
        if (event.amount !== expectedAmount || event.currency.toUpperCase() !== expectedCurrency) {
          logger.error({ requestId: (req as any).id, bookingId: booking._id, expectedAmount, receivedAmount: event.amount, expectedCurrency, receivedCurrency: event.currency }, "Payment webhook amount or currency did not match the booking");
          res.status(422).json({ success: false, message: "Payment amount or currency mismatch" });
          return;
        }

        if (booking.paymentStatus !== "confirmed") {
          booking.paymentStatus = "confirmed";
          booking.paymentNote = `Confirmed via Rapid Gateway (event ${event.eventId})`;
          await booking.save();

          const appliedPromo = await getAppliedPromoForBasket(event.merchantTransactionId);
          if (appliedPromo) {
            await finalizePromoRedemption(appliedPromo.promoCodeId, booking.student.toString(), booking._id.toString(), appliedPromo.originalAmount, appliedPromo.discountAmount).catch((err) =>
              logger.error({ err, bookingId: booking._id }, "Failed to record promo code redemption for booking checkout")
            );
          }
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
          feeSnapshot: {
            subtotal: booking.subtotal, studentFee: booking.studentFee, tutorFee: booking.tutorFee,
            tax: booking.tax, studentTotal: booking.studentTotal, tutorNet: booking.tutorNet,
            platformFee: booking.platformFee, feeConfig: booking.feeConfig,
          },
          metadata: { gatewayStatus: event.status },
        });

        try {
          const student = await User.findById(booking.student).select("name email");
          const tutor = await User.findById(booking.tutor).select("name email");
          const populatedBooking = await Booking.findById(booking._id).populate("request");
          if (student && tutor) {
            await NotificationService.publishEvent(student._id.toString(), "payment.succeeded", {
              amount: event.amount,
              bookingId: booking._id.toString(),
              subject: (populatedBooking?.request as any)?.subject,
              schedule: booking.schedule,
              teachingMode: booking.teachingMode,
              sessionCount: booking.sessionCount,
            });
          }
        } catch (err) {
          logger.error({ err, bookingId: booking._id }, "Failed to send payment receipt email");
        }
      }
    } else if (event.eventType === "transaction.failed") {
      logger.info({ requestId: (req as any).id, basketId: event.merchantTransactionId }, "Rapid Gateway reported a failed transaction");

      if (event.merchantTransactionId.startsWith("BID-")) {
        const bidId = event.merchantTransactionId.slice("BID-".length);
        const bid = await Bid.findById(bidId);
        // Gate failure side effects on the pending state. Gateways can deliver
        // a delayed failure after a successful event; that must never produce
        // a contradictory failure notification or ledger entry.
        if (bid?.status === "payment_pending") {
        const request = await RequestModel.findById(bid.request).select("student subject countryCode teachingMode");
          const student = request ? await User.findById(request.student).select("name email") : null;
          const tutor = await User.findById(bid.tutor).select("name email");
          // No Booking exists yet at this point (failed payments never reach
          // finalizeBidAcceptance), so fees must be computed fresh - with the
          // real country/teaching mode, not the ledger's fallback recompute
          // (which has neither and silently applies Pakistan's tax config to
          // every country's failed-payment records).
          const fees = await calculateMarketplaceFees(bid.amount, {
            currency: bid.currency || event.currency,
            countryCode: request?.countryCode,
            teachingMode: request?.teachingMode as "online" | "in-person" | "both" | undefined,
          });
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
            feeSnapshot: { ...fees, platformFee: fees.tutorFee + fees.tax },
            metadata: { gatewayStatus: event.status },
          });
          const bookingDetails = { bookingId: `BID-${bidId}`, subject: request?.subject };
          try {
            if (student) {
              await NotificationService.publishEvent(student._id.toString(), "payment.failed", {
                amount: event.amount,
                bookingId: `BID-${bidId}`,
                subject: request?.subject,
                tutorName: tutor?.name || "the tutor"
              });
            }
            if (tutor) {
              await NotificationService.publishEvent(tutor._id.toString(), "payment.failed", { // Maybe we need a payment.failed.tutor event
                amount: event.amount,
                bookingId: `BID-${bidId}`,
                subject: request?.subject,
                studentName: student?.name || "the student"
              });
            }
          } catch (err) {
            logger.error({ err, bidId }, "Failed to send payment failure notification");
          }
        }
      } else {
        const booking = await Booking.findById(event.merchantTransactionId);
        // A delayed failure must not contradict an already confirmed booking.
        if (booking && booking.paymentStatus !== "confirmed") {
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
            // Reuse the booking's own already-computed fees, same as the
            // payment.succeeded branch above - without this, the ledger
            // fallback recomputes fees with no countryCode/teachingMode and
            // silently applies Pakistan's tax config to every country's
            // failed-payment records.
            feeSnapshot: {
              subtotal: booking.subtotal, studentFee: booking.studentFee, tutorFee: booking.tutorFee,
              tax: booking.tax, studentTotal: booking.studentTotal, tutorNet: booking.tutorNet,
              platformFee: booking.platformFee, feeConfig: booking.feeConfig,
            },
            metadata: { gatewayStatus: event.status },
          });
          const requestDoc = booking.request ? await RequestModel.findById(booking.request).select("subject") : null;
          const bookingDetails = { bookingId: booking._id.toString(), subject: requestDoc?.subject, schedule: booking.schedule, teachingMode: booking.teachingMode, sessionCount: booking.sessionCount };
          const student = await User.findById(booking.student).select("name email");
          const tutor = await User.findById(booking.tutor).select("name email");
          try {
            if (student) {
              await NotificationService.publishEvent(student._id.toString(), "payment.failed", {
                amount: event.amount,
                bookingId: booking._id.toString(),
                subject: requestDoc?.subject,
                schedule: booking.schedule,
                teachingMode: booking.teachingMode,
                sessionCount: booking.sessionCount,
                tutorName: tutor?.name || "the tutor"
              });
            }
            if (tutor) {
              await NotificationService.publishEvent(tutor._id.toString(), "payment.failed", {
                amount: event.amount,
                bookingId: booking._id.toString(),
                subject: requestDoc?.subject,
                schedule: booking.schedule,
                teachingMode: booking.teachingMode,
                sessionCount: booking.sessionCount,
                studentName: student?.name || "the student"
              });
            }
          } catch (err) {
            logger.error({ err, bookingId: booking._id }, "Failed to send payment failure notification");
          }
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    logger.error({ requestId: (req as any).id, err }, "Error processing Rapid Gateway webhook");
    res.status(500).json({ success: false });
  }
};

// @desc    Get student's transaction history
// @route   GET /api/payments/history
// @access  Private (student or parent)
export const getTransactionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = "1" } = req.query;
  const limitNum = 20;
  const skip = (Number(page) - 1) * limitNum;

  const ledgerFilter: Record<string, unknown> = { student: req.user?._id };
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