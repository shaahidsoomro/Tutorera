import { seedFeePolicy } from "./helpers/feePolicy";
import request from "supertest";
import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User.model";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import Booking from "../models/Booking.model";
import Review from "../models/Review.model";
import TutorProfile from "../models/TutorProfile.model";
import PaymentLedger from "../models/PaymentLedger.model";
import { finalizeBidAcceptance } from "../controllers/request.controller";
import { rapidPayProvider } from "../services/rapidPayProvider.service";
import { recordPaymentLedger } from "../services/paymentProvider.service";

jest.mock("../utils/socket", () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));
// Stub only the outbound HTTP call to RapidPay's API — all paymentProvider and
// ledger logic above it runs against the real in-memory test database.
jest.mock("../services/rapidPayProvider.service", () => ({
  rapidPayProvider: {
    getSessionStatus: jest.fn(),
    createCheckout: jest.fn(),
  },
  assertRapidPayRuntimeConfiguration: jest.fn(),
  assertRapidPayCheckoutCapability: jest.fn(),
  getRapidPayCapabilities: jest.fn().mockReturnValue({ markets: new Set(["PK", "AE", "GB", "US", "SA", "IN"]), currencies: new Set(["USD"]) }),
  normalizeCnic: jest.fn((v: string) => v),
  normalizePkMobile: jest.fn((v: string) => v),
}));

function tokenFor(userId: string): string {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
}

