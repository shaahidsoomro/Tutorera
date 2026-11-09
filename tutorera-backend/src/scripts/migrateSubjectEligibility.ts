import "dotenv/config";
import mongoose from "mongoose";
import TutorProfile from "../models/TutorProfile.model";
import AcademicDiscipline from "../models/AcademicDiscipline.model";
import TeachingEligibilityRule from "../models/TeachingEligibilityRule.model";
import DisciplineSubjectMap from "../models/DisciplineSubjectMap.model";
import { qualificationDisciplines, refreshPendingEligibilityHints } from "../services/subjectEligibility.service";
import { autoApproveEligibleSubjects } from "../services/subjectDecision.service";

/**
 * Brings existing tutor data in line with "subjects follow the degree":
 *  1. reports whether discipline->subject data exists (the onboarding subject
 *     picker is empty without it),
 *  2. refreshes stale eligibility hints on pending subjects,
 *  3. auto-approves pending subjects for tutors whose qualification is already approved,
 *  4. lists tutors whose qualification has no discipline (an admin or the tutor must set it).
 *
 * Dry run by default. To write:  --apply --actor <adminUserId>
 * Idempotent; never edits qualifications or invents a discipline.
 */
export interface MigrationStats { scanned: number; noDiscipline: number; hintsRefreshed: number; autoApproved: number; autoApprovedSubjects: number; noDisciplineIds: string[] }

export async function runMigration(apply: boolean, actorId?: string): Promise<MigrationStats> {
  if (apply && (!actorId || !mongoose.isValidObjectId(actorId))) throw new Error("--apply requires --actor <adminUserId>");
  console.log(apply ? "MODE: APPLY" : "MODE: DRY RUN (no writes)");

  const [disciplines, rules, legacyMaps] = await Promise.all([
    AcademicDiscipline.countDocuments({ status: "active" }),
    TeachingEligibilityRule.countDocuments({ status: "active" }),
    DisciplineSubjectMap.countDocuments({ isActive: true }),
  ]);
  console.log(`Readiness: ${disciplines} active disciplines, ${rules} active eligibility rules, ${legacyMaps} active legacy discipline maps.`);
  if (disciplines === 0 && legacyMaps === 0) {
    console.warn("WARNING: no discipline->subject data. GET /tutors/eligible-subjects returns nothing, so tutors cannot choose subjects. Seed disciplines/rules first.");
  }

  const stats: MigrationStats = { scanned: 0, noDiscipline: 0, hintsRefreshed: 0, autoApproved: 0, autoApprovedSubjects: 0, noDisciplineIds: [] };
  const cursor = TutorProfile.find({
    $or: [{ "subjectEligibility.status": { $in: ["pending", "needs_evidence"] } }, { "education.0": { $exists: true } }],
  }).cursor();

  for await (const profile of cursor) {
    stats.scanned++;
    if ((profile.education || []).length > 0 && (await qualificationDisciplines(profile.education)).length === 0) {
      stats.noDiscipline++;
      if (stats.noDisciplineIds.length < 50) stats.noDisciplineIds.push(profile._id.toString());
    }
    const changed = await refreshPendingEligibilityHints(profile);
    if (changed) {
      stats.hintsRefreshed++;
      if (apply) await profile.save({ validateModifiedOnly: true });
    }
    const hasPending = (profile.subjectEligibility || []).some((entry) => entry.status === "pending");
    if (profile.degreeVerificationStatus === "approved" && hasPending) {
      if (apply) {
        const { approved } = await autoApproveEligibleSubjects(profile._id.toString(), { id: actorId!, name: "System migration" });
        if (approved.length) { stats.autoApproved++; stats.autoApprovedSubjects += approved.length; }
      } else if ((profile.subjectEligibility || []).some((entry) => entry.status === "pending" && (entry.eligibilityType === "direct"))) {
        stats.autoApproved++;
      }
    }
  }

  console.log(`Scanned ${stats.scanned} tutor profile(s).`);
  console.log(`Stale subject hints ${apply ? "refreshed" : "that would be refreshed"}: ${stats.hintsRefreshed}`);
  console.log(`Tutors ${apply ? `auto-approved (${stats.autoApprovedSubjects} subject(s))` : "likely to be auto-approved"}: ${stats.autoApproved}`);
  console.log(`Tutors whose qualification has no discipline (need it set before subjects can match): ${stats.noDiscipline}`);
  if (stats.noDisciplineIds.length) console.log(`First ${stats.noDisciplineIds.length} profile ids: ${stats.noDisciplineIds.join(", ")}`);
  return stats;
}

async function main() {
  const actorIndex = process.argv.indexOf("--actor");
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGO_URI is required");
  await mongoose.connect(mongoUri);
  try { await runMigration(process.argv.includes("--apply"), actorIndex >= 0 ? process.argv[actorIndex + 1] : undefined); }
  finally { await mongoose.disconnect().catch(() => undefined); }
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
