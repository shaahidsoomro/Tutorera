// src/tests/offer-concurrency.test.ts
//
// Audit §16 + "two simultaneous accepts" acceptance test (§30 item 7
// of the audit's acceptance plan). bid-concurrency.test covers the
// legacy acceptBid path; this suite covers acceptOffer — the newer
// offer-flow entry point that students actually hit from /offers.
//
// The race invariant: when a student has multiple offers on the same
// request and clicks "accept" on two of them simultaneously, exactly
// one must transition the request to awaiting_payment. The other must
// return 409 "already matched" and the second offer must stay in an
// active state (never flip to payment_pending).

import User from "../models/User.model";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import TutorProfile from "../models/TutorProfile.model";
import { acceptOffer } from "../controllers/offer.controller";
import { AuthRequest } from "../types";
import { Response } from "express";
import { Types } from "mongoose";

jest.mock("../utils/socket", () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));
// The acceptOffer handler calls out to the real payment provider to
// create a checkout session — that requires live RapidPay credentials
// (throws PAYMENT_GATEWAY_NOT_CONFIGURED otherwise) and is not what
// this suite is testing. Stub just the checkout call.
jest.mock("../services/paymentProvider.service", () => ({
  ...jest.requireActual("../services/paymentProvider.service"),
  paymentProvider: {
    ...jest.requireActual("../services/paymentProvider.service").paymentProvider,
    createCheckout: jest.fn().mockResolvedValue("https://checkout.test/mock-session"),
  },
}));
// market feature gate — just allow everything.
jest.mock("../services/market.service", () => ({
  ...jest.requireActual("../services/market.service"),
  assertAcceptanceAvailable: jest.fn().mockResolvedValue(undefined),
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

describe("acceptOffer race safety — concurrent accepts on the same request", () => {
  it("firing accept on two different offers of the same request lets exactly one win", async () => {
    const student = await User.create({
      name: "Student",
      email: "offer-race-student@test.com",
      password: "password123",
      role: "student",
      phone: "03001234567",
    });
    const tutorA = await User.create({
      name: "Tutor A",
      email: "offer-race-tutor-a@test.com",
      password: "password123",
      role: "tutor",
    });
    const tutorB = await User.create({
      name: "Tutor B",
      email: "offer-race-tutor-b@test.com",
      password: "password123",
      role: "tutor",
    });
    await TutorProfile.create({
      user: tutorA._id,
      subjectEligibility: [{ subject: "Mathematics", levels: ["Matric"], status: "approved" }],
    });
    await TutorProfile.create({
      user: tutorB._id,
      subjectEligibility: [{ subject: "Mathematics", levels: ["Matric"], status: "approved" }],
    });

    const requestDoc = await Request.create({
      student: student._id,
      subject: "Mathematics",
      level: "Matric",
      description: "Need help with algebra",
      budget: 1000,
      currency: "USD",
      schedule: "Evenings",
      status: "open",
      teachingMode: "online",
      countryCode: "PK",
    });

    const offerA = await Bid.create({
      request: requestDoc._id,
      tutor: tutorA._id,
      amount: 1000,
      initialStudentRate: 1000,
      currency: "USD",
      message: "I can help",
      status: "submitted",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const offerB = await Bid.create({
      request: requestDoc._id,
      tutor: tutorB._id,
      amount: 1200,
      initialStudentRate: 1000,
      currency: "USD",
      message: "I can also help",
      status: "submitted",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const req1 = mockAuthRequest({
      params: { id: (offerA._id as Types.ObjectId).toString() },
      body: { cnic: "4210112345671" },
      user: { _id: student._id, role: "student" } as unknown as AuthRequest["user"],
    });
    const req2 = mockAuthRequest({
      params: { id: (offerB._id as Types.ObjectId).toString() },
      body: { cnic: "4210112345671" },
      user: { _id: student._id, role: "student" } as unknown as AuthRequest["user"],
    });

    const res1 = mockResponse();
    const res2 = mockResponse();

    // Fire both without an await between them so they race to the
    // Request.updateOne atomic guard.
    await Promise.all([acceptOffer(req1, res1), acceptOffer(req2, res2)]);

    const statusCalls = [
      (res1.status as jest.Mock).mock.calls[0]?.[0],
      (res2.status as jest.Mock).mock.calls[0]?.[0],
    ];

    // Exactly one winner (200), one loser (409). Any other distribution
    // — two 200s, two 409s, 500/409 — means the race guard regressed.
    expect(statusCalls.sort()).toEqual([200, 409]);

    // Request must be in awaiting_payment with exactly one offer locked.
    const finalRequest = await Request.findById(requestDoc._id);
    expect(finalRequest?.status).toBe("awaiting_payment");

    const bothOffers = await Bid.find({ request: requestDoc._id });
    const paymentPendingCount = bothOffers.filter((o) => o.status === "payment_pending").length;
    expect(paymentPendingCount).toBe(1);

    // The losing offer must stay in an active state — the winner's
    // victory does not retroactively void other submitted offers.
    const loser = bothOffers.find((o) => o.status !== "payment_pending");
    expect(["submitted", "pending", "viewed", "countered"]).toContain(loser?.status);
  });
});
