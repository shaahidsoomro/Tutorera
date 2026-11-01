import mongoose, { Document, Schema, Types } from "mongoose";

export interface ILearningProgress extends Document {
  booking: Types.ObjectId;
  tutor: Types.ObjectId;
  student: Types.ObjectId;
  sessionDate: Date;
  sessionNumber?: number;
  topicsCovered: string[];
  homework?: string;
  attendanceStatus: "present" | "absent" | "late" | "rescheduled";
  tutorNotes?: string;
  studentMood?: "great" | "good" | "okay" | "struggling";
  nextSessionGoals?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LearningProgressSchema = new Schema<ILearningProgress>(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    tutor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionDate: { type: Date, required: true },
    sessionNumber: { type: Number },
    topicsCovered: [{ type: String, trim: true, maxlength: 200 }],
    homework: { type: String, trim: true, maxlength: 1000 },
    attendanceStatus: {
      type: String,
      enum: ["present", "absent", "late", "rescheduled"],
      default: "present",
    },
    tutorNotes: { type: String, trim: true, maxlength: 2000 },
    studentMood: { type: String, enum: ["great", "good", "okay", "struggling"] },
    nextSessionGoals: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export default mongoose.model<ILearningProgress>("LearningProgress", LearningProgressSchema);
