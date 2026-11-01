// src/services/subjectEligibility.service.ts
//
// Central enforcement point for qualification-based subject eligibility.
// A tutor selecting a subject during onboarding (TutorProfile.subjects)
// has NEVER granted, and still does not grant, any marketplace privilege -
// that's just their wish list. Actual eligibility to bid on, accept, or be
// booked for a given (subject, level) requires an explicit admin approval,
// tracked per-entry in TutorProfile.subjectEligibility[]. This module is
// the single place that logic lives, so every call site (bid creation,
// direct booking, bid acceptance, counter-offers, matching/recommendations,
// the browse-requests listing) enforces it identically instead of each
// re-implementing its own check.

import { Types, ClientSession } from "mongoose";
import TutorProfile, { ITutorProfile } from "../models/TutorProfile.model";
import Request from "../models/Request.model";
import Booking from "../models/Booking.model";
import DisciplineSubjectMap from "../models/DisciplineSubjectMap.model";
import AcademicDiscipline from "../models/AcademicDiscipline.model";
import Subject from "../models/Subject.model";
import TeachingEligibilityRule, { TeachingEligibilityType } from "../models/TeachingEligibilityRule.model";
import { logAudit } from "../utils/logAudit";
import { EDUCATION_LEVELS, normalizeEducationLevel } from "../config/educationLevels";
import { hasCurrentQualificationReview, meetsMinimumDegreeLevel } from "./qualificationReview.service";
import { hasApprovedSubjectEvidence } from "./subjectEvidenceReview.service";
import { isApprovalExempt } from "./eligibility.service";

export const NOT_ELIGIBLE_MESSAGE = "You are not approved to teach this subject or level. Submit a relevant qualification for admin review.";

function normalize(value: string): string {
  return (value || "").trim().toLowerCase();
}

/** True only if the tutor has an `approved` subjectEligibility entry for
 * this exact subject whose approved levels include the requested level (or
 * whose levels list is non-empty and the caller passed no level to check
 * against - level omission, e.g. for a general "can they teach this
 * subject at all" check). An entry with an empty `levels` array is treated
 * as "approved for the subject but not yet scoped to any level" - i.e.
 * NOT sufficient on its own; an admin must pick at least one level for the
 * approval to take effect (enforced in approveSubjectEligibility below). */
export function isSubjectLevelApproved(profile: Pick<ITutorProfile, "subjectEligibility">, subject: string, level?: string): boolean {
  const entries = profile.subjectEligibility || [];
  const target = normalize(subject);
  const entry = entries.find((e) => e.status === "approved" && normalize(e.subject) === target);
  if (!entry) return false;
  if (!level) return entry.levels.length > 0;
  return entry.levels.some((l) => normalize(l) === normalize(level));
}

export interface EligibilityCheckResult {
  eligible: boolean;
  message?: string;
}

/** The one function every enforcement call site should use. Returns a
 * plain result object (not a thrown error) so callers can shape their own
 * HTTP response/status code around it consistently with their existing
 * error-handling style. */
export function checkSubjectEligibility(profile: Pick<ITutorProfile, "subjectEligibility" | "adminApprovalExempt">, subject: string, level?: string): EligibilityCheckResult {
  if (isApprovalExempt(profile)) return { eligible: true };
  if (isSubjectLevelApproved(profile, subject, level)) return { eligible: true };
  return { eligible: false, message: NOT_ELIGIBLE_MESSAGE };
}

/** Recomputes the denormalized `approvedSubjects` flat list from
 * `subjectEligibility` so matching/listing queries can filter with a
 * simple $in instead of $elemMatch. Call this after ANY mutation of
 * subjectEligibility. Does not save; caller saves the profile. */
export function syncApprovedSubjects(profile: ITutorProfile): void {
  const approved = new Set<string>();
  for (const entry of profile.subjectEligibility || []) {
    if (entry.status === "approved" && entry.levels.length > 0) approved.add(entry.subject);
  }
  profile.approvedSubjects = Array.from(approved);
}

