// src/tests/bid.test.ts
//
// Covers BE-01 (cross-request bid substitution) from the audit report:
// a student must not be able to combine their own request ID with another
// request's bid ID to hijack an unrelated tutor/amount into their booking.

import User from "../models/User.model";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import Booking from "../models/Booking.model";
import { acceptBid, rejectBid } from "../controllers/request.controller";
import { AuthRequest } from "../types";
import { Response } from "express";

// These side effects (real-time notifications and emails) are not what this
// test is about, and we don't want real network calls slowing down or
// flaking the suite — mock them out.
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

describe("BE-01: cross-request bid substitution", () => {
  it("acceptBid rejects a bid that belongs to a different request", async () => {
    const student = await User.create({ name: "Student A", email: "a@test.com", password: "password123", role: "student" });
    const attackerStudent = await User.create({ name: "Attacker", email: "attacker@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Tutor A", email: "tutorA@test.com", password: "password123", role: "tutor" });

    // The attacker's own, legitimate request.
    const attackerRequest = await Request.create({
      student: attackerStudent._id,
      subject: "Math",
      level: "Matric",
      description: "Need help",
      budget: 1000,
      schedule: "Evenings",
      status: "open",
    });

    // A completely unrelated request/bid belonging to someone else.
    const otherRequest = await Request.create({
      student: student._id,
      subject: "Physics",
      level: "Matric",
      description: "Need help",
      budget: 2000,
      schedule: "Mornings",
      status: "open",
    });
    const otherBid = await Bid.create({
      request: otherRequest._id,
      tutor: tutor._id,
      amount: 2000,
      initialStudentRate: 2000,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      status: "pending",
      message: "I can help",
    });

    // Attack: attacker's own request ID + the unrelated bid's ID.
    const req = mockAuthRequest({
      params: { id: attackerRequest._id.toString(), bidId: otherBid._id.toString() },
      user: { _id: attackerStudent._id } as any,
    });
    const res = mockResponse();

    await acceptBid(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining("does not belong to this request") })
    );

    // No booking should have been created from this attempted attack.
    const bookingCount = await Booking.countDocuments({});
    expect(bookingCount).toBe(0);

    // The unrelated bid must remain untouched (still pending).
    const unchangedBid = await Bid.findById(otherBid._id);
    expect(unchangedBid?.status).toBe("pending");
  });

  it("rejectBid rejects a bid that belongs to a different request", async () => {
    const student = await User.create({ name: "Student B", email: "b@test.com", password: "password123", role: "student" });
    const attackerStudent = await User.create({ name: "Attacker2", email: "attacker2@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Tutor B", email: "tutorB@test.com", password: "password123", role: "tutor" });

    const attackerRequest = await Request.create({
      student: attackerStudent._id,
      subject: "Chemistry",
      level: "Matric",
      description: "Need help",
      budget: 1500,
      schedule: "Evenings",
      status: "open",
    });

    const otherRequest = await Request.create({
      student: student._id,
      subject: "Biology",
      level: "Matric",
      description: "Need help",
      budget: 1800,
      schedule: "Mornings",
      status: "open",
    });
    const otherBid = await Bid.create({
      request: otherRequest._id,
      tutor: tutor._id,
      amount: 1800,
      initialStudentRate: 1800,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      status: "pending",
      message: "I can help",
    });

    const req = mockAuthRequest({
      params: { id: attackerRequest._id.toString(), bidId: otherBid._id.toString() },
      user: { _id: attackerStudent._id } as any,
    });
    const res = mockResponse();

    await rejectBid(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining("does not belong to this request") })
    );

    const unchangedBid = await Bid.findById(otherBid._id);
    expect(unchangedBid?.status).toBe("pending");
  });

  it("acceptBid succeeds for a legitimately matching request/bid pair", async () => {
    const student = await User.create({ name: "Student C", email: "c@test.com", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Tutor C", email: "tutorC@test.com", password: "password123", role: "tutor" });

    const request = await Request.create({
      student: student._id,
      subject: "English",
      level: "Matric",
      description: "Need help",
      budget: 1200,
      schedule: "Evenings",
      status: "open",
    });
    const bid = await Bid.create({
      request: request._id,
      tutor: tutor._id,
      amount: 1200,
      initialStudentRate: 1200,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      status: "pending",
      message: "I can help",
    });

    const req = mockAuthRequest({
      params: { id: request._id.toString(), bidId: bid._id.toString() },
      user: { _id: student._id } as any,
    });
    const res = mockResponse();

    await acceptBid(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    // Accepting a marketplace offer now reserves it for payment; booking
    // creation happens only after the signed payment webhook succeeds.
    const booking = await Booking.findOne({ request: request._id });
    expect(booking).toBeNull();

    const reservedRequest = await Request.findById(request._id);
    expect(reservedRequest?.status).toBe("awaiting_payment");

    const reservedBid = await Bid.findById(bid._id);
    expect(reservedBid?.status).toBe("payment_pending");
    expect(reservedBid?.paymentPendingExpiresAt).toBeDefined();
  });
});
