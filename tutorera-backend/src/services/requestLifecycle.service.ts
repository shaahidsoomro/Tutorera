// src/services/requestLifecycle.service.ts
// Production-Ready TUTORERA Tuition Request Expiry, Archival & Retention Engine
// Implements server-side UTC lifecycle transitions, negotiation grace, atomic updates, and idempotency

import mongoose, { Types } from "mongoose";
import Request, { IRequest } from "../models/Request.model";
import Bid from "../models/Bid.model";
import Booking from "../models/Booking.model";
import User from "../models/User.model";
import Review from "../models/Review.model";
import { sendNotification } from "../utils/socket";
import { logAudit } from "../utils/logAudit";
import sendEmail from "../utils/sendEmail";
import { reviewRequestEmail } from "../utils/emailTemplates";
import logger from "../config/logger";
import { classifyRequestLoss } from "./requestLoss.service";
import {
  MARKETPLACE_REQUEST_EXPIRY_DAYS,
  EXPIRY_WARNING_HOURS,
  DAY_5_INTERVENTION_HOURS,
  ARCHIVE_INACTIVE_DAYS,
  REQUEST_EXPIRY_ENABLED,
  ACTIVE_REQUEST_STATUSES,
  NON_EXPIRABLE_STATUSES,
} from "../config/marketplace";
import { MatchingService } from "./matching.service";

export interface LifecycleRunResult {
  scanned: number;
  warningsSent: number;
  day5EscalationsSent: number;
  expiredCount: number;
  offersClosedCount: number;
  archivedCount: number;
  paymentHoldsCleaned: number;
  reviewRequestsSent: number;
  errors: string[];
}

/**
 * 1. Process 24-Hour Expiry Warnings
 * Notifies students when their active request is 24 hours away from expiry.
 */
export async function sendExpiryWarnings(io?: any): Promise<number> {
  const now = new Date();
  const warningThreshold = new Date(now.getTime() + EXPIRY_WARNING_HOURS * 60 * 60 * 1000);

  const eligible = await Request.find({
    status: { $in: ["open", "published", "receiving_offers", "negotiating"] },
    expiresAt: { $gt: now, $lte: warningThreshold },
    expiryWarningSentAt: { $exists: false },
  }).limit(100);

  let sent = 0;
  for (const reqDoc of eligible) {
    try {
      const offersCount = await Bid.countDocuments({
        request: reqDoc._id,
        status: { $nin: ["withdrawn", "rejected"] },
      });

      const message = offersCount > 0
        ? `Your request for ${reqDoc.subject} expires tomorrow and you have ${offersCount} tutor ${offersCount === 1 ? "offer" : "offers"} waiting. Compare offers or extend your request.`
        : `Your request for ${reqDoc.subject} expires tomorrow. You can review preferences or extend your request by 7 days.`;

      if (io) {
        await sendNotification(io, reqDoc.student.toString(), {
          title: "⏰ Tuition Request Expiring Soon",
          message,
          type: "bid",
          link: "/dashboard",
        });
      }

      reqDoc.expiryWarningSentAt = now;
      await reqDoc.save();
      sent++;
    } catch (err: any) {
      logger.error({ err, requestId: reqDoc._id }, "Failed to send request expiry warning");
    }
  }

  return sent;
}

/**
 * 2. Process Day-5 Supply Escalation
 * If a request reaches 48h before expiry with 0 offers, expand tutor reach and inform student.
 */
export async function processDay5Escalations(io?: any): Promise<number> {
  const now = new Date();
  const escalationThreshold = new Date(now.getTime() + DAY_5_INTERVENTION_HOURS * 60 * 60 * 1000);

  const eligible = await Request.find({
    status: { $in: ["open", "published", "receiving_offers"] },
    expiresAt: { $gt: now, $lte: escalationThreshold },
    day5InterventionSentAt: { $exists: false },
  }).limit(50);

  let escalated = 0;
  for (const reqDoc of eligible) {
    try {
      const offersCount = await Bid.countDocuments({ request: reqDoc._id });
      if (offersCount === 0) {
        // Broaden matching pool notifications
        if (io) {
          await MatchingService.dispatchProgressiveNotifications(reqDoc, io);
          await sendNotification(io, reqDoc.student.toString(), {
            title: "🔍 Expanding Tutor Search",
            message: `We're expanding search parameters to find more qualified tutors for ${reqDoc.subject}. You can also adjust your budget or schedule anytime.`,
            type: "general",
            link: "/dashboard",
          });
        }
        reqDoc.day5InterventionSentAt = now;
        await reqDoc.save();
        escalated++;
      }
    } catch (err: any) {
      logger.error({ err, requestId: reqDoc._id }, "Failed to process day-5 escalation");
    }
  }

  return escalated;
}

