import { Response } from "express";
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.model";
import TutorApplicationStatusHistory from "../models/TutorApplicationStatusHistory.model";
import { AuthRequest } from "../types";
import LegalAgreement, { ILegalAgreement } from "../models/LegalAgreement.model";
import TutorAgreementAcceptance from "../models/TutorAgreementAcceptance.model";
import TutorProfile from "../models/TutorProfile.model";
import TutorAgreement from "../models/TutorAgreement.model";
import User from "../models/User.model";
import {
  computeAgreementHash,
  getApplicableAgreement,
  seedDefaultLegalAgreements,
  TUTOR_AGREEMENT_VERSION,
} from "../services/legalAgreement.service";
import { syncTutorActivation } from "../services/tutorActivation.service";
import { generateContractPdf } from "../services/contractPdf.service";
import { sendAgreementReminders } from "../services/legalAgreementReminder.service";
import { calculateMarketplaceFees } from "../services/pricing.service";
import { recordStatusEvent } from "../services/tracking.service";
import { logAudit } from "../utils/logAudit";
import { NotificationService } from "../services/notification.service";
import { sendNotification } from "../utils/socket";
import { hasCoreDocumentsApproved, hasApprovedTeachingSubject, isAccessBlocked } from "../services/eligibility.service";

function maskIp(ip?: string): string {
  if (!ip) return "";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`;
  return ip.slice(0, 12);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// ─────────────────────────────────────────────────────────────────────────────
// TUTOR FACING CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

export const getCurrentTutorAgreement = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== "tutor") {
    res.status(403).json({ success: false, message: "Tutor access required." });
    return;
  }

  const profile = await TutorProfile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404).json({ success: false, message: "Tutor profile not found." });
    return;
  }

  const country = profile.countryCode || "PK";
  const agreement = await getApplicableAgreement("TUTOR_AGREEMENT", country);

  if (!agreement) {
    res.status(404).json({ success: false, message: "No applicable legal agreement published for your country." });
    return;
  }

  const feeSnapshot = await calculateMarketplaceFees(1000, country);

  const existingAcceptance = await TutorAgreementAcceptance.findOne({
    tutor: req.user._id,
    legalAgreement: agreement._id,
    acceptanceStatus: "active",
  }).sort({ acceptedAt: -1 });

  res.status(200).json({
    success: true,
    agreement: {
      _id: agreement._id,
      documentType: agreement.documentType,
      // Compatibility aliases retained while web clients move to the
      // canonical documentType/applicableSchedule names.
      agreementType: agreement.documentType,
      version: agreement.version,
      title: agreement.title,
      content: agreement.content,
      applicableSchedule: agreement.applicableSchedule,
      countrySchedule: agreement.applicableSchedule,
      country: agreement.country,
      locale: agreement.locale,
      contentHash: computeAgreementHash(agreement.content, agreement.applicableSchedule || ""),
      effectiveDate: agreement.effectiveDate,
      companyDetails: agreement.companyDetails,
      feeScheduleSnapshot: {
        marketplaceFeePercent: feeSnapshot.feeConfig.tutorFeePercent,
        taxRatePercent: feeSnapshot.feeConfig.taxRatePercent,
        currency: feeSnapshot.currency,
        effectiveFrom: agreement.feeScheduleSnapshot?.effectiveFrom || "2026-08-30",
      },
    },
    tutor: {
      id: req.user._id,
      applicationId: req.user.applicationId || "TUT-PENDING",
      verifiedLegalName: profile.fullName || req.user.name,
      country: profile.countryCode || "PK",
      verificationStatus: profile.verificationStatus,
      tutorStatus: profile.tutorStatus || "registered",
    },
    // Flat fields are retained for the agreement page and older clients.
    verifiedLegalName: profile.fullName || req.user.name,
    tutorProfileId: profile._id,
    applicationId: req.user.applicationId || "TUT-PENDING",
    alreadyAccepted: Boolean(existingAcceptance),
    latestAcceptance: existingAcceptance
      ? {
          _id: existingAcceptance._id,
          agreementVersion: existingAcceptance.agreementVersion,
          agreementHash: existingAcceptance.agreementHash,
          acceptedAt: existingAcceptance.acceptedAt,
          electronicSignature: existingAcceptance.electronicSignature,
          pdfDownloadUrl: `/api/v1/tutor/agreements/${existingAcceptance._id}/pdf`,
        }
      : null,
    feeSchedule: {
      marketplaceFeePercent: feeSnapshot.feeConfig.tutorFeePercent,
      taxRatePercent: feeSnapshot.feeConfig.taxRatePercent,
      currency: feeSnapshot.currency,
      summary: `Tutor platform fee: ${feeSnapshot.feeConfig.tutorFeePercent}%.`,
    },
    acceptance: existingAcceptance
      ? {
          id: existingAcceptance._id,
          version: existingAcceptance.agreementVersion,
          acceptedAt: existingAcceptance.acceptedAt,
          electronicSignature: existingAcceptance.electronicSignature,
          agreementHash: existingAcceptance.agreementHash,
        }
      : null,
  });
};

export const acceptTutorAgreement = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== "tutor") {
    res.status(403).json({ success: false, message: "Tutor access required." });
    return;
  }

  const {
    agreementId,
    agreementHash,
    electronicSignature,
    confirmations: submittedConfirmations,
    passwordConfirmation,
  } = req.body;

  // Accept the legacy field names used by the existing agreement page as well
  // as the canonical API names. All downstream persistence uses the canonical
  // shape, so a successful signature always stores the complete consent set.
  const confirmations = {
    ...(submittedConfirmations || {}),
    informationAccurate: submittedConfirmations?.informationAccurate ?? submittedConfirmations?.informationAccuracy,
    independentProvider: submittedConfirmations?.independentProvider ?? submittedConfirmations?.independentContractor,
  };

  // 1. Mandatory Consents Validation
  if (
    confirmations?.informationAccurate !== true ||
    confirmations?.agreementAccepted !== true ||
    confirmations?.safeguardingAccepted !== true ||
    confirmations?.independentProvider !== true ||
    confirmations?.feesTaxesUnderstood !== true ||
    confirmations?.electronicRecordsConsent !== true
  ) {
    res.status(400).json({
      success: false,
      code: "MANDATORY_CONSENTS_MISSING",
      message: "Every mandatory agreement consent checkbox must be explicitly accepted.",
    });
    return;
  }

  // 2. Fetch Profile & User
  const profile = await TutorProfile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404).json({ success: false, message: "Tutor profile not found." });
    return;
  }

  // 3. Status Eligibility Check: Tutor must be approved or in agreement_pending / reacceptance_required
  if (profile.suspendedAt || req.user.suspendedAt) {
    res.status(403).json({
      success: false,
      code: "TUTOR_SUSPENDED",
      message: "Your account is currently suspended. Agreement acceptance cannot be processed.",
    });
    return;
  }

  if (profile.verificationStatus !== "approved") {
    res.status(400).json({
      success: false,
      code: "APPLICATION_NOT_APPROVED",
      message: "Your tutor application has not been approved yet. Review by administration is required first.",
    });
    return;
  }

  // 4. Server-Side Signature Validation
  const verifiedLegalName = profile.fullName?.trim() || req.user.name?.trim() || "";
  if (!electronicSignature || typeof electronicSignature !== "string" || !electronicSignature.trim()) {
    res.status(400).json({
      success: false,
      code: "SIGNATURE_REQUIRED",
      message: "Electronic signature is required. Please type your verified full legal name.",
    });
    return;
  }

  if (normalizeName(electronicSignature) !== normalizeName(verifiedLegalName)) {
    res.status(400).json({
      success: false,
      code: "SIGNATURE_MISMATCH",
      message: `Electronic signature does not match your verified profile name. Please type '${verifiedLegalName}' exactly.`,
      expectedName: verifiedLegalName,
    });
    return;
  }

  // 5. Optional Password Confirmation Check
  if (passwordConfirmation) {
    const userWithPassword = await User.findById(req.user._id).select("+password");
    if (userWithPassword && userWithPassword.authProvider === "local") {
      const match = await userWithPassword.comparePassword(passwordConfirmation);
      if (!match) {
        res.status(401).json({
          success: false,
          code: "INVALID_PASSWORD",
          message: "Account re-authentication failed: incorrect password.",
        });
        return;
      }
    }
  }

  // 6. Find Applicable Published Agreement
  if (typeof agreementId !== "string" || !agreementId.trim()) {
    res.status(400).json({ success: false, code: "AGREEMENT_ID_REQUIRED", message: "Load and review the current agreement before signing." });
    return;
  }
  const agreement = await getApplicableAgreement("TUTOR_AGREEMENT", profile.countryCode || "PK");
  if (agreementId && (!agreement || String(agreementId) !== agreement._id.toString())) {
    res.status(409).json({ success: false, code: "AGREEMENT_CHANGED", message: "Reload and review the current agreement for your market before signing." });
    return;
  }

  if (!agreement) {
    res.status(404).json({
      success: false,
      code: "AGREEMENT_NOT_FOUND",
      message: "No current published agreement found to accept.",
    });
    return;
  }

  // 7. Prevent Stale Agreement / Check Hash
  const expectedHash = computeAgreementHash(agreement.content, agreement.applicableSchedule || "");
  if (typeof agreementHash !== "string" || agreementHash !== expectedHash) {
    res.status(409).json({ success: false, code: "AGREEMENT_CONTENT_CHANGED", message: "Reload and review the current agreement content before signing." });
    return;
  }

  // 8. Idempotency Check: Don't create duplicate active acceptance for same version
  const existingActive = await TutorAgreementAcceptance.findOne({
    tutor: req.user._id,
    legalAgreement: agreement._id,
    acceptanceStatus: "active",
  });

  if (existingActive) {
    // Already accepted; run activation sync to ensure active state
    const currentActivation = await syncTutorActivation(req.user._id);
    res.status(200).json({
      success: true,
      message: currentActivation.activated ? "Agreement already accepted. Your account is active." : "Agreement already accepted. Additional activation requirements remain.",
      acceptanceId: existingActive._id,
      agreementVersion: existingActive.agreementVersion,
      tutorStatus: currentActivation.status,
      activated: currentActivation.activated,
    });
    return;
  }

  // 9. Fee disclosure snapshot
  const feeCalculation = await calculateMarketplaceFees(1000, {
    countryCode: profile.countryCode || "PK",
    currency: profile.currency || "USD",
    teachingMode: profile.teachingMode || "online",
  });

  const now = new Date();
  const session = await mongoose.startSession();
  let acceptance: import("../models/TutorAgreementAcceptance.model").ITutorAgreementAcceptance;
  let activationResult: Awaited<ReturnType<typeof syncTutorActivation>>;
  try {
  const committed = await session.withTransaction(async () => {
  const currentProfile = await TutorProfile.findById(profile._id).session(session);
  if (!currentProfile) throw new Error("Tutor application no longer exists.");
  const currentUser = await User.findById(req.user!._id).session(session);
  if (!currentUser || currentUser.isDeleted || currentUser.suspendedAt ||
      ["suspended", "banned", "deleted"].includes(currentUser.moderationStatus || "") ||
      isAccessBlocked(currentProfile) || !currentProfile.onboardingComplete || currentProfile.verificationStatus !== "approved" ||
      !hasCoreDocumentsApproved(currentProfile) || !hasApprovedTeachingSubject(currentProfile)) {
    throw Object.assign(new Error("Application approval, required documents, and teaching subject approval must be complete before signing."), { statusCode: 403 });
  }
  if (normalizeName(electronicSignature) !== normalizeName(currentProfile.fullName?.trim() || currentUser.name.trim()))
    throw Object.assign(new Error("Your verified name changed. Reload before signing."), { statusCode: 409 });
  const currentAgreement = await getApplicableAgreement("TUTOR_AGREEMENT", currentProfile.countryCode || "PK", "en", { session });
  if (currentAgreement?._id.toString() !== agreement._id.toString())
    throw Object.assign(new Error("Your applicable agreement changed. Reload before signing."), { statusCode: 409 });
  if (!currentAgreement || currentAgreement.status !== "published" || computeAgreementHash(currentAgreement.content, currentAgreement.applicableSchedule || "") !== expectedHash)
    throw Object.assign(new Error("Agreement changed. Reload before signing."), { statusCode: 409 });
  const prior = await TutorAgreementAcceptance.findOne({ tutor: req.user!._id, legalAgreement: agreement!._id, acceptanceStatus: "active" }).session(session);
  if (prior) return { acceptance: prior, activationResult: await syncTutorActivation(req.user!._id, { session }) };
  // Serialize concurrent acceptance through the profile write before creating records.
  currentProfile.agreementAcceptedAt = now;
  currentProfile.agreementVersion = agreement!.version;
  currentProfile.agreementAcceptanceRequired = false;
  currentProfile.legacyAgreementStatus = "accepted";
  await currentProfile.save({ session, validateBeforeSave: false });
  // 10. Supersede any older acceptances
  await TutorAgreementAcceptance.updateMany(
    { tutor: req.user!._id, acceptanceStatus: "active" },
    { $set: { acceptanceStatus: "superseded", supersededAt: now } }, { session }
  );

  // 11. Create Immutable Acceptance Record
  const [acceptance] = await TutorAgreementAcceptance.create([{
    tutor: req.user!._id,
    tutorProfile: profile._id,
    legalAgreement: agreement._id,
    agreementVersion: agreement.version,
    agreementHash: expectedHash,
    country: agreement.country || "PK",
    locale: agreement.locale || "en",
    legalNameAtAcceptance: verifiedLegalName,
    electronicSignature: electronicSignature.trim(),
    acceptedAt: now,
    effectiveAt: agreement.effectiveDate || now,
    ipAddress: maskIp(req.ip),
    userAgent: req.headers["user-agent"]?.toString().slice(0, 500) || "Unknown",
    consents: {
      consentAgreement: Boolean(confirmations.agreementAccepted),
      consentInformationAccuracy: Boolean(confirmations.informationAccurate),
      consentSafeguarding: Boolean(confirmations.safeguardingAccepted),
      consentIndependentContractor: Boolean(confirmations.independentProvider),
      consentFeesTaxes: Boolean(confirmations.feesTaxesUnderstood),
      consentElectronicRecords: Boolean(confirmations.electronicRecordsConsent),
    },
    feeDisclosureSnapshot: {
      marketplaceFeePercent: feeCalculation.feeConfig.tutorFeePercent,
      taxRatePercent: feeCalculation.feeConfig.taxRatePercent,
      currency: feeCalculation.currency,
      effectiveFrom: agreement.feeScheduleSnapshot?.effectiveFrom || "2026-08-30",
    },
    contractSnapshot: {
      title: agreement.title,
      version: agreement.version,
      content: agreement.content,
      applicableSchedule: agreement.applicableSchedule || "",
      companyLegalName: agreement.companyDetails?.legalName || "MENTISERA (SMC-Private) Limited",
      tradingName: agreement.companyDetails?.tradingName || "TUTORERA®",
      registeredAddress: agreement.companyDetails?.registeredAddress || "House 387, Street 11, Phase 5-B, Ghauri Town, Islamabad, Pakistan",
      contactEmail: agreement.companyDetails?.contactEmail || "hello@mentisera.pk",
    },
    acceptanceStatus: "active",
  }], { session });

  // 12. Maintain the legacy contract in the same transaction.
    await TutorAgreement.findOneAndUpdate(
      { tutor: req.user!._id, tutorProfile: profile._id, status: "pending_acceptance" },
      {
        status: "active",
        acceptedAt: now,
        acceptanceIp: maskIp(req.ip),
        acceptanceUserAgent: req.headers["user-agent"]?.toString().slice(0, 500),
      },
      { sort: { createdAt: -1 }, session }
    );
  // 14. Authoritative Activation Evaluation & Synchronization
  const activationResult = await syncTutorActivation(req.user!._id, { session });

  // 15. Audit and History Logging
  await TutorApplicationStatusHistory.create([{
    tutor: req.user!._id, tutorProfile: profile._id,
    actor: req.user!.name, actorId: req.user!._id, actorRole: "tutor",
    event: "TUTOR_AGREEMENT_ACCEPTED",
    message: `Tutor Agreement ${agreement.version} electronically accepted. Hash: ${expectedHash.slice(0, 16)}...`,
    isPublic: false,
    statusAfter: activationResult.status,
  }], { session });

  await AuditLog.create([{
    action: "tutor_agreement_accepted",
    actor: req.user!.name,
    actorId: req.user!._id.toString(),
    entity: "TutorAgreementAcceptance",
    targetId: acceptance._id.toString(),
    targetName: req.user!.name,
    metadata: {
      version: agreement.version,
      hash: expectedHash,
      signature: electronicSignature.trim(),
      activated: activationResult.activated,
      status: activationResult.status,
      confirmations,
    },
  }], { session });
  return { acceptance, activationResult };
  });
  if (!committed) throw new Error("Agreement acceptance did not commit.");
  acceptance = committed.acceptance;
  activationResult = committed.activationResult;
  } finally { await session.endSession(); }
  // 16. In-App Notifications & Real-Time Socket
  const io = req.app.get("io");
  try { await sendNotification(io, req.user._id.toString(), {
    title: activationResult.activated ? "Agreement Confirmed & Profile Active" : "Agreement Confirmed",
    message: activationResult.activated ? `Agreement ${agreement.version} accepted. Your tutor account is active.` : `Agreement ${agreement.version} accepted. Additional activation requirements remain.`,
    type: "verification",
    link: "/dashboard",
  }); } catch { console.error("[AgreementAcceptance] Post-commit notification failed"); }

  try {
    await NotificationService.publishEvent(req.user._id.toString(), "verification.approved", {
      document: "Agreement",
      title: activationResult.activated ? "Agreement Confirmed & Account Active" : "Agreement Confirmed",
      message: activationResult.activated ? `Agreement ${agreement.version} recorded. Marketplace access is live.` : `Agreement ${agreement.version} recorded. Additional activation requirements remain.`,
      ctaArgs: { applicationId: req.user.applicationId || "TUT-PENDING" },
    });
  } catch (emailErr) {
    console.error("Failed to queue agreement accepted email:", emailErr);
  }

  res.status(200).json({
    success: true,
    message: activationResult.activated ? "Agreement accepted successfully. Your TUTORERA tutor account is now active." : "Agreement accepted successfully. Additional activation requirements remain.",
    acceptanceId: acceptance._id,
    agreementVersion: agreement.version,
    agreementHash: expectedHash,
    tutorStatus: activationResult.status,
    activated: activationResult.activated,
  });
};

export const listTutorAgreements = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== "tutor") {
    res.status(403).json({ success: false, message: "Tutor access required." });
    return;
  }

  const acceptances = await TutorAgreementAcceptance.find({ tutor: req.user._id })
    .sort({ acceptedAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    agreements: acceptances.map((a) => ({
      id: a._id,
      version: a.agreementVersion,
      title: a.contractSnapshot?.title || "Tutor Marketplace Agreement",
      country: a.country,
      acceptedAt: a.acceptedAt,
      effectiveAt: a.effectiveAt,
      status: a.acceptanceStatus,
      signature: a.electronicSignature,
      hash: a.agreementHash,
    })),
  });
};

export const getTutorAgreementById = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const acceptance = await TutorAgreementAcceptance.findById(req.params.id);
  if (!acceptance) {
    res.status(404).json({ success: false, message: "Agreement acceptance record not found." });
    return;
  }

  // Authorization: Only the tutor or admin may view
  if (req.user.role !== "admin" && acceptance.tutor.toString() !== req.user._id.toString()) {
    res.status(403).json({ success: false, message: "Unauthorized access to this legal record." });
    return;
  }

  res.status(200).json({ success: true, acceptance });
};

export const downloadTutorAgreementPdf = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const acceptance = await TutorAgreementAcceptance.findById(req.params.id);
  if (!acceptance) {
    res.status(404).json({ success: false, message: "Agreement acceptance record not found." });
    return;
  }

  // Authorization check
  if (req.user.role !== "admin" && acceptance.tutor.toString() !== req.user._id.toString()) {
    res.status(403).json({ success: false, message: "Unauthorized access to this legal record." });
    return;
  }

  const tutorUser = await User.findById(acceptance.tutor).select("applicationId name");
  const filename = `TUTORERA-Tutor-Agreement-${tutorUser?.applicationId || acceptance.tutor.toString()}-${acceptance.agreementVersion}.pdf`;

  const pdfBuffer = await generateContractPdf(acceptance, tutorUser?.applicationId);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", pdfBuffer.length);
  res.status(200).send(pdfBuffer);
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

export const listAdminAgreements = async (req: AuthRequest, res: Response): Promise<void> => {
  const agreements = await LegalAgreement.find().sort({ createdAt: -1 }).lean();
  const agreementIds = agreements.map((agreement) => agreement._id);
  const acceptanceTotals = agreementIds.length === 0
    ? []
    : await TutorAgreementAcceptance.aggregate([
        { $match: { legalAgreement: { $in: agreementIds }, acceptanceStatus: "active" } },
        { $group: { _id: "$legalAgreement", count: { $sum: 1 } } },
      ]);
  const acceptanceByAgreement = new Map(acceptanceTotals.map((row) => [row._id.toString(), row.count as number]));
  const versions = agreements.map((agreement) => ({
    ...agreement,
    acceptanceCount: acceptanceByAgreement.get(agreement._id.toString()) || 0,
  }));

  res.status(200).json({ success: true, agreements: versions });
};

export const createAdminAgreementDraft = async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    documentType = "TUTOR_AGREEMENT",
    version,
    title,
    content,
    applicableSchedule,
    country = "PK",
    locale = "en",
    requiresReacceptance = true,
    changelogNotes,
  } = req.body;

  if (!version || !title || !content) {
    res.status(400).json({ success: false, message: "version, title, and content are required." });
    return;
  }

  const contentHash = computeAgreementHash(content, applicableSchedule || "");

  const existing = await LegalAgreement.findOne({ documentType, version, country: country.toUpperCase() });
  if (existing) {
    res.status(409).json({ success: false, message: `Version ${version} already exists for ${country}.` });
    return;
  }

  const agreement = await LegalAgreement.create({
    documentType,
    version,
    title,
    content,
    applicableSchedule: applicableSchedule || "",
    country: country.toUpperCase(),
    locale,
    status: "draft",
    isCurrent: false,
    requiresReacceptance: Boolean(requiresReacceptance),
    contentHash,
    effectiveDate: new Date(),
    createdBy: req.user?._id,
    changelogNotes,
  });

  await logAudit({
    action: "legal_agreement_draft_created",
    actor: req.user?.name || "Admin",
    actorId: req.user?._id?.toString(),
    entity: "LegalAgreement",
    targetId: agreement._id.toString(),
    targetName: title,
    metadata: { version, country },
  });

  res.status(201).json({ success: true, agreement });
};

export const publishAdminAgreement = async (req: AuthRequest, res: Response): Promise<void> => {
  const agreement = await LegalAgreement.findById(req.params.id);
  if (!agreement) {
    res.status(404).json({ success: false, message: "Agreement not found." });
    return;
  }

  const { complianceDeadlineDays = 14, markReacceptance = agreement.requiresReacceptance } = req.body;
  const now = new Date();

  // 1. Unset current flag on previous agreements of same type and country
  await LegalAgreement.updateMany(
    { documentType: agreement.documentType, country: agreement.country, _id: { $ne: agreement._id } },
    { $set: { isCurrent: false } }
  );

  // 2. Set this agreement as published and current
  agreement.status = "published";
  agreement.isCurrent = true;
  agreement.publishedAt = now;
  agreement.publishedBy = req.user?._id;
  agreement.requiresReacceptance = Boolean(markReacceptance);

  if (markReacceptance) {
    const deadline = new Date(now.getTime() + complianceDeadlineDays * 24 * 60 * 60 * 1000);
    agreement.complianceDeadline = deadline;
  }

  await agreement.save();

  // 3. If material reacceptance is required, trigger status transition for existing active tutors
  if (agreement.requiresReacceptance && agreement.documentType === "TUTOR_AGREEMENT") {
    const country = agreement.country;
    const tutorProfiles = await TutorProfile.find({
      countryCode: country,
      verificationStatus: "approved",
      agreementVersion: { $ne: agreement.version },
    });

    for (const p of tutorProfiles) {
      p.tutorStatus = "agreement_reacceptance_required";
      p.agreementAcceptanceRequired = true;
      await p.save({ validateBeforeSave: false });
    }

    // Email the newly-flagged tutors right away rather than making them
    // wait for the next daily reminder run (see server.ts) - that run then
    // takes over and keeps nudging anyone who still hasn't signed.
    const io = req.app.get("io");
    sendAgreementReminders(io).catch((err) =>
      logAudit({
        action: "legal_agreement_reminder_failed",
        actor: "System",
        entity: "LegalAgreement",
        targetId: agreement._id.toString(),
        targetName: agreement.title,
        metadata: { error: err instanceof Error ? err.message : String(err) },
      })
    );
  }

  await logAudit({
    action: "legal_agreement_published",
    actor: req.user?.name || "Admin",
    actorId: req.user?._id?.toString(),
    entity: "LegalAgreement",
    targetId: agreement._id.toString(),
    targetName: agreement.title,
    metadata: { version: agreement.version, country: agreement.country, requiresReacceptance: agreement.requiresReacceptance },
  });

  res.status(200).json({ success: true, message: `Agreement ${agreement.version} published as current.`, agreement });
};

export const archiveAdminAgreement = async (req: AuthRequest, res: Response): Promise<void> => {
  const agreement = await LegalAgreement.findById(req.params.id);
  if (!agreement) {
    res.status(404).json({ success: false, message: "Agreement not found." });
    return;
  }

  if (agreement.isCurrent) {
    res.status(400).json({ success: false, message: "Cannot archive the currently active agreement. Publish a new current version first." });
    return;
  }

  agreement.status = "archived";
  agreement.archivedAt = new Date();
  await agreement.save();

  res.status(200).json({ success: true, message: `Agreement ${agreement.version} archived.`, agreement });
};

export const getAdminTutorAgreements = async (req: AuthRequest, res: Response): Promise<void> => {
  const tutorId = req.params.id;
  const [profile, acceptances] = await Promise.all([
    TutorProfile.findOne({ $or: [{ _id: tutorId }, { user: tutorId }] }).populate("user", "name email applicationId"),
    TutorAgreementAcceptance.find({ $or: [{ tutor: tutorId }, { tutorProfile: tutorId }] })
      .sort({ acceptedAt: -1 })
      .lean(),
  ]);

  if (!profile) {
    res.status(404).json({ success: false, message: "Tutor profile not found." });
    return;
  }

  res.status(200).json({
    success: true,
    tutor: {
      profileId: profile._id,
      userId: profile.user,
      fullName: profile.fullName,
      tutorStatus: profile.tutorStatus || "registered",
      verificationStatus: profile.verificationStatus,
      isVerified: profile.isVerified,
      marketplaceEligible: profile.marketplaceEligible,
      agreementAcceptanceRequired: profile.agreementAcceptanceRequired,
      agreementAcceptedAt: profile.agreementAcceptedAt,
      agreementVersion: profile.agreementVersion,
      legacyAgreementStatus: profile.legacyAgreementStatus || "none",
    },
    acceptances,
  });
};

export const getLegalComplianceStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const [
    totalApprovedTutors,
    awaitingAgreement,
    activeWithAgreement,
    reacceptanceRequired,
    acceptancesByVersion,
  ] = await Promise.all([
    TutorProfile.countDocuments({ verificationStatus: "approved" }),
    TutorProfile.countDocuments({
      verificationStatus: "approved",
      $or: [{ agreementAcceptedAt: { $exists: false } }, { agreementAcceptedAt: null }],
    }),
    TutorProfile.countDocuments({
      verificationStatus: "approved",
      marketplaceEligible: true,
      agreementAcceptedAt: { $exists: true, $ne: null },
    }),
    TutorProfile.countDocuments({
      tutorStatus: "agreement_reacceptance_required",
    }),
    TutorAgreementAcceptance.aggregate([
      { $match: { acceptanceStatus: "active" } },
      { $group: { _id: "$agreementVersion", count: { $sum: 1 } } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalApprovedTutors,
      awaitingAgreement,
      activeWithAgreement,
      reacceptanceRequired,
      acceptanceRatePercent:
        totalApprovedTutors > 0
          ? Math.round(((totalApprovedTutors - awaitingAgreement) / totalApprovedTutors) * 100)
          : 0,
      acceptancesByVersion,
    },
  });
};
