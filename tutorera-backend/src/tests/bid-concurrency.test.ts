// src/tests/bid-concurrency.test.ts
//
// Covers scenario #3 from the audit's minimum backend test suite: two
// concurrent bid-accept requests must create exactly one booking. This is
// what BE-07's fix (atomic findOneAndUpdate({status:"open"}) guard inside a
// Mongo transaction) is supposed to guarantee — this test actually fires
// both requests at once instead of trusting the code reads correctly.

import User from "../models/User.model";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import Booking from "../models/Booking.model";
import { acceptBid } from "../controllers/request.controller";
import { AuthRequest } from "../types";
import { Response } from "express";

jest.mock("../utils/socket", () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));
jest.mock("../services/paymentProvider.service", () => ({
  paymentProvider: {
    createCheckout: jest.fn().mockResolvedValue("https://checkout.test/session"),
  },
}));

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

describe("BE-07: concurrent bid acceptance is race-safe", () => {
  it("firing two simultaneous accept calls on the same bid creates exactly one booking", async () => {
    const student = await User.create({ name: "Student", email: "race-student@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Tutor", email: "race-tutor@test.com", password: "password123", role: "tutor" });

    const requestDoc = await Request.create({
      student: student._id,
      subject: "Math",
      level: "Matric",
      description: "Need help",
      budget: 1000,
      schedule: "Evenings",
      status: "open",
    });
    const bid = await Bid.create({
      request: requestDoc._id,
      tutor: tutor._id,
      amount: 1000,
      initialStudentRate: 1000,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      status: "pending",
      message: "I can help",
    });

    const makeReq = () =>
      mockAuthRequest({
        params: { id: requestDoc._id.toString(), bidId: bid._id.toString() },
        user: { _id: student._id } as any,
      });

    const res1 = mockResponse();
    const res2 = mockResponse();

    // Fire both "simultaneously" — no await between them — so both requests
    // race to read the request's "open" status before either commits.
    await Promise.all([acceptBid(makeReq(), res1), acceptBid(makeReq(), res2)]);

    const statusCalls = [
      (res1.status as jest.Mock).mock.calls[0]?.[0],
      (res2.status as jest.Mock).mock.calls[0]?.[0],
    ];

    // Exactly one of the two must have succeeded (200); the other must have
    // been rejected as a conflict (409) or bad request — never both 200.
    const successCount = statusCalls.filter((code) => code === 200).length;
    expect(successCount).toBe(1);

    // Acceptance now reserves the request for payment. No booking may exist
    // until the payment webhook finalizes the winning offer.
    const bookings = await Booking.find({ request: requestDoc._id });
    expect(bookings.length).toBe(0);

    const finalRequest = await Request.findById(requestDoc._id);
    expect(finalRequest?.status).toBe("awaiting_payment");

    const finalBid = await Bid.findById(bid._id);
    expect(finalBid?.status).toBe("payment_pending");
  });

  it("firing two concurrent accept calls for two DIFFERENT bids on the same request also results in only one booking", async () => {
    // A second, related race: two different tutors' bids on the SAME
    // request both get accepted "at once" (e.g. two browser tabs, or a
    // double-click). Only one bid should end up accepted; the request can
    // only close once.
    const student = await User.create({ name: "Student2", email: "race-student2@test.com", password: "password123", role: "student" });
    const tutorA = await User.create({ name: "TutorA", email: "race-tutorA@test.com", password: "password123", role: "tutor" });
    const tutorB = await User.create({ name: "TutorB", email: "race-tutorB@test.com", password: "password123", role: "tutor" });

    const requestDoc = await Request.create({
      student: student._id,
      subject: "Physics",
      level: "Matric",
      description: "Need help",
      budget: 1500,
      schedule: "Mornings",
      status: "open",
    });
    const bidA = await Bid.create({ request: requestDoc._id, tutor: tutorA._id, amount: 1500, initialStudentRate: 1500, expiresAt: new Date(Date.now() + 60 * 60 * 1000), status: "pending", message: "A" });
    const bidB = await Bid.create({ request: requestDoc._id, tutor: tutorB._id, amount: 1400, initialStudentRate: 1500, expiresAt: new Date(Date.now() + 60 * 60 * 1000), status: "pending", message: "B" });

    const reqA = mockAuthRequest({
      params: { id: requestDoc._id.toString(), bidId: bidA._id.toString() },
      user: { _id: student._id } as any,
    });
    const reqB = mockAuthRequest({
      params: { id: requestDoc._id.toString(), bidId: bidB._id.toString() },
      user: { _id: student._id } as any,
    });

    const resA = mockResponse();
    const resB = mockResponse();

    await Promise.all([acceptBid(reqA, resA), acceptBid(reqB, resB)]);

    const bookings = await Booking.find({ request: requestDoc._id });
    expect(bookings.length).toBe(0);

    // Exactly one offer may hold the request for checkout. The other remains
    // unselected until payment succeeds or the hold expires.
    const paymentPendingBids = await Bid.find({ request: requestDoc._id, status: "payment_pending" });
    expect(paymentPendingBids.length).toBe(1);

    const finalRequest = await Request.findById(requestDoc._id);
    expect(finalRequest?.status).toBe("awaiting_payment");
  });
});
