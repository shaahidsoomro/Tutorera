import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import TutorProfile from "../models/TutorProfile.model";
import ParentProfile from "../models/ParentProfile.model";
import ParentBookingApproval from "../models/ParentBookingApproval.model";
import RequestModel from "../models/Request.model";
import Bid from "../models/Bid.model";
import Booking from "../models/Booking.model";
import { assertParentBookingPolicy } from "../services/parentBookingPolicy.service";
import { finalizeBidAcceptance } from "../controllers/request.controller";

jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));
beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; });
let n = 0;
const uniqueEmail = (prefix: string) => `parent-policy-${prefix}-${Date.now()}-${++n}@test.example`;

async function actor(role: "parent" | "student" | "tutor") {
  const email = uniqueEmail(role);
  const user = await User.create({ name: `Policy ${role}`, email, password: "password123", role, countryCode: "PK", currency: "PKR", phone: "03001234567" });
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({ email, password: "password123" }).expect(200);
  return { user, agent };
}

async function fixture() {
  const student = await actor("student");
  const parent = await actor("parent");
  const tutor = await actor("tutor");
  await TutorProfile.create({ user: tutor.user._id, subjectEligibility: [{ subject: "Mathematics", levels: ["Matric"], status: "approved" }] });
  const guardian = await ParentProfile.create({ user: parent.user._id, approvalRequiredForBookings: true,
    spendingLimitMonthly: 4000, spendingLimitCurrency: "PKR", children: [{ studentUser: student.user._id, name: "Linked student", relationship: "child" }] });
  const req = await RequestModel.create({ student: student.user._id,
    subject: "Mathematics", level: "Matric", description: "Tutor math preparation", budget: 1000,
    currency: "PKR", countryCode: "PK", pricingUnit: "hour", teachingMode: "online",
    schedule: "Flexible after school", status: "open" });
  const bid = await Bid.create({ request: req._id, tutor: tutor.user._id, amount: 1000, initialStudentRate: 1000,
    currency: "PKR", status: "submitted", message: "I can tutor", pricingUnit: "hour",
    expiresAt: new Date(Date.now() + 3600_000) });
  return { student, parent, tutor, guardian, req, bid };
}
const policy = (f: Awaited<ReturnType<typeof fixture>>, amount = 1000, queueApprovals = false) =>
  assertParentBookingPolicy({ student: f.student.user._id, request: f.req._id, bid: f.bid._id,
    amount, currency: "PKR", queueApprovals });

