import mongoose from "mongoose";
// src/tests/booking.test.ts
//
// Covers BE-02 (arbitrary booking-state transitions) from the audit report:
// neither the student nor the tutor should be able to set a booking directly
// to "completed" (which unlocks referrals, ratings, and guarantee
// eligibility) — only an admin/system flow should do that. Students may
// only cancel; tutors may start (ongoing) or cancel.

import TutorProfile from "../models/TutorProfile.model";
import User from "../models/User.model";
import Booking from "../models/Booking.model";
import RequestModel from "../models/Request.model";
import Bid from "../models/Bid.model";
import BookedSlot from "../models/BookedSlot.model";
import { confirmExistingBookingPayment } from "../controllers/request.controller";
import { releaseExpiredPaymentHold, cleanupStalePaymentHolds } from "../services/requestLifecycle.service";
import { ensureLaunchMarkets } from "../services/market.service";
import supertest from "supertest";
import app from "../app";
import PaymentLedger from "../models/PaymentLedger.model";
import { paymentProvider, recordPaymentLedger } from "../services/paymentProvider.service";
import { updateBookingStatus } from "../controllers/booking.controller";
import { AuthRequest } from "../types";
import { Response } from "express";

jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));

function mockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockAuthRequest(overrides: Partial<AuthRequest>): AuthRequest {
  return {
    params: {},
    body: {},
    user: undefined,
    app: { get: () => ({ to: () => ({ emit: jest.fn() }) }) },
    ...overrides,
  } as unknown as AuthRequest;
}

async function makeBooking(studentId: any, tutorId: any, extra: Record<string, unknown> = {}) {
  // bid/request references are required: bookings without them are rejected as a data-integrity error.
  return Booking.create({
    student: studentId,
    tutor: tutorId,
    bid: new mongoose.Types.ObjectId(),
    request: new mongoose.Types.ObjectId(),
    amount: 1000,
    finalAgreedRate: 1000,
    subtotal: 1000,
    studentTotal: 1000,
    tutorNet: 800,
    feeConfig: { version: 1 },
    schedule: "Mon 5pm",
    status: "upcoming",
    ...extra,
  });
}

