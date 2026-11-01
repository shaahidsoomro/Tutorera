import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.model";
import { logAudit } from "../utils/logAudit";
import { sendTokenResponse, generateToken } from "../utils/generateToken";
import { AuthRequest } from "../types";
import crypto from "crypto";
import { NotificationService } from "../services/notification.service";
import {
  studentWelcomeEmail,
  parentWelcomeEmail,
  tutorWelcomeApplicationEmail,
  adminNewUserSignupEmail,
  passwordResetOtpEmail,
} from "../utils/emailTemplates";
import StudentProfile from "../models/StudentProfile.model";
import TutorProfile from "../models/TutorProfile.model";
import ParentProfile from "../models/ParentProfile.model";
import RequestModel from "../models/Request.model";
import Bid from "../models/Bid.model";
import Booking from "../models/Booking.model";
import Review from "../models/Review.model";
import {
  allocateApplicationId,
  generateTrackingToken,
  recordStatusEvent,
} from "../services/tracking.service";
import { trackingWelcomeEmail } from "../utils/trackingEmails";
import { resolveMarket } from "../services/market.service";
import { ageOnDate, issueGuardianConsent } from "../services/guardianConsent.service";
import { newGoogleStudentSchema } from "../validators/auth.validator";

const TRACKING_BASE_URL = process.env.CLIENT_URL || "https://tutorera.ac.pk";

// Google ID token verification — JWKS-based (fetch-based, works in CF Workers).
// Fetches Google's public keys via native fetch, converts JWK → PEM, verifies RS256.
let _googleJwksCache: { keys: Array<{ kid: string; n: string; e: string }>; fetchedAt: number } | null = null;

