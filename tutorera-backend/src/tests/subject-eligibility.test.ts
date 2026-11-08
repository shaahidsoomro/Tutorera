// src/tests/subject-eligibility.test.ts
//
// Covers the core qualification-based subject eligibility service: a
// tutor's self-declared subjects must never grant marketplace privilege on
// their own, approvals must require at least one level, and revoking a
// previously-approved subject must flag affected upcoming/ongoing bookings
// for admin review without cancelling them outright.

import User from "../models/User.model";
import TutorProfile from "../models/TutorProfile.model";
import Request from "../models/Request.model";
import Booking from "../models/Booking.model";
import Subject from "../models/Subject.model";
import AcademicDiscipline from "../models/AcademicDiscipline.model";
import TeachingEligibilityRule from "../models/TeachingEligibilityRule.model";
import DisciplineSubjectMap from "../models/DisciplineSubjectMap.model";
import { reviewQualification } from "../services/qualificationReview.service";
import { reviewSubjectEvidence } from "../services/subjectEvidenceReview.service";
import {
  checkSubjectEligibility,
  isSubjectLevelApproved,
  requestSubjectEligibility,
  approveSubjectEligibility,
  rejectSubjectEligibility,
  revokeSubjectEligibility,
  grandfatherExistingSubjects,
  syncApprovedSubjects,
  NOT_ELIGIBLE_MESSAGE,
  resolveTeachingEligibility,
} from "../services/subjectEligibility.service";

jest.mock("../utils/logAudit", () => ({ logAudit: jest.fn().mockResolvedValue(undefined) }));

async function makeTutor() {
  const discipline = await AcademicDiscipline.findOneAndUpdate({ code: "DISC-FIXTURE" }, { name: "Fixture Science", slug: "fixture-science", status: "active" }, { upsert: true, returnDocument: "after" });
  for (const name of ["Computer Science", "Physics"]) {
    const subject = await Subject.findOneAndUpdate({ name }, { code: `SUB-${name.replace(/ /g, "-").toUpperCase()}`, slug: name.toLowerCase().replace(/ /g, "-"), category: "Science", level: [], status: "active", isActive: true }, { upsert: true, returnDocument: "after" });
    await TeachingEligibilityRule.findOneAndUpdate({ discipline: discipline._id, subject: subject._id }, { eligibilityType: "direct", evidenceRequired: false, status: "active" }, { upsert: true });
  }
  const user = await User.create({
    name: "Eligibility Tutor",
    email: `eligibility-${Date.now()}-${Math.random()}@test.com`,
    password: "password123",
    role: "tutor",
  });
  const profile = await TutorProfile.create({
    user: user._id, fullName: user.name, degreeVerificationStatus: "approved",
    education: [{ degree: "BSc", institution: "Test University", year: 2020, discipline: "Fixture Science", disciplineRef: discipline._id, degreeDoc: "https://example.test/degree.pdf", degreeDocPublicId: "test-degree" }],
  });
  reviewQualification(profile, 0, "approved", user._id.toString(), "Verified fixture credential", "bachelors");
  return { user, profile };
}

