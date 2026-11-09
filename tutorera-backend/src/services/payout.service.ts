import mongoose from "mongoose";
import crypto from "node:crypto";
import Booking from "../models/Booking.model";
import PaymentLedger from "../models/PaymentLedger.model";
import TutorPayout from "../models/TutorPayout.model";
import RefundRequest from "../models/RefundRequest.model";
import logger from "../config/logger";

// ── Currency-qualified minimum thresholds ─────────────────────────────────────
// Amounts are in the currency's smallest useful unit (not cents; these are
// already the human-readable amounts stored on Booking.tutorPayout).
// A tutor whose accumulated payable does not meet the threshold stays in
// payoutStatus=pending until the next run.
const MINIMUM_BY_CURRENCY: Record<string, number> = {
  USD: 10,
  GBP: 10,
  AED: 40,
  SAR: 40,
  PKR: 2500,
  INR: 800,
};
const DEFAULT_MINIMUM = 10;
const AUTO_PAYOUT_MAX_BATCH = 50;

function minimumForCurrency(currency: string): number {
  return MINIMUM_BY_CURRENCY[currency.toUpperCase()] ?? DEFAULT_MINIMUM;
}

/** Stable, URL-safe unique reference for one manual transfer. */
function generateTransferRef(): string {
  return `PYOUT-${crypto.randomBytes(10).toString("hex").toUpperCase()}`;
}

export interface PayoutCreationResult {
  scanned: number;
  requested: number;
  skippedBelowThreshold: number;
  skippedAlreadyPending: number;
  failed: number;
  errors: string[];
}

/**
 * Scan bookings with confirmed payments whose tutor payout is still pending,
 * group them by tutor+currency, enforce currency-aware minimum thresholds, and
 * create a TutorPayout + PaymentLedger record for each eligible group.
 *
 * This function NEVER marks a payout as paid. Payment is only confirmed by an
 * admin calling `markPayoutComplete` with external evidence.
 *
 * Safe to run repeatedly: bookings already under a pending/requested payout are
 * excluded from a new batch.
 */
export async function createPayoutRequests(): Promise<PayoutCreationResult> {
  const result: PayoutCreationResult = {
    scanned: 0,
    requested: 0,
    skippedBelowThreshold: 0,
    skippedAlreadyPending: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Exclude bookings already under an in-flight payout
    const inFlightPayouts = await TutorPayout.find({
      state: { $in: ["pending", "requested"] },
    }).select("bookings").lean();
    const inFlightBookingIds = new Set(
      inFlightPayouts.flatMap((p) => p.bookings.map((id) => id.toString()))
    );

    const eligibleBookings = await Booking.find({
      paymentStatus: "confirmed",
      payoutStatus: "pending",
    })
      .select("_id tutor tutorPayout currency")
      .limit(AUTO_PAYOUT_MAX_BATCH)
      .lean();

    result.scanned = eligibleBookings.length;

    // Group by tutor + currency
    const groups = new Map<string, { tutorId: mongoose.Types.ObjectId; currency: string; bookingIds: mongoose.Types.ObjectId[]; total: number }>();
    for (const booking of eligibleBookings) {
      if (inFlightBookingIds.has(booking._id.toString())) {
        result.skippedAlreadyPending++;
        continue;
      }
      const currency = (booking.currency || "USD").toUpperCase();
      const key = `${booking.tutor.toString()}:${currency}`;
      const existing = groups.get(key);
      if (existing) {
        existing.bookingIds.push(booking._id);
        existing.total += booking.tutorPayout;
      } else {
        groups.set(key, {
          tutorId: booking.tutor,
          currency,
          bookingIds: [booking._id],
          total: booking.tutorPayout,
        });
      }
    }

    for (const group of groups.values()) {
      const minimum = minimumForCurrency(group.currency);
      if (group.total < minimum) {
        result.skippedBelowThreshold++;
        logger.debug(
          { tutorId: group.tutorId, currency: group.currency, total: group.total, minimum },
          "Payout below currency minimum — deferred"
        );
        continue;
      }

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const transferRef = generateTransferRef();
          const now = new Date();

          // Create ledger record first so we have its ID for the payout row
          const [ledger] = await PaymentLedger.create([{
            tutor: group.tutorId,
            provider: "manual",
            providerTransactionId: transferRef,
            eventType: "payout.requested",
            status: "processing",
            grossAmount: group.total,
            currency: group.currency,
            tutorPayable: group.total,
            platformNet: 0,
            settlementStatus: "expected",
            metadata: { bookingCount: group.bookingIds.length },
          }], { session });

          const [payout] = await TutorPayout.create([{
            transferRef,
            tutor: group.tutorId,
            bookings: group.bookingIds,
            currency: group.currency,
            totalAmount: group.total,
            state: "requested",
            requestedAt: now,
            ledgerEntry: ledger._id,
          }], { session });

          // Advance each booking to payoutStatus=processing and record the ref
          await Booking.updateMany(
            { _id: { $in: group.bookingIds } },
            {
              $set: {
                payoutStatus: "processing",
                payoutProcessingAt: now,
                payoutNote: `Payout requested: ${transferRef}`,
                payoutRequestedAt: now,
              },
            },
            { session }
          );

          logger.info(
            { transferRef, tutorId: group.tutorId, currency: group.currency, amount: group.total, bookings: group.bookingIds.length, payoutId: payout._id },
            "Payout requested — manual transfer required"
          );
        });
        result.requested++;
      } catch (err) {
        result.failed++;
        const msg = err instanceof Error ? err.message : "unknown error";
        result.errors.push(`Payout for tutor ${group.tutorId} (${group.currency}): ${msg}`);
        logger.error({ err, tutorId: group.tutorId, currency: group.currency }, "Failed to create payout request");
      } finally {
        await session.endSession();
      }
    }
  } catch (err) {
    result.errors.push(`Scan error: ${err instanceof Error ? err.message : "unknown error"}`);
    logger.error({ err }, "Failed to scan pending payouts");
  }

  return result;
}

