import mongoose, { Document, Schema, Types } from "mongoose";

export type AcademicRecordStatus = "active" | "inactive" | "archived";

export interface ISubjectCategory extends Document {
  code: string;
  name: string;
  slug: string;
  description?: string;
  status: AcademicRecordStatus;
  displayOrder: number;
  parentCategory?: Types.ObjectId | null;
  isPublic: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ISubjectCategory>({
  code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["active", "inactive", "archived"], default: "active", index: true },
  displayOrder: { type: Number, default: 0 },
  parentCategory: { type: Schema.Types.ObjectId, ref: "SubjectCategory", default: null },
  isPublic: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  archivedAt: { type: Date },
}, { timestamps: true });

schema.index({ status: 1, displayOrder: 1, name: 1 });
schema.index({ parentCategory: 1 });

export default mongoose.model<ISubjectCategory>("SubjectCategory", schema);
