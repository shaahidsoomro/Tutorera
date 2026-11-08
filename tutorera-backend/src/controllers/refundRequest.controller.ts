import { Response } from "express";
import mongoose, { Types } from "mongoose";
import { AuthRequest } from "../types";
import RefundRequest, { IRefundRequest } from "../models/RefundRequest.model";
import Booking from "../models/Booking.model";
import PaymentLedger from "../models/PaymentLedger.model";
import { logAudit } from "../utils/logAudit";
import User from "../models/User.model";
import sendEmail from "../utils/sendEmail";
import { escapeHtml } from "../utils/escapeHtml";
import { renderTransactionalEmail } from "../utils/emailBrand";
import logger from "../config/logger";

const REASON_LABELS: Record<string, string> = {
  tutor_cancelled: "Tutor Cancelled",
  session_not_delivered: "Session Not Delivered",
  quality_issue: "Quality Issue",
  scheduling_conflict: "Scheduling Conflict",
  duplicate_charge: "Duplicate Charge",
  other: "Other",
};

function today() {
  return new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(amount: number, currency?: string) {
  return `${(currency || "USD").toUpperCase()} ${Number(amount || 0).toLocaleString("en-US")}`;
}

export const submitRefundRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason, details } = req.body;
  const bookingId = req.params.id as string;

  if (!reason) {
    res.status(400).json({ success: false, message: "Refund reason is required." });
    return;
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    $or: [{ student: req.user?._id }, { parent: req.user?._id }],
    paymentStatus: { $in: ["confirmed", "received"] },
  }).populate<{ tutor: { _id: string; name: string; email: string } }>("tutor", "name email");

  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found or not eligible for refund." });
    return;
  }

  const existing = await RefundRequest.findOne({ booking: bookingId });
  if (existing) {
    res.status(409).json({ success: false, message: "A refund request has already been submitted for this booking." });
    return;
  }

  const tutor = booking.tutor as unknown as { _id: string; name: string; email: string };
  const refundAmount = booking.studentTotal || booking.amount;
  const refundDisplayAmount = formatAmount(refundAmount, booking.currency);

  const refundReq = await RefundRequest.create({
    student: booking.student,
    parent: booking.parent || (req.user?.role === "parent" ? req.user?._id : undefined),
    booking: new Types.ObjectId(bookingId),
    tutor: tutor._id,
    amount: refundAmount,
    reason,
    details: details || "",
  });

  const reasonLabel = REASON_LABELS[reason] || reason;

  // The RefundRequest row is now committed to the database. Both the
  // admin notification and the student receipt below are best-effort —
  // an email-provider outage must not reverse-fail the refund the user
  // just filed. Previously both calls were unguarded, so a Resend
  // outage would 500 the response after the row was written, trigger
  // the duplicate-guard on retry, and leave the user with no way to
  // confirm their refund was received.
  try {
    await sendEmail({
      to: process.env.EMAIL_USER as string,
      subject: `Refund Request — ${escapeHtml(req.user?.name)} (${reasonLabel})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1a1a2e;">New Refund Request</h2>
          <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f9fafb;border-radius:8px;overflow:hidden;margin:1rem 0;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong>Student</strong></td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">${escapeHtml(req.user?.name)} (${escapeHtml(req.user?.email)})</td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong>Tutor</strong></td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">${escapeHtml(tutor.name)}</td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong>Booking ID</strong></td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">${escapeHtml(bookingId)}</td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong>Amount</strong></td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">${escapeHtml(refundDisplayAmount)}</td></tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;"><strong>Reason</strong></td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">${escapeHtml(reasonLabel)}</td></tr>
            <tr><td style="padding:12px 16px;"><strong>Details</strong></td><td style="padding:12px 16px;">${escapeHtml(details || "—")}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:0.875rem;">Review in the admin panel and process the refund via the payment gateway if approved.</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({ err, refundRequestId: refundReq._id?.toString(), bookingId }, "Failed to send admin refund-request notification");
  }

  const studentEmailHtml = renderTransactionalEmail({
    subject: "TUTORERA® — Refund Request Received",
    emailCategory: "Refund",
    emailHeading: "Refund Request Received",
    emailSubheading: `Your refund request is being reviewed.`,
    firstName: req.user?.name,
    openingMessage: `We received your refund request for ${refundDisplayAmount} and will review it within 2–3 business days.`,
    mainMessage: `Reason: ${reasonLabel}.${details ? ` Details: ${details}` : ""} If approved, the refund will be processed to your original payment method within 5–7 business days.`,
    transaction: {
      referenceId: `REF-${bookingId}`,
      date: today(),
      status: "Under Review",
      amount: refundDisplayAmount,
    },
    cta: { label: "View Booking", url: "https://tutorera.ac.pk/dashboard" },
    additionalInformation: "Refunds are processed to the original payment method. For questions, contact hello@mentisera.pk.",
    includeSecurityNotice: true,
    deliverability: "This transactional notification was sent because you submitted a refund request on TUTORERA.",
  });

  try {
    await sendEmail({
      to: req.user?.email as string,
      subject: "TUTORERA® — Refund Request Received",
      html: studentEmailHtml,
    });
  } catch (err) {
    logger.error({ err, refundRequestId: refundReq._id?.toString(), bookingId }, "Failed to send student refund-request receipt");
  }

  res.status(201).json({ success: true, message: "Refund request submitted.", refundRequest: refundReq });
};

export const getMyRefundRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  const requests = await RefundRequest.find({
    $or: [{ student: req.user?._id }, { parent: req.user?._id }],
  })
    .populate("booking", "schedule teachingMode amount studentTotal currency createdAt")
    .populate("tutor", "name")
    .sort("-createdAt");

  res.status(200).json({ success: true, total: requests.length, refundRequests: requests });
};

export const getAllRefundRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = "1", limit = "25" } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
  const skip = (pageNum - 1) * limitNum;

  const total = await RefundRequest.countDocuments(filter);

  const requests = await RefundRequest.find(filter)
    .populate("student", "name email phone")
    .populate("tutor", "name email")
    .populate("booking", "amount studentTotal currency schedule teachingMode createdAt")
    .sort("-createdAt")
    .skip(skip)
    .limit(limitNum)
    .lean();

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    refundRequests: requests
  });
};

export const updateRefundRequestStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, adminNote } = req.body;
  // No provider-confirmed refund settlement adapter is configured yet.
  // Approvals are decisions, not evidence that money has been refunded.
  if (!["approved", "rejected"].includes(status)) {
    res.status(422).json({ success: false, code: "REFUND_SETTLEMENT_UNAVAILABLE", message: "Only approval or rejection is available. Processing requires verified gateway settlement." });
    return;
  }
  if (typeof adminNote !== "string" || adminNote.trim().length < 8 || adminNote.trim().length > 500) {
    res.status(422).json({ success: false, code: "REFUND_DECISION_REASON_REQUIRED", message: "Provide a decision reason between 8 and 500 characters." }); return;
  }

  const current = await RefundRequest.findById(req.params.id).select("status");
  if (!current) {
    res.status(404).json({ success: false, message: "Refund request not found." });
    return;
  }

  if (current.status !== "pending") {
    res.status(409).json({ success: false, code: "REFUND_ALREADY_REVIEWED", message: "The refund decision has already been recorded." });
    return;
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const changed = await RefundRequest.findOneAndUpdate({ _id: current._id, status: "pending" },
        { $set: { status, adminNote: adminNote.trim(), approvedBy: req.user?._id, approvedAt: new Date() } }, { returnDocument: "after", runValidators: true, session });
      if (!changed) throw Object.assign(new Error("Refund decision already recorded."), { statusCode: 409 });
      await logAudit({ action: "refund_decision_recorded", actor: req.user?.name || "Admin", actorId: req.user?._id?.toString(),
        entity: "RefundRequest", targetId: current._id.toString(), metadata: { status, reason: adminNote.trim(), approvalEnforcesDutySeparation: true } }, session);
    });
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 409) { res.status(409).json({ success: false, code: "REFUND_ALREADY_REVIEWED", message: "The refund decision has already been recorded." }); return; }
    throw error;
  } finally { await session.endSession(); }
  const refundReq = await RefundRequest.findById(current._id)
    .populate<{ student: { name: string; email: string } | null; booking: { studentTotal: number; amount: number; currency?: string } | null }>("student", "name email")
    .populate("booking", "studentTotal amount currency");
  if (!refundReq) throw new Error("Refund decision could not be loaded");

  const student = refundReq.student as unknown as { name: string; email: string };

  if (student?.email) {
    const refundBooking = refundReq.booking as unknown as { studentTotal: number; amount: number; currency?: string } | null;
    const refundAmount = refundBooking?.studentTotal ?? refundReq.amount;
    const refundDisplayAmount = formatAmount(refundAmount, refundBooking?.currency);
    const statusLabel = status === "approved" ? "Approved" : "Not Approved";
    const emailHtml = renderTransactionalEmail({
      subject: `TUTORERA® — Refund Request ${statusLabel}`,
      emailCategory: "Refund",
      emailHeading: `Refund Request ${statusLabel}`,
      emailSubheading: `Your refund request has been reviewed.`,
      firstName: student.name,
      openingMessage:
        status === "approved"
          ? `Your refund request of ${refundDisplayAmount} has been approved.`
          : `After review, we were unable to approve your refund request at this time.`,
      mainMessage:
        status === "approved"
          ? `Your refund request has been approved for processing, but funds have not yet been returned. We will confirm separately after the payment provider verifies settlement.`
          : adminNote || `If you have questions, please contact our support team.`,
      transaction: {
        referenceId: `REF-${refundReq._id}`,
        date: today(),
        status: status === "approved" ? "Approved" : "Rejected",
        amount: refundDisplayAmount,
      },
      cta: { label: "Contact Support", url: "https://tutorera.ac.pk/contact" },
      additionalInformation:
        status === "approved"
          ? "Approval does not confirm transfer. We will contact you once a provider-verified refund has settled."
          : "You may contact hello@mentisera.pk for further clarification.",
      includeSecurityNotice: true,
      deliverability: "This transactional notification was sent because you submitted a refund request on TUTORERA.",
    });

    try { await sendEmail({
      to: student.email,
      subject: `TUTORERA® — Refund Request ${statusLabel}`,
      html: emailHtml,
    }); } catch (error) { logger.error({ err: error, refundRequestId: refundReq._id }, "Refund decision email failed"); }
  }

  res.status(200).json({ success: true, refundRequest: refundReq });
};

function validReference(value: unknown, min = 8): value is string {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= 300;
}

// Phase 3 supports only documented, EXTERNALLY executed refunds. TUTORERA
// does not have a refund execution/lookup adapter for Rapid Gateway. Recording
// evidence here is an auditable operator claim; it never moves money.
// DUTY SEPARATION: The admin who approved the refund cannot record the settlement
// (prevents fraud where one person approves and then falsifies settlement evidence).
export const recordExternalRefundTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) { res.status(403).json({ success: false, code: "INITIATOR_ID_REQUIRED" }); return; }
  const { settlementReference, settlementMethod, evidenceReference } = req.body || {};
  if (!validReference(settlementReference) || !validReference(settlementMethod, 3) || !validReference(evidenceReference)) {
    res.status(400).json({ success: false, code: "REFUND_EVIDENCE_REQUIRED", message: "External transfer reference, method, and documentary evidence reference are required." }); return;
  }
  const refund = await RefundRequest.findOne({ _id: req.params.id, status: "approved", settlementReference: { $exists: false } });
  if (!refund) { res.status(409).json({ success: false, code: "REFUND_NOT_APPROVED", message: "Refund is not approved or settlement evidence has already been recorded." }); return; }

  if (refund.approvedBy && refund.approvedBy.toString() === req.user._id.toString()) {
    res.status(403).json({ success: false, code: "DUTY_SEPARATION_REQUIRED", message: "The admin who approved this refund cannot record the settlement. A different admin must record the transfer evidence to prevent fraud." }); return;
  }
  const booking = await Booking.findById(refund.booking);
  if (!booking || booking.paymentStatus !== "confirmed" || Math.abs(refund.amount - booking.studentTotal) > 0.01) {
    res.status(409).json({ success: false, code: "REFUND_AMOUNT_MISMATCH", message: "Only the exact original confirmed student payment can be reconciled via this workflow." }); return;
  }
  if (["paid", "processing"].includes(booking.payoutStatus)) {
    res.status(409).json({ success: false, code: "PAYOUT_REVERSAL_REQUIRED", message: "Resolve existing tutor settlement before refund reconciliation." }); return;
  }
  const session = await mongoose.startSession();
  const outcome: { recorded: IRefundRequest | null } = { recorded: null };
  try {
    await session.withTransaction(async () => {
      const held = await Booking.findOneAndUpdate(
        { _id: booking._id, paymentStatus: "confirmed", studentTotal: booking.studentTotal, payoutStatus: { $nin: ["paid", "processing"] } },
        { $set: { payoutStatus: "held", payoutNote: "Tutor payout held while external refund is reviewed" } },
        { returnDocument: "after", session },
      );
      if (!held) throw Object.assign(new Error("Booking payment or payout changed; review before recording the refund."), { statusCode: 409 });
      const recorded = await RefundRequest.findOneAndUpdate(
        { _id: refund._id, status: "approved", amount: refund.amount, settlementReference: { $exists: false } },
        { $set: { settlementReference: settlementReference.trim(), settlementMethod: settlementMethod.trim(),
          settlementEvidenceReference: evidenceReference.trim(), settlementInitiatedBy: req.user!._id } }, { returnDocument: "after", session },
      );
      if (!recorded) throw Object.assign(new Error("Refund was already claimed or changed."), { statusCode: 409 });
      await logAudit({ action: "external_refund_evidence_recorded", actor: req.user?.name || "Finance", actorId: req.user?._id?.toString(),
        entity: "RefundRequest", targetId: refund._id.toString(), metadata: { settlementReference: settlementReference.trim(), evidenceReference: evidenceReference.trim() } }, session);
      outcome.recorded = recorded;
    });
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 409) { res.status(409).json({ success: false, code: "REFUND_STATE_CHANGED", message: (error as Error).message }); return; }
    throw error;
  } finally { await session.endSession(); }
  res.json({ success: true, message: "External refund evidence recorded and tutor payout held. A separate finance reviewer must reconcile the provider or bank statement.", refundRequest: outcome.recorded });
};

// Independent correction records that the submitted transfer claim was wrong.
// It does not assert that money was returned or automatically release a hold.
export const voidExternalRefundEvidence = async (req: AuthRequest, res: Response): Promise<void> => {
  const actor = req.user?._id;
  const { settlementReference, reviewEvidence, reason } = req.body || {};
  if (!actor) { res.status(403).json({ success: false, code: "REVIEWER_ID_REQUIRED" }); return; }
  if (!validReference(settlementReference) || !validReference(reviewEvidence) || !validReference(reason, 12)) {
    res.status(400).json({ success: false, code: "REFUND_CORRECTION_EVIDENCE_REQUIRED", message: "Provide the original reference, independent evidence and a correction reason." }); return;
  }
  const current = await RefundRequest.findById(req.params.id);
  if (!current || current.status !== "approved" || !current.settlementReference || !current.settlementInitiatedBy) { res.status(409).json({ success: false, code: "REFUND_NOT_READY" }); return; }
  if (current.settlementInitiatedBy.toString() === actor.toString()) { res.status(403).json({ success: false, code: "SECOND_REVIEWER_REQUIRED" }); return; }
  if (current.settlementReference !== settlementReference.trim()) { res.status(409).json({ success: false, code: "REFUND_REFERENCE_MISMATCH" }); return; }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const ledger = await PaymentLedger.exists({ provider: "external_refund", providerEventId: `refund-${current._id}` }).session(session);
      if (ledger) throw Object.assign(new Error("A refund ledger event exists and requires reconciliation."), { statusCode: 409 });
      const result = await RefundRequest.updateOne(
        { _id: current._id, status: "approved", settlementReference: settlementReference.trim(), settlementInitiatedBy: current.settlementInitiatedBy, settlementVerifiedBy: { $exists: false } },
        { $push: { voidedSettlements: { reference: current.settlementReference, method: current.settlementMethod, originalEvidence: current.settlementEvidenceReference, initiatedBy: current.settlementInitiatedBy, reviewedBy: actor, reviewEvidence: reviewEvidence.trim(), reason: reason.trim(), reviewedAt: new Date() } },
          $unset: { settlementReference: 1, settlementMethod: 1, settlementEvidenceReference: 1, settlementInitiatedBy: 1 } }, { session },
      );
      if (result.modifiedCount !== 1) throw Object.assign(new Error("Refund evidence changed during review."), { statusCode: 409 });
      await logAudit({ action: "external_refund_evidence_voided", actor: req.user?.name || "Finance", actorId: actor.toString(), entity: "RefundRequest", targetId: current._id.toString(), metadata: { reference: settlementReference.trim(), reviewEvidence: reviewEvidence.trim(), reason: reason.trim() } }, session);
    });
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 409) { res.status(409).json({ success: false, code: "REFUND_STATE_CHANGED", message: (error as Error).message }); return; }
    throw error;
  } finally { await session.endSession(); }
  res.json({ success: true, message: "Evidence submission voided. The payout remains held until finance reviews it." });
};

// Second finance officer independently verifies external statement evidence.
// MongoDB transaction keeps Booking, RefundRequest and the accounting ledger
// consistent; never call this from a browser payment-return URL.
export const verifyExternalRefundTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?._id) { res.status(403).json({ success: false, code: "REVIEWER_ID_REQUIRED" }); return; }
  const { settlementReference, verificationEvidence, note } = req.body || {};
  if (!validReference(settlementReference) || !validReference(verificationEvidence) || !validReference(note, 12)) {
    res.status(400).json({ success: false, code: "REFUND_VERIFICATION_REQUIRED", message: "Matching transaction reference, independent bank/provider statement evidence and review note are required." }); return;
  }
  const current = await RefundRequest.findById(req.params.id);
  if (!current || current.status !== "approved" || !current.settlementReference) {
    res.status(409).json({ success: false, code: "REFUND_NOT_READY" }); return;
  }
  if (!current.settlementInitiatedBy || current.settlementInitiatedBy.toString() === req.user?._id?.toString()) {
    res.status(403).json({ success: false, code: "SECOND_REVIEWER_REQUIRED" }); return;
  }
  if (current.settlementReference !== settlementReference.trim()) {
    res.status(409).json({ success: false, code: "REFUND_REFERENCE_MISMATCH" }); return;
  }
  const session = await mongoose.startSession();
  let settled: IRefundRequest | null = null;
  let studentEmail: string | undefined;
  try {
    await session.withTransaction(async () => {
      const refund = await RefundRequest.findOne({ _id: current._id, status: "approved", settlementReference: settlementReference.trim(), settlementInitiatedBy: current.settlementInitiatedBy, settlementVerifiedBy: { $exists: false } }).session(session);
      if (!refund) throw Object.assign(new Error("Refund was already reconciled."), { statusCode: 409 });
      const booking = await Booking.findById(refund.booking).session(session);
      if (!booking || booking.paymentStatus !== "confirmed" || Math.abs(refund.amount - booking.studentTotal) > 0.01 || ["paid", "processing"].includes(booking.payoutStatus)) {
        throw Object.assign(new Error("Original payment, amount or tutor settlement no longer matches."), { statusCode: 409 });
      }
      booking.paymentStatus = "refunded";
      booking.paymentNote = "Full refund independently reconciled against external settlement evidence";
      booking.payoutStatus = "held";
      booking.payoutNote = "Tutor payout held after full student refund";
      await booking.save({ session });
      refund.status = "processed"; refund.processedAt = new Date();
      refund.settlementVerifiedBy = req.user?._id;
      refund.settlementEvidenceReference = verificationEvidence.trim();
      await refund.save({ session });
      const priorEvent = await PaymentLedger.exists({ provider: "external_refund", providerEventId: `refund-${refund._id}` }).session(session);
      if (priorEvent) throw Object.assign(new Error("A refund ledger event already exists; reconcile it before retrying."), { statusCode: 409 });
      await PaymentLedger.findOneAndUpdate(
        { provider: "external_refund", providerEventId: `refund-${refund._id}` },
        { $setOnInsert: {
          provider: "external_refund", providerEventId: `refund-${refund._id}`,
          providerTransactionId: settlementReference.trim(), eventType: "payment.refunded", status: "refunded",
          booking: booking._id, student: booking.student, tutor: booking.tutor,
          currency: booking.currency || "PKR", grossAmount: booking.studentTotal,
          studentPayment: 0, studentFee: 0, tutorFee: 0, tax: 0, gatewayFee: 0,
          refundAmount: refund.amount, tutorPayable: 0, platformNet: 0, settlementStatus: "reconciled",
          metadata: { verificationMode: "two_person_external_statement_review",
            initiatedBy: refund.settlementInitiatedBy?.toString(), reviewedBy: req.user?._id?.toString(),
            settlementMethod: refund.settlementMethod, evidenceReference: verificationEvidence.trim(),
            note: note.trim().slice(0, 500) },
        } }, { upsert: true, new: true, session }
      );
      await logAudit({ action: "external_refund_verified", actor: req.user?.name || "Finance", actorId: req.user?._id?.toString(),
        entity: "RefundRequest", targetId: current._id.toString(),
        metadata: { reference: settlementReference.trim(), evidenceReference: verificationEvidence.trim() } }, session);
      settled = refund;
    });
  } catch (err: any) {
    res.status(err?.statusCode || 500).json({ success: false, code: "REFUND_RECONCILIATION_FAILED", message: err?.message || "Unable to reconcile refund." }); return;
  } finally { await session.endSession(); }
  // A separate refund-confirmation email should not claim a gateway API was called.
  const student = await User.findById(current.student).select("email name");
  studentEmail = student?.email;
  if (studentEmail) {
    try {
      const html = renderTransactionalEmail({ subject: "TUTORERA® — External Refund Reconciled", emailCategory: "Refund",
        emailHeading: "Refund Reconciled", emailSubheading: "External settlement verification completed", firstName: student?.name,
        openingMessage: `The finance team independently reconciled an external refund of ${(await Booking.findById(current.booking))?.currency || "PKR"} ${current.amount.toLocaleString()} against transaction ${settlementReference.trim()}.`,
        mainMessage: "This confirmation records reconciliation of an externally executed transfer, not an automatic in-app refund. Contact support if your original payment method has not received the funds.",
        includeSecurityNotice: true });
      await sendEmail({ to: studentEmail, subject: "TUTORERA® — External Refund Reconciled", html });
    } catch (err) { console.error("Unable to email refund reconciliation confirmation", err); }
  }
  res.json({ success: true, message: "Externally executed full refund independently reconciled.", refundRequest: settled });
};
