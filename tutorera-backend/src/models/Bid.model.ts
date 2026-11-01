import mongoose, { Schema, Document, Types } from "mongoose";
import type { MarketplaceFeeQuote } from "../services/pricing.service";

export interface IBid extends Document {
  request: Types.ObjectId;
  tutor: Types.ObjectId;
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  convertedRequestAmount?: number;
  exchangeRate?: number;
  message: string;
  initialStudentRate: number;
  pricingUnit: "hour" | "session" | "month" | "course";
  availability?: string;
  expiresAt: Date;
  viewedAt?: Date;
  renewedAt?: Date;
  renewalCount: number;
  flaggedForModeration: boolean;
  moderationReasons: string[];
  expiryReminderSentAt?: Date;
  status: "pending" | "submitted" | "viewed" | "countered" | "payment_pending" | "accepted" | "rejected" | "withdrawn" | "expired" | "not_selected";
  paymentPendingExpiresAt?: Date;
  feeQuote?: MarketplaceFeeQuote;
  isDirect: boolean;
  shortlistedAt?: Date;
  createdAt: Date;
}

const bidSchema = new Schema<IBid>(
  {
    request: { type: Schema.Types.ObjectId, ref: "Request", required: true },
    tutor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    // The request currency is authoritative. Controller paths always set this;
    // it stays optional at schema level so historical records remain readable
    // until the additive migration has completed.
    currency: { type: String, uppercase: true, trim: true },
    originalAmount: { type: Number },
    originalCurrency: { type: String, trim: true },
    convertedRequestAmount: { type: Number },
    exchangeRate: { type: Number, default: 1.0 },
    initialStudentRate: { type: Number, required: true, min: 0 },
    pricingUnit: { type: String, enum: ["hour", "session", "month", "course"], default: "hour" },
    availability: { type: String, trim: true, maxlength: 300 },
    expiresAt: { type: Date, required: true },
    viewedAt: { type: Date },
    renewedAt: { type: Date },
    renewalCount: { type: Number, default: 0, min: 0 },
    flaggedForModeration: { type: Boolean, default: false },
    moderationReasons: [{ type: String }],
    expiryReminderSentAt: { type: Date },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "submitted", "viewed", "countered", "payment_pending", "accepted", "rejected", "withdrawn", "expired", "not_selected"],
      default: "submitted",
    },
    paymentPendingExpiresAt: { type: Date },
    feeQuote: { type: Schema.Types.Mixed },
    isDirect: { type: Boolean, default: false },
    shortlistedAt: { type: Date },
  },
  { timestamps: true }
);

bidSchema.index({ request: 1, tutor: 1 }, { unique: true });
bidSchema.index({ expiresAt: 1, status: 1 });
bidSchema.index({ tutor: 1, createdAt: -1 });

export default mongoose.model<IBid>("Bid", bidSchema);
