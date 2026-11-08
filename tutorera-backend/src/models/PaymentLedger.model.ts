import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPaymentLedger extends Document {
  booking?: Types.ObjectId;
  bid?: Types.ObjectId;
  student?: Types.ObjectId;
  payer?: Types.ObjectId;
  tutor?: Types.ObjectId;
  provider: string;
  providerEventId?: string;
  providerTransactionId: string;
  eventType: "checkout.created" | "payment.succeeded" | "payment.failed" | "payment.refunded" | "payout.requested" | "payout.completed" | "manual.adjustment";
  status: "pending" | "succeeded" | "failed" | "refunded" | "processing";
  grossAmount: number;
  currency: string;
  studentPayment: number;
  studentFee: number;
  tutorFee: number;
  tax: number;
  gatewayFee: number;
  refundAmount: number;
  tutorPayable: number;
  platformNet: number;
  settlementStatus: "unsettled" | "expected" | "settled" | "reconciled" | "exception";
  feeSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentLedgerSchema = new Schema<IPaymentLedger>(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    bid: { type: Schema.Types.ObjectId, ref: "Bid", index: true },
    student: { type: Schema.Types.ObjectId, ref: "User", index: true },
    payer: { type: Schema.Types.ObjectId, ref: "User", index: true },
    tutor: { type: Schema.Types.ObjectId, ref: "User", index: true },
    // New ledger rows must always identify the active gateway. Historical
    // provider values are retained as immutable financial evidence.
    provider: { type: String, required: true, trim: true, default: "rapidpay", index: true },
    providerEventId: { type: String, trim: true, index: true },
    providerTransactionId: { type: String, required: true, trim: true, index: true },
    eventType: { type: String, enum: ["checkout.created", "payment.succeeded", "payment.failed", "payment.refunded", "payout.requested", "payout.completed", "manual.adjustment"], required: true },
    status: { type: String, enum: ["pending", "succeeded", "failed", "refunded", "processing"], required: true },
    grossAmount: { type: Number, required: true, min: 0 },
    // Historical rows retain their stored currency. New ledgers are created
    // in the active market's USD settlement currency.
    currency: { type: String, required: true, trim: true, default: "USD" },
    studentPayment: { type: Number, default: 0, min: 0 },
    studentFee: { type: Number, default: 0, min: 0 },
    tutorFee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    gatewayFee: { type: Number, default: 0, min: 0 },
    refundAmount: { type: Number, default: 0, min: 0 },
    tutorPayable: { type: Number, default: 0, min: 0 },
    platformNet: { type: Number, default: 0 },
    settlementStatus: { type: String, enum: ["unsettled", "expected", "settled", "reconciled", "exception"], default: "unsettled", index: true },
    feeSnapshot: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Partial filter so the unique constraint only applies to rows that actually
// carry a providerEventId (gateway webhook events). Rows without one (checkout
// creation, poll-based confirmation) must be allowed to coexist for the same
// basket. A sparse index is not sufficient here — MongoDB's sparse index still
// indexes documents where the field is explicitly null, and Mongoose sets
// absent String paths to null in $setOnInsert, causing false dup-key errors.
paymentLedgerSchema.index(
  { provider: 1, providerEventId: 1 },
  { unique: true, partialFilterExpression: { providerEventId: { $exists: true, $type: "string" } } }
);
paymentLedgerSchema.index({ providerTransactionId: 1, eventType: 1, createdAt: -1 });
paymentLedgerSchema.index({ provider: 1, eventType: 1, status: 1, updatedAt: 1 });

export default mongoose.model<IPaymentLedger>("PaymentLedger", paymentLedgerSchema);
