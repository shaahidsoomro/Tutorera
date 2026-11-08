import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBookedSlot extends Document {
  tutor: Types.ObjectId;
  student: Types.ObjectId;
  booking: Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  timezone?: string;
  startAt?: Date;
  endAt?: Date;
  createdAt: Date;
}

const bookedSlotSchema = new Schema<IBookedSlot>(
  {
    tutor:     { type: Schema.Types.ObjectId, ref: "User", required: true },
    student:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    booking:   { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    date:      { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime:   { type: String, required: true },
    timezone: { type: String, trim: true },
    startAt: { type: Date, index: true },
    endAt: { type: Date },
  },
  { timestamps: true }
);

// Prevent double booking — same tutor, same date, same startTime
bookedSlotSchema.index({ tutor: 1, date: 1, startTime: 1 }, { unique: true });
// A compound sparse index still includes legacy slots when `tutor` exists but
// `startAt` does not. Restrict this constraint to normalized UTC instants.
// Named separately from the old sparse `tutor_1_startAt_1` so both can coexist
// while migrateBookedSlotStartAtIndex swaps them without a uniqueness gap.
bookedSlotSchema.index({ tutor: 1, startAt: 1 }, { name: "tutor_1_startAt_1_dated", unique: true, partialFilterExpression: { startAt: { $type: "date" } } });
bookedSlotSchema.index({ tutor: 1, startAt: 1, endAt: 1 });

export default mongoose.model<IBookedSlot>("BookedSlot", bookedSlotSchema);
