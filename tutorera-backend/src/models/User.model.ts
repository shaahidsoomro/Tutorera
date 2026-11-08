import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser } from "../types";

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [
        function (this: IUser) {
          return this.authProvider === "local";
        },
        "Password is required",
      ],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["student", "tutor", "admin", "pending", "parent"],
      default: "student",
    },
    adminRole: {
      type: String,
      enum: [
        "super_admin",
        "marketplace_operations",
        "student_success",
        "tutor_operations",
        "verification_officer",
        "trust_and_safety",
        "finance",
        "support",
        "growth",
        "content",
        "analyst",
        "country_admin",
      ],
      default: "super_admin",
    },
    adminPermissions: [{ type: String }],
    allowedCountryCodes: [{ type: String, uppercase: true, trim: true }],
    phone: { type: String, trim: true },
    countryCode: { type: String, uppercase: true, trim: true, index: true },
    countryName: { type: String, trim: true },
    country: { type: Schema.Types.ObjectId, ref: "Country", index: true },
    region: { type: Schema.Types.ObjectId, ref: "Region", index: true },
    cityRef: { type: Schema.Types.ObjectId, ref: "City", index: true },
    locality: { type: Schema.Types.ObjectId, ref: "Locality", index: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere" },
    },
    timezone: { type: String, trim: true },
    currency: { type: String, uppercase: true, trim: true },
    preferredLanguage: { type: String, lowercase: true, trim: true, default: "en" },
    avatar: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    // Account enforcement is deliberately distinct from tutor-profile eligibility.
    // `isActive` remains the fast authentication gate for backwards compatibility.
    moderationStatus: { type: String, enum: ["active", "suspended", "banned", "deleted"], default: "active", index: true },
    suspendedAt: { type: Date },
    suspendedUntil: { type: Date },
    bannedAt: { type: Date },
    moderationReason: { type: String, trim: true, maxlength: 1000 },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderationCase: { type: Schema.Types.ObjectId, ref: "SafetyCase" },
    sessionInvalidBefore: { type: Date },
    // Explicitly marks non-production accounts created by seeds, QA, or
    // demonstrations. Public marketplace queries must never surface them.
    isTestAccount: { type: Boolean, default: false, index: true },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    referralCode: { type: String, unique: true, sparse: true },
    referralCredit: { type: Number, default: 0 },
    // Currency of this user's referral balance. Legacy balances predate the
    // currency-aware referral program and were always issued in PKR; run
    // `npm run migrate:referral-currency -- --apply` to stamp them honestly
    // instead of letting this default relabel historic credits.
    referralCreditCurrency: { type: String, uppercase: true, trim: true, default: "USD" },
    referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    accountStatus: {
      type: String,
      enum: ["registered", "onboarding", "profile_complete", "submitted", "verified", "rejected"],
      default: "registered",
    },

    // ── Tutor Application Tracking ──
    applicationId: { type: String, unique: true, sparse: true, index: true },
    trackingTokenHash: { type: String, unique: true, sparse: true, index: true },
    trackingTokenCreatedAt: { type: Date },
    trackingTokenRotatedAt: { type: Date },
    applicationSubmittedAt: { type: Date },

    // ── Legal, Privacy & Compliance ──
    legalTermsVersionAccepted: { type: String, default: "2026.2-GLOBAL" },
    privacyVersionAccepted: { type: String, default: "2026.2-GLOBAL" },
    legalAcceptedAt: { type: Date, default: Date.now },
    legalAcceptedIp: { type: String },
    parentConsentVerified: { type: Boolean, default: false },
    guardianConsentVerifiedAt: { type: Date },
    parentGuardianEmail: { type: String, trim: true },
    parentGuardianName: { type: String, trim: true },
    children: [{ type: Schema.Types.ObjectId, ref: "User" }],
    dateOfBirth: { type: Date },
    isMinor: { type: Boolean, default: false },
    marketingConsent: { type: Boolean, default: false },
    cookieConsent: {
      necessary: { type: Boolean, default: true },
      analytics: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
      updatedAt: { type: Date, default: Date.now },
    },
    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      bookingUpdates: { type: Boolean, default: true },
      bidNotifications: { type: Boolean, default: true },
      chatMessages: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      platformUpdates: { type: Boolean, default: false },
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletionReason: { type: String },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !(this as any).password) return;
  (this as any).password = await bcrypt.hash((this as any).password, 12);
});

// Compare password
userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// location.type defaults to "Point" whenever the location subdocument exists
// at all, even if coordinates was never populated. MongoDB's 2dsphere index
// then rejects EVERY save of that document with "Can't extract geo keys" -
// not just location updates - because it can't build an index entry from an
// incomplete GeoJSON Point. Strip an invalid location out before validation.
userSchema.pre("validate", function () {
  const p = this as any;
  if (p.location && (!Array.isArray(p.location.coordinates) || p.location.coordinates.length !== 2)) {
    p.location = undefined;
  }
});

userSchema.index({ createdAt: -1 });

export default mongoose.model<IUser>("User", userSchema);
