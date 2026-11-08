import mongoose, { Schema, Document, Types } from "mongoose";

export interface IConversation extends Document {
  student: Types.ObjectId;
  tutor: Types.ObjectId;
  bookings: Types.ObjectId[];
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
    bookings: [{ type: Schema.Types.ObjectId, ref: "Booking" }],
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    studentUnread: { type: Number, default: 0 },
    tutorUnread: { type: Number, default: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ student: 1, tutor: 1 }, { unique: true });

export default mongoose.model<IConversation>("Conversation", conversationSchema);