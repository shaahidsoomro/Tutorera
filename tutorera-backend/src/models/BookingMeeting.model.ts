import mongoose, { Schema, Types } from "mongoose";

// Explicit document shape so query typing does not rely on schema inference.
export interface IBookingMeeting {
  booking: Types.ObjectId;
  provider: "google_meet" | "microsoft_teams";
  url: string;
  submittedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IBookingMeeting>({
  booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true, index: true },
  provider: { type: String, enum: ["google_meet", "microsoft_teams"], required: true },
  url: { type: String, required: true, maxlength: 2048, select: false },
  submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
export default mongoose.model<IBookingMeeting>("BookingMeeting", schema);