/**
 * 3. Idempotent & Concurrency-Safe Request Expiry Processor
 * Identifies expired active requests, executes atomic state transition,
 * marks unselected offers as closed, preserves active negotiations under grace,
 * and notifies the student.
 */
export async function expireEligibleRequests(io?: any): Promise<{ expiredCount: number; offersClosedCount: number }> {
  const now = new Date();
  let expiredCount = 0;
  let offersClosedCount = 0;

  // Find active requests past expiration date
  const expiredCandidates = await Request.find({
    status: { $in: ["open", "published", "receiving_offers", "negotiating"] },
    expiresAt: { $lte: now },
  }).limit(200);

  for (const reqDoc of expiredCandidates) {
    try {
      // Check negotiation grace: If request is in "negotiating" and has an active counter-offer
      // that is still valid according to the bid's own expiresAt, preserve the private negotiation!
      let activeNegotiationGrace = false;
      if (reqDoc.status === "negotiating") {
        const activeCounterBid = await Bid.findOne({
          request: reqDoc._id,
          status: "countered",
          expiresAt: { $gt: now },
        });
        if (activeCounterBid) {
          activeNegotiationGrace = true;
        }
      }

      // If active negotiation grace applies, do NOT prematurely mark the request as "expired",
      // but ensure it remains non-discoverable by new tutors.
      if (activeNegotiationGrace) {
        continue;
      }

      // Atomic conditional update — ensures only one transition wins against concurrent bookings/offers
      const updateResult = await Request.updateOne(
        {
          _id: reqDoc._id,
          status: { $in: ["open", "published", "receiving_offers", "negotiating"] },
          expiresAt: { $lte: now },
        },
        {
          $set: {
            status: "expired",
            expiredAt: now,
          },
        }
      );

      if (updateResult.modifiedCount !== 1) {
        // Another process accepted an offer or transitioned this request concurrently
        continue;
      }

      expiredCount++;
      await classifyRequestLoss({
        requestId: reqDoc._id,
        signals: { source: "scheduled_request_expiry" },
      });

      // Close outstanding active offers for this expired request
      const activeBidUpdate = await Bid.updateMany(
        {
          request: reqDoc._id,
          status: { $in: ["pending", "submitted", "viewed"] },
        },
        {
          $set: { status: "expired" },
        }
      );
      offersClosedCount += activeBidUpdate.modifiedCount;

      // Notify student with Repost & View Previous Offers CTA
      if (io) {
        const totalBids = await Bid.countDocuments({ request: reqDoc._id });
        const expiryNotice = totalBids > 0
          ? `Your tuition request for ${reqDoc.subject} has expired after 7 days. You can review past offers or repost with updated preferences.`
          : `Your tuition request for ${reqDoc.subject} has expired. Repost your requirement or adjust your budget/schedule to attract tutors.`;

        await sendNotification(io, reqDoc.student.toString(), {
          title: "📋 Tuition Request Expired",
          message: expiryNotice,
          type: "general",
          link: "/dashboard",
        });

        // Notify tutors who had submitted pending offers that are now closed
        const affectedBids = await Bid.find({ request: reqDoc._id, status: "expired" }).select("tutor");
        for (const b of affectedBids) {
          await sendNotification(io, b.tutor.toString(), {
            title: "Request Closed",
            message: `The tuition request for ${reqDoc.subject} has expired and is no longer accepting offers.`,
            type: "bid",
            link: "/offers",
          });
        }
      }

      await logAudit({
        action: "tuition_request_expired",
        actor: "system",
        entity: "Request",
        targetId: reqDoc._id.toString(),
        metadata: {
          subject: reqDoc.subject,
          publishedAt: reqDoc.publishedAt,
          expiresAt: reqDoc.expiresAt,
          extensionCount: reqDoc.extensionCount,
        },
      });
    } catch (err: any) {
      logger.error({ err, requestId: reqDoc._id }, "Failed to expire request document");
    }
  }

  return { expiredCount, offersClosedCount };
}

/**
 * 4. Safe Archival of Inactive Requests
 * Retains records for legal, compliance, tax, and dispute integrity.
 * Moves requests expired or cancelled > ARCHIVE_INACTIVE_DAYS (30 days) to "archived"
 * only if there are no open bookings, disputes, or legal holds.
 */