export interface PayoutCompletionInput {
  transferRef: string;
  evidenceRef: string;
  adminId: string;
  adminNote?: string;
}

/**
 * Mark a payout as completed.  Only callable by an admin who supplies an
 * external evidence reference (bank transaction id, provider receipt, etc.).
 *
 * Never marks a payout paid based on the existence of a report alone.
 */
export async function markPayoutComplete(input: PayoutCompletionInput): Promise<void> {
  if (!input.evidenceRef?.trim()) {
    throw new Error("evidenceRef is required to mark a payout complete");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payout = await TutorPayout.findOne({ transferRef: input.transferRef }, null, { session });
      if (!payout) throw new Error(`Payout ${input.transferRef} not found`);
      if (payout.state === "completed") throw new Error(`Payout ${input.transferRef} is already completed`);
      if (!["pending", "requested"].includes(payout.state)) {
        throw new Error(`Payout ${input.transferRef} cannot be completed from state ${payout.state}`);
      }

      const now = new Date();
      payout.state = "completed";
      payout.completedAt = now;
      payout.evidenceRef = input.evidenceRef.trim();
      payout.actionedBy = new mongoose.Types.ObjectId(input.adminId);
      payout.adminNote = input.adminNote?.trim();
      await payout.save({ session });

      await Booking.updateMany(
        { _id: { $in: payout.bookings } },
        { $set: { payoutStatus: "paid", payoutPaidAt: now } },
        { session }
      );

      await PaymentLedger.findByIdAndUpdate(
        payout.ledgerEntry,
        { $set: { eventType: "payout.completed", status: "succeeded", settlementStatus: "settled", "metadata.evidenceRef": input.evidenceRef } },
        { session }
      );

      logger.info(
        { transferRef: input.transferRef, evidenceRef: input.evidenceRef, adminId: input.adminId, tutorId: payout.tutor, amount: payout.totalAmount, currency: payout.currency },
        "Payout marked complete by admin"
      );
    });
  } finally {
    await session.endSession();
  }
}

export interface PayoutFailureInput {
  transferRef: string;
  adminId: string;
  adminNote: string;
}

/**
 * Mark a payout as failed and return bookings to payoutStatus=pending so they
 * will be picked up on the next scan.
 */
