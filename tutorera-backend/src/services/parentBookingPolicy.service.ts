import type { ClientSession, Types } from "mongoose";
import mongoose from "mongoose";
import ParentProfile from "../models/ParentProfile.model";
import ParentBookingApproval from "../models/ParentBookingApproval.model";
import Booking from "../models/Booking.model";
import Bid from "../models/Bid.model";
import Request from "../models/Request.model";
import User from "../models/User.model";

export class ParentBookingPolicyError extends Error {
  constructor(public code: string, message: string, public statusCode = 409) { super(message); }
}

const round = (value: number) => Math.round(value * 100) / 100;
const currentMonth = (now: Date) => ({
  start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
});

export async function assertParentBookingPolicy(args: {
  student: Types.ObjectId | string;
  bid: Types.ObjectId | string;
  amount: number;
  currency: string;
  request: Types.ObjectId | string;
  queueApprovals?: boolean;
  session?: ClientSession;
  bookingId?: Types.ObjectId | string;
}): Promise<void> {
  const { student, bid, request, queueApprovals = false, session } = args;
  const amount = round(args.amount);
  const currency = args.currency.toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency)) {
    throw new ParentBookingPolicyError("INVALID_PAYMENT_AMOUNT", "A valid offer total and payment currency are required.", 422);
  }
  // Consent-confirmed links are authoritative. Never trust a parent ID supplied
  // by the checkout browser, and never rely on a denormalized Booking.parent.
  const studentRecord = await User.findById(student).select("role isMinor parentConsentVerified parentGuardianEmail").session(session || null);
  const supervisedMinor = studentRecord?.role === "student" && studentRecord.isMinor === true;
  if (supervisedMinor && !studentRecord?.parentConsentVerified) {
    throw new ParentBookingPolicyError("GUARDIAN_CONSENT_REQUIRED",
      "Adult guardian verification is required before an underage student can make a booking.", 403);
  }
  const guardians = await ParentProfile.find({ "children.studentUser": student }).session(session || null);
  if (supervisedMinor && !guardians.length) {
    throw new ParentBookingPolicyError("GUARDIAN_LINK_REQUIRED",
      "This minor's verified guardian link is missing. A new verification is required.", 403);
  }
  if (!guardians.length) return;
  const now = new Date();
  const { start, end } = currentMonth(now);
  let unresolvedApproval: ParentBookingPolicyError | null = null;

  for (const guardian of guardians.sort((a, b) => a.user.toString().localeCompare(b.user.toString()))) {
    // This write serializes concurrent webhook settlements for siblings subject
    // to the same parent's spending cap. The transaction that owns this session
    // will retry or fail if another payment simultaneously changes that parent.
    if (session) {
      const lock = await ParentProfile.collection.updateOne(
        { _id: guardian._id, "children.studentUser": student },
        { $inc: { policyCheckLockVersion: 1 } }, { session }
      );
      if (lock.matchedCount !== 1) throw new ParentBookingPolicyError("PARENT_LINK_REVOKED", "Guardian account link changed before booking confirmation.");
    }
    if (guardian.spendingLimitMonthly != null) {
      const limit = guardian.spendingLimitMonthly;
      if (!Number.isFinite(limit) || limit < 0) throw new ParentBookingPolicyError("PARENT_LIMIT_INVALID", "Guardian spending limit is invalid.");
      const parent = await User.findById(guardian.user).select("currency").session(session || null);
      const limitCurrency = (guardian.spendingLimitCurrency || guardian.currency || parent?.currency || "").toUpperCase();
      // No live FX quote can be safely applied as a hidden approval conversion.
      // Require the guardian to set their limit in the student's checkout currency.
      if (limitCurrency !== currency) {
        throw new ParentBookingPolicyError("PARENT_LIMIT_CURRENCY_MISMATCH", `Guardian spending limit currency (${limitCurrency || "unset"}) does not match the booking currency (${currency}).`);
      }
      const childIds = guardian.children.map(child => child.studentUser);
      const confirmed = await Booking.find({
        student: { $in: childIds }, paymentStatus: "confirmed",
        $or: [
          { paymentConfirmedAt: { $gte: start, $lt: end } },
          { paymentConfirmedAt: { $exists: false }, createdAt: { $gte: start, $lt: end } },
        ],
      }).select("studentTotal currency").session(session || null).lean();
      if (confirmed.some(row => (row.currency || "PKR").toUpperCase() !== currency)) {
        throw new ParentBookingPolicyError("PARENT_LIMIT_CURRENCY_MISMATCH", "Guardian spending records span multiple currencies. Finance must reconcile before another payment.");
      }
      const paid = confirmed.reduce((sum, row) => sum + (row.studentTotal || 0), 0);
      const childRequests = await Request.find({ student: { $in: childIds } }).select("_id").session(session || null).lean();
      const pending = childRequests.length
        ? await Bid.find({
          request: { $in: childRequests.map(row => row._id) },
          _id: { $ne: new mongoose.Types.ObjectId(String(bid)) },
          status: "payment_pending",
          $or: [{ paymentPendingExpiresAt: { $gt: now } }, { paymentOutcomeUnknown: true }, { checkoutStartedAt: { $exists: true } }],
          createdAt: { $lt: end },
        }).select("feeQuote amount currency").session(session || null).lean()
        : [];
      if (pending.some(row => (row.currency || "PKR").toUpperCase() !== currency)) {
        throw new ParentBookingPolicyError("PARENT_LIMIT_CURRENCY_MISMATCH", "Pending sibling bookings use another currency.");
      }
      const reserved = pending.reduce((sum, row) => sum + (row.feeQuote?.studentTotal || row.amount), 0);
      if (round(paid + reserved + amount) > limit) {
        throw new ParentBookingPolicyError("PARENT_SPENDING_LIMIT_EXCEEDED", `This booking exceeds the guardian's monthly spending limit of ${currency} ${limit.toLocaleString()}.`);
      }
    }

    if (guardian.approvalRequiredForBookings || supervisedMinor) {
      let approval = await ParentBookingApproval.findOne({ parent: guardian.user, bid }).session(session || null);
      // For a new offer, queue the exact price/currency consent once. Never
      // auto-renew a rejection, and never silently reuse an approval for a
      // different fee quote.
      if (!approval && queueApprovals) {
        const originalBid = await Bid.findById(bid).select("expiresAt").session(session || null);
        const expiresAt = originalBid?.expiresAt && originalBid.expiresAt > now
          ? originalBid.expiresAt : new Date(now.getTime() + 48 * 3600_000);
        approval = await ParentBookingApproval.findOneAndUpdate(
          { parent: guardian.user, bid },
          { $setOnInsert: { parent: guardian.user, student, request, bid, amount, currency, status: "pending", expiresAt } },
          { upsert: true, new: true, session: session || undefined }
        );
      }
      if (approval && (approval.amount !== amount || approval.currency !== currency || approval.student.toString() !== student.toString() || approval.request.toString() !== request.toString())) {
        throw new ParentBookingPolicyError("PARENT_APPROVAL_QUOTE_CHANGED", "Tutor offer details changed; a new consent request is required.");
      }
      if (!approval || approval.status !== "approved" || approval.expiresAt <= now) {
        const code = approval?.status === "rejected" ? "PARENT_APPROVAL_REJECTED" : "PARENT_APPROVAL_REQUIRED";
        unresolvedApproval ||= new ParentBookingPolicyError(code,
          code === "PARENT_APPROVAL_REJECTED" ? "Your guardian declined this offer." : "Guardian approval is required for this exact tutor offer before payment.");
      }
    }
  }
  // All linked guardians receive their decision request in a single attempt.
  if (unresolvedApproval) throw unresolvedApproval;
}
