import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import Booking from "../models/Booking.model";
import TutorPayout from "../models/TutorPayout.model";
import AuditLog from "../models/AuditLog.model";

beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; });

const BASE = "/api/v1/admin/tutor-payouts";

async function signIn(adminRole: "finance" | "support" | "super_admin") {
  const email = `${adminRole}-${Date.now()}-${Math.random()}@test.com`;
  const user = await User.create({ name: `${adminRole} admin`, email, password: "password123", role: "admin", adminRole });
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({ email, password: "password123" }).expect(200);
  return { agent, id: user.id as string };
}

async function mkUser(role: "student" | "tutor", tag: string) {
  return User.create({ name: `${tag} ${role}`, email: `${tag}-${Date.now()}-${Math.random()}@test.com`, password: "password123", role });
}

async function mkBooking(student: { _id: unknown }, tutor: { _id: unknown }, extra: Record<string, unknown> = {}) {
  return Booking.create({
    student: student._id, tutor: tutor._id, amount: 3000, finalAgreedRate: 3000, pricingUnit: "session", sessionCount: 1,
    subtotal: 3000, studentFee: 0, tutorFee: 600, tax: 90, studentTotal: 3000, tutorNet: 2310, feeConfig: { version: "test" },
    platformFee: 690, tutorPayout: 3000, schedule: "Evening", teachingMode: "online", status: "completed",
    paymentStatus: "confirmed", payoutStatus: "pending", currency: "PKR", payoutRequestedAt: new Date(), ...extra,
  });
}

