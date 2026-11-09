import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import Booking from "../models/Booking.model";
import RefundRequest from "../models/RefundRequest.model";
import FeeConfig from "../models/FeeConfig.model";
import { resolveMarketplaceFees } from "../services/pricing.service";
import { paymentProvider, recordPaymentLedger } from "../services/paymentProvider.service";

jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));

beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; });

describe("admin financial mutation integrity", () => {
  async function loginAs(adminRole: string, suffix: string) {
    const email = `${suffix}@test.com`;
    await User.create({ name: suffix, email, password: "password123", role: "admin", adminRole });
    const agent = request.agent(app);
    await agent.post("/api/v1/auth/login").send({ email, password: "password123" }).expect(200);
    return agent;
  }

  async function booking() {
    const [student, tutor] = await User.create([
      { name: "Finance Student", email: `student-${Date.now()}@test.com`, password: "password123", role: "student" },
      { name: "Finance Tutor", email: `tutor-${Date.now()}@test.com`, password: "password123", role: "tutor" },
    ]);
    return Booking.create({ student: student._id, tutor: tutor._id, amount: 1000, finalAgreedRate: 1000, pricingUnit: "hour", sessionCount: 1, subtotal: 1000, studentFee: 0, tutorFee: 200, tax: 30, studentTotal: 1000, tutorNet: 770, feeConfig: { version: "test" }, platformFee: 230, tutorPayout: 770, schedule: "Evening", teachingMode: "online", paymentStatus: "received", payoutStatus: "pending" });
  }

  it("does not let a read-only analyst mutate payment state", async () => {
    const analyst = await loginAs("analyst", `finance-analyst-${Date.now()}`);
    const record = await booking();
    await analyst.patch(`/api/v1/admin/bookings/${record._id}/payment`).send({ paymentStatus: "confirmed", paymentNote: "Bank receipt verified" }).expect(403);
  });

  it("preserves fee snapshots when finance confirms payment", async () => {
    const finance = await loginAs("finance", `finance-admin-${Date.now()}`);
    const record = await booking();
    await finance.patch(`/api/v1/admin/bookings/${record._id}/payment`).send({ paymentStatus: "confirmed", paymentNote: "Bank receipt verified" }).expect(200);
    const saved = await Booking.findById(record._id).lean();
    expect(saved?.platformFee).toBe(230);
    expect(saved?.tutorPayout).toBe(770);
    expect(saved?.feeConfig).toEqual({ version: "test" });
  });

  it("enforces finance RBAC for tax configuration mutations", async () => {
    const analyst = await loginAs("analyst", `tax-analyst-${Date.now()}`);
    await analyst.post("/api/v1/admin/tax-config").send({ countryCode: "PK", rate: 7, taxType: "GST", name: "Test" }).expect(403);
    await analyst.put("/api/v1/admin/tax-config/507f1f77bcf86cd799439011").send({ rate: 7 }).expect(403);
  });

  it("keeps an approved refund distinct from verified settlement", async () => {
    const reviewer = await loginAs("trust_and_safety", `claims-reviewer-${Date.now()}`);
    const record = await booking();
    record.paymentStatus = "confirmed";
    await record.save();
    const claim = await RefundRequest.create({ student: record.student, tutor: record.tutor, booking: record._id, amount: 1000, reason: "quality_issue", details: "Lesson was not as described", status: "pending" });
    await reviewer.patch(`/api/v1/admin/refund-requests/${claim._id}`).send({ status: "processed" }).expect(422);
    await reviewer.patch(`/api/v1/admin/refund-requests/${claim._id}`).send({ status: "approved", adminNote: "Verified the claim against the lesson record." }).expect(200);
    const [savedClaim, savedBooking] = await Promise.all([RefundRequest.findById(claim._id), Booking.findById(record._id)]);
    expect(savedClaim?.status).toBe("approved");
    expect(savedClaim?.processedAt).toBeUndefined();
    expect(savedBooking?.paymentStatus).toBe("confirmed");
    await reviewer.patch(`/api/v1/admin/refund-requests/${claim._id}`).send({ status: "approved", adminNote: "Second decision should be refused." }).expect(409);
  });

  it("uses admin-configured fee percentages rather than frozen global constants", async () => {
    await FeeConfig.create({ version: "2026-test", countryCode: "GLOBAL", currency: "PKR", studentFeePercent: 3, tutorFeePercent: 11, taxPercent: 5, minimumFee: 0, maximumFee: 5000, isActive: true });
    const quote = await resolveMarketplaceFees(1000, "PK");
    expect(quote).toMatchObject({ studentFee: 30, tutorFee: 110, tax: 6, studentTotal: 1030, tutorNet: 884 });
    expect(quote.feeConfig.version).toBe("2026-test");
  });

  it("does not trust a payment-success URL for a different student or a pending booking", async () => {
    const record = await booking();
    const student = await User.findById(record.student);
    const outsider = await User.create({ name: "Another Student", email: `other-${Date.now()}@test.com`, password: "password123", role: "student" });
    const studentAgent = request.agent(app);
    const outsiderAgent = request.agent(app);
    await studentAgent.post("/api/v1/auth/login").send({ email: student?.email, password: "password123" }).expect(200);
    await outsiderAgent.post("/api/v1/auth/login").send({ email: outsider.email, password: "password123" }).expect(200);
    const pending = await studentAgent.get(`/api/v1/payments/status/booking/${record._id}`).expect(200);
    expect(pending.body.verified).toBe(false);
    await outsiderAgent.get(`/api/v1/payments/status/booking/${record._id}`).expect(404);
    record.paymentStatus = "confirmed"; await record.save();
    const settled = await studentAgent.get(`/api/v1/payments/status/booking/${record._id}`).expect(200);
    expect(settled.body.verified).toBe(true);
  });

  it("rejects mismatched payment gateway amount before confirming a booking", async () => {
    const record = await booking();
    await recordPaymentLedger({ providerTransactionId: record._id.toString(), eventType: "checkout.created", status: "pending", amount: 1000, currency: "PKR", bookingId: record._id.toString() });
    const signature = jest.spyOn(paymentProvider, "verifyWebhookSignature").mockReturnValue(true);
    try {
      const result = await request(app).post("/api/v1/payments/webhook")
        .set("X-RapidGateway-Signature", "test")
        .send({ eventId: "wrong-amount-event", eventType: "transaction.completed", merchantTransactionId: record._id.toString(), status: "completed", amount: 900, currency: "PKR" }).expect(409);
      expect(result.body.code).toBe("PAYMENT_RECONCILIATION_FAILED");
      expect((await Booking.findById(record._id))?.paymentStatus).toBe("received");
    } finally { signature.mockRestore(); }
  });

  it("rejects skipped payout transitions and updates without reasons", async () => {
    const finance = await loginAs("finance", `finance-transition-${Date.now()}`);
    const record = await booking();
    record.paymentStatus = "confirmed";
    await record.save();
    await finance.patch(`/api/v1/admin/bookings/${record._id}/payment`).send({ payoutStatus: "paid", payoutNote: "External transfer completed" }).expect(409);
    await finance.patch(`/api/v1/admin/bookings/${record._id}/payment`).send({ payoutStatus: "approved" }).expect(400);
  });
});
