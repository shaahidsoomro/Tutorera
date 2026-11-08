import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import Booking from "../models/Booking.model";
import PaymentLedger from "../models/PaymentLedger.model";
import RefundRequest from "../models/RefundRequest.model";
import ParentProfile from "../models/ParentProfile.model";
import AuditLog from "../models/AuditLog.model";
import { withDistributedJobLease } from "../services/jobLease.service";

jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));
beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; });

let n = 0;
async function createUser(role: "student" | "tutor" | "parent" | "admin", adminRole?: string) {
  const email = `settlement-${Date.now()}-${++n}@example.test`;
  const user = await User.create({ name: `Settlement ${role}`, email, password: "password123", role, ...(adminRole ? { adminRole } : {}) });
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({ email, password: "password123" }).expect(200);
  return { user, agent };
}
async function completedBooking(student: any, tutor: any, parent?: any) {
  return Booking.create({
    student: student._id, tutor: tutor._id, parent: parent?._id,
    amount: 1200, finalAgreedRate: 1200, subtotal: 1200, studentFee: 0,
    tutorFee: 240, tax: 36, studentTotal: 1200, tutorNet: 924,
    platformFee: 276, tutorPayout: 924, feeConfig: { version: "test" },
    currency: "PKR", schedule: "Monday afternoon", teachingMode: "online",
    status: "completed", paymentStatus: "confirmed", payoutStatus: "pending",
  });
}