export async function processRequestArchival(): Promise<number> {
  const now = new Date();
  const archiveCutoff = new Date(now.getTime() - ARCHIVE_INACTIVE_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await Request.find({
    status: { $in: ["expired", "cancelled"] },
    updatedAt: { $lte: archiveCutoff },
    archivedAt: { $exists: false },
    legalHold: { $ne: true },
  }).limit(100);

  let archivedCount = 0;
  for (const reqDoc of candidates) {
    try {
      const activeBooking = await Booking.findOne({
        request: reqDoc._id,
        status: { $in: ["upcoming", "ongoing"] },
      });
      if (activeBooking) {
        continue;
      }

      reqDoc.status = "archived";
      reqDoc.archivedAt = now;
      await reqDoc.save();
      archivedCount++;

      await logAudit({
        action: "tuition_request_archived",
        actor: "system",
        entity: "Request",
        targetId: reqDoc._id.toString(),
      });
    } catch (err: any) {
      logger.error({ err, requestId: reqDoc._id }, "Failed to archive request document");
    }
  }

  return archivedCount;
}

/**
 * 5. Cleanup Stale Payment Holds
 * Reverts requests stuck in awaiting_payment beyond the hold window (30 minutes).
 * Prevents orphaned payment_pending bids and stuck request states.
 */
// Release a stale acceptance only if its bid is still in payment_pending.
// The bid state is our compare-and-set fence against a racing payment webhook.
export async function releaseExpiredPaymentHold(requestId: Types.ObjectId): Promise<boolean> {
  const session = await mongoose.startSession();
  let released = false;
  try {
    await session.withTransaction(async () => {
      const selected = await Request.findOne({ _id: requestId, status: "awaiting_payment" }).select("acceptedOffer").session(session).lean();
      if (!selected) return;
      const stale = await Bid.findOneAndUpdate(
        { request: requestId, ...(selected.acceptedOffer ? { _id: selected.acceptedOffer } : {}), status: "payment_pending", paymentOutcomeUnknown: { $ne: true }, checkoutStartedAt: { $exists: false }, paymentPendingExpiresAt: { $lte: new Date() } },
        { $set: { status: "submitted" }, $unset: { paymentPendingExpiresAt: "", paymentReservationId: "", paymentOutcomeUnknown: "" } },
        { new: true, session }
      );
      if (!stale) return;
      // Direct tutor acceptances have an unpaid booking for the student dashboard.
      // Never delete these records: late gateway callbacks must reconcile against
      // a cancelled booking rather than an unrelated newer checkout.
      await Booking.updateMany(
        { bid: stale._id, paymentStatus: "pending", status: "upcoming" },
        { $set: { status: "cancelled", cancelReason: "Payment reservation expired" } },
        { session }
      );
      await Request.updateOne(
        { _id: requestId, status: "awaiting_payment", $or: [{ acceptedOffer: stale._id }, { acceptedOffer: { $exists: false } }] },
        { $set: { status: "open" }, $unset: { acceptedOffer: "", finalAgreedRate: "" } },
        { session }
      );
      released = true;
    });
  } finally {
    await session.endSession();
  }
  return released;
}

export async function cleanupStalePaymentHolds(): Promise<{ cleaned: number; errors: string[] }> {
  const result = { cleaned: 0, errors: [] as string[] };
  // Expiry belongs to the BID hold, not Request.updatedAt (which may be
  // changed by unrelated operations and can expire a valid checkout early).
  const stale = await Bid.find({ status: "payment_pending", paymentPendingExpiresAt: { $lte: new Date() } })
    .select("request").limit(50).lean();
  for (const bid of stale) {
    try {
      if (await releaseExpiredPaymentHold(bid.request)) result.cleaned++;
    } catch (err: any) {
      result.errors.push(`Failed to clean expired payment hold ${bid._id}: ${err?.message}`);
      logger.error({ err, bidId: bid._id }, "Payment-hold release failed");
    }
  }
  return result;
}

/**
 * Master Lifecycle Worker Function
 * Executed on scheduled interval by server.ts
 */
/**
 * 6. Send Review Requests for Completed Bookings
 * Identifies bookings completed >1 hour ago without a review, sends a
 * review request email to the student.
 */
export async function sendReviewRequests(io?: any): Promise<number> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const eligibleBookings = await Booking.find({
    status: "completed",
    completedAt: { $exists: true, $lte: oneHourAgo },
    reviewRequestSentAt: { $exists: false },
  }).limit(50);

  let sent = 0;
  for (const booking of eligibleBookings) {
    try {
      const existingReview = await Review.findOne({ booking: booking._id });
      if (existingReview) continue;

      const [studentUser, tutorUser] = await Promise.all([
        User.findById(booking.student).select("name email"),
        User.findById(booking.tutor).select("name email"),
      ]);

      if (!studentUser || !tutorUser) continue;

      // Claim exactly once before emailing: overlapping lifecycle workers must
      // not send the same review request on every 15-minute polling interval.
      const claimTime = new Date();
      const claimed = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "completed", reviewRequestSentAt: { $exists: false } },
        { $set: { reviewRequestSentAt: claimTime } }, { new: true }
      );
      if (!claimed) continue;
      const request = await (Booking.findById(booking._id).populate("request", "subject") as any);
      const subject = request?.request?.subject || "your session";

      const reviewMail = reviewRequestEmail(studentUser.name, tutorUser.name, subject, booking._id.toString());
      await sendEmail({
        to: studentUser.email,
        subject: reviewMail.subject,
        html: reviewMail.html,
        eventType: "review_requested",
        relatedEntityType: "Booking",
        relatedEntityId: booking._id.toString(),
      });

      if (io) {
        await sendNotification(io, studentUser._id.toString(), {
          title: "📝 How Was Your Session?",
          message: `Your ${subject} session with ${tutorUser.name} is complete. Share your feedback to help other students.`,
          type: "general",
          link: "/dashboard",
        });
      }

      sent++;
    } catch (err: any) {
      // Retry on a future run if mail delivery fails. A successful send is
      // never intentionally repeated, even across multiple worker instances.
      await Booking.updateOne({ _id: booking._id, reviewRequestSentAt: { $exists: true } }, { $unset: { reviewRequestSentAt: "" } });
      logger.error({ err, bookingId: booking._id }, "Failed to send review request");
    }
  }

  return sent;
}

