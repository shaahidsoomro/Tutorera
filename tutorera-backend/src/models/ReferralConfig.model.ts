import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReferralMilestone {
  fromReferral: number;
  toReferral: number | null;
  referrerRewardAmount: number;
}

// Singleton document - there is always exactly one. Referral.controller.ts
// reads this at runtime instead of hardcoded constants, so admins can adjust
// the reward without a code deploy.
export interface IReferralConfig extends Document {
  referrerRewardAmount: number;
  referredDiscountAmount: number;
  currency: string;
  isActive: boolean;
  milestonesEnabled: boolean;
  milestones: IReferralMilestone[];
  updatedBy?: Types.ObjectId;
  updatedAt?: Date;
}

const milestoneSchema = new Schema<IReferralMilestone>(
  {
    fromReferral: { type: Number, required: true, min: 1 },
    toReferral: { type: Number, default: null },
    referrerRewardAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const referralConfigSchema = new Schema<IReferralConfig>(
  {
    referrerRewardAmount: { type: Number, default: 200, min: 0 },
    referredDiscountAmount: { type: Number, default: 200, min: 0 },
    // No schema default: a default would also relabel legacy documents that predate this field.
    currency: { type: String, uppercase: true, trim: true },
    isActive: { type: Boolean, default: true },
    milestonesEnabled: { type: Boolean, default: false },
    milestones: {
      type: [milestoneSchema],
      default: [
        { fromReferral: 1,  toReferral: 1,    referrerRewardAmount: 200 },
        { fromReferral: 2,  toReferral: 5,    referrerRewardAmount: 250 },
        { fromReferral: 6,  toReferral: 10,   referrerRewardAmount: 300 },
        { fromReferral: 11, toReferral: 20,   referrerRewardAmount: 400 },
        { fromReferral: 21, toReferral: null, referrerRewardAmount: 500 },
      ],
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<IReferralConfig>("ReferralConfig", referralConfigSchema);
