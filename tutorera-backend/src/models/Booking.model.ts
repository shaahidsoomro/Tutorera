import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBooking extends Document {
  student: Types.ObjectId;
  tutor: Types.ObjectId;
  request: Types.ObjectId;
  bid: Types.ObjectId;
  parent?: Types.ObjectId;
  amount: number;
  finalAgreedRate: number;
  currency?: string;
  countryCode?: string;
  timezone?: string;
  scheduleTimezone?: string;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date;
  // Structured recurrence data — mirrors Request.model.ts's fields of the
  // same name. Previously this data existed on the Request document but was
  // silently dropped when finalizeBidAcceptance built the Booking, leaving
  // only the free-text `schedule` string (e.g. "MonL12pm, Wed: 12pm,
  // Fri:4pm") with nothing structured behind it to compute real calendar
  // occurrence dates, reminders, or Google Meet events from.
  preferredDays?: string[];
  preferredStartTime?: string;
  sessionDurationMinutes?: number;
  sessionsPerWeek?: number;
  expectedStartDate?: Date;
  pricingUnit: "hour" | "session" | "month" | "course";
  sessionCount: number;
  subtotal: number;
  studentFee: number;
  tutorFee: number;
  tax: number;
  studentTotal: number;
  tutorNet: number;
  feeConfig: Record<string, unknown>;
  platformFee: number;
  tutorPayout: number;
  schedule: string;
  teachingMode: "online" | "in-person" | "both";
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  cancelReason?: string;
  completedAt?: Date;
  reviewRequestSentAt?: Date;
  paymentStatus: "pending" | "received" | "confirmed" | "failed" | "refunded" | "partially_refunded" | "chargeback" | "disputed";
  paymentConfirmedAt?: Date;
  paymentNote?: string;
  payoutStatus: "pending" | "approved" | "processing" | "paid" | "failed" | "held";
  payoutNote?: string;
  payoutRequestedAt?: Date;
  payoutApprovedAt?: Date;
  payoutProcessingAt?: Date;
  payoutPaidAt?: Date;
  payoutFailedAt?: Date;
  payoutSettlementReference?: string;
  payoutSettlementMethod?: string;
  payoutEvidenceReference?: string;
  payoutInitiatedBy?: Types.ObjectId;
  payoutVerifiedBy?: Types.ObjectId;
  isFirstSession: boolean;
  // Set when a tutor's subject-teaching eligibility for this booking's
  // subject is rejected/revoked AFTER the booking was already made (e.g.
  // their degree verification was overturned, or an admin pulled back a
  // previously-approved subject) - see
  // services/subjectEligibility.service.ts's revokeSubjectEligibility().
  // Does not auto-cancel the booking; surfaces it for an admin to decide.
  flaggedForReview?: boolean;
  flagReason?: string;
  flaggedAt?: Date;
  rescheduleProposal?: {
    proposedBy: Types.ObjectId;
    proposedByRole: "student" | "tutor";
    proposedStartAt: Date;
    proposedEndAt: Date;
    proposedAt: Date;
    note?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tutor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    request: { type: Schema.Types.ObjectId, ref: "Request" },
    bid: { type: Schema.Types.ObjectId, ref: "Bid" },
    parent: { type: Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true },
    finalAgreedRate: { type: Number, required: true },
    currency: { type: String, uppercase: true, trim: true, index: true },
    countryCode: { type: String, uppercase: true, trim: true, index: true },
    timezone: { type: String, trim: true },
    scheduleTimezone: { type: String, trim: true },
    scheduledStartAt: { type: Date, index: true },
    scheduledEndAt: { type: Date },
    preferredDays: [{ type: String }],
    preferredStartTime: { type: String },
    sessionDurationMinutes: { type: Number, min: 15, max: 480 },
    sessionsPerWeek: { type: Number, min: 1, max: 14 },
    expectedStartDate: { type: Date },
    pricingUnit: { type: String, enum: ["hour", "session", "month", "course"], default: "hour" },
    sessionCount: { type: Number, default: 1, min: 1 },
    subtotal: { type: Number, required: true },
    studentFee: { type: Number, default: 0 },
    tutorFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    studentTotal: { type: Number, required: true },
    tutorNet: { type: Number, required: true },
    feeConfig: { type: Schema.Types.Mixed, required: true },
    platformFee: { type: Number, default: 0 },
    tutorPayout: { type: Number, default: 0 },
    schedule: { type: String, required: true },
    teachingMode: { type: String, enum: ["online", "in-person", "both"], default: "both" },
    status: { type: String, enum: ["upcoming", "ongoing", "completed", "cancelled"], default: "upcoming" },
    cancelReason: { type: String },
    completedAt: { type: Date },
    reviewRequestSentAt: { type: Date },
    paymentStatus: {
      type: String,
      enum: ["pending", "received", "confirmed", "failed", "refunded", "partially_refunded", "chargeback", "disputed"],
      default: "pending",
    },
    paymentNote: { type: String, default: "" },
    paymentConfirmedAt: { type: Date, index: true },
    payoutStatus: {
      type: String,
      enum: ["pending", "approved", "processing", "paid", "failed", "held"],
      default: "pending",
    },
    payoutNote: { type: String, default: "" },
    payoutRequestedAt: { type: Date },
    payoutApprovedAt: { type: Date },
    payoutProcessingAt: { type: Date },
    payoutPaidAt: { type: Date },
    payoutFailedAt: { type: Date },
    payoutSettlementReference: { type: String, trim: true },
    payoutSettlementMethod: { type: String, trim: true },
    payoutEvidenceReference: { type: String, trim: true },
    payoutInitiatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    payoutVerifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isFirstSession: { type: Boolean, default: false },
    flaggedForReview: { type: Boolean, default: false, index: true },
    flagReason: { type: String, trim: true, default: "" },
    flaggedAt: { type: Date },
    rescheduleProposal: {
      proposedBy: { type: Schema.Types.ObjectId, ref: "User" },
      proposedByRole: { type: String, enum: ["student", "tutor"] },
      proposedStartAt: { type: Date },
      proposedEndAt: { type: Date },
      proposedAt: { type: Date },
      note: { type: String, trim: true, maxlength: 500 },
    },
  },
  { timestamps: true }
);

bookingSchema.index({ tutor: 1, payoutStatus: 1, payoutPaidAt: -1 });
bookingSchema.index({ countryCode: 1, currency: 1, createdAt: -1 });

export default mongoose.model<IBooking>("Booking", bookingSchema);