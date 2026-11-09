import { Types } from "mongoose";
import TutorProfile from "../models/TutorProfile.model";
import AuditLog from "../models/AuditLog.model";
import TutorApplicationStatusHistory from "../models/TutorApplicationStatusHistory.model";
import DisciplineSubjectMap from "../models/DisciplineSubjectMap.model";
import { reviewQualification } from "../services/qualificationReview.service";
import { runMigration } from "../scripts/migrateSubjectEligibility";

const stale = { status: "pending", eligibilityType: "unmapped", matchesDiscipline: false, evidenceRequired: true, levels: [] };
const education = (discipline?: string) => [{ degree: "BSc", institution: "University", year: 2020, degreeDoc: "doc",
  verificationStatus: "approved", degreeLevel: "bachelors", ...(discipline ? { discipline } : {}) }];

async function seed() {
  await Promise.all([AuditLog.init(), TutorApplicationStatusHistory.init()]);
  await DisciplineSubjectMap.create({ discipline: "Science Fixture", eligibleSubjects: ["Physics"], isActive: true });
  const reviewer = new Types.ObjectId().toString();
  const withDiscipline = await TutorProfile.create({ user: new Types.ObjectId(), fullName: "With discipline", levels: ["O-Level"],
    degreeVerificationStatus: "approved", education: education("Science Fixture"),
    subjectEligibility: [{ subject: "Physics", ...stale }, { subject: "History", ...stale }] } as never);
  const withoutDiscipline = await TutorProfile.create({ user: new Types.ObjectId(), fullName: "No discipline", levels: ["O-Level"],
    degreeVerificationStatus: "approved", education: education(),
    subjectEligibility: [{ subject: "Physics", ...stale }] } as never);
  for (const profile of [withDiscipline, withoutDiscipline]) {
    reviewQualification(profile, 0, "approved", reviewer, "Verified", "bachelors");
    await profile.save();
  }
  return { withDiscipline, withoutDiscipline };
}
const statuses = async (id: unknown) => Object.fromEntries((await TutorProfile.findById(id))!.subjectEligibility!.map((e) => [e.subject, e.status]));

describe("subject eligibility migration", () => {
  it("dry run reports but writes nothing", async () => {
    const { withDiscipline } = await seed();
    const stats = await runMigration(false);
    expect(stats.scanned).toBe(2);
    expect(stats.hintsRefreshed).toBe(1);
    expect(stats.noDiscipline).toBe(1);
    expect(await statuses(withDiscipline._id)).toEqual({ Physics: "pending", History: "pending" });
    expect((await TutorProfile.findById(withDiscipline._id))!.subjectEligibility![0].eligibilityType).toBe("unmapped");
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it("apply approves matching subjects only and leaves tutors without a discipline untouched", async () => {
    const { withDiscipline, withoutDiscipline } = await seed();
    const actor = new Types.ObjectId().toString();
    const stats = await runMigration(true, actor);
    expect(stats.autoApprovedSubjects).toBe(1);
    expect(await statuses(withDiscipline._id)).toEqual({ Physics: "approved", History: "pending" });
    expect(await statuses(withoutDiscipline._id)).toEqual({ Physics: "pending" });
    expect(stats.noDisciplineIds).toEqual([withoutDiscipline._id.toString()]);
    // idempotent
    const again = await runMigration(true, actor);
    expect(again.autoApprovedSubjects).toBe(0);
    expect(await statuses(withDiscipline._id)).toEqual({ Physics: "approved", History: "pending" });
  });

  it("refuses to apply without an actor", async () => {
    await expect(runMigration(true)).rejects.toThrow("--actor");
  });
});
