import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  messageType: "text" | "image" | "file" | "system";
  isRead: boolean;
  isDeleted: boolean;
  editedAt?: Date;
  editHistory?: Array<{ content: string; editedAt: Date }>;
  attachmentUrl?: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true },
    messageType: { type: String, enum: ["text", "image", "file", "system"], default: "text" },
    isRead: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    editedAt: { type: Date },
    editHistory: [
      {
        content: { type: String, required: true },
        editedAt: { type: Date, required: true },
      },
    ],
    attachmentUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ content: "text" });

export default mongoose.model<IMessage>("Message", messageSchema);