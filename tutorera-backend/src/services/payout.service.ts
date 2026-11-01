import Booking from "../models/Booking.model";
import PaymentLedger from "../models/PaymentLedger.model";
import RefundRequest from "../models/RefundRequest.model";
import logger from "../config/logger";

export interface PayoutListResult {
  payouts: object[];
  total: number;
  page: number;
  pages: number;
}

export async function listPayouts(opts: {
  state?: string;
  tutorId?: string;
  page: number;
  limit: number;
}): Promise<PayoutListResult> {
  const filter: Record<string, unknown> = {
    status: "completed",
    paymentStatus: "confirmed",
    payoutRequestedAt: { $exists: true },
  };
  if (opts.state) filter.payoutStatus = opts.state;
  if (opts.tutorId) filter.tutor = opts.tutorId;
  const skip = (opts.page - 1) * opts.limit;
  const [payouts, total] = await Promise.all([
    Booking.find(filter)
      .select("_id tutor student payoutStatus payoutRequestedAt payoutPaidAt payoutSettlementReference payoutNote amount currency")
      .sort({ payoutRequestedAt: -1 })
      .skip(skip)
      .limit(opts.limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);
  return { payouts, total, page: opts.page, pages: Math.ceil(total / opts.limit) };
}

export async function markPayoutComplete(opts: {
  transferRef: string;
  evidenceRef: string;
  adminId: string;
  adminNote?: string;
}): Promise<void> {
  const booking = await Booking.findOne({ transferRef: opts.transferRef });
  if (!booking) throw Object.assign(new Error("Payout not found for transferRef"), { statusCode: 404 });
  if (booking.payoutStatus === "paid") throw Object.assign(new Error("Payout already marked complete"), { statusCode: 409 });
  booking.payoutStatus = "paid";
  booking.payoutPaidAt = new Date();
  booking.payoutEvidenceReference = opts.evidenceRef;
  booking.payoutNote = opts.adminNote || "";
  await booking.save();
  logger.info({ transferRef: opts.transferRef, adminId: opts.adminId }, "Payout marked complete");
}

export async function markPayoutFailed(opts: {
  transferRef: string;
  adminId: string;
  adminNote: string;
}): Promise<void> {
  const booking = await Booking.findOne({ transferRef: opts.transferRef });
  if (!booking) throw Object.assign(new Error("Payout not found for transferRef"), { statusCode: 404 });
  booking.payoutStatus = "pending";
  booking.payoutNote = opts.adminNote;
  await booking.save();
  logger.warn({ transferRef: opts.transferRef, adminId: opts.adminId }, "Payout marked failed, returned to pending");
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