describe("Fix 4: enforce linked guardian spending and booking decisions", () => {
  it("queues a price-specific approval before the student can accept an offer", async () => {
    const f = await fixture();
    const blocked = await f.student.agent.post(`/api/v1/offers/${f.bid._id}/accept`).expect(409);
    expect(blocked.body.code).toBe("PARENT_APPROVAL_REQUIRED");
    expect((await RequestModel.findById(f.req._id))?.status).toBe("open");
    expect((await Bid.findById(f.bid._id))?.status).toBe("submitted");
    const approval = await ParentBookingApproval.findOne({ parent: f.parent.user._id, bid: f.bid._id });
    expect(approval).toMatchObject({ status: "pending", amount: 1000, currency: "PKR" });
    const list = await f.parent.agent.get("/api/v1/parent/booking-approvals").expect(200);
    expect(list.body.approvals).toHaveLength(1);
    const outside = await actor("parent");
    await outside.agent.post(`/api/v1/parent/booking-approvals/${approval!._id}/decision`)
      .send({ decision: "approved" }).expect(409);
    await f.parent.agent.post(`/api/v1/parent/booking-approvals/${approval!._id}/decision`)
      .send({ decision: "approved" }).expect(200);
    await expect(policy(f)).resolves.toBeUndefined();
    await f.parent.agent.post(`/api/v1/parent/booking-approvals/${approval!._id}/decision`)
      .send({ decision: "rejected" }).expect(409);
  });

  it("enforces a spending cap across all children and confirmed payments", async () => {
    const f = await fixture();
    await ParentProfile.updateOne({ _id: f.guardian._id }, { $set: { approvalRequiredForBookings: false, spendingLimitMonthly: 1600 } });
    const sibling = await actor("student");
    await ParentProfile.updateOne({ _id: f.guardian._id }, { $push: { children: { studentUser: sibling.user._id, name: "Second child", relationship: "child" } } });
    await Booking.create({ student: sibling.user._id, tutor: f.tutor.user._id,
      amount: 800, finalAgreedRate: 800, currency: "PKR", subtotal: 800, studentTotal: 800,
      tutorNet: 640, feeConfig: { version: "test" }, schedule: "Flexible",
      paymentStatus: "confirmed", paymentConfirmedAt: new Date() });
    await expect(policy(f, 900)).rejects.toMatchObject({ code: "PARENT_SPENDING_LIMIT_EXCEEDED" });
    await expect(policy(f, 800)).resolves.toBeUndefined();
  });

  it("counts existing unpaid checkout holds toward the household cap", async () => {
    const f = await fixture();
    await ParentProfile.updateOne({ _id: f.guardian._id }, { $set: { approvalRequiredForBookings: false, spendingLimitMonthly: 1300 } });
    const req2 = await RequestModel.create({ student: f.student.user._id, subject: "English", level: "Matric",
      description: "English tuition request", budget: 600, currency: "PKR", countryCode: "PK",
      pricingUnit: "hour", teachingMode: "online", schedule: "Flexible", status: "awaiting_payment" });
    await Bid.create({ request: req2._id, tutor: f.tutor.user._id, amount: 600, initialStudentRate: 600, currency: "PKR",
      status: "payment_pending", pricingUnit: "hour", message: "Pending sibling tutoring payment",
      expiresAt: new Date(Date.now() + 7200_000), feeQuote: {
        subtotal: 600, studentFee: 0, tutorFee: 120, tax: 18,
        studentTotal: 600, tutorNet: 462, feeConfig: { version: "test" },
      }, paymentPendingExpiresAt: new Date(Date.now() + 3600_000) });
    await expect(policy(f, 800)).rejects.toMatchObject({ code: "PARENT_SPENDING_LIMIT_EXCEEDED" });
  });

  it("counts unresolved gateway attempts after their original hold expiry", async () => {
    const f = await fixture();
    await ParentProfile.updateOne({ _id: f.guardian._id }, { $set: { approvalRequiredForBookings: false, spendingLimitMonthly: 1300 } });
    const other = await RequestModel.create({ student: f.student.user._id, subject: "English", level: "Matric", description: "English tuition request", budget: 600, currency: "PKR", countryCode: "PK", pricingUnit: "hour", teachingMode: "online", schedule: "Flexible", status: "awaiting_payment" });
    await Bid.create({ request: other._id, tutor: f.tutor.user._id, amount: 600, initialStudentRate: 600, currency: "PKR", status: "payment_pending", pricingUnit: "hour", message: "Awaiting provider reconciliation", expiresAt: new Date(Date.now() + 7200_000), paymentPendingExpiresAt: new Date(Date.now() - 1000), paymentOutcomeUnknown: true });
    await expect(policy(f, 800)).rejects.toMatchObject({ code: "PARENT_SPENDING_LIMIT_EXCEEDED" });
  });

  it("requires each linked guardian when more than one adult enables approval", async () => {
    const f = await fixture();
    const parent2 = await actor("parent");
    await ParentProfile.create({ user: parent2.user._id, approvalRequiredForBookings: true, children: [
      { studentUser: f.student.user._id, name: "Shared linked student", relationship: "child" },
    ] });
    await expect(policy(f, 1000, true)).rejects.toMatchObject({ code: "PARENT_APPROVAL_REQUIRED" });
    expect(await ParentBookingApproval.countDocuments({ bid: f.bid._id })).toBe(2);
    await ParentBookingApproval.updateOne({ parent: f.parent.user._id, bid: f.bid._id }, { $set: { status: "approved" } });
    await expect(policy(f)).rejects.toMatchObject({ code: "PARENT_APPROVAL_REQUIRED" });
    await ParentBookingApproval.updateOne({ parent: parent2.user._id, bid: f.bid._id }, { $set: { status: "approved" } });
    await expect(policy(f)).resolves.toBeUndefined();
  });

  it("rejects guardian denial, changed offer price and revoked parental links", async () => {
    const f = await fixture();
    await expect(policy(f, 1000, true)).rejects.toMatchObject({ code: "PARENT_APPROVAL_REQUIRED" });
    await ParentBookingApproval.updateOne({ parent: f.parent.user._id, bid: f.bid._id }, { $set: { status: "rejected" } });
    await expect(policy(f)).rejects.toMatchObject({ code: "PARENT_APPROVAL_REJECTED" });
    await expect(policy(f, 1100)).rejects.toMatchObject({ code: "PARENT_APPROVAL_QUOTE_CHANGED" });
    await ParentProfile.updateOne({ _id: f.guardian._id }, { $set: { children: [] } });
    await expect(policy(f)).resolves.toBeUndefined();
  });

  it("enforces currency-specific limits without unapproved FX conversions", async () => {
    const f = await fixture();
    await ParentProfile.updateOne({ _id: f.guardian._id }, { $set: { spendingLimitCurrency: "AED" } });
    await expect(policy(f)).rejects.toMatchObject({ code: "PARENT_LIMIT_CURRENCY_MISMATCH" });
  });

  it("rejects invalid negative or non-numeric limits", async () => {
    const f = await fixture();
    await f.parent.agent.patch("/api/v1/parent/settings").send({ spendingLimitMonthly: -100 }).expect(400);
    await f.parent.agent.patch("/api/v1/parent/settings").send({ spendingLimitMonthly: "unlimited" }).expect(400);
    const valid = await f.parent.agent.patch("/api/v1/parent/settings")
      .send({ approvalRequiredForBookings: true, spendingLimitMonthly: 2500, spendingLimitCurrency: "PKR" }).expect(200);
    expect(valid.body.profile.spendingLimitMonthly).toBe(2500);
  });

  it("does not finalize a gateway-paid offer when the linked parent has not approved it", async () => {
    const f = await fixture();
    await RequestModel.updateOne({ _id: f.req._id }, { $set: { status: "awaiting_payment", acceptedOffer: f.bid._id } });
    await Bid.updateOne({ _id: f.bid._id }, { $set: { status: "payment_pending", feeQuote: {
      subtotal: 1000, studentFee: 0, tutorFee: 200, tax: 30,
      studentTotal: 1000, tutorNet: 770, feeConfig: { version: "test" },
    }, paymentPendingExpiresAt: new Date(Date.now() + 1800_000) } });
    await expect(finalizeBidAcceptance(f.bid._id.toString(), undefined))
      .rejects.toMatchObject({ code: "PARENT_APPROVAL_REQUIRED" });
    expect(await Booking.countDocuments({ bid: f.bid._id })).toBe(0);
    expect((await Bid.findById(f.bid._id))?.status).toBe("payment_pending");
    await expect(policy(f, 1000, true)).rejects.toMatchObject({ code: "PARENT_APPROVAL_REQUIRED" });
    await ParentBookingApproval.updateOne({ parent: f.parent.user._id, bid: f.bid._id }, { $set: { status: "approved" } });
    await finalizeBidAcceptance(f.bid._id.toString(), undefined);
    expect((await Booking.findOne({ bid: f.bid._id }))?.paymentStatus).toBe("confirmed");
  });
});
