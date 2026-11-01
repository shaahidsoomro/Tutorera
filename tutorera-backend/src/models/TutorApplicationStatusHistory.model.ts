import mongoose, { Schema, Document, Types } from "mongoose";

export type StatusEvent =
  | "TUTOR_AGREEMENT_ISSUED"
  | "TUTOR_AGREEMENT_ACCEPTED"
  | "SUBJECT_ELIGIBILITY_REVIEW_REQUIRED"
  | "APPLICATION_CREATED"
  | "PROFILE_INFORMATION_UPDATED"
  | "EDUCATIONAL_DOCUMENTS_SUBMITTED"
  | "EDUCATIONAL_DOCUMENTS_RESUBMITTED"
  | "EDUCATIONAL_DOCUMENTS_VERIFIED"
  | "EDUCATIONAL_DOCUMENTS_REJECTED"
  | "EDUCATIONAL_DOCUMENTS_PENDING"
  | "CNIC_SUBMITTED"
  | "CNIC_RESUBMITTED"
  | "CNIC_VERIFIED"
  | "CNIC_REJECTED"
  | "CNIC_PENDING"
  | "AVATAR_SUBMITTED"
  | "AVATAR_RESUBMITTED"
  | "AVATAR_VERIFIED"
  | "AVATAR_REJECTED"
  | "AVATAR_PENDING"
  | "DEMO_VIDEO_SUBMITTED"
  | "DEMO_VIDEO_RESUBMITTED"
  | "DEMO_VIDEO_APPROVED"
  | "DEMO_VIDEO_REJECTED"
  | "DEMO_VIDEO_PENDING"
  | "POLICE_VERIFICATION_SUBMITTED"
  | "POLICE_VERIFICATION_RESUBMITTED"
  | "POLICE_VERIFICATION_APPROVED"
  | "POLICE_VERIFICATION_REJECTED"
  | "POLICE_VERIFICATION_PENDING"
  | "SUBJECT_EVIDENCE_SUBMITTED"
  | "SUBJECT_EVIDENCE_REVIEWED"
  | "SUBJECT_ELIGIBILITY_APPROVED"
  | "SUBJECT_ELIGIBILITY_REJECTED"
  | "SUBJECT_ELIGIBILITY_REVOKED"
  | "APPLICATION_SUBMITTED"
  | "MARKETPLACE_ACTIVATED"
  | "MARKETPLACE_DEACTIVATED"
  | "HOME_TUITION_ACTIVATED"
  | "HOME_TUITION_DEACTIVATED"
  | "PROFILE_APPROVED"
  | "PROFILE_REJECTED"
  | "PROFILE_SUSPENDED"
  | "PROFILE_UNSUSPENDED"
  | "RE_VERIFICATION_REQUESTED"
  | "TOKEN_ROTATED"
  | "ADMIN_APPROVAL_EXEMPT_GRANTED"
  | "ADMIN_APPROVAL_EXEMPT_REVOKED"
  | "POLICE_EXEMPTED"
  | "POLICE_REQUIREMENT_RESTORED";

export interface ITutorApplicationStatusHistory extends Document {
  tutor: Types.ObjectId;
  tutorProfile?: Types.ObjectId;
  actor: string;
  actorId?: Types.ObjectId;
  actorRole: "system" | "tutor" | "admin";
  event: StatusEvent;
  statusBefore?: string;
  statusAfter?: string;
  message: string;
  isPublic: boolean;
  createdAt: Date;
}

const tutorApplicationStatusHistorySchema = new Schema<ITutorApplicationStatusHistory>(
  {
    tutor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tutorProfile: { type: Schema.Types.ObjectId, ref: "TutorProfile", index: true },
    actor: { type: String, required: true, default: "System" },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, enum: ["system", "tutor", "admin"], default: "system" },
    event: { type: String, required: true, index: true },
    statusBefore: { type: String },
    statusAfter: { type: String },
    message: { type: String, required: true },
    isPublic: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

tutorApplicationStatusHistorySchema.index({ tutor: 1, createdAt: -1 });
tutorApplicationStatusHistorySchema.index({ tutor: 1, isPublic: 1, createdAt: -1 });

export default mongoose.model<ITutorApplicationStatusHistory>(
  "TutorApplicationStatusHistory",
  tutorApplicationStatusHistorySchema
);