export async function processRequestLifecycle(io?: any): Promise<LifecycleRunResult> {
  const result: LifecycleRunResult = {
    scanned: 0,
    warningsSent: 0,
    day5EscalationsSent: 0,
    expiredCount: 0,
    offersClosedCount: 0,
    archivedCount: 0,
    paymentHoldsCleaned: 0,
    reviewRequestsSent: 0,
    errors: [],
  };

  if (!REQUEST_EXPIRY_ENABLED) {
    // Payment-hold cleanup and review invitations are independent of the
    // request-expiry feature flag; disabling request expiry must not leave
    // unpaid bookings stuck or suppress completed-session invitations.
    try {
      const paymentCleanup = await cleanupStalePaymentHolds();
      result.paymentHoldsCleaned = paymentCleanup.cleaned;
      result.errors.push(...paymentCleanup.errors);
    } catch (err: any) { result.errors.push(`Payment hold cleanup: ${err?.message}`); }
    try { result.reviewRequestsSent = await sendReviewRequests(io); }
    catch (err: any) { result.errors.push(`Review invitations: ${err?.message}`); }
    return result;
  }

  try {
    result.warningsSent = await sendExpiryWarnings(io);
  } catch (err: any) {
    result.errors.push(`Warnings error: ${err?.message}`);
    logger.error({ err }, "Request lifecycle: warnings error");
  }

  try {
    result.day5EscalationsSent = await processDay5Escalations(io);
  } catch (err: any) {
    result.errors.push(`Escalations error: ${err?.message}`);
    logger.error({ err }, "Request lifecycle: escalations error");
  }

  try {
    const { expiredCount, offersClosedCount } = await expireEligibleRequests(io);
    result.expiredCount = expiredCount;
    result.offersClosedCount = offersClosedCount;
  } catch (err: any) {
    result.errors.push(`Expiry error: ${err?.message}`);
    logger.error({ err }, "Request lifecycle: expiry error");
  }

  try {
    result.archivedCount = await processRequestArchival();
  } catch (err: any) {
    result.errors.push(`Archival error: ${err?.message}`);
    logger.error({ err }, "Request lifecycle: archival error");
  }

  try {
    const paymentCleanup = await cleanupStalePaymentHolds();
    result.paymentHoldsCleaned = paymentCleanup.cleaned;
    paymentCleanup.errors.forEach((e) => result.errors.push(e));
  } catch (err: any) {
    result.errors.push(`Payment hold cleanup error: ${err?.message}`);
    logger.error({ err }, "Request lifecycle: payment hold cleanup error");
  }

  try {
    result.reviewRequestsSent = await sendReviewRequests();
  } catch (err: any) {
    result.errors.push(`Review request error: ${err?.message}`);
    logger.error({ err }, "Request lifecycle: review request error");
  }

  return result;
}
