import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import Booking from "../models/Booking.model";
import TutorProfile from "../models/TutorProfile.model";

jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));

const api = () => request(app);

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-at-least-16-chars";
});

async function authedTutor() {
  const email = `pricing-reader-${Date.now()}-${Math.random()}@test.com`;
  await User.create({ name: "Pricing Reader", email, password: "password123", role: "tutor" });
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({ email, password: "password123" }).expect(200);
  return agent;
}

async function completedBooking(currency: string | undefined, finalAgreedRate: number, pricingUnit = "hour") {
  const [student, tutor] = await User.create([
    { name: "Pricing Student", email: `pricing-student-${Date.now()}-${Math.random()}@test.com`, password: "password123", role: "student" },
    { name: "Pricing Tutor", email: `pricing-tutor-${Date.now()}-${Math.random()}@test.com`, password: "password123", role: "tutor" },
  ]);
  return Booking.create({
    student: student._id,
    tutor: tutor._id,
    amount: finalAgreedRate,
    finalAgreedRate,
    currency,
    pricingUnit,
    sessionCount: 1,
    subtotal: finalAgreedRate,
    studentFee: 0,
    tutorFee: 0,
    tax: 0,
    studentTotal: finalAgreedRate,
    tutorNet: finalAgreedRate,
    feeConfig: { version: "test" },
    schedule: "Evening",
    teachingMode: "online",
    status: "completed",
    paymentStatus: "confirmed",
    payoutStatus: "paid",
  });
}

describe("pricing insight never mixes currencies", () => {
  it("does not expose marketplace pricing activity to anonymous callers", async () => {
    await completedBooking("PKR", 5000);
    await api().get("/api/v1/pricing/insights").expect(401);
  });

  it("aggregates only PKR activity and ignores other currencies", async () => {
    await completedBooking("PKR", 5000);
    await completedBooking("PKR", 7000);
    await completedBooking("USD", 20);
    await completedBooking("GBP", 16);

    const agent = await authedTutor();
    const res = await agent.get("/api/v1/pricing/insights").expect(200);

    expect(res.body.insight.currency).toBe("PKR");
    expect(res.body.insight.count).toBe(2);
    expect(res.body.insight.min).toBe(5000);
    expect(res.body.insight.max).toBe(7000);
  });

  it("normalizes non-hourly pricing units before comparing them", async () => {
    await completedBooking("PKR", 40, "session");
    await completedBooking("PKR", 120, "month");

    const agent = await authedTutor();
    const res = await agent.get("/api/v1/pricing/insights").expect(200);

    expect(res.body.insight.count).toBe(2);
    expect(res.body.insight.min).toBe(30);
    expect(res.body.insight.max).toBe(80);
  });

  it("excludes rows with an unsupported or missing currency instead of assuming one", async () => {
    await completedBooking("PKR", 30);
    await completedBooking("XYZ", 900);
    await completedBooking(undefined, 900);

    const agent = await authedTutor();
    const res = await agent.get("/api/v1/pricing/insights").expect(200);

    expect(res.body.insight.count).toBe(1);
    expect(res.body.insight.min).toBe(30);
    expect(res.body.insight.max).toBe(30);
  });

  it("counts only PKR tutor profile rates", async () => {
    const make = async (suffix: string, currency: string, hourlyRate: number) => {
      const tutor = await User.create({ name: `Insight Tutor ${suffix}`, email: `insight-${suffix}-${Date.now()}-${Math.random()}@test.com`, password: "password123", role: "tutor" });
      await TutorProfile.create({ user: tutor._id, city: "Karachi", subjects: ["Mathematics"], hourlyRate, currency });
    };
    await make("pkr", "PKR", 1500);
    await make("aed", "AED", 367);

    const agent = await authedTutor();
    const res = await agent.get("/api/v1/pricing/insights?city=Karachi").expect(200);

    expect(res.body.insight.currency).toBe("PKR");
    expect(res.body.insight.sampleSource.activeProfiles).toBe(1);
    expect(res.body.insight.min).toBe(1500);
  });
});