describe("admin tutor-payout workflow (two finance reviewers)", () => {
  it("requires authentication and the payout.read permission", async () => {
    await request(app).get(BASE).expect(401);
    await (await signIn("support")).agent.get(BASE).expect(403);
    await (await signIn("support")).agent.post(`${BASE}/PYOUT-X/initiate`).send({ settlementReference: "BANK-TXN-0001" }).expect(403);
  });

  it("lists payouts and reads the queue summary, rejecting a malformed tutorId", async () => {
    const { agent } = await signIn("finance");
    const list = await agent.get(BASE).expect(200);
    expect(list.body).toMatchObject({ success: true, total: 0, items: [] });
    expect((await agent.get(`${BASE}/queue`).expect(200)).body.result).toMatchObject({ scanned: 0, failed: 0 });
    await agent.get(`${BASE}?tutorId=not-an-id`).expect(400);
  });

  it("scan is a dry run unless apply=true, and only requests eligible bookings", async () => {
    const { agent } = await signIn("finance");
    const student = await mkUser("student", "s1");
    const tutor = await mkUser("tutor", "t1");
    const eligible = await mkBooking(student, tutor);
    const notRequested = await mkBooking(student, tutor, { payoutRequestedAt: undefined });
    const notCompleted = await mkBooking(student, tutor, { status: "upcoming" });

    const dry = await agent.post(`${BASE}/scan`).expect(200);
    expect(dry.body.dryRun).toBe(true);
    expect(await TutorPayout.countDocuments()).toBe(0);

    const applied = await agent.post(`${BASE}/scan?apply=true`).expect(200);
    expect(applied.body.result).toMatchObject({ requested: 1, failed: 0 });
    const payout = await TutorPayout.findOne().lean();
    expect(payout?.state).toBe("requested");
    expect(payout?.bookings.map(String)).toEqual([eligible.id]);
    expect((await Booking.findById(eligible._id))?.payoutStatus).toBe("processing");
    expect((await Booking.findById(notRequested._id))?.payoutStatus).toBe("pending");
    expect((await Booking.findById(notCompleted._id))?.payoutStatus).toBe("pending");
  });

  it("cannot be settled by one admin: initiate, then a different admin completes with the same reference", async () => {
    const a = await signIn("finance");
    const b = await signIn("finance");
    const student = await mkUser("student", "s2");
    const tutor = await mkUser("tutor", "t2");
    const booking = await mkBooking(student, tutor);
    await a.agent.post(`${BASE}/scan?apply=true`).expect(200);
    const { transferRef } = (await TutorPayout.findOne().lean())!;
    const REF = "BANK-TXN-12345";
    const evidence = { settlementReference: REF, evidenceRef: "STATEMENT-LINE-88" };

    // Cannot complete before the transfer is recorded.
    expect((await b.agent.post(`${BASE}/${transferRef}/complete`).send(evidence).expect(409)).body.code).toBe("PAYOUT_NOT_INITIATED");

    // Initiation needs a real reference.
    expect((await a.agent.post(`${BASE}/${transferRef}/initiate`).send({ settlementReference: "short" }).expect(400)).body.code).toBe("SETTLEMENT_REFERENCE_REQUIRED");
    await a.agent.post(`${BASE}/${transferRef}/initiate`).send({ settlementReference: REF }).expect(200);
    expect((await TutorPayout.findOne({ transferRef }))?.state).toBe("initiated");
    // The same transfer cannot be recorded twice.
    expect((await a.agent.post(`${BASE}/${transferRef}/initiate`).send({ settlementReference: REF }).expect(409)).body.code).toBe("PAYOUT_NOT_REQUESTED");

    // The initiator cannot also complete it.
    expect((await a.agent.post(`${BASE}/${transferRef}/complete`).send(evidence).expect(403)).body.code).toBe("SECOND_REVIEWER_REQUIRED");
    expect((await Booking.findById(booking._id))?.payoutStatus).toBe("processing");

    // The second reviewer must repeat the recorded reference and give real evidence.
    expect((await b.agent.post(`${BASE}/${transferRef}/complete`).send({ ...evidence, settlementReference: "BANK-TXN-99999" }).expect(409)).body.code).toBe("PAYOUT_REFERENCE_MISMATCH");
    expect((await b.agent.post(`${BASE}/${transferRef}/complete`).send({ ...evidence, evidenceRef: "short" }).expect(400)).body.code).toBe("PAYOUT_EVIDENCE_REQUIRED");

    await b.agent.post(`${BASE}/${transferRef}/complete`).send(evidence).expect(200);
    const paid = await Booking.findById(booking._id);
    expect(paid).toMatchObject({ payoutStatus: "paid", payoutSettlementReference: REF });
    expect(String(paid?.payoutInitiatedBy)).toBe(a.id);
    expect(String(paid?.payoutVerifiedBy)).toBe(b.id);
    expect((await TutorPayout.findOne({ transferRef }))?.state).toBe("completed");

    // Completing twice is refused, and each step was audited.
    expect((await b.agent.post(`${BASE}/${transferRef}/complete`).send(evidence).expect(409)).body.code).toBe("PAYOUT_ALREADY_COMPLETED");
    for (const action of ["payout_requests_created", "payout_transfer_recorded", "payout_completed"]) {
      expect(await AuditLog.countDocuments({ action })).toBe(1);
    }
  });

  it("keeps booking-level payout endpoints away from bookings that belong to a batch", async () => {
    const a = await signIn("finance");
    const b = await signIn("finance");
    const student = await mkUser("student", "s4");
    const tutor = await mkUser("tutor", "t4");
    const booking = await mkBooking(student, tutor);
    await a.agent.post(`${BASE}/scan?apply=true`).expect(200);

    const edit = await b.agent.patch(`/api/v1/admin/bookings/${booking.id}/payment`).send({ payoutStatus: "held", payoutNote: "Holding for review" }).expect(409);
    expect(edit.body.code).toBe("PAYOUT_MANAGED_BY_BATCH");
    const verify = await b.agent.post(`/api/v1/admin/bookings/${booking.id}/payout/verify`)
      .send({ settlementReference: "BANK-TXN-12345", verificationEvidence: "STATEMENT-LINE-88", note: "independently checked statement" }).expect(409);
    expect(verify.body.code).toBe("PAYOUT_MANAGED_BY_BATCH");
    expect((await Booking.findById(booking._id))?.payoutStatus).toBe("processing");
  });

  it("refuses to pay a batch whose booking changed state, and rolls the whole completion back", async () => {
    const a = await signIn("finance");
    const b = await signIn("finance");
    const student = await mkUser("student", "s5");
    const tutor = await mkUser("tutor", "t5");
    const booking = await mkBooking(student, tutor);
    await a.agent.post(`${BASE}/scan?apply=true`).expect(200);
    const { transferRef } = (await TutorPayout.findOne().lean())!;
    await a.agent.post(`${BASE}/${transferRef}/initiate`).send({ settlementReference: "BANK-TXN-55555" }).expect(200);

    await Booking.updateOne({ _id: booking._id }, { $set: { payoutStatus: "held" } });
    const res = await b.agent.post(`${BASE}/${transferRef}/complete`).send({ settlementReference: "BANK-TXN-55555", evidenceRef: "STATEMENT-LINE-55" }).expect(409);
    expect(res.body.code).toBe("PAYOUT_BOOKINGS_CHANGED");
    expect((await TutorPayout.findOne({ transferRef }))?.state).toBe("initiated");
    expect((await Booking.findById(booking._id))?.payoutStatus).toBe("held");
  });

  it("failing a payout needs a note and returns its bookings to pending", async () => {
    const { agent } = await signIn("finance");
    const student = await mkUser("student", "s3");
    const tutor = await mkUser("tutor", "t3");
    const booking = await mkBooking(student, tutor);
    await agent.post(`${BASE}/scan?apply=true`).expect(200);
    const { transferRef } = (await TutorPayout.findOne().lean())!;

    expect((await agent.post(`${BASE}/${transferRef}/fail`).send({ adminNote: "  " }).expect(400)).body.code).toBe("ADMIN_NOTE_REQUIRED");
    await agent.post(`${BASE}/${transferRef}/fail`).send({ adminNote: "Bank rejected the transfer" }).expect(200);
    expect((await TutorPayout.findOne({ transferRef }))?.state).toBe("failed");
    expect((await Booking.findById(booking._id))?.payoutStatus).toBe("pending");
    await agent.post(`${BASE}/PYOUT-DOES-NOT-EXIST/fail`).send({ adminNote: "x" }).expect(404);
  });
});
