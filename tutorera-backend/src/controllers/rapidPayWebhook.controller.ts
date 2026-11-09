import crypto from "crypto";
import { Request, Response } from "express";
import logger from "../config/logger";
import { paymentProvider, recordPaymentLedger } from "../services/paymentProvider.service";
import PaymentLedger from "../models/PaymentLedger.model";
import Booking from "../models/Booking.model";
import { finalizeBidAcceptance } from "../controllers/request.controller";
import { finalizePromoRedemption, getAppliedPromoForBasket } from "../services/promoCode.service";

// RapidPay webhook handler.
//
// Register this URL in the RapidPay merchant dashboard (Settings → Webhooks):
//   https://tutorera.ac.pk/api/payments/rapidpay/webhook
//
// Set RAPID_GATEWAY_WEBHOOK_SECRET in Render / Cloudflare to the signing salt
// shown on that same settings page. Never commit the secret to source.
//
// Signature scheme (from RapidPay docs):
//   X-RapidGateway-Signature — HMAC-SHA256(secret, timestamp + "." + rawBody), uppercase hex
//   X-RapidGateway-Timestamp — Unix timestamp (seconds) when the event was sent
//   X-RapidGateway-Event     — event type string (same as payload eventType)
//   X-RapidGateway-Delivery  — delivery attempt UUID
//   Replay window: |now − timestamp| ≤ 300 seconds

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    crypto.timingSafeEqual(ba, ba); // constant-time dummy to avoid length-leak
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

function verifyWebhookSignature(
  rawBody: Buffer,
  providedSignature: string,
  timestamp: string,
  secret: string
): boolean {
  // RapidPay signs: HMAC_SHA256(secret, timestamp + "." + rawRequestBody) → uppercase hex
  const signingInput = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", secret).update(signingInput).digest("hex").toUpperCase();
  return timingSafeEqual(providedSignature.toUpperCase(), expected);
}

function isWithinReplayWindow(timestamp: string): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return Math.abs(Date.now() / 1000 - ts) <= 300;
}

interface RapidPayWebhookPayload {
  eventId?: string;              // de-duplicate on this
  eventType?: string;            // "transaction.completed" | "transaction.failed" | etc.
  status?: string;               // "SUCCESS" | "FAILED" | etc.
  merchantTransactionId?: string;// = the basketId submitted when creating the session
  amount?: number;
  currency?: string;
  gatewayTxnRef?: string;
  merchantId?: number;
  environment?: string;
  occurredAt?: string;
  [key: string]: unknown;
}

function extractWebhookPayload(body: unknown): RapidPayWebhookPayload | null {
  if (!body || typeof body !== "object") return null;
  return body as RapidPayWebhookPayload;
}

/**
 * POST /api/payments/rapidpay/webhook
 *
 * Receives signed notifications from RapidPay. Verifies HMAC signature and
 * 5-minute replay window, then finalizes or rejects the corresponding booking.
 * Safe to call more than once: finalizeBidAcceptance's atomic guard and
 * eventId-based dedup make duplicate deliveries a no-op.
 */
