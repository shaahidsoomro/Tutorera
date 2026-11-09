import mongoose, { Schema, Types } from "mongoose";

// Explicit document shape so query typing does not rely on schema inference.
export interface IAgeReviewRequest {
  student: Types.ObjectId;
  status: "pending" | "in_review" | "closed";
  reason: "missing_date_of_birth" | "incorrect_date_of_birth" | "guardian_contact_recovery";
  resolution?: "referred_to_support" | "duplicate_request";
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  verifiedDateOfBirth?: Date;
  evidenceReference?: string;
  evidenceCheckedBy?: Types.ObjectId;
  evidenceCheckedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ageReviewRequestSchema = new Schema<IAgeReviewRequest>({
  student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["pending", "in_review", "closed"], default: "pending", index: true },
  reason: { type: String, enum: ["missing_date_of_birth", "incorrect_date_of_birth", "guardian_contact_recovery"], required: true },
  resolution: { type: String, enum: ["referred_to_support", "duplicate_request"] },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  assignedAt: { type: Date },
  verifiedDateOfBirth: { type: Date, select: false },
  evidenceReference: { type: String, select: false, maxlength: 120 },
  evidenceCheckedBy: { type: Schema.Types.ObjectId, ref: "User" },
  evidenceCheckedAt: { type: Date },
  // Never accept identity documents or raw birth dates in this request.
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// At most one active age review per student, including concurrent submissions.
// Historical duplicates must be reconciled before deploying this unique index.
ageReviewRequestSchema.index({ student: 1 }, {
  unique: true, partialFilterExpression: { status: { $in: ["pending", "in_review"] } },
  name: "unique_active_student_age_review",
});
export default mongoose.model<IAgeReviewRequest>("AgeReviewRequest", ageReviewRequestSchema);
