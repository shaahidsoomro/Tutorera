import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReview extends Document {
  tutor: Types.ObjectId;
  student: Types.ObjectId;
  booking: Types.ObjectId;
  rating: number;
  comment: string;
  tutorResponse?: string;
  tutorRespondedAt?: Date;
  isVerifiedBooking: boolean;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    tutor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, minlength: 10 },
    tutorResponse: { type: String, trim: true, maxlength: 1000 },
    tutorRespondedAt: { type: Date },
    isVerifiedBooking: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One review per booking
reviewSchema.index({ booking: 1, student: 1 }, { unique: true });

export default mongoose.model<IReview>("Review", reviewSchema);