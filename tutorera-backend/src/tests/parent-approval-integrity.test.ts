import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import TutorProfile from "../models/TutorProfile.model";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import ParentProfile from "../models/ParentProfile.model";
import ParentBookingApproval from "../models/ParentBookingApproval.model";
import Booking from "../models/Booking.model";
import { assertParentBookingPolicy, ParentBookingPolicyError } from "../services/parentBookingPolicy.service";
import { resolveMarketplaceFees } from "../services/pricing.service";
import { Types } from "mongoose";

jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));
beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; });
let serial = 0;

async function makeFixture(options: { approval?: boolean; cap?: number; feeQuote?: boolean } = {}) {
  const suffix = `${Date.now()}-${++serial}`;
  const student = await User.create({
    name: "Consent Student", email: `consent-student-${suffix}@example.test`,
    password: "password123", role: "student", countryCode: "PK", currency: "PKR",
  });
  const parent = await User.create({
    name: "Consent Parent", email: `consent-parent-${suffix}@example.test`,
    password: "password123", role: "parent", countryCode: "PK", currency: "PKR",
  });
  const tutor = await User.create({
    name: "Consent Tutor", email: `consent-tutor-${suffix}@example.test`,
    password: "password123", role: "tutor",
  });
  await TutorProfile.create({ user: tutor._id, subjectEligibility: [{ subject: "Mathematics", levels: ["Matric"], status: "approved" }] });
  const profile = await ParentProfile.create({
    user: parent._id, approvalRequiredForBookings: options.approval ?? true,
    ...(options.cap !== undefined ? { spendingLimitMonthly: options.cap, spendingLimitCurrency: "PKR" } : {}),
    children: [{ studentUser: student._id, name: student.name, level: "Matric",
      subjects: ["Mathematics"], relationship: "child" }],
  });
  const tutoringRequest = await Request.create({
    student: student._id, subject: "Mathematics", level: "Matric",
    description: "A scheduled mathematics lesson", budget: 1000,
    pricingUnit: "hour", currency: "PKR", countryCode: "PK",
    schedule: "Weekday afternoon", teachingMode: "online", status: "open",
    allowCounterOffers: true,
  });
  const feeQuote = await resolveMarketplaceFees(1000, "PK");
  const bid = await Bid.create({
    request: tutoringRequest._id, tutor: tutor._id, amount: 1000,
    initialStudentRate: 1000, currency: "PKR", pricingUnit: "hour",
    message: "Consent test offer", status: "submitted",
    expiresAt: new Date(Date.now() + 2 * 86400_000),
    ...(options.feeQuote ? { feeQuote } : {}),
  });
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login")
    .send({ email: parent.email, password: "password123" }).expect(200);
  return { student, parent, tutor, profile, tutoringRequest, bid, agent, feeQuote };
}

async function queueApproval(fixture: Awaited<ReturnType<typeof makeFixture>>) {
  await expect(assertParentBookingPolicy({
    student: fixture.student._id, request: fixture.tutoringRequest._id,
    bid: fixture.bid._id, amount: fixture.feeQuote.studentTotal,
    currency: "PKR", queueApprovals: true,
  })).rejects.toMatchObject({ code: "PARENT_APPROVAL_REQUIRED" });
  const approval = await ParentBookingApproval.findOne({
    parent: fixture.parent._id, bid: fixture.bid._id,
  });
  expect(approval).not.toBeNull();
  return approval!;
}

function decision(agent: Awaited<ReturnType<typeof makeFixture>>["agent"], id: string, status: string = "approved") {
  return agent.post(`/api/v1/parent/booking-approvals/${id}/decision`).send({ decision: status });
}

