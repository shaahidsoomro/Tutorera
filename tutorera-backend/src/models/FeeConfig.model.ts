// src/models/FeeConfig.model.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IFeeConfig extends Document {
  version: string;
  countryCode: string;
  currency: string;
  studentFeePercent: number;
  tutorFeePercent: number;
  minimumFee: number;
  maximumFee: number;
  taxPercent: number;
  // Payment gateway processing cost (Switch's own cut) - a
  // real cost of accepting the payment, distinct from TutorEra's own
  // commission (studentFeePercent/tutorFeePercent) and from government tax
  // (TaxConfig, per country). Modeled the standard way gateways price
  // (percentage + fixed amount per transaction) and absorbed from the
  // platform's own margin, not the tutor's payout.
  gatewayFeePercent: number;
  gatewayFixedFee: number;
  effectiveDate: Date;
  isActive: boolean;
  notes?: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const feeConfigSchema = new Schema<IFeeConfig>(
  {
    version: { type: String, required: true },
    countryCode: { type: String, default: "GLOBAL", index: true },
    currency: { type: String, default: "USD" },
    studentFeePercent: { type: Number, default: 0, min: 0, max: 100 },
    tutorFeePercent: { type: Number, default: 20, min: 0, max: 100 },
    minimumFee: { type: Number, default: 0, min: 0 },
    maximumFee: { type: Number, default: 5000, min: 0 },
    taxPercent: { type: Number, default: 15, min: 0, max: 100 },
    gatewayFeePercent: { type: Number, default: 2.9, min: 0, max: 100 },
    gatewayFixedFee: { type: Number, default: 0, min: 0 },
    effectiveDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<IFeeConfig>("FeeConfig", feeConfigSchema);
