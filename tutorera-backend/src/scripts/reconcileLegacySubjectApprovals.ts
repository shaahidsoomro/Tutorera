/**
 * Safely bind legacy approved teaching subjects to a reviewed qualification.
 * Default mode is dry-run. It never approves, revokes, or changes levels.
 * Commit requires an explicit confirmation phrase after reviewing the report.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import TutorProfile from "../models/TutorProfile.model";
import Subject from "../models/Subject.model";
import TeachingEligibilityRule from "../models/TeachingEligibilityRule.model";
import { hasCurrentQualificationReview } from "../services/qualificationReview.service";

dotenv.config();
const commit = process.argv.includes("--commit");
const confirmed = process.argv.includes("--confirm=LINK_LEGACY_SUBJECT_APPROVALS");
const normal = (value: string) => value.trim().toLowerCase();

async function main() {
  if (commit && !confirmed) throw new Error("Refusing write: use --commit --confirm=LINK_LEGACY_SUBJECT_APPROVALS after reviewing the dry run.");
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false });
  if (mongoose.connection.readyState !== 1) throw new Error("Database connection is unavailable; no reconciliation was attempted.");
  const report = { mode: commit ? "commit" : "dry-run", scannedProfiles: 0, unlinkedApprovedEntries: 0, linked: 0, ambiguous: [] as string[], unmatched: [] as string[] };
  const subjects = await Subject.find().select("_id name").lean();
  const subjectByName = new Map(subjects.map(subject => [normal(subject.name), subject]));
  const rules = await TeachingEligibilityRule.find({ status: "active" }).select("discipline subject eligibilityType").lean();
  const session = commit ? await TutorProfile.startSession() : null;
  const work = async () => {
    const profiles = await TutorProfile.find({ "subjectEligibility.status": "approved" }).select("user fullName education subjectEligibility approvedSubjects").session(session).cursor();
    for await (const profile of profiles) {
      report.scannedProfiles++;
      let changed = false;
      for (const entry of profile.subjectEligibility || []) {
        if (entry.status !== "approved" || Number.isInteger(entry.qualificationIndex)) continue;
        report.unlinkedApprovedEntries++;
        const subject = entry.subjectRef ? subjects.find(item => item._id.equals(entry.subjectRef!)) : subjectByName.get(normal(entry.subject));
        const matches = (profile.education || []).map((education, index) => ({ education, index })).filter(({ education }) => {
          if (!hasCurrentQualificationReview(education) || !education.disciplineRef || !subject) return false;
          return rules.some(rule => rule.eligibilityType === "direct" && rule.discipline.equals(education.disciplineRef!) && rule.subject.equals(subject._id));
        });
        const label = `${profile._id}:${entry.subject}`;
        if (matches.length !== 1) {
          (matches.length ? report.ambiguous : report.unmatched).push(label);
          continue;
        }
        const match = matches[0];
        entry.qualificationIndex = match.index;
        entry.subjectRef = subject!._id;
        const rule = rules.find(item => item.eligibilityType === "direct" && item.discipline.equals(match.education.disciplineRef!) && item.subject.equals(subject!._id));
        entry.eligibilityRuleRef = rule?._id;
        entry.eligibilityType = "direct";
        entry.evidenceRequired = false;
        changed = true;
        report.linked++;
      }
      if (changed && commit) await profile.save({ session: session || undefined, validateModifiedOnly: true });
    }
  };
  try { if (session) await session.withTransaction(work); else await work(); console.log(JSON.stringify(report, null, 2)); }
  finally { await session?.endSession(); await mongoose.disconnect(); }
}
main().catch(error => { console.error("Legacy subject-approval reconciliation failed:", error); process.exit(1); });
