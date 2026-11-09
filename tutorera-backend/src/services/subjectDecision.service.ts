import mongoose from "mongoose";
import TutorProfile, { ITutorProfile } from "../models/TutorProfile.model";
import AuditLog from "../models/AuditLog.model";
import TutorApplicationStatusHistory from "../models/TutorApplicationStatusHistory.model";
import { approveSubjectEligibility, refreshPendingEligibilityHints, rejectSubjectEligibility, revokeSubjectEligibility } from "./subjectEligibility.service";
import { EDUCATION_LEVELS, normalizeEducationLevel } from "../config/educationLevels";

export class SubjectDecisionError extends Error {
  constructor(message: string, public readonly statusCode: number) { super(message); }
}

export function subjectDecisionToken(profile: ITutorProfile, subject: string): string {
  const entry = profile.subjectEligibility?.find(item => item.subject.trim().toLowerCase() === subject.trim().toLowerCase());
  // Mongoose and BSON may materialize properties in different orders.
  const stable = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
    return value;
  };
  return JSON.stringify(stable(JSON.parse(JSON.stringify([entry, profile.education, profile.degreeVerificationStatus]))));
}

export async function commitSubjectDecision(input: {
  profileId: string; subject: string; action: "approve" | "reject" | "revoke";
  levels: string[]; reason: string; expectedToken: string; actor: { id: string; name: string };
}) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const profile = await TutorProfile.findById(input.profileId).session(session);
      if (!profile) throw new SubjectDecisionError("Application not found.", 404);
      const entry = profile.subjectEligibility?.find(item => item.subject.trim().toLowerCase() === input.subject.trim().toLowerCase());
      if (!entry) throw new SubjectDecisionError("Subject request not found.", 404);
      if (subjectDecisionToken(profile, input.subject) !== input.expectedToken)
        throw new SubjectDecisionError("Application changed. Reload before reviewing.", 409);
      const previousStatus = entry.status;
      const options = { session, skipAudit: true };
      const result = input.action === "approve"
        ? await approveSubjectEligibility(profile, input.subject, input.levels, input.actor, input.reason, options)
        : input.action === "reject"
          ? await rejectSubjectEligibility(profile, input.subject, input.reason, input.actor, options)
          : await revokeSubjectEligibility(profile, input.subject, input.reason, input.actor, options);
      if (!result.success) throw new SubjectDecisionError(result.message, 422);
      await profile.save({ session, validateModifiedOnly: true });
      const flaggedBookings = "flaggedBookings" in result ? result.flaggedBookings : undefined;
      await AuditLog.create([{ action: `subject_eligibility_${entry.status}`, actor: input.actor.name,
        actorId: input.actor.id, entity: "TutorProfile", targetId: profile._id.toString(), targetName: profile.fullName,
        metadata: { subject: entry.subject, previousStatus, status: entry.status, levels: entry.levels,
          reason: input.reason.trim(), flaggedBookings, qualificationIndex: entry.qualificationIndex,
          ruleId: entry.eligibilityRuleRef?.toString() } }], { session });
      await TutorApplicationStatusHistory.create([{ tutor: profile.user, tutorProfile: profile._id,
        actor: input.actor.name, actorId: input.actor.id, actorRole: "admin", isPublic: false,
        event: input.action === "approve" ? "SUBJECT_ELIGIBILITY_APPROVED" : input.action === "reject" ? "SUBJECT_ELIGIBILITY_REJECTED" : "SUBJECT_ELIGIBILITY_REVOKED",
        statusBefore: previousStatus, statusAfter: entry.status,
        message: `${entry.subject} subject eligibility ${entry.status}${input.reason.trim() ? `: ${input.reason.trim()}` : ""}` }], { session });
      return { profile, flaggedBookings };
    });
  } finally { await session.endSession(); }
}

export const AUTO_APPROVAL_REASON = "Auto-approved with verified qualification";

/**
 * Approving a qualification approves the tutor's pending subjects that the
 * qualification makes eligible, at the levels the tutor declared. Each subject still goes through
 * commitSubjectDecision, so the rule checks (minimum degree level, active
 * rule, evidence for conditional subjects) are unchanged: anything that does
 * not pass stays pending for manual admin review.
 */
export async function autoApproveEligibleSubjects(profileId: string, actor: { id: string; name: string }): Promise<{ approved: string[]; skipped: string[] }> {
  const approved: string[] = [];
  const skipped: string[] = [];
  const profile = await TutorProfile.findById(profileId);
  if (!profile || profile.degreeVerificationStatus !== "approved") return { approved, skipped };
  if (await refreshPendingEligibilityHints(profile)) await profile.save({ validateModifiedOnly: true });
  const levels = Array.from(new Set((profile.levels || [])
    .map((level) => normalizeEducationLevel(level))
    .filter((level) => (EDUCATION_LEVELS as readonly string[]).includes(level))));
  if (levels.length === 0) return { approved, skipped };

  for (const entry of profile.subjectEligibility || []) {
    // The stored eligibilityType is only a hint captured when the subject was
    // requested (often before any discipline existed); approveSubjectEligibility
    // re-resolves it against the current qualifications and rules.
    if (entry.status !== "pending") continue;
    try {
      await commitSubjectDecision({ profileId, subject: entry.subject, action: "approve", levels,
        reason: AUTO_APPROVAL_REASON, expectedToken: subjectDecisionToken(profile, entry.subject), actor });
      approved.push(entry.subject);
    } catch (error) {
      if (!(error instanceof SubjectDecisionError)) throw error;
      skipped.push(entry.subject);
    }
  }
  return { approved, skipped };
}