export const handleRapidPayWebhook = async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.RAPID_GATEWAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    logger.error("RAPIDPAY_WEBHOOK_SECRET is not configured — webhook cannot be verified");
    res.status(503).json({ success: false, message: "Webhook verification is not configured." });
    return;
  }

  const providedSignature = req.headers["x-rapidgateway-signature"] as string | undefined;
  const timestamp = req.headers["x-rapidgateway-timestamp"] as string | undefined;
  const rawBody: Buffer | undefined = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!rawBody || !providedSignature || !timestamp) {
    res.status(400).json({ success: false, message: "Missing signature, timestamp, or body." });
    return;
  }

  if (!isWithinReplayWindow(timestamp)) {
    logger.warn({ timestamp }, "Rejected RapidPay webhook outside the 5-minute replay window");
    res.status(401).json({ success: false, message: "Webhook timestamp outside replay window." });
    return;
  }

  if (!verifyWebhookSignature(rawBody, providedSignature, timestamp, secret)) {
    logger.warn({ headers: req.headers }, "Rejected RapidPay webhook with invalid signature");
    res.status(401).json({ success: false, message: "Invalid webhook signature." });
    return;
  }

  const payload = extractWebhookPayload(req.body);
  if (!payload) {
    res.status(400).json({ success: false, message: "Unreadable webhook payload." });
    return;
  }

  const { eventId, eventType, merchantTransactionId: basketId, amount, currency, status } = payload;
  const requestId = (req as Request & { id?: string }).id;

  logger.info({ requestId, eventId, eventType, basketId, status }, "Received verified RapidPay webhook");

  // Acknowledge immediately — RapidPay retries on anything other than 2xx.
  res.status(200).json({ success: true, received: true });

  setImmediate(async () => {
    try {
      const isSuccess = eventType === "transaction.completed" && status === "SUCCESS";
      const isFailure = eventType === "transaction.failed" || status === "FAILED";

      if (!basketId) {
        logger.warn({ requestId, eventType, eventId }, "RapidPay webhook has no merchantTransactionId — cannot reconcile");
        return;
      }

      const checkout = await PaymentLedger.findOne({
        provider: "rapidpay",
        providerTransactionId: basketId,
        eventType: "checkout.created",
      }).sort("-createdAt");

      if (!checkout) {
        logger.warn({ requestId, basketId, eventType }, "RapidPay webhook: no checkout ledger row found for this reference");
        return;
      }

      // Dedup on eventId — same event can arrive more than once.
      if (eventId) {
        const alreadyProcessed = await PaymentLedger.exists({ providerEventId: eventId });
        if (alreadyProcessed) {
          logger.info({ requestId, basketId, eventId }, "RapidPay webhook: duplicate event — ignoring");
          return;
        }
      }

      const alreadySettled = await PaymentLedger.exists({
        provider: "rapidpay",
        providerTransactionId: basketId,
        eventType: "payment.succeeded",
        status: "succeeded",
      });
      if (alreadySettled) {
        logger.info({ requestId, basketId }, "RapidPay webhook: payment already settled — ignoring");
        return;
      }

      if (isSuccess) {
        const expectedAmount = checkout.grossAmount;
        const expectedCurrency = (checkout.currency || "").toUpperCase();
        const receivedAmount = amount ?? expectedAmount;
        const receivedCurrency = (currency || expectedCurrency).toUpperCase();

        if (receivedAmount !== expectedAmount || (expectedCurrency && receivedCurrency !== expectedCurrency)) {
          logger.error(
            { requestId, basketId, expectedAmount, receivedAmount, expectedCurrency, receivedCurrency },
            "RapidPay webhook amount or currency mismatch — refusing to finalize"
          );
          return;
        }

        const sessionId = (checkout.metadata as Record<string, unknown>)?.sessionId as string | undefined;

        if (basketId.startsWith("BID-")) {
          const bidId = basketId.slice("BID-".length);
          const io = req.app.get("io");
          await finalizeBidAcceptance(bidId, io);
          const appliedPromo = await getAppliedPromoForBasket(basketId);
          await recordPaymentLedger({
            providerTransactionId: basketId,
            providerEventId: eventId,
            eventType: "payment.succeeded",
            status: "succeeded",
            amount: receivedAmount,
            currency: receivedCurrency,
            bidId,
            studentId: checkout.student?.toString(),
            tutorId: checkout.tutor?.toString(),
            metadata: { sessionId, eventType, eventId, webhookSource: "rapidpay" },
          });
          if (appliedPromo && checkout.student) {
            await finalizePromoRedemption(
              appliedPromo.promoCodeId,
              checkout.student.toString(),
              basketId,
              appliedPromo.originalAmount,
              appliedPromo.discountAmount,
            ).catch((err) => logger.error({ err, basketId }, "Failed to record promo redemption via webhook"));
          }
          logger.info({ requestId, basketId, bidId }, "RapidPay webhook: bid-backed payment confirmed and booking created");
        } else {
          const booking = await Booking.findById(basketId);
          if (!booking) {
            logger.warn({ requestId, basketId }, "RapidPay webhook: no booking found for this reference");
            return;
          }
          if (booking.paymentStatus !== "confirmed") {
            booking.paymentStatus = "confirmed";
            booking.paymentNote = "Confirmed via RapidPay webhook";
            await booking.save();
          }
          await recordPaymentLedger({
            providerTransactionId: basketId,
            providerEventId: eventId,
            eventType: "payment.succeeded",
            status: "succeeded",
            amount: receivedAmount,
            currency: receivedCurrency,
            bookingId: basketId,
            studentId: checkout.student?.toString(),
            tutorId: checkout.tutor?.toString(),
            metadata: { sessionId, eventType, eventId, webhookSource: "rapidpay" },
          });
          logger.info({ requestId, basketId }, "RapidPay webhook: booking payment confirmed");
        }
      } else if (isFailure) {
        await PaymentLedger.updateOne(
          { _id: checkout._id, status: "pending" },
          { $set: { status: "failed", "metadata.webhookEvent": eventType } }
        );
        await recordPaymentLedger({
          providerTransactionId: basketId,
          providerEventId: eventId,
          eventType: "payment.failed",
          status: "failed",
          amount: checkout.grossAmount,
          currency: checkout.currency,
          bookingId: checkout.booking?.toString(),
          bidId: checkout.bid?.toString(),
          studentId: checkout.student?.toString(),
          tutorId: checkout.tutor?.toString(),
          metadata: { eventType, eventId, webhookSource: "rapidpay" },
        });
        logger.info({ requestId, basketId, eventType }, "RapidPay webhook: payment failure recorded");
      } else {
        logger.info({ requestId, basketId, eventType, status }, "RapidPay webhook: unhandled event type — acknowledged but not acted on");
      }
    } catch (err) {
      logger.error({ err, basketId, eventType }, "RapidPay webhook: unhandled error during async finalization");
    }
  });
};
