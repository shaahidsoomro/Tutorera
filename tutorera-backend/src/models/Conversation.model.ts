import mongoose, { Schema, Document, Types } from "mongoose";

export interface IConversation extends Document {
  student: Types.ObjectId;
  tutor: Types.ObjectId;
  request?: Types.ObjectId;
  offer?: Types.ObjectId;
  bookings: Types.ObjectId[];
  stage: 'offer' | 'booking';
  lastMessage: string;
  lastMessageAt: Date;
  studentUnread: number;
  tutorUnread: number;
  createdAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tutor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    request: { type: Schema.Types.ObjectId, ref: "Request", index: true },
    offer: { type: Schema.Types.ObjectId, ref: "Bid", index: true },
    bookings: [{ type: Schema.Types.ObjectId, ref: "Booking" }],
    stage: { type: String, enum: ['offer', 'booking'], default: 'booking' },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    studentUnread: { type: Number, default: 0 },
    tutorUnread: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One conversation per student-tutor pair: the offer-stage chat becomes the
// booking chat once bookings are attached to it.
conversationSchema.index({ student: 1, tutor: 1 }, { unique: true });
conversationSchema.index({ bookings: 1 });

export default mongoose.model<IConversation>("Conversation", conversationSchema);