export async function markPayoutFailed(input: PayoutFailureInput): Promise<void> {
  if (!input.adminNote?.trim()) {
    throw new Error("adminNote is required when marking a payout failed");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payout = await TutorPayout.findOne({ transferRef: input.transferRef }, null, { session });
      if (!payout) throw new Error(`Payout ${input.transferRef} not found`);
      if (!["pending", "requested"].includes(payout.state)) {
        throw new Error(`Payout ${input.transferRef} cannot be failed from state ${payout.state}`);
      }

      const now = new Date();
      payout.state = "failed";
      payout.actionedBy = new mongoose.Types.ObjectId(input.adminId);
      payout.adminNote = input.adminNote.trim();
      await payout.save({ session });

      // Return bookings to pending so they re-enter the next payout run
      await Booking.updateMany(
        { _id: { $in: payout.bookings } },
        { $set: { payoutStatus: "pending", payoutNote: `Payout failed (${input.transferRef}): ${input.adminNote}` } },
        { session }
      );

      await PaymentLedger.findByIdAndUpdate(
        payout.ledgerEntry,
        { $set: { status: "failed", settlementStatus: "exception", "metadata.failureNote": input.adminNote } },
        { session }
      );

      logger.warn(
        { transferRef: input.transferRef, adminId: input.adminId, tutorId: payout.tutor, note: input.adminNote },
        "Payout marked failed by admin — bookings returned to pending"
      );
    });
  } finally {
    await session.endSession();
  }
}

/** List payouts by state for admin review. */
export async function listPayouts(filters: {
  state?: string;
  tutorId?: string;
  page: number;
  limit: number;
}): Promise<{ items: unknown[]; total: number; page: number; pages: number }> {
  const page = Math.max(1, filters.page);
  const limit = Math.min(100, Math.max(1, filters.limit));
  const query: Record<string, unknown> = {};
  if (filters.state && filters.state !== "all") query.state = filters.state;
  if (filters.tutorId) query.tutor = new mongoose.Types.ObjectId(filters.tutorId);

  const [items, total] = await Promise.all([
    TutorPayout.find(query)
      .populate("tutor", "name email")
      .populate("actionedBy", "name")
      .sort({ requestedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TutorPayout.countDocuments(query),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) };
}

export interface PayoutRunResult {
  scanned: number;
  processed: number;
  failed: number;
  errors: string[];
  awaitingApproval: number;
  awaitingIndependentVerification: number;
  approvedRefundsAwaitingSettlement: number;
  paymentExceptionsAwaitingReconciliation: number;
}

// Queue monitoring ONLY. Real bank/wallet transfers are initiated externally,
// then independently attested by finance. In the absence of a provider payout
// API, this worker must never auto-transition a booking to 'paid'.
export async function processPendingPayouts(): Promise<PayoutRunResult> {
  const result: PayoutRunResult = {
    scanned: 0, processed: 0, failed: 0, errors: [],
    awaitingApproval: 0, awaitingIndependentVerification: 0,
    approvedRefundsAwaitingSettlement: 0, paymentExceptionsAwaitingReconciliation: 0,
  };
  try {
    const [pending, processing, refunds, exceptions] = await Promise.all([
      Booking.countDocuments({ status: "completed", paymentStatus: "confirmed", payoutStatus: "pending", payoutRequestedAt: { $exists: true } }),
      Booking.countDocuments({ status: "completed", paymentStatus: "confirmed", payoutStatus: "processing" }),
      RefundRequest.countDocuments({ status: "approved" }),
      PaymentLedger.countDocuments({ settlementStatus: "exception" }),
    ]);
    result.awaitingApproval = pending;
    result.awaitingIndependentVerification = processing;
    result.approvedRefundsAwaitingSettlement = refunds;
    result.paymentExceptionsAwaitingReconciliation = exceptions;
    result.scanned = pending + processing + refunds + exceptions;
    if (result.scanned > 0) logger.warn({ ...result }, "Finance action queue has unresolved transfers or reconciliation exceptions");
  } catch (err: any) {
    result.failed++;
    result.errors.push(`Finance queue scan failed: ${err?.message || "unknown error"}`);
    logger.error({ err }, "Finance queue scan failed");
  }
  return result;
}
