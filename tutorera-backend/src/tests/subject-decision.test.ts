import { Types } from "mongoose";
import TutorProfile from "../models/TutorProfile.model";
import AuditLog from "../models/AuditLog.model";
import TutorApplicationStatusHistory from "../models/TutorApplicationStatusHistory.model";
import DisciplineSubjectMap from "../models/DisciplineSubjectMap.model";
import Request from "../models/Request.model";
import Booking from "../models/Booking.model";
import { reviewQualification } from "../services/qualificationReview.service";
import { autoApproveEligibleSubjects, commitSubjectDecision, subjectDecisionToken, SubjectDecisionError } from "../services/subjectDecision.service";

async function fixture() {
  await Promise.all([AuditLog.init(), TutorApplicationStatusHistory.init()]);
  await DisciplineSubjectMap.create({ discipline: "Science Fixture", eligibleSubjects: ["Physics"], isActive: true });
  const profile = await TutorProfile.create({ user: new Types.ObjectId(), fullName: "Subject Tutor",
    degreeVerificationStatus: "approved", education: [{ degree: "BSc", institution: "University", year: 2020,
      discipline: "Science Fixture", degreeDoc: "private-document" }],
    subjectEligibility: [{ subject: "Physics", status: "pending", matchesDiscipline: true, evidenceRequired: false, levels: [] }] });
  const actor = { id: new Types.ObjectId().toString(), name: "Reviewer" };
  reviewQualification(profile, 0, "approved", actor.id, "Verified", "bachelors");
  await profile.save();
  return { profileId: profile._id.toString(), subject: "Physics", action: "approve" as const,
    levels: ["O-Level"], reason: "Verified academic scope", actor, expectedToken: subjectDecisionToken(profile, "Physics") };
}

describe("atomic subject decisions", () => {
  it("commits approval, searchable subjects, audit, and private tracking history", async () => {
    const input = await fixture();
    const result = (await commitSubjectDecision(input))!;
    expect(result.profile.approvedSubjects).toContain("Physics");
    expect(await AuditLog.countDocuments()).toBe(1);
    expect((await TutorApplicationStatusHistory.findOne())!.isPublic).toBe(false);
  });

  it("rolls back approval if audit cannot be persisted", async () => {
    const input = await fixture();
    const failure = jest.spyOn(AuditLog, "create").mockRejectedValueOnce(new Error("Audit unavailable") as never);
    try { await expect(commitSubjectDecision(input)).rejects.toThrow("Audit unavailable"); }
    finally { failure.mockRestore(); }
    expect((await TutorProfile.findById(input.profileId))!.subjectEligibility![0].status).toBe("pending");
    expect(await TutorApplicationStatusHistory.countDocuments()).toBe(0);
  });

  it("allows only one contradictory decision from the same snapshot", async () => {
    const input = await fixture();
    const results = await Promise.allSettled([commitSubjectDecision(input),
      commitSubjectDecision({ ...input, action: "reject", reason: "Scope not supported" })]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const loser = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(loser.reason).toBeInstanceOf(SubjectDecisionError);
    expect(loser.reason.statusCode).toBe(409);
    expect(await AuditLog.countDocuments()).toBe(1);
  });

  it("rolls back revocation and booking flags together if history fails", async () => {
    const input = await fixture();
    const approved = (await commitSubjectDecision(input))!.profile;
    const student = new Types.ObjectId();
    const request = await Request.create({ student, subject: "Physics", level: "O-Level", description: "Tuition",
      budget: 1000, schedule: "Evenings", status: "open" });
    const booking = await Booking.create({ student, tutor: approved.user, request: request._id, amount: 1000,
      finalAgreedRate: 1000, subtotal: 1000, studentTotal: 1000, tutorNet: 1000,
      feeConfig: {}, schedule: "Evenings", status: "upcoming" });
    const revoke = { ...input, action: "revoke" as const, reason: "Credential invalidated",
      expectedToken: subjectDecisionToken(approved, "Physics") };
    const failure = jest.spyOn(TutorApplicationStatusHistory, "create").mockRejectedValueOnce(new Error("History unavailable") as never);
    try { await expect(commitSubjectDecision(revoke)).rejects.toThrow("History unavailable"); }
    finally { failure.mockRestore(); }
    expect((await TutorProfile.findById(input.profileId))!.subjectEligibility![0].status).toBe("approved");
    expect((await Booking.findById(booking._id))!.flaggedForReview).not.toBe(true);
    expect(await AuditLog.countDocuments()).toBe(1);
    const revoked = (await commitSubjectDecision(revoke))!;
    expect(revoked.flaggedBookings).toBe(1);
    expect(revoked.profile.approvedSubjects).not.toContain("Physics");
    expect((await Booking.findById(booking._id))!.status).toBe("upcoming");
  });

  it("requires a reason and approved state for revocation", async () => {
    const input = await fixture();
    await expect(commitSubjectDecision({ ...input, action: "revoke" })).rejects.toMatchObject({ statusCode: 422 });
    const profile = (await commitSubjectDecision(input))!.profile;
    await expect(commitSubjectDecision({ ...input, action: "revoke", reason: "",
      expectedToken: subjectDecisionToken(profile, "Physics") })).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe("auto-approval on qualification approval", () => {
  async function autoFixture(levels: string[]) {
    await Promise.all([AuditLog.init(), TutorApplicationStatusHistory.init()]);
    await DisciplineSubjectMap.create({ discipline: "Science Fixture", eligibleSubjects: ["Physics"], isActive: true });
    const profile = await TutorProfile.create({ user: new Types.ObjectId(), fullName: "Auto Tutor", levels,
      degreeVerificationStatus: "approved", education: [{ degree: "BSc", institution: "University", year: 2020,
        discipline: "Science Fixture", degreeDoc: "private-document" }],
      subjectEligibility: [
        { subject: "Physics", status: "pending", eligibilityType: "direct", matchesDiscipline: true, evidenceRequired: false, levels: [] },
        { subject: "History", status: "pending", eligibilityType: "unmapped", matchesDiscipline: false, evidenceRequired: true, levels: [] },
      ] });
    reviewQualification(profile, 0, "approved", new Types.ObjectId().toString(), "Verified", "bachelors");
    await profile.save();
    return { profileId: profile._id.toString(), actor: { id: new Types.ObjectId().toString(), name: "Reviewer" } };
  }

  it("approves directly-eligible subjects at the declared levels and leaves off-discipline ones pending", async () => {
    const { profileId, actor } = await autoFixture(["O-Level"]);
    const result = await autoApproveEligibleSubjects(profileId, actor);
    expect(result.approved).toEqual(["Physics"]);
    const saved = (await TutorProfile.findById(profileId))!;
    const byName = Object.fromEntries(saved.subjectEligibility!.map((e) => [e.subject, e]));
    expect(byName.Physics.status).toBe("approved");
    expect(byName.Physics.levels).toHaveLength(1);
    expect(byName.Physics.levels[0]).toMatch(/^O-Level/);
    expect(byName.History.status).toBe("pending");
    expect(saved.approvedSubjects).toContain("Physics");
  });

  it("does nothing when the tutor declared no valid teaching levels", async () => {
    const { profileId, actor } = await autoFixture([]);
    const result = await autoApproveEligibleSubjects(profileId, actor);
    expect(result.approved).toEqual([]);
    expect((await TutorProfile.findById(profileId))!.subjectEligibility![0].status).toBe("pending");
  });
});
