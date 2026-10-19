import mongoose, { Schema } from "mongoose";

const ageReviewRequestSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["pending", "closed"], default: "pending", index: true },
  reason: { type: String, enum: ["missing_date_of_birth", "incorrect_date_of_birth"], required: true },
  // Never accept identity documents or raw birth dates in this request.
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

ageReviewRequestSchema.index({ student: 1, status: 1 });
export default mongoose.model("AgeReviewRequest", ageReviewRequestSchema);
