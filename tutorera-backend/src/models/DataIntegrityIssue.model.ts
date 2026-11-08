import mongoose, { Document, Schema, Types } from "mongoose";

export type DataIntegrityIssueType =
  | "orphan_reference"
  | "missing_payment_confirmation"
  | "missing_completion_timestamp"
  | "incomplete_fee_snapshot";

export interface IDataIntegrityIssue extends Document {
  fingerprint: string;
  type: DataIntegrityIssueType;
  severity: "high" | "critical";
  entityType: string;
  entityId: string;
  relation?: string;
  countryCode?: string;
  details: Record<string, unknown>;
  status: "open" | "reviewing" | "resolved" | "ignored";
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolutionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IDataIntegrityIssue>({
  fingerprint: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: ["orphan_reference", "missing_payment_confirmation", "missing_completion_timestamp", "incomplete_fee_snapshot"], required: true, index: true },
  severity: { type: String, enum: ["high", "critical"], required: true, index: true },
  entityType: { type: String, required: true, trim: true, index: true },
  entityId: { type: String, required: true, trim: true, index: true },
  relation: { type: String, trim: true },
  countryCode: { type: String, uppercase: true, trim: true, index: true },
  // Store identifiers and lifecycle facts only. Never duplicate personal data
  // or financial evidence into the operations queue.
  details: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["open", "reviewing", "resolved", "ignored"], default: "open", index: true },
  detectedAt: { type: Date, required: true, default: Date.now, index: true },
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  resolutionNote: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });

schema.index({ status: 1, severity: -1, detectedAt: -1 });
schema.index({ entityType: 1, entityId: 1, status: 1 });

export default mongoose.model<IDataIntegrityIssue>("DataIntegrityIssue", schema);
