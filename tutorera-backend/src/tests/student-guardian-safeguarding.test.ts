import request from "supertest";
import jwt from "jsonwebtoken";
import { isRealtimeStudentAllowed } from "../services/chatAccess.service";
import app from "../app";
import User from "../models/User.model";
import GuardianConsent from "../models/GuardianConsent.model";
import ParentProfile from "../models/ParentProfile.model";
import AgeReviewRequest from "../models/AgeReviewRequest.model";
import sendEmail from "../utils/sendEmail";
import { ensureLaunchMarkets } from "../services/market.service";
import { ageOnDate, verifyGuardianConsent } from "../services/guardianConsent.service";
import { googleIdToken, installGoogleJwksMock } from "./helpers/googleIdToken";

// Guardian-consent behavior is tested here, not the IP-based HTTP throttle.
// Other integration suites exercise rate limiting itself. Without isolation,
// repeated invalid OTP checks share one in-memory counter across test cases
// and return 429 before consent-validation assertions can run.
jest.mock("../middlewares/rateLimiters", () => ({
  ...jest.requireActual("../middlewares/rateLimiters"),
  otpVerifyLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));

beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; installGoogleJwksMock(); });
beforeEach(async () => { await ensureLaunchMarkets(); jest.clearAllMocks(); });
let i = 0;
const email = (kind: string) => `safeguard-${kind}-${Date.now()}-${++i}@example.test`;
const underage = { dateOfBirth: "2010-03-20", guardianName: "Adult Guardian" };

function getCode(guardian: string): string {
  const send = (sendEmail as jest.Mock).mock.calls.map(x => x[0]);
  const message = send.find((x: any) => x.to === guardian && x.subject.includes("Guardian verification"));
  if (!message) throw new Error("Guardian verification email not sent");
  const code = String(message.html).match(/>(\d{8})</)?.[1];
  if (!code) throw new Error("Missing verification code from guardian email");
  return code;
}

async function signupMinor(method: "local" | "google" = "local") {
  const studentEmail = email("student"), guardianEmail = email("guardian");
  const signup = method === "google"
    ? await request(app).post("/api/v1/auth/google").send({
        idToken: googleIdToken(studentEmail), role: "student", countryCode: "PK",
        ...underage, guardianEmail,
      }).expect(201)
    : await request(app).post("/api/v1/auth/register").send({
        name: "Teen Student", email: studentEmail, password: "password123",
        role: "student", countryCode: "PK", ...underage, guardianEmail,
      }).expect(201);
  const studentAgent = request.agent(app);
  await studentAgent.post("/api/v1/auth/login").send({
    email: studentEmail, password: "password123",
  }).expect(method === "google" ? 400 : 200);
  return { studentEmail, guardianEmail, studentToken: signup.body.token as string, signup };
}

async function parentAgent(guardianEmail: string) {
  const parent = await User.create({
    name: "Adult Guardian", email: guardianEmail, password: "password123", role: "parent",
    countryCode: "PK", currency: "PKR",
  });
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({
    email: guardianEmail, password: "password123",
  }).expect(200);
  return { parent, agent };
}

