import mongoose, { Schema } from "mongoose";

// The basket is unique per attempt. This records our intended amount, not a
// claim that the provider created a checkout or received any money.
const schema = new Schema({
  _id: { type: String, required: true },
  provider: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true },
  state: { type: String, enum: ["prepared", "dispatched", "responded", "unknown"], required: true },
  booking: { type: Schema.Types.ObjectId, ref: "Booking" },
  bid: { type: Schema.Types.ObjectId, ref: "Bid" },
  student: { type: Schema.Types.ObjectId, ref: "User" },
  payer: { type: Schema.Types.ObjectId, ref: "User" },
  tutor: { type: Schema.Types.ObjectId, ref: "User" },
  feeSnapshot: { type: Schema.Types.Mixed },
}, { timestamps: true });
schema.index({ state: 1, updatedAt: 1 });
schema.index({ bid: 1, createdAt: -1 });
export default mongoose.model("PaymentCheckoutIntent", schema);
