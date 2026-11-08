import mongoose, { Schema, Document, Types } from "mongoose";

export type RefundReason =
  | "tutor_cancelled"
  | "session_not_delivered"
  | "quality_issue"
  | "scheduling_conflict"
  | "duplicate_charge"
  | "other";

export interface IRefundRequest extends Document {
  student: Types.ObjectId;
  parent?: Types.ObjectId;
  booking: Types.ObjectId;
  tutor: Types.ObjectId;
  amount: number;
  reason: RefundReason;
  details: string;
  status: "pending" | "approved" | "rejected" | "processed";
  adminNote: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  processedAt?: Date;
  settlementReference?: string;
  settlementMethod?: string;
  settlementEvidenceReference?: string;
  settlementInitiatedBy?: Types.ObjectId;
  settlementVerifiedBy?: Types.ObjectId;
  voidedSettlements?: Array<{ reference?: string; method?: string; originalEvidence?: string; initiatedBy?: Types.ObjectId; reviewedBy?: Types.ObjectId; reviewEvidence?: string; reason?: string; reviewedAt?: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const refundRequestSchema = new Schema<IRefundRequest>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parent: { type: Schema.Types.ObjectId, ref: "User" },
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    tutor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    reason: {
      type: String,
      enum: ["tutor_cancelled", "session_not_delivered", "quality_issue", "scheduling_conflict", "duplicate_charge", "other"],
      required: true,
    },
    details: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected", "processed"], default: "pending" },
    adminNote: { type: String, default: "" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    processedAt: { type: Date },
    settlementReference: { type: String, trim: true },
    settlementMethod: { type: String, trim: true },
    settlementEvidenceReference: { type: String, trim: true },
    settlementInitiatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    settlementVerifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    voidedSettlements: [{ reference: String, method: String, originalEvidence: String, initiatedBy: { type: Schema.Types.ObjectId, ref: "User" }, reviewedBy: { type: Schema.Types.ObjectId, ref: "User" }, reviewEvidence: String, reason: String, reviewedAt: Date }],
  },
  { timestamps: true }
);

refundRequestSchema.index({ student: 1, createdAt: -1 });
refundRequestSchema.index({ parent: 1, createdAt: -1 });
refundRequestSchema.index({ status: 1, createdAt: -1 });
refundRequestSchema.index({ booking: 1 }, { unique: true });

export default mongoose.model<IRefundRequest>("RefundRequest", refundRequestSchema);
