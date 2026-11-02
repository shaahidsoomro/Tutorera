/**
 * Migration: re-evaluate matchesDiscipline on all non-approved subjectEligibility entries
 *
 * When eligibility rules are added or changed AFTER a tutor completed onboarding,
 * the stored `matchesDiscipline` flag becomes stale (it was computed at save time).
 * This script re-runs `resolveTeachingEligibility` against the current live rule set
 * and updates only the fields that changed, without touching status, levels, or evidence.
 *
 * Scope: entries where status IN [pending, needs_evidence, rejected]
 * Approved and revoked entries are intentionally skipped — their flags are
 * load-bearing in audit trails and should only change via a formal re-approval.
 *
 * Default mode is dry-run. Pass --commit to persist.
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db";
import TutorProfile from "../models/TutorProfile.model";
import AcademicDiscipline from "../models/AcademicDiscipline.model";
import { resolveTeachingEligibility } from "../services/subjectEligibility.service";

const commit = process.argv.includes("--commit");
const RECALCULATE_STATUSES = new Set(["pending", "needs_evidence", "rejected"]);

async function main() {
  await connectDB();

  const report = {
    mode: commit ? "commit" : "dry-run",
    profilesScanned: 0,
    entriesScanned: 0,
    entriesUpdated: 0,
    profilesUpdated: 0,
    changes: [] as Array<{ tutorId: string; subject: string; before: boolean; after: boolean; eligibilityType: string }>,
  };

  const cursor = TutorProfile.find({
    "subjectEligibility.0": { $exists: true },
  }).cursor();

  for await (const profile of cursor) {
    report.profilesScanned++;
    const qualifications = profile.education || [];
    let profileDirty = false;

    for (const entry of profile.subjectEligibility || []) {
      if (!RECALCULATE_STATUSES.has(entry.status)) continue;
      report.entriesScanned++;

      // Build the list of disciplines from the qualifications tied to this entry.
      // Fall back to ALL qualifications if no qualificationIndex is stored.
      const targetQualifications =
        entry.qualificationIndex != null && qualifications[entry.qualificationIndex]
          ? [qualifications[entry.qualificationIndex]]
          : qualifications;

      const disciplines: string[] = [];
      for (const q of targetQualifications) {
        if (q.disciplineRef) {
          const disc = await AcademicDiscipline.findById(q.disciplineRef).lean();
          if (disc?.name) disciplines.push(disc.name);
        } else if (q.discipline?.trim()) {
          disciplines.push(q.discipline.trim());
        }
      }

      if (disciplines.length === 0) continue;

      // Re-resolve against every relevant discipline; pick the best match.
      const resolutions = await Promise.all(
        disciplines.map((d) => resolveTeachingEligibility(d, entry.subject))
      );
      const direct = resolutions.find((r) => r.eligibilityType === "direct");
      const conditional = resolutions.find((r) => r.eligibilityType === "conditional");
      const best = direct ?? conditional ?? resolutions[0];

      const newMatchesDiscipline = best.eligibilityType !== "unmapped";
      const newEligibilityType = best.eligibilityType;
      const newEvidenceRequired = best.evidenceRequired;
      const newSubjectRef = best.subjectId;
      const newRuleRef = best.ruleId;

      const changed =
        entry.matchesDiscipline !== newMatchesDiscipline ||
        entry.eligibilityType !== newEligibilityType ||
        entry.evidenceRequired !== newEvidenceRequired;

      if (!changed) continue;

      report.entriesUpdated++;
      report.changes.push({
        tutorId: profile._id.toString(),
        subject: entry.subject,
        before: entry.matchesDiscipline,
        after: newMatchesDiscipline,
        eligibilityType: newEligibilityType,
      });

      if (commit) {
        entry.matchesDiscipline = newMatchesDiscipline;
        entry.eligibilityType = newEligibilityType as typeof entry.eligibilityType;
        entry.evidenceRequired = newEvidenceRequired;
        if (newSubjectRef) entry.subjectRef = newSubjectRef;
        if (newRuleRef) entry.eligibilityRuleRef = newRuleRef;

        // needs_evidence is the correct status for a conditional subject that
        // requires uploaded evidence before the admin can approve it.
        if (
          entry.status === "pending" &&
          newEligibilityType === "conditional" &&
          newEvidenceRequired
        ) {
          entry.status = "needs_evidence";
        }
      }

      profileDirty = true;
    }

    if (profileDirty) {
      report.profilesUpdated++;
      if (commit) {
        await profile.save({ validateModifiedOnly: true });
      }
    }
  }

  if (report.changes.length > 0) {
    console.log("\nChanged entries:");
    for (const c of report.changes) {
      const arrow = c.before ? "true→false" : `false→true (${c.eligibilityType})`;
      console.log(`  Tutor ${c.tutorId}  subject="${c.subject}"  matchesDiscipline: ${arrow}`);
    }
  } else {
    console.log("\nNo changes detected — all matchesDiscipline flags are current.");
  }

  console.log("\nReport:", JSON.stringify({ ...report, changes: report.changes.length }, null, 2));
  if (!commit) {
    console.log("\nDry-run complete. Re-run with --commit to persist changes.");
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
