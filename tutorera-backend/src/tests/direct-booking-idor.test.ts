// src/tests/direct-booking-idor.test.ts
//
// Audit §15 + P1-04 companion: direct-booking IDOR regression. Audit
// P1-04 flagged direct booking as a product-questionable path that
// might be retired; locking its authorization behaviour down with
// tests now makes any future retirement / refactor safer.
//
// Covered:
//   POST /api/v1/requests/direct           (create a direct request)
//   GET  /api/v1/requests/direct/my        (tutor's inbox of direct requests)
//
// Protection is three-layer:
//   1. Role gate (authorize("student", "parent") on create, "tutor" on list)
//   2. Parent / learner link check for parent accounts
//   3. GET filter scopes { targetTutor: req.user._id, isDirect: true }

import request from "supertest";
import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User.model";
import TuitionRequest from "../models/Request.model";
import TutorProfile from "../models/TutorProfile.model";
import ParentProfile from "../models/ParentProfile.model";
import FeatureFlag from "../models/FeatureFlag.model";

function tokenFor(userId: string): string {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
}

async function makeUser(role: "student" | "parent" | "tutor", suffix: string) {
  const user = await User.create({
    name: `${role[0].toUpperCase() + role.slice(1)} ${suffix}`,
    email: `${role}-${suffix}@direct-booking-idor.test`,
    password: "password123",
    role,
    isActive: true,
  });
  return { user, token: tokenFor(user.id) };
}

async function makeMarketplaceEligibleTutor(suffix: string) {
  const user = await makeUser("tutor", suffix);
  // Minimum state the createDirectBookingRequest handler accepts:
  // - isMarketplaceEligible() → requires isVerified + verificationStatus
  //   approved + core docs approved + agreement + subject eligibility
  // - checkSubjectEligibility() → the requested subject+level must be in
  //   subjectEligibility with status "approved"
  // - teachingMode must match the requested mode
  await TutorProfile.create({
    user: user.user._id,
    bio: "An honest biography describing this tutor's teaching background.",
    subjects: ["Mathematics"],
    hourlyRate: 1500,
    teachingMode: "online",
    isVerified: true,
    verificationStatus: "approved",
    cnicVerificationStatus: "approved",
    degreeVerificationStatus: "approved",
    demoVideoStatus: "approved",
    agreementAcceptedAt: new Date(),
    marketplaceEligible: true,
    countryCode: "PK",
    subjectEligibility: [
      { subject: "Mathematics", levels: ["O-Level (Cambridge / Edexcel)"], status: "approved" },
    ],
    averageRating: 0,
    totalReviews: 0,
  });
  return user;
}