describe("Phase 4 Fix 4 — exact guardian consent and spending safeguards", () => {
  it("fails closed when the booking account no longer exists", async () => {
    await expect(assertParentBookingPolicy({ student: new Types.ObjectId(), bid: new Types.ObjectId(), request: new Types.ObjectId(), amount: 100, currency: "PKR" }))
      .rejects.toMatchObject({ code: "STUDENT_ACCOUNT_UNAVAILABLE" });
  });
  it("accepts the unchanged payable total even when the checkout fee quote is not yet stored on the bid", async () => {
    const fixture = await makeFixture();
    const approval = await queueApproval(fixture);
    expect((await Bid.findById(fixture.bid._id))?.feeQuote).toBeUndefined();
    const response = await decision(fixture.agent, approval._id.toString()).expect(200);
    expect(response.body.approval.status).toBe("approved");
    await expect(assertParentBookingPolicy({
      student: fixture.student._id, request: fixture.tutoringRequest._id,
      bid: fixture.bid._id, amount: fixture.feeQuote.studentTotal, currency: "PKR",
    })).resolves.toBeUndefined();
  });

  it("refuses guardian consent if the bid rate changed before approval", async () => {
    const fixture = await makeFixture();
    const approval = await queueApproval(fixture);
    await Bid.updateOne({ _id: fixture.bid._id }, { $set: { amount: 2000 } });
    const response = await decision(fixture.agent, approval._id.toString()).expect(409);
    expect(response.body.code).toBe("PARENT_APPROVAL_QUOTE_CHANGED");
    expect((await ParentBookingApproval.findById(approval._id))?.status).toBe("pending");
  });

  it("refuses consent when bid currency or request association differs", async () => {
    const fixture = await makeFixture();
    const approval = await queueApproval(fixture);
    await Bid.updateOne({ _id: fixture.bid._id }, { $set: { currency: "AED" } });
    expect((await decision(fixture.agent, approval._id.toString()).expect(409)).body.code)
      .toBe("PARENT_APPROVAL_QUOTE_CHANGED");
    await Bid.updateOne({ _id: fixture.bid._id }, { $set: {
      currency: "PKR", request: fixture.parent._id,
    } });
    expect((await decision(fixture.agent, approval._id.toString()).expect(409)).body.code)
      .toBe("PARENT_APPROVAL_QUOTE_CHANGED");
  });

  it("refuses a stale stored fee quote and permits a matching frozen fee quote", async () => {
    const fixture = await makeFixture({ feeQuote: true });
    const approval = await queueApproval(fixture);
    await Bid.updateOne({ _id: fixture.bid._id }, { $set: { "feeQuote.studentTotal": fixture.feeQuote.studentTotal + 100 } });
    expect((await decision(fixture.agent, approval._id.toString()).expect(409)).body.code)
      .toBe("PARENT_APPROVAL_QUOTE_CHANGED");
    await Bid.updateOne({ _id: fixture.bid._id }, { $set: { "feeQuote.studentTotal": fixture.feeQuote.studentTotal } });
    await decision(fixture.agent, approval._id.toString()).expect(200);
  });

  it("cannot approve an expired offer or an expired approval request", async () => {
    const fixture = await makeFixture();
    const approval = await queueApproval(fixture);
    await ParentBookingApproval.updateOne({ _id: approval._id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await decision(fixture.agent, approval._id.toString()).expect(409)).body.code)
      .toBe("APPROVAL_NOT_PENDING");
    await ParentBookingApproval.updateOne({ _id: approval._id },
      { $set: { expiresAt: new Date(Date.now() + 86400_000) } });
    await Bid.updateOne({ _id: fixture.bid._id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await decision(fixture.agent, approval._id.toString()).expect(409)).body.code)
      .toBe("OFFER_NO_LONGER_AVAILABLE");
  });

  it("cannot approve a bid after a guardian-student link is revoked", async () => {
    const fixture = await makeFixture();
    const approval = await queueApproval(fixture);
    await ParentProfile.updateOne({ _id: fixture.profile._id }, { $set: { children: [] } });
    expect((await decision(fixture.agent, approval._id.toString()).expect(403)).body.code)
      .toBe("PARENT_LINK_REVOKED");
  });

  it("prevents spending-cap violations from another sibling's confirmed payments", async () => {
    const fixture = await makeFixture({ approval: false, cap: 1200 });
    const sibling = await User.create({
      name: "Second Child", email: `sibling-${Date.now()}-${++serial}@example.test`,
      password: "password123", role: "student",
    });
    await ParentProfile.updateOne({ _id: fixture.profile._id }, { $push: {
      children: { studentUser: sibling._id, name: sibling.name, relationship: "child" },
    } });
    await Booking.create({
      student: sibling._id, tutor: fixture.tutor._id, amount: 750,
      finalAgreedRate: 750, subtotal: 750, studentTotal: 750, tutorNet: 600, feeConfig: { version: "test-guardian-cap" }, currency: "PKR",
      schedule: "Monday", teachingMode: "online", paymentStatus: "confirmed",
      paymentConfirmedAt: new Date(),
    });
    await expect(assertParentBookingPolicy({
      student: fixture.student._id, request: fixture.tutoringRequest._id,
      bid: fixture.bid._id, amount: fixture.feeQuote.studentTotal, currency: "PKR",
    })).rejects.toMatchObject({ code: "PARENT_SPENDING_LIMIT_EXCEEDED" });
  });
});