describe("subjectEligibility.service", () => {
  it("requires a separate evidence decision before approving a conditional teaching subject", async () => {
    const { user, profile } = await makeTutor();
    const subject = await Subject.create({ code: "SUB-COND", name: "Conditional Chemistry", slug: "conditional-chemistry", category: "Science", level: [] });
    await TeachingEligibilityRule.create({ discipline: profile.education[0].disciplineRef, subject: subject._id, eligibilityType: "conditional", evidenceRequired: true });
    await requestSubjectEligibility(profile, subject.name, { discipline: "Fixture Science" });
    const entry = profile.subjectEligibility![0];
    entry.evidence = [{ url: "private-url", publicId: "private-id", status: "pending" }];
    expect((await approveSubjectEligibility(profile, subject.name, ["O-Level"], { name: "Admin" }, "Reviewed certificate")).success).toBe(false);
    reviewSubjectEvidence(entry, 0, "approved", "Chemistry certificate verified", user._id.toString());
    expect((await approveSubjectEligibility(profile, subject.name, ["O-Level"], { name: "Admin" }, "Reviewed certificate")).success).toBe(true);
  });

  it("allows a minimum-degree rule only after the linked degree level is verified", async () => {
    const { user, profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Computer Science", { discipline: "Fixture Science" });
    const subject = await Subject.findOne({ name: "Computer Science" });
    await TeachingEligibilityRule.updateOne({ subject: subject!._id }, { $set: { minimumDegreeLevel: "Masters" } });
    expect((await approveSubjectEligibility(profile, "Computer Science", ["O-Level"], { name: "Admin" })).success).toBe(false);
    reviewQualification(profile, 0, "approved", user._id.toString(), "Masters credential verified", "masters");
    expect((await approveSubjectEligibility(profile, "Computer Science", ["O-Level"], { name: "Admin" })).success).toBe(true);
  });

  it("does not reuse a qualification review after the credential is changed", async () => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Computer Science", { discipline: "Fixture Science" });
    profile.education[0].degreeDoc = "https://example.test/replacement.pdf";
    expect((await approveSubjectEligibility(profile, "Computer Science", ["O-Level"], { name: "Admin" })).success).toBe(false);
  });

  it.each(["archived", "minimum-degree"])("blocks approval when the current rule is %s", async (change) => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Computer Science", { discipline: "Fixture Science" });
    const subject = await Subject.findOne({ name: "Computer Science" });
    await TeachingEligibilityRule.updateOne({ subject: subject!._id }, { $set: change === "archived" ? { status: "archived" } : { minimumDegreeLevel: "Masters" } });
    expect((await approveSubjectEligibility(profile, "Computer Science", ["O-Level"], { name: "Admin" })).success).toBe(false);
    expect(profile.subjectEligibility![0].status).toBe("pending");
  });

  it.each(["pending", "rejected"] as const)("blocks subject approval while education documents are %s", async (status) => {
    const { profile } = await makeTutor();
    profile.degreeVerificationStatus = status;
    await requestSubjectEligibility(profile, "Mathematics");
    expect((await approveSubjectEligibility(profile, "Mathematics", ["Matric"], { name: "Admin" }, "Reviewed")).success).toBe(false);
    expect(profile.subjectEligibility![0].status).toBe("pending");
  });

  it("blocks subject approval when education entries are absent despite an approved document flag", async () => {
    const { profile } = await makeTutor();
    profile.education = [];
    await requestSubjectEligibility(profile, "Mathematics");
    expect((await approveSubjectEligibility(profile, "Mathematics", ["Matric"], { name: "Admin" }, "Reviewed")).success).toBe(false);
  });

  it.each([["Invented Level"], [""], ["O-Level", "Invented Level"]])("rejects unsupported approval levels %j without mutating the request", async (...levels) => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Mathematics");
    const result = await approveSubjectEligibility(profile, "Mathematics", levels, { name: "Admin" }, "Reviewed");
    expect(result.success).toBe(false);
    expect(profile.subjectEligibility![0].status).toBe("pending");
    expect(profile.approvedSubjects || []).toEqual([]);
  });

  it.each(["", "   "])("requires a nonblank rejection reason", async (reason) => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Mathematics");
    expect((await rejectSubjectEligibility(profile, "Mathematics", reason, { name: "Admin" })).success).toBe(false);
    expect(profile.subjectEligibility![0].status).toBe("pending");
  });

  it.each(["inactive", "archived"])("does not restore a %s canonical discipline through a legacy mapping", async (status) => {
    await AcademicDiscipline.create({ code: "DISC-DISABLED", name: "Disabled Dentistry", slug: "disabled-dentistry", status });
    await DisciplineSubjectMap.create({ discipline: "Disabled Dentistry", eligibleSubjects: ["Pakistan Studies"], isActive: true });
    expect((await resolveTeachingEligibility("Disabled Dentistry", "Pakistan Studies")).eligibilityType).toBe("unmapped");
  });

  it("does not restore a disabled canonical subject through a legacy mapping", async () => {
    await Subject.create({ code: "SUB-DISABLED", name: "Disabled Subject", slug: "disabled-subject", category: "Science", level: [], status: "archived", isActive: false });
    await DisciplineSubjectMap.create({ discipline: "Legacy Science", eligibleSubjects: ["Disabled Subject"] });
    expect((await resolveTeachingEligibility("Legacy Science", "Disabled Subject")).eligibilityType).toBe("unmapped");
  });

  it("matches legacy discipline names literally rather than as regular expressions", async () => {
    await DisciplineSubjectMap.create({ discipline: "ScienceX", eligibleSubjects: ["Biology"] });
    expect((await resolveTeachingEligibility("Science.", "Biology")).eligibilityType).toBe("unmapped");
  });

  it("a self-declared subject with no eligibility entry is never approved", async () => {
    const { profile } = await makeTutor();
    const result = checkSubjectEligibility(profile, "Computer Science", "O-Level");
    expect(result.eligible).toBe(false);
    expect(result.message).toBe(NOT_ELIGIBLE_MESSAGE);
  });

  it("requestSubjectEligibility creates a pending entry that does not itself grant eligibility", async () => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Computer Science");
    expect(profile.subjectEligibility?.[0].status).toBe("pending");
    expect(isSubjectLevelApproved(profile, "Computer Science")).toBe(false);
  });

  it("requestSubjectEligibility is idempotent per subject", async () => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Computer Science");
    await requestSubjectEligibility(profile, "Computer Science");
    expect(profile.subjectEligibility?.length).toBe(1);
  });

  it("approveSubjectEligibility requires at least one level", async () => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Computer Science");
    const result = await approveSubjectEligibility(profile, "Computer Science", [], { name: "Admin" });
    expect(result.success).toBe(false);
    expect(isSubjectLevelApproved(profile, "Computer Science")).toBe(false);
  });

  it("approveSubjectEligibility with levels grants eligibility and syncs approvedSubjects", async () => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Computer Science");
    profile.subjectEligibility![0].evidence = [{ url: "https://example.test/evidence.pdf", label: "Degree evidence", uploadedAt: new Date() }];
    const result = await approveSubjectEligibility(profile, "Computer Science", ["O-Level", "A-Level"], { name: "Admin" }, "Verified computer-science credential reviewed.");
    expect(result.success).toBe(true);
    expect(isSubjectLevelApproved(profile, "Computer Science", "O-Level")).toBe(true);
    expect(isSubjectLevelApproved(profile, "Computer Science", "University")).toBe(false);
    expect(profile.approvedSubjects).toContain("Computer Science");
  });

  it("does not allow an off-discipline subject to be approved without documented evidence", async () => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Pakistan Studies", { discipline: "Dentistry" });
    expect(profile.subjectEligibility?.[0].matchesDiscipline).toBe(false);

    const withoutRationale = await approveSubjectEligibility(profile, "Pakistan Studies", ["Matric"], { name: "Admin" });
    expect(withoutRationale.success).toBe(false);
    expect(checkSubjectEligibility(profile, "Pakistan Studies", "Matric").eligible).toBe(false);

    profile.subjectEligibility![0].evidence = [{ url: "https://example.test/teaching-certificate.pdf", label: "Teaching certificate", uploadedAt: new Date() }];

    const withEvidence = await approveSubjectEligibility(
      profile,
      "Pakistan Studies",
      ["Matric"],
      { name: "Admin" },
      "Verified teaching certificate and subject-specific assessment were reviewed."
    );
    expect(withEvidence.success).toBe(false);
    expect(checkSubjectEligibility(profile, "Pakistan Studies", "Matric").eligible).toBe(false);
  });

  it("does not accept an admin rationale as a substitute for required evidence", async () => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Pakistan Studies", { discipline: "Dentistry" });
    const result = await approveSubjectEligibility(profile, "Pakistan Studies", ["Matric"], { name: "Admin" }, "The tutor says they have prior experience.");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.message).toMatch(/evidence/i);
  });

  it("does not allow an already approved subject request to be approved or rejected again", async () => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Computer Science", { discipline: "Fixture Science" });
    profile.subjectEligibility![0].evidence = [{ url: "https://example.test/evidence.pdf", label: "Degree evidence", uploadedAt: new Date() }];
    const approval = await approveSubjectEligibility(profile, "Computer Science", ["O-Level"], { name: "Admin" }, "Evidence reviewed.");
    expect(approval.success).toBe(true);
    const duplicateApproval = await approveSubjectEligibility(profile, "Computer Science", ["A-Level"], { name: "Admin" }, "Second review.");
    const rejection = await rejectSubjectEligibility(profile, "Computer Science", "Changed mind", { name: "Admin" });
    expect(duplicateApproval.success).toBe(false);
    expect(rejection.success).toBe(false);
    expect(profile.subjectEligibility![0].levels).toEqual(["O-Level"]);
  });

  it("rejectSubjectEligibility keeps the subject out of approvedSubjects", async () => {
    const { profile } = await makeTutor();
    await requestSubjectEligibility(profile, "Mathematics");
    const result = await rejectSubjectEligibility(profile, "Mathematics", "No supporting qualification provided.", { name: "Admin" });
    expect(result.success).toBe(true);
    expect(checkSubjectEligibility(profile, "Mathematics").eligible).toBe(false);
    expect(profile.approvedSubjects || []).not.toContain("Mathematics");
  });

  it("grandfatherExistingSubjects auto-approves an already-active tutor's current subjects", async () => {
    const { profile } = await makeTutor();
    profile.subjects = ["Physics", "Chemistry"];
    profile.levels = ["O-Level"];
    grandfatherExistingSubjects(profile);
    expect(isSubjectLevelApproved(profile, "Physics", "O-Level")).toBe(true);
    expect(isSubjectLevelApproved(profile, "Chemistry", "O-Level")).toBe(true);
    expect(profile.approvedSubjects?.sort()).toEqual(["Chemistry", "Physics"]);
  });

  it("grandfatherExistingSubjects does not duplicate an already-reviewed subject", async () => {
    const { profile } = await makeTutor();
    profile.subjects = ["Physics"];
    await approveSubjectEligibility(
      Object.assign(profile, { subjectEligibility: [{ subject: "Physics", levels: [], status: "pending", matchesDiscipline: false, requestedAt: new Date() }] }),
      "Physics",
      ["A-Level"],
      { name: "Admin" },
      "Verified subject-specific credential reviewed."
    );
    grandfatherExistingSubjects(profile);
    expect(profile.subjectEligibility?.filter((e) => e.subject === "Physics").length).toBe(1);
    expect(profile.subjectEligibility?.[0].levels).toEqual(["A-Level"]);
  });

  it("revokeSubjectEligibility removes approval and flags affected upcoming bookings without cancelling them", async () => {
    const { user, profile } = await makeTutor();
    const student = await User.create({ name: "Student", email: `student-${Date.now()}@test.com`, password: "password123", role: "student" });

    await requestSubjectEligibility(profile, "Computer Science", { discipline: "Fixture Science" });
    expect((await approveSubjectEligibility(profile, "Computer Science", ["O-Level"], { name: "Admin" })).success).toBe(true);
    await profile.save();

    const request = await Request.create({
      student: student._id,
      subject: "Computer Science",
      level: "O-Level",
      description: "Need help",
      budget: 1000,
      schedule: "Evenings",
      status: "open",
    });
    const booking = await Booking.create({
      student: student._id,
      tutor: user._id,
      request: request._id,
      amount: 1000,
      finalAgreedRate: 1000,
      subtotal: 1000,
      studentTotal: 1000,
      tutorNet: 1000,
      feeConfig: {},
      schedule: "Evenings",
      status: "upcoming",
    });

    const result = await revokeSubjectEligibility(profile, "Computer Science", "Degree verification overturned.", { name: "Admin" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.flaggedBookings).toBe(1);
    expect(checkSubjectEligibility(profile, "Computer Science").eligible).toBe(false);

    const flaggedBooking = await Booking.findById(booking._id);
    expect(flaggedBooking?.flaggedForReview).toBe(true);
    expect(flaggedBooking?.status).toBe("upcoming"); // not auto-cancelled
  });

  it("syncApprovedSubjects excludes approved entries with no levels attached", async () => {
    const { profile } = await makeTutor();
    profile.subjectEligibility = [
      { subject: "Biology", levels: [], status: "approved", matchesDiscipline: false, requestedAt: new Date() } as any,
    ];
    syncApprovedSubjects(profile);
    expect(profile.approvedSubjects || []).not.toContain("Biology");
  });

  it("uses a canonical direct rule as the eligibility source", async () => {
    const discipline = await AcademicDiscipline.create({ code: "DISC-TEST-CS", name: "Test Computer Science", slug: "test-computer-science" });
    const subject = await Subject.create({ code: "SUB-TEST-CS", name: "Test Computer Science", slug: "test-computer-science-subject", category: "Computing", level: [] });
    const rule = await TeachingEligibilityRule.create({ discipline: discipline._id, subject: subject._id, eligibilityType: "direct", evidenceRequired: false });
    const result = await resolveTeachingEligibility(discipline.name, subject.name);
    expect(result).toMatchObject({ eligibilityType: "direct", evidenceRequired: false, subjectId: subject._id, ruleId: rule._id });
  });

  it("marks canonical conditional rules as requiring evidence", async () => {
    const discipline = await AcademicDiscipline.create({ code: "DISC-TEST-MATH", name: "Test Mathematics", slug: "test-mathematics" });
    const subject = await Subject.create({ code: "SUB-TEST-PROG", name: "Test Programming", slug: "test-programming", category: "Computing", level: [] });
    await TeachingEligibilityRule.create({ discipline: discipline._id, subject: subject._id, eligibilityType: "conditional", evidenceRequired: true });
    const result = await resolveTeachingEligibility(discipline.name, subject.name);
    expect(result.eligibilityType).toBe("conditional");
    expect(result.evidenceRequired).toBe(true);
  });

  it("fails closed when a canonical discipline has no rule for a subject", async () => {
    const discipline = await AcademicDiscipline.create({ code: "DISC-TEST-DENT", name: "Test Dentistry", slug: "test-dentistry" });
    const subject = await Subject.create({ code: "SUB-TEST-PAK", name: "Test Pakistan Studies", slug: "test-pakistan-studies", category: "Social Sciences", level: [] });
    const result = await resolveTeachingEligibility(discipline.name, subject.name);
    expect(result.eligibilityType).toBe("unmapped");
    expect(result.evidenceRequired).toBe(true);
  });
});