async function seedDirectRequest(studentId: Types.ObjectId, targetTutorId: Types.ObjectId) {
  return TuitionRequest.create({
    student: studentId,
    targetTutor: targetTutorId,
    subject: "Mathematics",
    level: "O-Level (Cambridge / Edexcel)",
    description: "Looking for help with algebra and past-paper practice.",
    budget: 2000,
    pricingUnit: "hour",
    currency: "PKR",
    teachingMode: "online",
    schedule: "Mon–Thu, 6 PM",
    status: "open",
    isDirect: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

const validBody = (tutorId: string) => ({
  tutorId,
  subject: "Mathematics",
  level: "O-Level (Cambridge / Edexcel)",
  description: "Need help with algebra and past-paper practice sessions.",
  teachingMode: "online",
  schedule: "Mon–Thu, 6 PM",
});

describe("direct-booking IDOR + authorization boundaries", () => {
  // Direct booking is off until an admin enables the flag; the test database is wiped between tests.
  beforeEach(async () => {
    await FeatureFlag.create({ key: "ENABLE_DIRECT_BOOKING", enabled: true, scope: "global" });
  });

  it("a tutor cannot create a direct booking request (role gate → 403)", async () => {
    const impostor = await makeUser("tutor", "impostor-create");
    const target = await makeMarketplaceEligibleTutor("target-impostor");

    const res = await request(app)
      .post(`/api/v1/requests/direct`)
      .set("Authorization", `Bearer ${impostor.token}`)
      .send(validBody((target.user._id as Types.ObjectId).toString()));

    expect(res.status).toBe(403);

    const count = await TuitionRequest.countDocuments({ targetTutor: target.user._id, isDirect: true });
    expect(count).toBe(0);
  });

  it("a parent cannot direct-book for a learner they are not linked to (403)", async () => {
    // P1-04 adjacency: a parent-mode direct booking must reject any
    // learnerId that isn't under this parent's ParentProfile. Without
    // this check, any logged-in parent could create a direct request
    // in a child's name and expose the child's identity to a tutor.
    const parent = await makeUser("parent", "unlinked");
    const otherChild = await makeUser("student", "someone-elses-child");
    const target = await makeMarketplaceEligibleTutor("target-unlinked");

    // Seed a ParentProfile for `parent` with NO linked children so the
    // model's existence doesn't mask the real failure path.
    await ParentProfile.create({ user: parent.user._id, children: [] });

    const res = await request(app)
      .post(`/api/v1/requests/direct`)
      .set("Authorization", `Bearer ${parent.token}`)
      .send({
        ...validBody((target.user._id as Types.ObjectId).toString()),
        learnerId: (otherChild.user._id as Types.ObjectId).toString(),
      });

    expect(res.status).toBe(403);

    const count = await TuitionRequest.countDocuments({ targetTutor: target.user._id, isDirect: true });
    expect(count).toBe(0);
  });

  it("a parent WITHOUT a learnerId is refused (LEARNER_REQUIRED, 422)", async () => {
    // Parents must select a child; defaulting to "the parent themselves"
    // would create a bogus student record.
    const parent = await makeUser("parent", "no-learner");
    const target = await makeMarketplaceEligibleTutor("target-no-learner");

    const res = await request(app)
      .post(`/api/v1/requests/direct`)
      .set("Authorization", `Bearer ${parent.token}`)
      .send(validBody((target.user._id as Types.ObjectId).toString()));

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("LEARNER_REQUIRED");
  });

  it("getMyDirectRequests only returns direct requests TARGETED at the calling tutor", async () => {
    // Core IDOR invariant: tutor A listing their direct inbox must
    // never see a direct request addressed to tutor B.
    const student = await makeUser("student", "list-student");
    const tutorA = await makeMarketplaceEligibleTutor("list-A");
    const tutorB = await makeMarketplaceEligibleTutor("list-B");

    const aReq = await seedDirectRequest(
      student.user._id as Types.ObjectId,
      tutorA.user._id as Types.ObjectId,
    );
    const bReq = await seedDirectRequest(
      student.user._id as Types.ObjectId,
      tutorB.user._id as Types.ObjectId,
    );

    const res = await request(app)
      .get(`/api/v1/requests/direct/my`)
      .set("Authorization", `Bearer ${tutorA.token}`);

    expect(res.status).toBe(200);

    const returnedIds: string[] = (res.body.requests || []).map((r: { _id: string }) => r._id);
    expect(returnedIds).toContain(aReq.id);
    expect(returnedIds).not.toContain(bReq.id);
  });

  it("a student cannot read the tutor direct-request inbox (role gate → 403)", async () => {
    const student = await makeUser("student", "inbox-role");

    const res = await request(app)
      .get(`/api/v1/requests/direct/my`)
      .set("Authorization", `Bearer ${student.token}`);

    expect(res.status).toBe(403);
  });

  it("rejects direct booking request with 403 when ENABLE_DIRECT_BOOKING is false (Phase 5 feature flag)", async () => {
    const origFlag = process.env.ENABLE_DIRECT_BOOKING;
    process.env.ENABLE_DIRECT_BOOKING = "false";

    try {
      const student = await makeUser("student", "flag-disabled");
      const tutor = await makeMarketplaceEligibleTutor("flag-tutor");

      const res = await request(app)
        .post("/api/v1/requests/direct")
        .set("Authorization", `Bearer ${student.token}`)
        .send({
          tutorId: tutor.user.id,
          subject: "Mathematics",
          level: "O-Level (Cambridge / Edexcel)",
          description: "Need direct help",
          teachingMode: "online",
          schedule: "Mon 18:00",
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("DIRECT_BOOKING_DISABLED");
    } finally {
      process.env.ENABLE_DIRECT_BOOKING = origFlag;
    }
  });
});
