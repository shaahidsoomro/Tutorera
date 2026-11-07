import mongoose, { Schema } from "mongoose";

// Only authenticated, normalized provider fields are retained. This record is
// evidence of receipt, not proof that the event has been reconciled.
const schema = new Schema({
  _id: { type: String, required: true },
  provider: { type: String, required: true },
  payloadHash: { type: String, required: true },
  providerEventId: { type: String },
  reference: { type: String },
  eventType: { type: String },
  status: { type: String },
  amount: { type: Schema.Types.Mixed },
  currency: { type: String },
  reviewReason: { type: String, maxlength: 100 },
  state: { type: String, enum: ["pending", "processed", "unmatched", "exception"], default: "pending" },
  verifiedAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ state: 1, createdAt: 1 });
schema.index({ provider: 1, reference: 1, createdAt: -1 });
export default mongoose.model("PaymentWebhookEvent", schema);