describe("Marketplace Lifecycle End-to-End Suite (Phase 4 / Audit �30)", () => {
  beforeEach(async () => { await seedFeePolicy(); });
  it("completes full student online requirement: matching -> offer -> paid acceptance -> booking -> session -> review", async () => {
    // 1. Create Student and Tutor accounts
    const student = await User.create({
      name: "Ayesha Student",
      email: "ayesha@e2e-marketplace.test",
      password: "password123",
      role: "student",
      isActive: true,
      countryCode: "PK",
    });
    const studentToken = tokenFor(student.id);

    const tutorUser = await User.create({
      name: "Dr. Bilal Tutor",
      email: "bilal@e2e-marketplace.test",
      password: "password123",
      role: "tutor",
      isActive: true,
      countryCode: "PK",
    });

    const tutorProfile = await TutorProfile.create({
      user: tutorUser._id,
      bio: "PhD in Mathematics with 10 years of teaching experience.",
      subjects: ["Mathematics"],
      levels: ["O-Level (Cambridge / Edexcel)"],
      teachingMode: "online",
      hourlyRate: 3000,
      verificationStatus: "approved",
      onboardingComplete: true,
      averageRating: 0,
      totalReviews: 0,
      subjectEligibility: [
        {
          subject: "Mathematics",
          levels: ["O-Level (Cambridge / Edexcel)"],
          status: "approved",
          matchesDiscipline: true,
          requestedAt: new Date(),
        },
      ],
    });

    // 2. Student posts online requirement
    const tuitionRequest = await Request.create({
      student: student._id,
      subject: "Mathematics",
      level: "O-Level (Cambridge / Edexcel)",
      budget: 3000,
      currency: "USD",
      pricingUnit: "hour",
      teachingMode: "online",
      description: "Need help preparing for upcoming Cambridge exams",
      schedule: "Mon/Wed 18:00",
      status: "awaiting_payment",
    });

    // 3. Tutor submits an offer
    const bid = await Bid.create({
      request: tuitionRequest._id,
      tutor: tutorUser._id,
      amount: 3000,
      currency: "USD",
      originalAmount: 3000,
      originalCurrency: "USD",
      convertedRequestAmount: 3000,
      exchangeRate: 1,
      pricingUnit: "hour",
      initialStudentRate: 3000,
      expiresAt: new Date(Date.now() + 86400000),
      message: "I can cover the full syllabus in 8 weeks.",
      status: "payment_pending",
    });

    // 4. Student accepts offer and checkout finalizes
    await finalizeBidAcceptance(bid._id.toString(), null);

    // Verify atomic state transition: exactly 1 booking created
    const bookings = await Booking.find({ bid: bid._id });
    expect(bookings).toHaveLength(1);
    const booking = bookings[0];
    expect(booking.student.toString()).toBe(student.id);
    expect(booking.tutor.toString()).toBe(tutorUser.id);
    expect(booking.paymentStatus).toBe("confirmed");
    expect(booking.teachingMode).toBe("online");

    // Verify bid and request lifecycle closure
    const updatedBid = await Bid.findById(bid._id);
    expect(updatedBid?.status).toBe("accepted");
    const updatedRequest = await Request.findById(tuitionRequest._id);
    expect(updatedRequest?.status).toBe("closed");

    // 5. Negative check: student cannot review while session is upcoming
    const prematureReviewRes = await request(app)
      .post(`/api/v1/reviews/${tutorUser.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        rating: 5,
        comment: "Excellent tutor!",
        bookingId: booking.id,
      });
    expect(prematureReviewRes.status).toBe(400);

    // 6. Complete session & mark booking completed
    booking.status = "completed";
    await booking.save();

    // 7. Student submits review on completed booking
    const reviewRes = await request(app)
      .post(`/api/v1/reviews/${tutorUser.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        rating: 5,
        comment: "Outstanding lessons and clear explanations!",
        bookingId: booking.id,
      });
    expect(reviewRes.status).toBe(201);
    expect(reviewRes.body.success).toBe(true);

    // Verify persisted review and tutor profile aggregates
    const createdReview = await Review.findOne({ booking: booking._id });
    expect(createdReview).not.toBeNull();
    expect(createdReview?.rating).toBe(5);

    const refreshedProfile = await TutorProfile.findById(tutorProfile._id);
    expect(refreshedProfile?.totalReviews).toBe(1);
    expect(refreshedProfile?.averageRating).toBe(5);

    // 8. Negative check: duplicate review on same booking is rejected
    const duplicateReviewRes = await request(app)
      .post(`/api/v1/reviews/${tutorUser.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        rating: 4,
        comment: "Trying to submit second review",
        bookingId: booking.id,
      });
    expect(duplicateReviewRes.status).toBe(400);
    expect(await Review.countDocuments({ booking: booking._id })).toBe(1);
  });

  it("completes home / in-person requirement and verifies idempotent payment finalization", async () => {
    await seedFeePolicy("PKR", "PK");
    const student = await User.create({
      name: "Hamza Student",
      email: "hamza@e2e-marketplace.test",
      password: "password123",
      role: "student",
      isActive: true,
      city: "Lahore",
      countryCode: "PK",
    });

    const tutorUser = await User.create({
      name: "Fatima In-Person Tutor",
      email: "fatima@e2e-marketplace.test",
      password: "password123",
      role: "tutor",
      isActive: true,
      city: "Lahore",
      countryCode: "PK",
    });

    await TutorProfile.create({
      user: tutorUser._id,
      bio: "Experienced in-person home tutor for sciences.",
      subjects: ["Physics"],
      levels: ["A-Level"],
      teachingMode: "in-person",
      city: "Lahore",
      countryCode: "PK",
      verificationStatus: "approved",
      onboardingComplete: true,
    });

    const homeRequest = await Request.create({
      student: student._id,
      subject: "Physics",
      level: "A-Level",
      budget: 4000,
      currency: "PKR",
      pricingUnit: "hour",
      teachingMode: "in-person",
      city: "Lahore",
      countryCode: "PK",
      description: "In-person tutoring required at home in Lahore",
      schedule: "Tue/Thu 17:00",
      status: "awaiting_payment",
    });

    const homeBid = await Bid.create({
      request: homeRequest._id,
      tutor: tutorUser._id,
      amount: 4000,
      currency: "PKR",
      originalAmount: 4000,
      originalCurrency: "PKR",
      convertedRequestAmount: 4000,
      exchangeRate: 1,
      pricingUnit: "hour",
      initialStudentRate: 4000,
      expiresAt: new Date(Date.now() + 86400000),
      message: "Available for home visits in Lahore.",
      status: "payment_pending",
    });

    // Simulate concurrent or duplicate webhook delivery
    await Promise.all([
      finalizeBidAcceptance(homeBid._id.toString(), null),
      finalizeBidAcceptance(homeBid._id.toString(), null),
    ]);

    // Exactly one booking must exist despite duplicate delivery
    const homeBookings = await Booking.find({ bid: homeBid._id });
    expect(homeBookings).toHaveLength(1);
    expect(homeBookings[0].teachingMode).toBe("in-person");
    expect(homeBookings[0].countryCode).toBe("PK");
    expect(homeBookings[0].paymentStatus).toBe("confirmed");
  });
});