describe("Phase 5 — student age declaration and verified guardian mailbox consent", () => {
  it("requires a real student date of birth; rejects under-13 independent registration", async () => {
    const missing = email("missing");
    await request(app).post("/api/v1/auth/register").send({
      name: "Unknown age", email: missing, password: "password123", role: "student",
    }).expect(400);
    expect(await User.findOne({ email: missing })).toBeNull();

    const tooYoung = email("young");
    const response = await request(app).post("/api/v1/auth/register").send({
      name: "Young Child", email: tooYoung, password: "password123",
      role: "student", dateOfBirth: "2017-07-18",
    }).expect(400);
    expect(response.body.message).toMatch(/under 13/i);
    expect(await User.findOne({ email: tooYoung })).toBeNull();

    expect(ageOnDate("2025-02-30")).toBe(-1);
    expect(ageOnDate("2010-03-20", new Date("2026-03-19"))).toBe(15);
    expect(ageOnDate("2010-03-20", new Date("2026-03-20"))).toBe(16);
  });

  it("rejects self-designated guardian email or missing guardian contact details", async () => {
    const student = email("self");
    const bad = await request(app).post("/api/v1/auth/register").send({
      name: "Teen Student", email: student, password: "password123",
      role: "student", dateOfBirth: underage.dateOfBirth,
      guardianEmail: student, guardianName: "Same account",
    }).expect(400);
    expect(bad.body.message).toMatch(/separate valid email/i);
    expect(await User.findOne({ email: student })).toBeNull();
  });

  it("keeps a minor's valid JWT restricted until guardian approval; parent must verify the emailed OTP", async () => {
    const { studentEmail, guardianEmail, studentToken, signup } = await signupMinor();
    expect(signup.body.user.isMinor).toBe(true);
    expect(signup.body.user.parentConsentVerified).toBe(false);
    const student = await User.findOne({ email: studentEmail });
    expect(student?.dateOfBirth?.toISOString().slice(0, 10)).toBe(underage.dateOfBirth);
    expect(student?.isMinor).toBe(true);
    const verifyEmail = await GuardianConsent.findOne({ student: student!._id });
    expect(verifyEmail?.status).toBe("pending");
    expect(verifyEmail?.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const bearer = { Authorization: `Bearer ${studentToken}` };
    await request(app).get("/api/v1/auth/me").set(bearer).expect(200);
    const blocked = await request(app).get("/api/v1/students/profile/me").set(bearer).expect(403);
    expect(blocked.body.code).toBe("GUARDIAN_CONSENT_REQUIRED");
    await request(app).get("/api/v1/payments/history").set(bearer).expect(403);
    await request(app).post("/api/v1/requests/draft").set(bearer).send({}).expect(403);

    const stranger = await parentAgent(email("stranger"));
    const code = getCode(guardianEmail);
    const strangerTry = await stranger.agent.post("/api/v1/auth/guardian-consent/verify").send({
      studentId: student!._id.toString(), code, adultAttestation: true,
      guardianDateOfBirth: "1980-06-01",
    }).expect(409);
    expect(strangerTry.body.code).toBe("CONSENT_EXPIRED");

    const { parent, agent } = await parentAgent(guardianEmail);
    const inbox = await agent.get("/api/v1/auth/guardian-consent/pending").expect(200);
    expect(inbox.body.requests).toHaveLength(1);
    expect(inbox.body.requests[0].studentId).toBe(student!._id.toString());

    await agent.post("/api/v1/auth/guardian-consent/verify").send({
      studentId: student!._id.toString(), code: "12345678", adultAttestation: true,
      guardianDateOfBirth: "1980-06-01",
    }).expect(400);
    await agent.post("/api/v1/auth/guardian-consent/verify").send({
      studentId: student!._id.toString(), code, adultAttestation: false,
      guardianDateOfBirth: "1980-06-01",
    }).expect(422);
    await agent.post("/api/v1/auth/guardian-consent/verify").send({
      studentId: student!._id.toString(), code, adultAttestation: true,
      guardianDateOfBirth: "2014-06-01",
    }).expect(422);
    const result = await agent.post("/api/v1/auth/guardian-consent/verify").send({
      studentId: student!._id.toString(), code, adultAttestation: true,
      guardianDateOfBirth: "1980-06-01",
    }).expect(200);
    expect(result.body.success).toBe(true);
    const linked = await ParentProfile.findOne({ user: parent._id });
    expect(linked?.approvalRequiredForBookings).toBe(true);
    expect(linked?.children.some(c => c.studentUser.toString() === student!._id.toString())).toBe(true);
    const studentApproved = await User.findById(student!._id);
    expect(studentApproved?.parentConsentVerified).toBe(true);
    expect(studentApproved?.guardianConsentVerifiedAt).toBeTruthy();

    const after = await request(app).get("/api/v1/students/profile/me").set(bearer);
    expect(after.status).not.toBe(403);
    // Profile completion must not let an already-verified teen change the
    // account birth date in order to evade age-based restrictions.
    const editedBirthDate = await request(app).post("/api/v1/students/onboarding")
      .set(bearer).send({ fullName: "Changed DOB", dateOfBirth: "1990-01-01" }).expect(409);
    expect(editedBirthDate.body.code).toBe("STUDENT_DOB_MISMATCH");
    const afterEdit = await User.findById(student!._id);
    expect(afterEdit?.dateOfBirth?.toISOString().slice(0, 10)).toBe(underage.dateOfBirth);
    // Supervised teens must not self-attach a different guardian by ID/email
    // or remove their own verified guardian, even after consent activation.
    const relink = await request(app).post("/api/v1/students/guardians")
      .set(bearer).send({ parentUserId: parent._id.toString() }).expect(403);
    expect(relink.body.code).toBe("MINOR_GUARDIAN_LINK_RESTRICTED");
    const unlink = await request(app).delete(`/api/v1/students/guardians/${linked!._id}`)
      .set(bearer).expect(403);
    expect(unlink.body.code).toBe("GUARDIAN_UNLINK_RESTRICTED");
    await agent.post("/api/v1/auth/guardian-consent/verify").send({
      studentId: student!._id.toString(), code, adultAttestation: true,
      guardianDateOfBirth: "1980-06-01",
    }).expect(409);
  });

  it("withdrawal of the last supervising guardian immediately blocks the same JWT", async () => {
    const { studentEmail, guardianEmail, studentToken } = await signupMinor();
    const student = await User.findOne({ email: studentEmail });
    const { parent, agent } = await parentAgent(guardianEmail);
    const code = getCode(guardianEmail);
    await agent.post("/api/v1/auth/guardian-consent/verify").send({
      studentId: student!._id.toString(), code, adultAttestation: true,
      guardianDateOfBirth: "1983-05-01",
    }).expect(200);
    const profile = await ParentProfile.findOne({ user: parent._id });
    const linkId = profile!.children.find(x => x.studentUser.toString() === student!._id.toString())!._id!.toString();
    await agent.delete(`/api/v1/parent/children/${linkId}`).expect(200);
    const response = await request(app).get("/api/v1/payments/history")
      .set("Authorization", `Bearer ${studentToken}`).expect(403);
    expect(response.body.code).toBe("GUARDIAN_CONSENT_REQUIRED");
    expect((await User.findById(student!._id))?.parentConsentVerified).toBe(false);
  });

  it("treats Google student signup exactly like local signup; pending Google role selection also enforces DOB", async () => {
    const { studentEmail, signup, studentToken } = await signupMinor("google");
    const student = await User.findOne({ email: studentEmail });
    expect(student?.isMinor).toBe(true);
    expect(signup.body.user.parentConsentVerified).toBe(false);
    await request(app).get("/api/v1/payments/history")
      .set("Authorization", `Bearer ${studentToken}`).expect(403);

    const pendingEmail = email("pending-role");
    const pending = await request(app).post("/api/v1/auth/google").send({
      idToken: googleIdToken(pendingEmail), countryCode: "PK",
    }).expect(201);
    await request(app).patch("/api/v1/auth/select-role")
      .set("Authorization", `Bearer ${pending.body.token}`)
      .send({ role: "student" }).expect(400);
    const guardian = email("role-guardian");
    const selected = await request(app).patch("/api/v1/auth/select-role")
      .set("Authorization", `Bearer ${pending.body.token}`)
      .send({ role: "student", ...underage, guardianEmail: guardian }).expect(200);
    expect(selected.body.user.isMinor).toBe(true);
    expect(selected.body.user.parentConsentVerified).toBe(false);
    expect(getCode(guardian)).toMatch(/^\d{8}$/);
  });

  it("does not allow a new Google student to omit age; blocks unselected role access", async () => {
    const newEmail = email("google-undated");
    const noAge = await request(app).post("/api/v1/auth/google")
      .send({ idToken: googleIdToken(newEmail), role: "student", countryCode: "PK" }).expect(400);
    expect(noAge.body.code).toBe("STUDENT_AGE_DETAILS_REQUIRED");
    expect(await User.findOne({ email: newEmail })).toBeNull();

    const pendingEmail = email("pending-protected");
    const pending = await request(app).post("/api/v1/auth/google")
      .send({ idToken: googleIdToken(pendingEmail), countryCode: "PK" }).expect(201);
    const restricted = await request(app).get("/api/v1/payments/history")
      .set("Authorization", `Bearer ${pending.body.token}`).expect(403);
    expect(restricted.body.code).toBe("ROLE_SELECTION_REQUIRED");
    await request(app).patch("/api/v1/auth/select-role")
      .set("Authorization", `Bearer ${pending.body.token}`)
      .send({ role: "student", ...underage, guardianEmail: pendingEmail }).expect(400);
  });

  it("locks guardian consent after five wrong codes and requires a fresh guarded request", async () => {
    const { studentEmail, guardianEmail } = await signupMinor();
    const student = await User.findOne({ email: studentEmail });
    const { agent } = await parentAgent(guardianEmail);
    // The in-memory express-rate-limit store is shared by previous
    // supertest requests in this suite. Give this scenario its own
    // trusted-proxy address so it measures the *per-consent* five-code
    // ceiling rather than the unrelated per-IP throttle.
    const testAddress = "198.18.0.42";
    const correct = getCode(guardianEmail);
    const wrong = correct === "00000000" ? "00000001" : "00000000";
    for (let n = 0; n < 5; n++) {
      await agent.post("/api/v1/auth/guardian-consent/verify")
        .set("X-Forwarded-For", testAddress)
        .send({ studentId: student!._id.toString(), code: wrong,
          adultAttestation: true, guardianDateOfBirth: "1980-04-10" }).expect(400);
    }
    const result = await agent.post("/api/v1/auth/guardian-consent/verify")
      .set("X-Forwarded-For", testAddress)
      .send({ studentId: student!._id.toString(), code: correct,
        adultAttestation: true, guardianDateOfBirth: "1980-04-10" }).expect(409);
    expect(result.body.code).toBe("CONSENT_EXPIRED");
    expect((await User.findById(student!._id))?.parentConsentVerified).toBe(false);
  });

  it("consumes invalid verification-code attempts atomically during concurrent requests", async () => {
    const { studentEmail, guardianEmail } = await signupMinor();
    const student = await User.findOne({ email: studentEmail });
    const { parent } = await parentAgent(guardianEmail);
    const correct = getCode(guardianEmail);
    const wrong = correct === "00000000" ? "00000001" : "00000000";
    const input = { parentId: parent._id, studentId: student!._id.toString(),
      adultAttestation: true, guardianDateOfBirth: "1980-01-01" };
    const attempts = await Promise.allSettled(Array.from({ length: 5 }, () =>
      verifyGuardianConsent({ ...input, code: wrong })));
    expect(attempts).toHaveLength(5);
    expect(attempts.every(result => result.status === "rejected")).toBe(true);
    const current = await GuardianConsent.findOne({ student: student!._id });
    expect(current?.attempts).toBe(5);
    await expect(verifyGuardianConsent({ ...input, code: correct }))
      .rejects.toMatchObject({ code: "CONSENT_EXPIRED" });
    expect((await User.findById(student!._id))?.parentConsentVerified).toBe(false);
  });

  it("accepts the fifth and last valid guardian-code attempt after four failures", async () => {
    const { studentEmail, guardianEmail } = await signupMinor();
    const student = await User.findOne({ email: studentEmail });
    const { parent } = await parentAgent(guardianEmail);
    const correct = getCode(guardianEmail);
    const wrong = correct === "00000000" ? "00000001" : "00000000";
    const args = { parentId: parent._id, studentId: student!._id.toString(),
      adultAttestation: true, guardianDateOfBirth: "1980-01-01" };
    for (let attempt = 0; attempt < 4; attempt++) {
      await expect(verifyGuardianConsent({ ...args, code: wrong }))
        .rejects.toMatchObject({ code: "INVALID_CONSENT_CODE" });
    }
    await verifyGuardianConsent({ ...args, code: correct });
    expect((await GuardianConsent.findOne({ student: student!._id }))?.status).toBe("verified");
    expect((await User.findById(student!._id))?.parentConsentVerified).toBe(true);
  });

  it("allows a declared adult student to complete local registration without a guardian", async () => {
    const adultEmail = email("adult");
    const result = await request(app).post("/api/v1/auth/register").send({
      name: "Adult Student", email: adultEmail, password: "password123",
      role: "student", countryCode: "PK", dateOfBirth: "1996-05-10",
    }).expect(201);
    expect(result.body.user.isMinor).toBe(false);
    expect(await GuardianConsent.countDocuments()).toBe(0);
    const response = await request(app).get("/api/v1/students/profile/me")
      .set("Authorization", `Bearer ${result.body.token}`);
    expect(response.status).not.toBe(403);
  });
});


describe("Phase 6 — legacy unknown-age access controls", () => {
  const previous = process.env.LEGACY_STUDENT_AGE_ENFORCEMENT;
  afterEach(() => {
    if (previous === undefined) delete process.env.LEGACY_STUDENT_AGE_ENFORCEMENT;
    else process.env.LEGACY_STUDENT_AGE_ENFORCEMENT = previous;
  });

  it("blocks legacy student protected routes with age review enabled while retaining account access", async () => {
    const student = await User.create({ name: "Legacy Student", email: email("legacy"),
      password: "password123", role: "student", countryCode: "PK" });
    const token = jwt.sign({ id: student._id.toString(), role: "student" }, process.env.JWT_SECRET!);
    const headers = { Authorization: `Bearer ${token}` };
    process.env.LEGACY_STUDENT_AGE_ENFORCEMENT = "true";
    const denial = await request(app).get("/api/v1/payments/history").set(headers).expect(403);
    expect(denial.body.code).toBe("STUDENT_AGE_REVIEW_REQUIRED");
    await request(app).get("/api/v1/auth/me").set(headers).expect(200);
    const review = await request(app).get("/api/v1/auth/me/age-review").set(headers).expect(200);
    expect(review.body.status).toBe("age_review_required");
    expect(review.body.supportRequired).toBe(true);
    expect(review.body.enforcementEnabled).toBe(true);
    expect((await User.findById(student._id))?.dateOfBirth).toBeUndefined();
    process.env.LEGACY_STUDENT_AGE_ENFORCEMENT = "false";
    const oldBehavior = await request(app).get("/api/v1/payments/history").set(headers);
    expect(oldBehavior.body.code).not.toBe("STUDENT_AGE_REVIEW_REQUIRED");
  });
});


describe("Phase 6 — realtime historical age gate", () => {
  const previous = process.env.LEGACY_STUDENT_AGE_ENFORCEMENT;
  afterEach(() => {
    if (previous === undefined) delete process.env.LEGACY_STUDENT_AGE_ENFORCEMENT;
    else process.env.LEGACY_STUDENT_AGE_ENFORCEMENT = previous;
  });

  it("rejects unknown-age student realtime identity only when enforcement is enabled", () => {
    const legacy = { role: "student", isActive: true, isMinor: false, parentConsentVerified: false };
    process.env.LEGACY_STUDENT_AGE_ENFORCEMENT = "false";
    expect(isRealtimeStudentAllowed(legacy)).toBe(true);
    process.env.LEGACY_STUDENT_AGE_ENFORCEMENT = "true";
    expect(isRealtimeStudentAllowed(legacy)).toBe(false);
    expect(isRealtimeStudentAllowed({ ...legacy, dateOfBirth: new Date("1995-01-01") })).toBe(true);
    expect(isRealtimeStudentAllowed({ ...legacy, isMinor: true, parentConsentVerified: false,
      dateOfBirth: new Date("2011-01-01") })).toBe(false);
  });
});


describe("Phase 6 — age review intake concurrency", () => {
  const previous = process.env.LEGACY_STUDENT_AGE_ENFORCEMENT;
  afterEach(() => {
    if (previous === undefined) delete process.env.LEGACY_STUDENT_AGE_ENFORCEMENT;
    else process.env.LEGACY_STUDENT_AGE_ENFORCEMENT = previous;
  });

  it("creates exactly one pending review across simultaneous requests and allows self-service when restricted", async () => {
    const student = await User.create({ name: "Historical Student", email: email("age-review"),
      password: "password123", role: "student", countryCode: "PK" });
    const token = jwt.sign({ id: student._id.toString(), role: "student" }, process.env.JWT_SECRET!);
    const headers = { Authorization: `Bearer ${token}` };
    process.env.LEGACY_STUDENT_AGE_ENFORCEMENT = "true";
    // The MongoDB partial unique index must exist before racing requests.
    await AgeReviewRequest.init();

    const submissions = await Promise.all(Array.from({ length: 3 }, () =>
      request(app).post("/api/v1/auth/me/age-review/request").set(headers)
        .send({ reason: "missing_date_of_birth" })));
    expect(submissions.every(result => result.status === 200 || result.status === 201)).toBe(true);
    const ids = submissions.map(result => String(result.body.requestId));
    expect(new Set(ids).size).toBe(1);
    const latest = await request(app).get("/api/v1/auth/me/age-review/request").set(headers).expect(200);
    expect(latest.body.review.status).toBe("pending");
    expect(String(latest.body.review._id)).toBe(ids[0]);
    expect((await User.findById(student._id))?.dateOfBirth).toBeUndefined();
  });
});