async function getGooglePublicKey(kid: string): Promise<string | null> {
  const now = Date.now();
  if (!_googleJwksCache || now - _googleJwksCache.fetchedAt > 3_600_000) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!res.ok) return null;
    const data = await res.json() as { keys: Array<{ kid: string; n: string; e: string; kty: string; alg: string }> };
    _googleJwksCache = { keys: data.keys, fetchedAt: now };
  }
  const key = _googleJwksCache.keys.find((k) => k.kid === kid);
  if (!key) return null;
  // Convert JWK RSA public key to PEM
  const n = Buffer.from(key.n, "base64url");
  const e = Buffer.from(key.e, "base64url");
  // ASN.1 DER encoding of RSAPublicKey: SEQUENCE { INTEGER n, INTEGER e }
  const encodeAsn1Int = (buf: Buffer): Buffer => {
    const needsPad = buf[0] & 0x80;
    const body = needsPad ? Buffer.concat([Buffer.from([0x00]), buf]) : buf;
    const lenBytes = body.length > 127
      ? Buffer.from([0x82, (body.length >> 8) & 0xff, body.length & 0xff])
      : Buffer.from([body.length]);
    return Buffer.concat([Buffer.from([0x02]), lenBytes, body]);
  };
  const nAsn1 = encodeAsn1Int(n);
  const eAsn1 = encodeAsn1Int(e);
  const seqBody = Buffer.concat([nAsn1, eAsn1]);
  const seqLenBytes = seqBody.length > 127
    ? Buffer.from([0x82, (seqBody.length >> 8) & 0xff, seqBody.length & 0xff])
    : Buffer.from([seqBody.length]);
  const rsaPublicKey = Buffer.concat([Buffer.from([0x30]), seqLenBytes, seqBody]);
  // SubjectPublicKeyInfo wrapper: SEQUENCE { SEQUENCE { OID rsaEncryption, NULL }, BIT STRING rsaPublicKey }
  const rsaOid = Buffer.from([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
  const bitStringBody = Buffer.concat([Buffer.from([0x00]), rsaPublicKey]);
  const bitStringLen = bitStringBody.length > 127
    ? Buffer.from([0x82, (bitStringBody.length >> 8) & 0xff, bitStringBody.length & 0xff])
    : Buffer.from([bitStringBody.length]);
  const bitString = Buffer.concat([Buffer.from([0x03]), bitStringLen, bitStringBody]);
  const spkiBody = Buffer.concat([rsaOid, bitString]);
  const spkiLenBytes = spkiBody.length > 127
    ? Buffer.from([0x82, (spkiBody.length >> 8) & 0xff, spkiBody.length & 0xff])
    : Buffer.from([spkiBody.length]);
  const spki = Buffer.concat([Buffer.from([0x30]), spkiLenBytes, spkiBody]);
  const b64 = spki.toString("base64");
  return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----`;
}

async function verifyGoogleIdToken(idToken: string): Promise<{ sub: string; email: string; name?: string; picture?: string } | null> {
  try {
    // Decode header to get kid without verifying (safe — we verify next)
    const [headerB64] = idToken.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8")) as { kid?: string; alg?: string };
    if (!header.kid || header.alg !== "RS256") return null;
    const publicKey = await getGooglePublicKey(header.kid);
    if (!publicKey) return null;
    const decoded = jwt.verify(idToken, publicKey, {
      algorithms: ["RS256"],
      audience: process.env.GOOGLE_CLIENT_ID,
      issuer: ["accounts.google.com", "https://accounts.google.com"],
    }) as jwt.JwtPayload;
    if (!decoded.email || decoded.email_verified !== true || !decoded.sub) return null;
    return { sub: decoded.sub, email: decoded.email as string, name: decoded.name as string | undefined, picture: decoded.picture as string | undefined };
  } catch {
    return null;
  }
}

// @desc    Register user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, phone, city, countryCode = "PK", dateOfBirth, guardianEmail, guardianName } = req.body;
  const studentAge = role === "student" ? ageOnDate(dateOfBirth) : -1;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400).json({ success: false, message: "Email already registered" });
    return;
  }

  const market = await resolveMarket(countryCode);
  if (!market || !market.isActive) {
    res.status(422).json({ success: false, message: "Registration is not available in the selected market." });
    return;
  }
  if ((role === "tutor" && !market.tutorRegistration) || ((role === "student" || role === "parent") && !market.studentRegistration)) {
    res.status(422).json({ success: false, message: "Registration for this account type is not available in the selected market." });
    return;
  }
  const user = await User.create({
    name, email, password, role, phone, city,
    countryCode: market.countryCode, countryName: market.countryName,
    timezone: market.timezone, currency: market.currency,
    preferredLanguage: req.body.preferredLanguage || market.defaultLanguage,
    accountStatus: "registered",
    ...(role === "student" ? {
      dateOfBirth: new Date(dateOfBirth + "T00:00:00.000Z"),
      isMinor: studentAge < 18, parentConsentVerified: studentAge >= 18,
      ...(studentAge < 18 ? { parentGuardianEmail: guardianEmail.toLowerCase(),
        parentGuardianName: guardianName.trim() } : {}),
    } : {}),
  });

  // Mailbox delivery errors must not authorize a restricted minor account.
  if (role === "student" && studentAge < 18) {
    try { await issueGuardianConsent(user._id); }
    catch (err) { console.error("[Safeguarding] Could not deliver initial guardian consent:", err); }
  }

  let trackingToken: string | undefined;
  if (user.role === "tutor") {
    user.applicationId = await allocateApplicationId();
    const t = generateTrackingToken();
    user.trackingTokenHash = t.hash;
    user.trackingTokenCreatedAt = new Date();
    user.applicationSubmittedAt = new Date();
    await user.save();
    trackingToken = t.plaintext;
  } else if (user.role === "parent") {
    await ParentProfile.create({ user: user._id, children: [], approvalRequiredForBookings: false });
  }

  await logAudit({
    action: "user_registered",
    actor: "System",
    entity: "User",
    targetId: user._id.toString(),
    targetName: user.name,
    metadata: { role: user.role, email: user.email, applicationId: user.applicationId },
  });

  if (user.role === "tutor") {
    await recordStatusEvent({
      tutorId: user._id.toString(),
      actor: { name: user.name, role: "system" },
      event: "APPLICATION_CREATED",
      message: "Tutor application created",
      isPublic: true,
    });
  }

  try {
    const payload: Record<string, unknown> = { role: user.role };
    if (user.role === "tutor") {
      const trackingUrl = (user.applicationId && trackingToken) ? `${TRACKING_BASE_URL}/track/tutor/${trackingToken}` : `${TRACKING_BASE_URL}/tutor/application-status`;
      payload.applicationId = user.applicationId;
      payload.trackingUrl = trackingUrl;
    }
    await NotificationService.publishEvent(user._id.toString(), "auth.registered", payload);

    try {
      // Platform super-admin notification
      await NotificationService.publishEvent("system_admin", "admin.user_registered", {
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
        country: user.countryName,
        authProvider: "local",
        applicationId: user.applicationId,
      });
    } catch (adminErr) {
      console.error("Failed to send admin signup alert email:", adminErr);
    }
  } catch (err) {
    console.error("Failed to send registration email:", err);
  }

  sendTokenResponse(user, 201, res);
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    res.status(401).json({ success: false, message: "Invalid email or password" });
    return;
  }

  if (user.authProvider === "google" && !user.password) {
    res.status(400).json({
      success: false,
      message: "This account uses Google Sign-In. Please log in with Google.",
    });
    return;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(401).json({ success: false, message: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ success: false, message: "Your account has been deactivated" });
    return;
  }

  if (user.isDeleted) {
    res.status(403).json({ success: false, message: "This account has been deleted upon request." });
    return;
  }

  sendTokenResponse(user, 200, res);
};

// @desc    Google Sign-In / Sign-Up
// @route   POST /api/auth/google
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  const { idToken, role, countryCode = "PK", preferredLanguage, dateOfBirth, guardianEmail, guardianName } = req.body;

  const payload = await verifyGoogleIdToken(idToken);
  if (!payload) {
    res.status(401).json({ success: false, message: "Invalid Google token" });
    return;
  }

  const { sub: googleId, email, name, picture } = payload;

  // 1. Existing user linked to this Google account
  let user = await User.findOne({ googleId });

  // 2. Existing local account with the same email — link it
  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      user.googleId = googleId;
      if (!user.avatar) user.avatar = picture || "";
      await user.save();
    }
  }

  let isNewUser = false;
  let trackingToken: string | undefined;

  // 3. No existing user at all — create one with selected role or pending
  if (!user) {
    const assignedRole = role === "student" || role === "tutor" || role === "parent" ? role : "pending";
    if (assignedRole === "student") {
      const valid = newGoogleStudentSchema.safeParse({
        role: "student", email, dateOfBirth, guardianEmail, guardianName,
      });
      if (!valid.success) {
        res.status(400).json({ success: false, code: "STUDENT_AGE_DETAILS_REQUIRED",
          message: valid.error.issues[0]?.message || "Student date of birth and guardian details are required." });
        return;
      }
    }
    const market = await resolveMarket(countryCode);
    if (!market || !market.isActive) {
      res.status(422).json({ success: false, message: "Registration is not available in the selected market." });
      return;
    }
    if ((assignedRole === "tutor" && !market.tutorRegistration) ||
        ((assignedRole === "student" || assignedRole === "parent") && !market.studentRegistration) ||
        (assignedRole === "pending" && !market.tutorRegistration && !market.studentRegistration)) {
      res.status(422).json({ success: false, message: "Registration for this account type is not available in the selected market." });
      return;
    }
    isNewUser = true;
    user = await User.create({
      name: name || email.split("@")[0],
      email,
      googleId,
      authProvider: "google",
      role: assignedRole,
      avatar: picture || "",
      countryCode: market.countryCode,
      countryName: market.countryName,
      currency: market.currency,
      timezone: market.timezone,
      preferredLanguage: preferredLanguage || market.defaultLanguage,
      accountStatus: "registered",
      ...(assignedRole === "student" ? {
        dateOfBirth: new Date(dateOfBirth + "T00:00:00.000Z"),
        isMinor: ageOnDate(dateOfBirth) < 18,
        parentConsentVerified: ageOnDate(dateOfBirth) >= 18,
        ...(ageOnDate(dateOfBirth) < 18 ? {
          parentGuardianEmail: guardianEmail.toLowerCase(),
          parentGuardianName: guardianName.trim(),
        } : {}),
      } : {}),
    });
    if (assignedRole === "student" && user.isMinor) {
      try { await issueGuardianConsent(user._id); }
      catch (err) { console.error("[Safeguarding] Could not deliver Google guardian consent:", err); }
    }

    if (user.role === "tutor") {
      user.applicationId = await allocateApplicationId();
      const t = generateTrackingToken();
      user.trackingTokenHash = t.hash;
      user.trackingTokenCreatedAt = new Date();
      user.applicationSubmittedAt = new Date();
      await user.save();
      trackingToken = t.plaintext;
    } else if (user.role === "parent") {
      await ParentProfile.create({ user: user._id, children: [], approvalRequiredForBookings: false });
    }

    await logAudit({
      action: "user_registered",
      actor: "System",
      entity: "User",
      targetId: user._id.toString(),
      targetName: user.name,
      metadata: { role: user.role, email: user.email, via: "google" },
    });

    if (user.role === "tutor") {
      await recordStatusEvent({
        tutorId: user._id.toString(),
        actor: { name: user.name, role: "system" },
        event: "APPLICATION_CREATED",
        message: "Tutor application created via Google Sign-Up",
        isPublic: true,
      });
    }

    try {
      const payload: Record<string, unknown> = { role: user.role };
      if (user.role === "tutor") {
        const trackingUrl = (user.applicationId && trackingToken) ? `${TRACKING_BASE_URL}/track/tutor/${trackingToken}` : `${TRACKING_BASE_URL}/tutor/application-status`;
        payload.applicationId = user.applicationId;
        payload.trackingUrl = trackingUrl;
      }
      await NotificationService.publishEvent(user._id.toString(), "auth.registered", payload);

      try {
        // Platform super-admin notification
        await NotificationService.publishEvent("system_admin", "admin.user_registered", {
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || "N/A",
          city: user.city || "Unknown",
          country: user.countryName || "Unknown",
          authProvider: "google",
          applicationId: user.applicationId,
        });
      } catch (adminErr) {
        console.error("Failed to send admin signup alert email:", adminErr);
      }
    } catch (err) {
      console.error("Failed to send Google signup email:", err);
    }
  }

  if (!user.isActive) {
    res.status(403).json({ success: false, message: "Your account has been deactivated" });
    return;
  }

  const token = generateToken(user._id.toString(), user.role);
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
  };
  res.cookie("token", token, cookieOptions);

  res.status(isNewUser ? 201 : 200).json({
    success: true,
    token,
    needsRole: user.role === "pending",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isApproved: user.isApproved,
      avatar: user.avatar,
      countryCode: user.countryCode,
      countryName: user.countryName,
      currency: user.currency,
      timezone: user.timezone,
      preferredLanguage: user.preferredLanguage,
      isMinor: user.isMinor === true,
      parentConsentVerified: user.parentConsentVerified === true,
    },
  });
};

// @desc    Set role for a Google user who registered as "pending"
// @route   PATCH /api/auth/select-role
export const selectRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, dateOfBirth, guardianEmail, guardianName } = req.body;

  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  if (user.role !== "pending") {
    res.status(400).json({ success: false, message: "Role has already been set for this account" });
    return;
  }

  // Pending Google accounts also remain bound to their original market.
  // A role selected later must not bypass that market's registration policy.
  const market = await resolveMarket(user.countryCode);
  if (!market || !market.isActive ||
      (role === "tutor" && !market.tutorRegistration) ||
      ((role === "student" || role === "parent") && !market.studentRegistration)) {
    res.status(422).json({ success: false, message: "Registration for this account type is not available in the selected market." });
    return;
  }
  if (role === "student" && ageOnDate(dateOfBirth) < 18 &&
      guardianEmail?.toLowerCase() === user.email.toLowerCase()) {
    res.status(400).json({ success: false, code: "DISTINCT_GUARDIAN_EMAIL_REQUIRED",
      message: "A student cannot designate their own account email as the guardian." }); return;
  }
  user.role = role;
  if (role === "student") {
    const studentAge = ageOnDate(dateOfBirth);
    user.dateOfBirth = new Date(dateOfBirth + "T00:00:00.000Z");
    user.isMinor = studentAge < 18;
    user.parentConsentVerified = studentAge >= 18;
    if (studentAge < 18) {
      user.parentGuardianEmail = guardianEmail.toLowerCase();
      user.parentGuardianName = guardianName.trim();
    }
  }
  let trackingToken: string | undefined;
  if (role === "tutor") {
    user.applicationId = await allocateApplicationId();
    const t = generateTrackingToken();
    user.trackingTokenHash = t.hash;
    user.trackingTokenCreatedAt = new Date();
    user.applicationSubmittedAt = new Date();
    trackingToken = t.plaintext;
  } else if (role === "parent") {
    await ParentProfile.create({ user: user._id, children: [], approvalRequiredForBookings: false });
  }
  await user.save();
  if (role === "student" && user.isMinor) {
    try { await issueGuardianConsent(user._id); }
    catch (err) { console.error("[Safeguarding] Could not deliver selected-role guardian consent:", err); }
  }

  await logAudit({
    action: "user_role_selected",
    actor: user.name,
    entity: "User",
    targetId: user._id.toString(),
    targetName: user.name,
    metadata: { role, applicationId: user.applicationId },
  });

  if (role === "tutor") {
    await recordStatusEvent({
      tutorId: user._id.toString(),
      actor: { name: user.name, role: "system" },
      event: "APPLICATION_CREATED",
      message: "Tutor application created",
      isPublic: true,
    });
  }

  try {
    const payload: Record<string, unknown> = { role: user.role };
    if (user.role === "tutor") {
      const trackingUrl = (user.applicationId && trackingToken) ? `${TRACKING_BASE_URL}/track/tutor/${trackingToken}` : `${TRACKING_BASE_URL}/tutor/application-status`;
      payload.applicationId = user.applicationId;
      payload.trackingUrl = trackingUrl;
    }
    await NotificationService.publishEvent(user._id.toString(), "auth.registered", payload);

    try {
      await NotificationService.publishEvent("system_admin", "admin.user_registered", {
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "N/A",
        city: user.city || "Unknown",
        country: user.countryName || "Unknown",
        authProvider: "google",
        applicationId: user.applicationId,
      });
    } catch (adminErr) {
      console.error("Failed to send admin role selection alert email:", adminErr);
    }
  } catch (err) {
    console.error("Failed to send registration email:", err);
  }

  sendTokenResponse(user, 200, res);
};

// @desc    Logout user
// @route   POST /api/auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  res.cookie("token", "", { expires: new Date(0), httpOnly: true });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// @desc    Get current user
// @route   GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?._id);
  res.status(200).json({ success: true, user });
};

// @desc    Update personal info
// @route   PATCH /api/auth/update-profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, city, address, countryCode, countryName, preferredLanguage, postalCode, lat, lng } = req.body;
  const updates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries({ name, phone, city, address, countryCode, countryName, postalCode })) {
    if (typeof value === "string") updates[key] = value.trim();
  }

  if (typeof lat === "number" && typeof lng === "number") {
    updates.location = { type: "Point", coordinates: [lng, lat] };
  }

  // English is the sole reviewed UI locale at launch.  Persisting an
  // arbitrary language here previously caused the client to render an
  // incomplete translation resource.  Additional locales can be enabled
  // deliberately once their copy and accessibility review are complete.
  if (preferredLanguage !== undefined) {
    if (preferredLanguage !== "en") {
      res.status(400).json({ success: false, message: "That interface language is not available yet." });
      return;
    }
    updates.preferredLanguage = "en";
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  );

  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  // Sync spatial and location fields to TutorProfile and StudentProfile
  const profileUpdates: Record<string, unknown> = {};
  if (updates.city) profileUpdates.city = updates.city;
  if (updates.countryCode) profileUpdates.countryCode = updates.countryCode;
  if (updates.countryName) profileUpdates.countryName = updates.countryName;
  if (updates.postalCode) profileUpdates.postalCode = updates.postalCode;
  if (updates.location) profileUpdates.location = updates.location;

  if (Object.keys(profileUpdates).length > 0) {
    await Promise.all([
      TutorProfile.findOneAndUpdate({ user: user._id }, { $set: profileUpdates }),
      StudentProfile.findOneAndUpdate({ user: user._id }, { $set: profileUpdates }),
    ]);
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user,
  });
};

// @desc    Change password
// @route   PATCH /api/auth/change-password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id).select("+password");
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  if (user.authProvider === "google" && !user.password) {
    res.status(400).json({
      success: false,
      message: "This account uses Google Sign-In and has no password to change",
    });
    return;
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    res.status(400).json({ success: false, message: "Current password is incorrect" });
    return;
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: "Password changed successfully" });
};

// @desc    Request password reset OTP
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Always return generic success — prevents email enumeration
  const genericResponse = {
    success: true,
    message: "If that email is registered, a verification code has been sent.",
  };

  if (!user) {
    res.status(200).json(genericResponse);
    return;
  }

  if (user.authProvider === "google" && !user.password) {
    // Don't reveal account type either — same generic message
    res.status(200).json(genericResponse);
    return;
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  user.resetPasswordToken = hashedOtp;
  user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  try {
    await NotificationService.publishEvent(user._id.toString(), "auth.password.reset_requested", { otp });
  } catch (err) {
    // Roll back the OTP if email fails, so a stale unusable OTP doesn't linger
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(500).json({ success: false, message: "Failed to send email. Please try again." });
    return;
  }

  res.status(200).json(genericResponse);
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email }).select("+password +resetPasswordToken +resetPasswordExpire");

  if (!user || !user.resetPasswordToken || !user.resetPasswordExpire) {
    res.status(400).json({ success: false, message: "Invalid or expired code" });
    return;
  }

  if (user.resetPasswordExpire.getTime() < Date.now()) {
    res.status(400).json({ success: false, message: "Code has expired. Please request a new one." });
    return;
  }

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  if (hashedOtp !== user.resetPasswordToken) {
    res.status(400).json({ success: false, message: "Invalid code" });
    return;
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  await logAudit({
    action: "password_reset",
    actor: user.name,
    entity: "User",
    targetId: user._id.toString(),
    targetName: user.name,
  });

  res.status(200).json({ success: true, message: "Password reset successfully. You can now log in." });
};

// @desc    Export all user data (GDPR / Data Rights)
// @route   GET /api/v1/auth/me/export
// @access  Private
export const exportData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Not authorized" });
      return;
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const [studentProfile, tutorProfile, requests, bids, bookings, reviews] = await Promise.all([
      StudentProfile.findOne({ user: userId }),
      TutorProfile.findOne({ user: userId }),
      RequestModel.find({ student: userId }),
      Bid.find({ tutor: userId }),
      Booking.find({ $or: [{ student: userId }, { tutor: userId }] }),
      Review.find({ $or: [{ student: userId }, { tutor: userId }] }),
    ]);

    await logAudit({
      action: "data_export",
      actor: user.name,
      entity: "User",
      targetId: userId.toString(),
      targetName: user.name,
    });

    res.status(200).json({
      success: true,
      exportGeneratedAt: new Date().toISOString(),
      platform: "TUTORERA by MENTISERA",
      data: {
        account: user,
        studentProfile,
        tutorProfile,
        requests,
        bids,
        bookings,
        reviews,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to generate data export" });
  }
};

// @desc    Self-serve account deletion (GDPR / Right to be Forgotten)
// @route   POST /api/v1/auth/me/delete-account
// @access  Private
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { password, reason } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Not authorized" });
      return;
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // If local auth, verify password before deletion
    if (user.authProvider === "local" && user.password) {
      if (!password) {
        res.status(400).json({ success: false, message: "Password is required to confirm account deletion" });
        return;
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ success: false, message: "Invalid password" });
        return;
      }
    }

    // Check for active or ongoing bookings
    const activeBookings = await Booking.find({
      $or: [{ student: userId }, { tutor: userId }],
      status: { $in: ["upcoming", "ongoing"] },
    });

    if (activeBookings.length > 0) {
      res.status(400).json({
        success: false,
        message: "Cannot delete account while you have active or upcoming tutoring sessions. Please complete or cancel sessions before requesting deletion.",
      });
      return;
    }

    // Anonymize user identifying information
    const anonymizedId = userId.toString().slice(-6);
    user.name = `Deleted User (${anonymizedId})`;
    user.email = `deleted_${userId}@deleted.tutorera.ac.pk`;
    user.phone = undefined;
    user.avatar = undefined;
    user.isDeleted = true;
    user.isActive = false;
    user.deletedAt = new Date();
    user.deletionReason = reason || "User-initiated self-serve deletion";
    await user.save({ validateBeforeSave: false });

    // Cancel open requests
    await RequestModel.updateMany(
      { student: userId, status: { $in: ["open", "draft", "receiving_offers", "negotiating"] } },
      { status: "cancelled" }
    );

    // Deactivate tutor profile if tutor
    await TutorProfile.findOneAndUpdate(
      { user: userId },
      { isActive: false, isVerified: false, bio: "[Account Deleted]" }
    );

    await logAudit({
      action: "account_deletion",
      actor: user.name,
      entity: "User",
      targetId: userId.toString(),
      targetName: user.name,
    });

    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: "Your account and personal identifying data have been successfully deleted in accordance with our retention policy.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to process account deletion" });
  }
};

// @desc    Update privacy, cookie and marketing consent preferences
// @route   PATCH /api/v1/auth/me/consent
// @access  Private
export const updateConsent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { legalTermsVersionAccepted, privacyVersionAccepted, marketingConsent, cookieConsent } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Not authorized" });
      return;
    }

    const updates: Record<string, any> = {};
    if (legalTermsVersionAccepted) {
      updates.legalTermsVersionAccepted = legalTermsVersionAccepted;
      updates.legalAcceptedAt = new Date();
    }
    if (privacyVersionAccepted) {
      updates.privacyVersionAccepted = privacyVersionAccepted;
    }
    if (typeof marketingConsent === "boolean") {
      updates.marketingConsent = marketingConsent;
    }
    if (cookieConsent && typeof cookieConsent === "object") {
      updates.cookieConsent = {
        necessary: true,
        analytics: Boolean(cookieConsent.analytics),
        marketing: Boolean(cookieConsent.marketing),
        updatedAt: new Date(),
      };
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { returnDocument: "after" });

    res.status(200).json({
      success: true,
      message: "Consent preferences updated successfully",
      consent: {
        legalTermsVersionAccepted: user?.legalTermsVersionAccepted,
        privacyVersionAccepted: user?.privacyVersionAccepted,
        marketingConsent: user?.marketingConsent,
        cookieConsent: user?.cookieConsent,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update consent preferences" });
  }
};


// Read-only account guidance. This endpoint never accepts or changes a DOB.
export const getAgeReviewStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user || user.role !== "student") {
    res.status(403).json({ success: false, code: "STUDENT_ACCOUNT_REQUIRED" });
    return;
  }
  const unknownAge = !user.dateOfBirth || !Number.isFinite(new Date(user.dateOfBirth).getTime());
  const guardianPending = user.isMinor === true && user.parentConsentVerified !== true;
  res.setHeader("Cache-Control", "no-store");
  res.json({
    success: true,
    status: unknownAge ? "age_review_required" : guardianPending ? "guardian_consent_required" : "no_age_review_required",
    enforcementEnabled: process.env.LEGACY_STUDENT_AGE_ENFORCEMENT === "true",
    supportRequired: unknownAge,
    message: unknownAge
      ? "Contact support for a secure age review. Do not submit identity documents in chat."
      : guardianPending
        ? "Guardian consent is required to use tutoring features."
        : "No age review is currently required for this account.",
  });
};