describe("Phase 3 finance settlement and payer-accounting controls", () => {
  it("requires a refund decision reason and records the decision with its audit", async () => {
    const student = await createUser("student"); const tutor = await createUser("tutor"); const admin = await createUser("admin", "super_admin");
    const booking = await completedBooking(student.user, tutor.user);
    const refund = await RefundRequest.create({ student: student.user._id, tutor: tutor.user._id, booking: booking._id, amount: 1200, reason: "session_not_delivered", details: "Session cancelled", status: "pending" });
    const url = `/api/v1/admin/refund-requests/${refund._id}`;
    await admin.agent.patch(url).send({ status: "approved", adminNote: "short" }).expect(422);
    await admin.agent.patch(url).send({ status: "approved", adminNote: "Reviewed supporting evidence" }).expect(200);
    expect(await AuditLog.countDocuments({ action: "refund_decision_recorded", targetId: refund._id.toString() })).toBe(1);
    await admin.agent.patch(url).send({ status: "rejected", adminNote: "Reviewed supporting evidence" }).expect(409);
  });

  it("rolls back a refund decision if its audit write fails", async () => {
    const student = await createUser("student"); const tutor = await createUser("tutor"); const admin = await createUser("admin", "super_admin");
    const booking = await completedBooking(student.user, tutor.user);
    const refund = await RefundRequest.create({ student: student.user._id, tutor: tutor.user._id, booking: booking._id, amount: 1200, reason: "session_not_delivered", details: "Session cancelled", status: "pending" });
    const audit = jest.spyOn(AuditLog, "create").mockRejectedValueOnce(new Error("Audit unavailable") as never);
    try {
      await admin.agent.patch(`/api/v1/admin/refund-requests/${refund._id}`).send({ status: "approved", adminNote: "Reviewed supporting evidence" }).expect(500);
      expect((await RefundRequest.findById(refund._id))?.status).toBe("pending");
    } finally { audit.mockRestore(); }
  });
  it("shows parent only transactions actually paid by that parent, while student sees their own events", async () => {
    const parentA = await createUser("parent");
    const parentB = await createUser("parent");
    const student = await createUser("student");
    const tutor = await createUser("tutor");
    const booking = await completedBooking(student.user, tutor.user, parentA.user);
    await PaymentLedger.create([
      { booking: booking._id, student: student.user._id, payer: parentA.user._id, tutor: tutor.user._id,
        provider: "rapid_gateway", providerEventId: "parent-a-event", providerTransactionId: "parent-checkout", eventType: "payment.succeeded",
        status: "succeeded", grossAmount: 1200, currency: "PKR", studentPayment: 1200 },
      { booking: booking._id, student: student.user._id, payer: parentB.user._id, tutor: tutor.user._id,
        provider: "rapid_gateway", providerEventId: "parent-b-event", providerTransactionId: "different-parent-checkout", eventType: "payment.succeeded",
        status: "succeeded", grossAmount: 1200, currency: "PKR", studentPayment: 1200 },
    ]);
    const a = await parentA.agent.get("/api/v1/payments/history").expect(200);
    const b = await parentB.agent.get("/api/v1/payments/history").expect(200);
    const st = await student.agent.get("/api/v1/payments/history").expect(200);
    expect(a.body.pagination.total).toBe(1);
    expect(b.body.pagination.total).toBe(1);
    expect(st.body.pagination.total).toBe(2);
  });

  it("uses the consent-confirmed parent/child link for payment status instead of a missing booking.parent field", async () => {
    const student = await createUser("student");
    const tutor = await createUser("tutor");
    const guardian = await createUser("parent");
    const booking = await completedBooking(student.user, tutor.user);
    await guardian.agent.get(`/api/v1/payments/status/booking/${booking._id}`).expect(404);
    await ParentProfile.create({ user: guardian.user._id, children: [{ studentUser: student.user._id, name: student.user.name, level: "O-Level", subjects: ["Mathematics"], relationship: "child" }] });
    const linked = await guardian.agent.get(`/api/v1/payments/status/booking/${booking._id}`).expect(200);
    expect(linked.body.verified).toBe(true);
    await ParentProfile.updateOne({ user: guardian.user._id }, { $set: { children: [] } });
    await guardian.agent.get(`/api/v1/payments/status/booking/${booking._id}`).expect(404);
  });

  it("records a tutor payout request without falsely marking it processing or paid", async () => {
    const student = await createUser("student");
    const tutor = await createUser("tutor");
    const booking = await completedBooking(student.user, tutor.user);
    const result = await tutor.agent.post(`/api/v1/earnings/payouts/${booking._id}/request`).expect(200);
    expect(result.body.booking.payoutStatus).toBe("pending");
    expect(result.body.booking.payoutProcessingAt).toBeFalsy();
    expect(result.body.booking.payoutRequestedAt).toBeTruthy();
    await tutor.agent.post(`/api/v1/earnings/payouts/${booking._id}/request`).expect(409);
  });

  it("requires a second finance officer to reconcile an external payout; direct mark-paid is forbidden", async () => {
    const student = await createUser("student");
    const tutor = await createUser("tutor");
    const accountantA = await createUser("admin", "finance");
    const accountantB = await createUser("admin", "finance");
    const booking = await completedBooking(student.user, tutor.user);
    await accountantA.agent.patch(`/api/v1/admin/bookings/${booking._id}/payment`)
      .send({ payoutStatus: "paid", payoutNote: "Paid to tutor account externally" }).expect(409);
    await accountantA.agent.patch(`/api/v1/admin/bookings/${booking._id}/payment`)
      .send({ payoutStatus: "approved", payoutNote: "Finance approved tutor payout request" }).expect(200);
    await accountantA.agent.patch(`/api/v1/admin/bookings/${booking._id}/payment`)
      .send({ payoutStatus: "processing", payoutNote: "Bank transfer initiated and evidence filed",
        payoutSettlementMethod: "bank_transfer", payoutSettlementReference: "TRF-20261018-0001", payoutEvidenceReference: "receipt-bank-20261018-1" }).expect(200);
    await accountantA.agent.post(`/api/v1/admin/bookings/${booking._id}/payout/verify`)
      .send({ settlementReference: "TRF-20261018-0001", verificationEvidence: "verified-statement-001", note: "Second person independently checked statement" }).expect(403);
    const result = await accountantB.agent.post(`/api/v1/admin/bookings/${booking._id}/payout/verify`)
      .send({ settlementReference: "TRF-20261018-0001", verificationEvidence: "verified-statement-001", note: "Second person independently checked statement" }).expect(200);
    expect(result.body.booking.payoutStatus).toBe("paid");
    expect((await Booking.findById(booking._id))?.payoutVerifiedBy?.toString()).toBe(accountantB.user._id.toString());
    const ledger = await PaymentLedger.findOne({ providerEventId: `payout-${booking._id}` });
    expect(ledger?.provider).toBe("external_transfer");
    expect(ledger?.settlementStatus).toBe("reconciled");
    expect(await AuditLog.countDocuments({ action: "external_payout_verified", targetId: booking._id.toString() })).toBe(1);
    await accountantB.agent.post(`/api/v1/admin/bookings/${booking._id}/payout/verify`)
      .send({ settlementReference: "TRF-20261018-0001", verificationEvidence: "verified-statement-001", note: "Already reconciled externally" }).expect(409);
  });

  it("rolls back payout verification when the audit event fails", async () => {
    const student = await createUser("student"); const tutor = await createUser("tutor");
    const initiator = await createUser("admin", "finance"); const reviewer = await createUser("admin", "finance");
    const booking = await completedBooking(student.user, tutor.user);
    await Booking.updateOne({ _id: booking._id }, { $set: { payoutStatus: "processing", payoutInitiatedBy: initiator.user._id, payoutSettlementReference: "TRF-ROLLBACK-001", payoutSettlementMethod: "bank_transfer" } });
    const audit = jest.spyOn(AuditLog, "create").mockRejectedValueOnce(new Error("Audit unavailable") as never);
    try {
      await reviewer.agent.post(`/api/v1/admin/bookings/${booking._id}/payout/verify`)
        .send({ settlementReference: "TRF-ROLLBACK-001", verificationEvidence: "verified-statement-001", note: "Second person independently checked statement" }).expect(500);
      expect((await Booking.findById(booking._id))?.payoutStatus).toBe("processing");
      expect(await PaymentLedger.countDocuments({ providerEventId: `payout-${booking._id}` })).toBe(0);
    } finally { audit.mockRestore(); }
  });

  it("does not mark a payout paid when a ledger event already exists", async () => {
    const student = await createUser("student"); const tutor = await createUser("tutor");
    const initiator = await createUser("admin", "finance"); const reviewer = await createUser("admin", "finance");
    const booking = await completedBooking(student.user, tutor.user);
    await Booking.updateOne({ _id: booking._id }, { $set: { payoutStatus: "processing", payoutInitiatedBy: initiator.user._id, payoutSettlementReference: "TRF-EXISTING-001", payoutSettlementMethod: "bank_transfer" } });
    await PaymentLedger.create({ provider: "external_transfer", providerEventId: `payout-${booking._id}`, providerTransactionId: "TRF-OLD-001", eventType: "payout.completed", status: "succeeded", currency: "PKR", grossAmount: 924 });
    await reviewer.agent.post(`/api/v1/admin/bookings/${booking._id}/payout/verify`)
      .send({ settlementReference: "TRF-EXISTING-001", verificationEvidence: "verified-statement-001", note: "Second person independently checked statement" }).expect(409);
    expect((await Booking.findById(booking._id))?.payoutStatus).toBe("processing");
    expect(await PaymentLedger.countDocuments({ providerEventId: `payout-${booking._id}` })).toBe(1);
    expect(await AuditLog.countDocuments({ action: "external_payout_verified", targetId: booking._id.toString() })).toBe(0);
  });

  it("does not process an approved refund until an independent reviewer reconciles external settlement", async () => {
    const student = await createUser("student");
    const tutor = await createUser("tutor");
    const accountantA = await createUser("admin", "finance");
    const accountantB = await createUser("admin", "finance");
    const booking = await completedBooking(student.user, tutor.user);
    const refund = await RefundRequest.create({ student: student.user._id, tutor: tutor.user._id,
      booking: booking._id, amount: 1200, reason: "session_not_delivered",
      details: "Session cancelled by tutor", status: "approved" });
    const url = `/api/v1/admin/refund-requests/${refund._id}`;
    await accountantA.agent.post(`${url}/external-transfer`)
      .send({ settlementReference: "REF-20261018-0001", settlementMethod: "bank_transfer", evidenceReference: "bank-receipt-refund-001" }).expect(200);
    expect((await Booking.findById(booking._id))?.payoutStatus).toBe("held");
    const blocked = await accountantA.agent.patch(`/api/v1/admin/bookings/${booking._id}/payment`)
      .send({ payoutStatus: "processing", payoutNote: "Attempt to process during review", payoutSettlementMethod: "bank_transfer", payoutSettlementReference: "TRF-REFUND-TEST", payoutEvidenceReference: "evidence-refund-test" }).expect(409);
    expect(blocked.body.code).toBe("REFUND_RECONCILIATION_PENDING");
    await accountantA.agent.post(`${url}/external-verify`)
      .send({ settlementReference: "REF-20261018-0001", verificationEvidence: "bank-statement-refund-001", note: "Confirmed independently from bank statement" }).expect(403);
    await accountantB.agent.post(`${url}/external-verify`)
      .send({ settlementReference: "REF-20261018-0001", verificationEvidence: "bank-statement-refund-001", note: "Confirmed independently from bank statement" }).expect(200);
    expect((await RefundRequest.findById(refund._id))?.status).toBe("processed");
    expect((await Booking.findById(booking._id))?.paymentStatus).toBe("refunded");
    expect((await Booking.findById(booking._id))?.payoutStatus).toBe("held");
    const event = await PaymentLedger.findOne({ providerEventId: `refund-${refund._id}` });
    expect(event?.provider).toBe("external_refund");
    expect(event?.refundAmount).toBe(1200);
    expect(await AuditLog.countDocuments({ action: "external_refund_verified", targetId: refund._id.toString() })).toBe(1);
    await accountantB.agent.post(`${url}/external-verify`)
      .send({ settlementReference: "REF-20261018-0001", verificationEvidence: "bank-statement-refund-001", note: "Already reconciled externally" }).expect(409);
  });

  it("rolls back refund reconciliation when its audit event fails", async () => {
    const student = await createUser("student"); const tutor = await createUser("tutor");
    const initiator = await createUser("admin", "finance"); const reviewer = await createUser("admin", "finance");
    const booking = await completedBooking(student.user, tutor.user);
    const refund = await RefundRequest.create({ student: student.user._id, tutor: tutor.user._id, booking: booking._id, amount: 1200, reason: "session_not_delivered", details: "Session cancelled by tutor", status: "approved" });
    const url = `/api/v1/admin/refund-requests/${refund._id}`;
    await initiator.agent.post(`${url}/external-transfer`).send({ settlementReference: "REF-ROLLBACK-001", settlementMethod: "bank_transfer", evidenceReference: "bank-receipt-refund-001" }).expect(200);
    const audit = jest.spyOn(AuditLog, "create").mockRejectedValueOnce(new Error("Audit unavailable") as never);
    try {
      await reviewer.agent.post(`${url}/external-verify`).send({ settlementReference: "REF-ROLLBACK-001", verificationEvidence: "bank-statement-refund-001", note: "Confirmed independently from bank statement" }).expect(500);
      expect((await RefundRequest.findById(refund._id))?.status).toBe("approved");
      expect((await Booking.findById(booking._id))?.paymentStatus).toBe("confirmed");
      expect(await PaymentLedger.countDocuments({ providerEventId: `refund-${refund._id}` })).toBe(0);
    } finally { audit.mockRestore(); }
  });

  it("rolls back the payout hold and evidence when refund initiation audit fails", async () => {
    const student = await createUser("student"); const tutor = await createUser("tutor");
    const initiator = await createUser("admin", "finance");
    const booking = await completedBooking(student.user, tutor.user);
    const refund = await RefundRequest.create({ student: student.user._id, tutor: tutor.user._id, booking: booking._id, amount: 1200, reason: "session_not_delivered", details: "Session cancelled by tutor", status: "approved" });
    const audit = jest.spyOn(AuditLog, "create").mockRejectedValueOnce(new Error("Audit unavailable") as never);
    try {
      await initiator.agent.post(`/api/v1/admin/refund-requests/${refund._id}/external-transfer`)
        .send({ settlementReference: "REF-HOLD-ROLLBACK", settlementMethod: "bank_transfer", evidenceReference: "bank-receipt-refund-001" }).expect(500);
      expect((await Booking.findById(booking._id))?.payoutStatus).toBe("pending");
      expect((await RefundRequest.findById(refund._id))?.settlementReference).toBeUndefined();
    } finally { audit.mockRestore(); }
  });

  it("requires an independent reviewer to void incorrect refund evidence without releasing the payout hold", async () => {
    const student = await createUser("student"); const tutor = await createUser("tutor");
    const initiator = await createUser("admin", "finance"); const reviewer = await createUser("admin", "finance");
    const booking = await completedBooking(student.user, tutor.user);
    const refund = await RefundRequest.create({ student: student.user._id, tutor: tutor.user._id, booking: booking._id, amount: 1200, reason: "session_not_delivered", details: "Session cancelled by tutor", status: "approved" });
    const url = `/api/v1/admin/refund-requests/${refund._id}`;
    await initiator.agent.post(`${url}/external-transfer`).send({ settlementReference: "REF-INCORRECT-001", settlementMethod: "bank_transfer", evidenceReference: "bank-receipt-refund-001" }).expect(200);
    const correction = { settlementReference: "REF-INCORRECT-001", reviewEvidence: "bank-statement-review-001", reason: "Reference belongs to a different transaction" };
    await initiator.agent.post(`${url}/external-evidence/void`).send(correction).expect(403);
    await reviewer.agent.post(`${url}/external-evidence/void`).send(correction).expect(200);
    const stored = await RefundRequest.findById(refund._id).lean();
    expect(stored?.settlementReference).toBeUndefined();
    expect((stored as any).voidedSettlements).toHaveLength(1);
    expect((await Booking.findById(booking._id))?.payoutStatus).toBe("held");
    expect(await AuditLog.countDocuments({ action: "external_refund_evidence_voided", targetId: refund._id.toString() })).toBe(1);
  });

  it("uses one MongoDB lease per scheduled job name across workers", async () => {
    let unlock!: () => void;
    const release = new Promise<void>(resolve => { unlock = resolve; });
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const first = withDistributedJobLease("test-finance-job", async () => { entered(); await release; });
    await started;
    const concurrent = await withDistributedJobLease("test-finance-job", async () => { throw new Error("Should not execute concurrently"); });
    expect(concurrent).toBe(false);
    unlock();
    expect(await first).toBe(true);
    expect(await withDistributedJobLease("test-finance-job", async () => undefined)).toBe(true);
  });
});