describe("BE-02: booking state-transition authorization", () => {
  it("a student cannot mark their own booking as completed", async () => {
    const student = await User.create({ name: "S", email: "s1@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "T", email: "t1@test.com", password: "password123", role: "tutor" });
    const booking = await makeBooking(student._id, tutor._id);

    const req = mockAuthRequest({
      params: { id: booking._id.toString() },
      body: { status: "completed" },
      user: { _id: student._id, role: "student" } as any,
    });
    const res = mockResponse();

    await updateBookingStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    const unchanged = await Booking.findById(booking._id);
    expect(unchanged?.status).toBe("upcoming");
  });

  it("a tutor cannot mark a booking as completed", async () => {
    const student = await User.create({ name: "S2", email: "s2@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "T2", email: "t2@test.com", password: "password123", role: "tutor" });
    const booking = await makeBooking(student._id, tutor._id);

    const req = mockAuthRequest({
      params: { id: booking._id.toString() },
      body: { status: "completed" },
      user: { _id: tutor._id, role: "tutor" } as any,
    });
    const res = mockResponse();

    await updateBookingStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    const unchanged = await Booking.findById(booking._id);
    expect(unchanged?.status).toBe("upcoming");
  });

  it("a student CAN cancel their own upcoming booking", async () => {
    const student = await User.create({ name: "S3", email: "s3@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "T3", email: "t3@test.com", password: "password123", role: "tutor" });
    const booking = await makeBooking(student._id, tutor._id);

    const req = mockAuthRequest({
      params: { id: booking._id.toString() },
      body: { status: "cancelled", cancelReason: "Change of plans" },
      user: { _id: student._id, role: "student" } as any,
    });
    const res = mockResponse();

    await updateBookingStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const updated = await Booking.findById(booking._id);
    expect(updated?.status).toBe("cancelled");
  });

  it("a tutor CAN mark a booking as ongoing, but not a student", async () => {
    const student = await User.create({ name: "S4", email: "s4@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "T4", email: "t4@test.com", password: "password123", role: "tutor" });
    const booking = await makeBooking(student._id, tutor._id, { paymentStatus: "confirmed" });

    // Student attempts "ongoing" — should be rejected.
    const studentReq = mockAuthRequest({
      params: { id: booking._id.toString() },
      body: { status: "ongoing" },
      user: { _id: student._id, role: "student" } as any,
    });
    const studentRes = mockResponse();
    await updateBookingStatus(studentReq, studentRes);
    expect(studentRes.status).toHaveBeenCalledWith(403);

    // Tutor may start ONLY after the payment is confirmed by the gateway.
    await Booking.updateOne({ _id: booking._id }, { $set: { paymentStatus: "confirmed" } });
    const tutorReq = mockAuthRequest({
      params: { id: booking._id.toString() },
      body: { status: "ongoing" },
      user: { _id: tutor._id, role: "tutor" } as any,
    });
    const tutorRes = mockResponse();
    await updateBookingStatus(tutorReq, tutorRes);
    expect(tutorRes.status).toHaveBeenCalledWith(200);

    const updated = await Booking.findById(booking._id);
    expect(updated?.status).toBe("ongoing");
  });

  it("a user with no role on the booking (not participant) is rejected before reaching the status check", async () => {
    const student = await User.create({ name: "S5", email: "s5@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "T5", email: "t5@test.com", password: "password123", role: "tutor" });
    const outsider = await User.create({ name: "Outsider", email: "outsider@test.com", password: "password123", role: "student" });
    const booking = await makeBooking(student._id, tutor._id);

    const req = mockAuthRequest({
      params: { id: booking._id.toString() },
      body: { status: "cancelled" },
      user: { _id: outsider._id, role: "student" } as any,
    });
    const res = mockResponse();

    await updateBookingStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const unchanged = await Booking.findById(booking._id);
    expect(unchanged?.status).toBe("upcoming");
  });

  it("cannot transition a booking that is already cancelled", async () => {
    const student = await User.create({ name: "S6", email: "s6@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "T6", email: "t6@test.com", password: "password123", role: "tutor" });
    const booking = await Booking.create({
      student: student._id,
      tutor: tutor._id,
      amount: 1000,
      finalAgreedRate: 1000,
      subtotal: 1000,
      studentTotal: 1000,
      tutorNet: 800,
      feeConfig: { version: 1 },
      schedule: "Mon 5pm",
      status: "cancelled",
    });

    const req = mockAuthRequest({
      params: { id: booking._id.toString() },
      body: { status: "cancelled" },
      user: { _id: student._id, role: "student" } as any,
    });
    const res = mockResponse();

    await updateBookingStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});


describe("Phase 2: direct-booking payment reservation and tutor session integrity", () => {
  beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; });

  async function directFixture(startHour = 15) {
    await ensureLaunchMarkets();
    const salt = `${Date.now()}-${Math.random()}`;
    const [student, tutor] = await User.create([
      { name: "Direct Student", email: `direct-s-${salt}@example.test`, password: "password123", role: "student" },
      { name: "Direct Tutor", email: `direct-t-${salt}@example.test`, password: "password123", role: "tutor" },
    ]);
    // Accepting an offer requires approved subject eligibility for the request's subject and level.
    await TutorProfile.create({ user: tutor._id, fullName: "Direct Tutor", subjects: ["Mathematics"],
      levels: ["O-Level (Cambridge / Edexcel)"], approvedSubjects: ["Mathematics"],
      subjectEligibility: [{ subject: "Mathematics", levels: ["O-Level (Cambridge / Edexcel)"], status: "approved",
        matchesDiscipline: true, evidenceRequired: false }] });
    const when = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    when.setUTCHours(startHour, 0, 0, 0);
    const ends = new Date(when.getTime() + 60 * 60 * 1000);
    const date = when.toISOString().slice(0, 10);
    const req = await RequestModel.create({
      student: student._id, targetTutor: tutor._id, isDirect: true,
      subject: "Mathematics", level: "O-Level (Cambridge / Edexcel)", description: "Exam preparation",
      budget: 1000, pricingUnit: "hour", currency: "PKR", allowCounterOffers: true,
      countryCode: "PK", timezone: "UTC", scheduleTimezone: "UTC",
      selectedDate: date, selectedStartTime: `${String(startHour).padStart(2, "0")}:00`,
      selectedEndTime: `${String(startHour + 1).padStart(2, "0")}:00`,
      scheduledStartAt: when, scheduledEndAt: ends,
      teachingMode: "online", schedule: "Weekdays afternoon", status: "open",
    });
    const bid = await Bid.create({ request: req._id, tutor: tutor._id, amount: 1000,
      currency: "PKR", initialStudentRate: 1000, pricingUnit: "hour",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), message: "Direct booking request", isDirect: true, status: "submitted" });
    const tutorAgent = supertest.agent(app);
    await tutorAgent.post("/api/v1/auth/login").send({ email: tutor.email, password: "password123" }).expect(200);
    return { student, tutor, req, bid, tutorAgent };
  }

  it("approves direct booking without reserving a slot before payment, then confirms atomically", async () => {
    const { req, bid, tutorAgent } = await directFixture();
    await tutorAgent.patch(`/api/v1/requests/${req._id}/bids/${bid._id}/accept`).expect(200);
    const awaiting = await Booking.findOne({ bid: bid._id });
    expect(awaiting?.paymentStatus).toBe("pending");
    expect(await BookedSlot.countDocuments()).toBe(0);
    expect((await RequestModel.findById(req._id))?.status).toBe("awaiting_payment");
    await confirmExistingBookingPayment(awaiting!._id.toString());
    const paid = await Booking.findById(awaiting!._id);
    expect(paid?.paymentStatus).toBe("confirmed");
    expect((await RequestModel.findById(req._id))?.status).toBe("closed");
    expect((await Bid.findById(bid._id))?.status).toBe("accepted");
    expect(await BookedSlot.countDocuments({ booking: awaiting!._id })).toBe(1);
    const retry = await confirmExistingBookingPayment(awaiting!._id.toString());
    expect(retry.alreadyConfirmed).toBe(true);
    expect(await BookedSlot.countDocuments({ booking: awaiting!._id })).toBe(1);
  });

  it("expires unpaid reservations and cannot later confirm the cancelled booking", async () => {
    const { req, bid, tutorAgent } = await directFixture();
    await tutorAgent.patch(`/api/v1/requests/${req._id}/bids/${bid._id}/accept`).expect(200);
    await Bid.updateOne({ _id: bid._id }, { $set: { paymentPendingExpiresAt: new Date(Date.now() - 60_000) } });
    expect((await cleanupStalePaymentHolds()).cleaned).toBe(1);
    expect((await Booking.findOne({ bid: bid._id }))?.status).toBe("cancelled");
    expect((await RequestModel.findById(req._id))?.status).toBe("open");
    expect((await Bid.findById(bid._id))?.status).toBe("submitted");
    const cancelled = await Booking.findOne({ bid: bid._id });
    await expect(confirmExistingBookingPayment(cancelled!._id.toString())).rejects.toMatchObject({ code: "BOOKING_NOT_PAYABLE" });
    expect(await releaseExpiredPaymentHold(req._id)).toBe(false);
  });

  it("rejects overlapping confirmed tutor slots without changing the second payment state", async () => {
    const first = await directFixture();
    await first.tutorAgent.patch(`/api/v1/requests/${first.req._id}/bids/${first.bid._id}/accept`).expect(200);
    const one = await Booking.findOne({ bid: first.bid._id });
    await confirmExistingBookingPayment(one!._id.toString());
    const secondStudent = await User.create({ name: "Second Student", email: `second-${Date.now()}@example.test`, password: "password123", role: "student" });
    const secondRequest = await RequestModel.create({ ...first.req.toObject(), _id: undefined,
      student: secondStudent._id, status: "open", acceptedOffer: undefined, createdAt: undefined, updatedAt: undefined });
    const secondBid = await Bid.create({ request: secondRequest._id, tutor: first.tutor._id, amount: 1000,
      currency: "PKR", initialStudentRate: 1000, pricingUnit: "hour",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), message: "Second direct booking", isDirect: true, status: "submitted" });
    await first.tutorAgent.patch(`/api/v1/requests/${secondRequest._id}/bids/${secondBid._id}/accept`).expect(200);
    const two = await Booking.findOne({ bid: secondBid._id });
    await expect(confirmExistingBookingPayment(two!._id.toString())).rejects.toMatchObject({ code: "BOOKING_SLOT_TAKEN" });
    expect((await Booking.findById(two!._id))?.paymentStatus).toBe("pending");
    expect(await BookedSlot.countDocuments()).toBe(1);
  });

  it("quarantines money received after the direct-booking hold expired", async () => {
    const { req, bid, tutorAgent } = await directFixture();
    await tutorAgent.patch(`/api/v1/requests/${req._id}/bids/${bid._id}/accept`).expect(200);
    const booking = await Booking.findOne({ bid: bid._id });
    await recordPaymentLedger({ providerTransactionId: booking!._id.toString(), eventType: "checkout.created", status: "pending", amount: booking!.studentTotal, currency: "PKR", bookingId: booking!._id.toString() });
    await Bid.updateOne({ _id: bid._id }, { $set: { paymentPendingExpiresAt: new Date(Date.now() - 5 * 60_000) } });
    await cleanupStalePaymentHolds();
    const signature = jest.spyOn(paymentProvider, "verifyWebhookSignature").mockReturnValue(true);
    try {
      const response = await supertest(app).post("/api/v1/payments/webhook")
        .send({ eventId: "late-direct-payment", eventType: "transaction.completed", merchantTransactionId: booking!._id.toString(), status: "completed", amount: booking!.studentTotal, currency: "PKR" }).expect(200);
      expect(response.body.code).toBe("PAYMENT_RECONCILIATION_REQUIRED");
      expect((await Booking.findById(booking!._id))?.paymentStatus).toBe("pending");
      expect((await Booking.findById(booking!._id))?.status).toBe("cancelled");
      expect((await PaymentLedger.findOne({ providerEventId: "late-direct-payment" }))?.settlementStatus).toBe("exception");
      expect(await BookedSlot.countDocuments()).toBe(0);
    } finally { signature.mockRestore(); }
  });

  it("allows only one concurrent direct tutor acceptance to create an unpaid booking", async () => {
    const { req, bid, tutorAgent } = await directFixture();
    const responses = await Promise.all([
      tutorAgent.patch(`/api/v1/requests/${req._id}/bids/${bid._id}/accept`),
      tutorAgent.patch(`/api/v1/requests/${req._id}/bids/${bid._id}/accept`),
    ]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect(await Booking.countDocuments({ bid: bid._id })).toBe(1);
    expect(await BookedSlot.countDocuments()).toBe(0);
  });

  it("exposes the public tracking API at the endpoint used by the frontend", async () => {
    await supertest(app).get("/api/v1/tracking/not-a-valid-public-token").expect(404);
  });

  it("rejects a tutor starting tuition without a confirmed payment", async () => {
    const student = await User.create({ name: "Unpaid Student", email: "unpaid-student@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Unpaid Tutor", email: "unpaid-tutor@test.com", password: "password123", role: "tutor" });
    const booking = await makeBooking(student._id, tutor._id);
    const res = mockResponse();
    await updateBookingStatus(mockAuthRequest({ params: { id: booking._id.toString() }, body: { status: "ongoing" }, user: { _id: tutor._id, role: "tutor" } as any }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect((await Booking.findById(booking._id))?.status).toBe("upcoming");
  });

  it("does not complete a session without confirmed payment or re-complete it twice", async () => {
    const admin = await User.create({ name: "Bookings Admin", email: "bookings-admin@test.com", password: "password123", role: "admin", adminRole: "super_admin" });
    const student = await User.create({ name: "Admin Student", email: "admin-student@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Admin Tutor", email: "admin-tutor@test.com", password: "password123", role: "tutor" });
    const booking = await makeBooking(student._id, tutor._id);
    const agent = supertest.agent(app);
    await agent.post("/api/v1/auth/login").send({ email: admin.email, password: "password123" }).expect(200);
    await agent.patch(`/api/v1/admin/bookings/${booking._id}/status`).send({ status: "completed" }).expect(409);
    await Booking.updateOne({ _id: booking._id }, { $set: { paymentStatus: "confirmed", status: "ongoing" } });
    await agent.patch(`/api/v1/admin/bookings/${booking._id}/status`).send({ status: "completed" }).expect(200);
    expect((await Booking.findById(booking._id))?.completedAt).toBeInstanceOf(Date);
    await agent.patch(`/api/v1/admin/bookings/${booking._id}/status`).send({ status: "completed" }).expect(409);
  });
});