/** Checks whether `subject` appears in any active DisciplineSubjectMap
 * entry for the given discipline - a hint surfaced to the reviewing admin,
 * never used to auto-approve (see module doc comment). */
export async function subjectMatchesDiscipline(discipline: string | undefined, subject: string): Promise<boolean> {
  const rule = await resolveTeachingEligibility(discipline, subject);
  return rule.eligibilityType === "direct";
}

export interface TeachingEligibilityResolution {
  eligibilityType: TeachingEligibilityType | "unmapped";
  evidenceRequired: boolean;
  subjectId?: Types.ObjectId;
  ruleId?: Types.ObjectId;
}

/**
 * Canonical eligibility resolver. Once a discipline has migrated to the
 * Academic Framework, its active rule set is authoritative: no matching rule
 * means unmapped. The legacy string-array map is consulted only while no
 * canonical discipline exists, keeping current production records readable
 * during the additive migration.
 */
export async function resolveTeachingEligibility(discipline: string | undefined, subject: string, session?: ClientSession): Promise<TeachingEligibilityResolution> {
  if (!discipline || !subject) return { eligibilityType: "unmapped", evidenceRequired: true };
  // MongoDB transaction sessions must not run concurrent operations.
  const canonicalDiscipline = await AcademicDiscipline.findOne({ name: new RegExp(`^${discipline.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).session(session || null).lean();
  const canonicalSubject = await Subject.findOne({ name: new RegExp(`^${subject.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).session(session || null).lean();
  if (canonicalDiscipline) {
    if (canonicalDiscipline.status !== "active" || !canonicalSubject || canonicalSubject.status !== "active" || !canonicalSubject.isActive) {
      return { eligibilityType: "unmapped", evidenceRequired: true };
    }
    const rule = await TeachingEligibilityRule.findOne({ discipline: canonicalDiscipline._id, subject: canonicalSubject._id, status: "active" }).session(session || null).lean();
    return rule
      ? { eligibilityType: rule.eligibilityType, evidenceRequired: rule.evidenceRequired, subjectId: canonicalSubject._id, ruleId: rule._id }
      : { eligibilityType: "unmapped", evidenceRequired: true, subjectId: canonicalSubject._id };
  }

  // A disabled canonical subject must not regain eligibility via legacy data.
  if (canonicalSubject && (canonicalSubject.status !== "active" || !canonicalSubject.isActive)) {
    return { eligibilityType: "unmapped", evidenceRequired: true };
  }
  const mapping = await DisciplineSubjectMap.findOne({ discipline: new RegExp(`^${discipline.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), isActive: true }).session(session || null).lean();
  if (!mapping) return { eligibilityType: "unmapped", evidenceRequired: true, subjectId: canonicalSubject?._id };
  const target = normalize(subject);
  return mapping.eligibleSubjects.some((s) => normalize(s) === target)
    ? { eligibilityType: "direct", evidenceRequired: false, subjectId: canonicalSubject?._id }
    : { eligibilityType: "unmapped", evidenceRequired: true, subjectId: canonicalSubject?._id };
}

/** Creates (or leaves alone, if one already exists) a "pending"
 * subjectEligibility entry for a subject the tutor has requested - from
 * onboarding step 3, or a later "request an additional subject" action.
 * Idempotent per subject: re-requesting an already-pending/approved/
 * rejected subject does not create a duplicate entry or reset its status. */
export async function requestSubjectEligibility(
  profile: ITutorProfile,
  subject: string,
  opts: { discipline?: string; disciplines?: string[]; qualificationIndex?: number } = {}
): Promise<void> {
  profile.subjectEligibility = profile.subjectEligibility || [];
  const target = normalize(subject);
  const exists = profile.subjectEligibility.some((e) => normalize(e.subject) === target);
  if (exists) return;

  const disciplines = Array.from(new Set([opts.discipline, ...(opts.disciplines || [])]
    .filter((discipline): discipline is string => Boolean(discipline?.trim()))));
  const resolutions = disciplines.length
    ? await Promise.all(disciplines.map((discipline) => resolveTeachingEligibility(discipline, subject)))
    : [];
  const directQualificationIndex = resolutions.findIndex((result) => result.eligibilityType === "direct");
  const conditionalQualificationIndex = resolutions.findIndex((result) => result.eligibilityType === "conditional");
  const matchedQualificationIndex = directQualificationIndex >= 0 ? directQualificationIndex : conditionalQualificationIndex;
  const resolution = matchedQualificationIndex >= 0 ? resolutions[matchedQualificationIndex] : resolutions[0];
  const matchesDiscipline = resolution?.eligibilityType === "direct";
  profile.subjectEligibility.push({
    subject,
    levels: [],
    status: resolution?.eligibilityType === "conditional" && resolution.evidenceRequired ? "needs_evidence" : "pending",
    matchesDiscipline,
    qualificationIndex: opts.qualificationIndex ?? (matchedQualificationIndex >= 0 ? matchedQualificationIndex : undefined),
    subjectRef: resolution?.subjectId,
    eligibilityRuleRef: resolution?.ruleId,
    eligibilityType: resolution?.eligibilityType || "unmapped",
    evidenceRequired: resolution?.evidenceRequired ?? true,
    requestedAt: new Date(),
  } as ITutorProfile["subjectEligibility"] extends (infer T)[] | undefined ? T : never);
}

export interface ReviewActorInfo {
  id?: Types.ObjectId | string;
  name?: string;
}

/** Admin approves a specific subject for a specific set of levels. Levels
 * must be non-empty - an approval with no levels attached would silently
 * never take effect (see isSubjectLevelApproved), which would look to the
 * admin like a successful approval that mysteriously doesn't work. */
export async function approveSubjectEligibility(
  profile: ITutorProfile,
  subject: string,
  levels: string[],
  reviewer: ReviewActorInfo,
  approvalReason = "",
  options: { session?: ClientSession; skipAudit?: boolean } = {}
): Promise<{ success: true } | { success: false; message: string }> {
  if (!levels || levels.length === 0) {
    return { success: false, message: "At least one teaching level must be selected to approve a subject." };
  }
  if (!Array.isArray(levels) || levels.some((level) => typeof level !== "string" || !(EDUCATION_LEVELS as readonly string[]).includes(normalizeEducationLevel(level)))) {
    return { success: false, message: "Choose valid teaching levels before approving this subject." };
  }
  const entry = (profile.subjectEligibility || []).find((e) => normalize(e.subject) === normalize(subject));
  if (!entry) return { success: false, message: `No eligibility request found for subject "${subject}".` };
  if (["approved", "revoked", "suspended"].includes(entry.status)) {
    return { success: false, message: `This subject request is ${entry.status} and cannot be approved again.` };
  }
  if (profile.degreeVerificationStatus !== "approved" || !(profile.education || []).some((qualification) =>
    qualification.degree?.trim() && qualification.institution?.trim() && qualification.degreeDoc?.trim()
  )) {
    return { success: false, message: "Complete education credentials and approved educational documents are required before subject approval." };
  }
  if (!entry.matchesDiscipline && !approvalReason.trim()) {
    return {
      success: false,
      message: "An off-discipline subject requires documented supporting evidence and an explicit approval rationale.",
    };
  }
  if (entry.evidenceRequired && !(entry.evidence || []).some((item) => Boolean(item.url))) {
    return { success: false, message: "Supporting evidence must be uploaded before this conditional subject request can be approved." };
  }

  // Never trust the discipline hint saved when the subject was requested:
  // qualifications and the administrator's rule set may have changed since.
  const qualifications = profile.education || [];
  let approvedQualification: { index: number; resolution: TeachingEligibilityResolution } | undefined;
  for (const [index, qualification] of qualifications.entries()) {
    if (!hasCurrentQualificationReview(qualification)) continue;
    if (!qualification.degree?.trim() || !qualification.institution?.trim() || !qualification.degreeDoc?.trim()) continue;
    const discipline = qualification.disciplineRef
      ? await AcademicDiscipline.findById(qualification.disciplineRef).session(options.session || null).lean()
      : undefined;
    if (qualification.disciplineRef && (!discipline || discipline.status !== "active")) continue;
    const resolution = await resolveTeachingEligibility(discipline?.name || qualification.discipline, subject, options.session);
    if (resolution.eligibilityType === "unmapped") continue;
    if (resolution.ruleId) {
      const rule = await TeachingEligibilityRule.findById(resolution.ruleId).session(options.session || null).lean();
      if (!rule || rule.status !== "active" || !meetsMinimumDegreeLevel(qualification, rule.minimumDegreeLevel)) continue;
    }
    if (!approvedQualification || resolution.eligibilityType === "direct") {
      approvedQualification = { index, resolution };
    }
  }
  if (!approvedQualification) {
    return { success: false, message: "No documented qualification satisfies the active subject eligibility rule. Review the qualification and any minimum-degree requirement before approval." };
  }
  const currentResolution = approvedQualification.resolution;
  if (currentResolution.eligibilityType === "conditional" && !approvalReason.trim()) {
    return { success: false, message: "Conditional subject approval requires an explicit evidence-review rationale." };
  }
  if ((currentResolution.evidenceRequired || currentResolution.eligibilityType === "conditional") && !(entry.evidence || []).some(hasApprovedSubjectEvidence)) {
    return { success: false, message: "Supporting evidence must receive an explicit admin approval before conditional subject approval." };
  }

  entry.status = "approved";
  entry.qualificationIndex = approvedQualification.index;
  entry.subjectRef = currentResolution.subjectId;
  entry.eligibilityRuleRef = currentResolution.ruleId;
  entry.eligibilityType = currentResolution.eligibilityType;
  entry.matchesDiscipline = currentResolution.eligibilityType === "direct";
  entry.evidenceRequired = currentResolution.evidenceRequired;
  entry.levels = levels;
  entry.reviewedBy = reviewer.id ? new Types.ObjectId(reviewer.id) : undefined;
  entry.reviewedAt = new Date();
  entry.reason = approvalReason.trim();
  syncApprovedSubjects(profile);

  if (!options.skipAudit) await logAudit({
    action: "subject_eligibility_approved",
    actor: reviewer.name || "Admin",
    actorId: reviewer.id?.toString(),
    entity: "TutorProfile",
    targetId: profile._id.toString(),
    targetName: profile.fullName,
    metadata: { subject, levels, matchesDiscipline: entry.matchesDiscipline, approvalReason: approvalReason.trim() || undefined },
  });

  return { success: true };
}

export async function rejectSubjectEligibility(
  profile: ITutorProfile,
  subject: string,
  reason: string,
  reviewer: ReviewActorInfo,
  options: { session?: ClientSession; skipAudit?: boolean } = {}
): Promise<{ success: true } | { success: false; message: string }> {
  if (typeof reason !== "string" || !reason.trim()) {
    return { success: false, message: "A subject-specific rejection reason is required." };
  }
  const entry = (profile.subjectEligibility || []).find((e) => normalize(e.subject) === normalize(subject));
  if (!entry) return { success: false, message: `No eligibility request found for subject "${subject}".` };
  if (["approved", "revoked", "suspended"].includes(entry.status)) {
    return { success: false, message: `This subject request is ${entry.status} and cannot be rejected.` };
  }

  entry.status = "rejected";
  entry.reviewedBy = reviewer.id ? new Types.ObjectId(reviewer.id) : undefined;
  entry.reviewedAt = new Date();
  entry.reason = reason.trim();
  syncApprovedSubjects(profile);

  if (!options.skipAudit) await logAudit({
    action: "subject_eligibility_rejected",
    actor: reviewer.name || "Admin",
    actorId: reviewer.id?.toString(),
    entity: "TutorProfile",
    targetId: profile._id.toString(),
    targetName: profile.fullName,
    metadata: { subject, reason },
  });

  return { success: true };
}

/**
 * Pulls back a PREVIOUSLY-APPROVED subject (qualification changed,
 * rejected, revoked, or expired) and flags any existing upcoming/ongoing
 * bookings for that tutor+subject combination for admin review - it does
 * not cancel them outright, since an admin needs to judge each one.
 */
export async function revokeSubjectEligibility(
  profile: ITutorProfile,
  subject: string,
  reason: string,
  reviewer: ReviewActorInfo,
  options: { session?: ClientSession; skipAudit?: boolean } = {}
): Promise<{ success: true; flaggedBookings: number } | { success: false; message: string }> {
  const entry = (profile.subjectEligibility || []).find((e) => normalize(e.subject) === normalize(subject));
  if (!entry) return { success: false, message: `No eligibility entry found for subject "${subject}".` };
  if (entry.status !== "approved") return { success: false, message: "Only an approved subject can be revoked." };
  if (!reason?.trim()) return { success: false, message: "A subject-specific revocation reason is required." };

  entry.status = "revoked";
  entry.reviewedBy = reviewer.id ? new Types.ObjectId(reviewer.id) : undefined;
  entry.reviewedAt = new Date();
  entry.reason = reason || "";
  syncApprovedSubjects(profile);

  const affectedRequestIds = await Request.find({ subject: new RegExp(`^${subject.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).session(options.session || null).select("_id").lean();
  const requestIds = affectedRequestIds.map((r) => r._id);
  const flagResult = await Booking.updateMany(
    { tutor: profile.user, request: { $in: requestIds }, status: { $in: ["upcoming", "ongoing"] } },
    { $set: { flaggedForReview: true, flagReason: `Tutor's "${subject}" eligibility was revoked: ${reason || "no reason given"}`, flaggedAt: new Date() } },
    { session: options.session }
  );

  if (!options.skipAudit) await logAudit({
    action: "subject_eligibility_revoked",
    actor: reviewer.name || "Admin",
    actorId: reviewer.id?.toString(),
    entity: "TutorProfile",
    targetId: profile._id.toString(),
    targetName: profile.fullName,
    metadata: { subject, reason, flaggedBookings: flagResult.modifiedCount },
  });

  return { success: true, flaggedBookings: flagResult.modifiedCount };
}

/**
 * Migration/grandfathering helper: for a tutor who was already active
 * before this feature existed, treat their current self-declared
 * subjects/levels as pre-approved rather than retroactively locking them
 * out of subjects they were already teaching. Safe to call repeatedly
 * (idempotent - skips subjects that already have an eligibility entry).
 */
export function grandfatherExistingSubjects(profile: ITutorProfile): void {
  profile.subjectEligibility = profile.subjectEligibility || [];
  const existingSubjects = new Set((profile.subjectEligibility || []).map((e) => normalize(e.subject)));
  for (const subject of profile.subjects || []) {
    if (existingSubjects.has(normalize(subject))) continue;
    profile.subjectEligibility.push({
      subject,
      levels: profile.levels && profile.levels.length > 0 ? profile.levels : ["Other"],
      status: "approved",
      matchesDiscipline: false,
      requestedAt: profile.createdAt || new Date(),
      reviewedAt: new Date(),
      reason: "Grandfathered: tutor was already active before subject-eligibility approval was introduced.",
    } as ITutorProfile["subjectEligibility"] extends (infer T)[] | undefined ? T : never);
  }
  syncApprovedSubjects(profile);
}
