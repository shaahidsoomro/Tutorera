import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import TutorProfile from "../models/TutorProfile.model";
import TutorAvailability from "../models/TutorAvailability.model";
import type { IWeeklySlot } from "../models/TutorAvailability.model";
import Booking from "../models/Booking.model";
import BookedSlot from "../models/BookedSlot.model";
import { MatchingService } from "../services/matching.service";
import { tutorLocalDate } from "../services/availability.service";
import { zonedDateTimeToUtc } from "../utils/timezone";
import { IRequest } from "../models/Request.model";
import { ITutorProfile } from "../models/TutorProfile.model";

jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));
beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; });
let serial = 0;
const nextEmail = () => `calendar-matching-${Date.now()}-${++serial}@example.test`;

function nextAvailableDate(timezone: string) {
  const future = new Date(Date.now() + 4 * 86400_000);
  const date = tutorLocalDate(future, timezone);
  const day = new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) as IWeeklySlot["day"];
  return { date, day };
}

async function fixture(timezone = "Asia/Karachi") {
  const tutor = await User.create({ name: "Tutor Calendar", email: nextEmail(), password: "password123", role: "tutor" });
  const student = await User.create({ name: "Calendar Student", email: nextEmail(), password: "password123", role: "student" });
  const profile = await TutorProfile.create({
    user: tutor._id, timezone, subjects: ["Mathematics"], levels: ["Matric (9th & 10th)"],
    // Matching only considers tutors approved for the request's subject and level.
    approvedSubjects: ["Mathematics"],
    subjectEligibility: [{ subject: "Mathematics", levels: ["Matric (9th & 10th)"], status: "approved", matchesDiscipline: true, evidenceRequired: false }],
    hourlyRate: 1000, currency: "PKR", teachingMode: "online",
    availability: [{ day: "Sunday", slots: ["08:00-09:00"] }],
    createdAt: new Date(),
  });
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({ email: tutor.email, password: "password123" }).expect(200);
  const { date, day } = nextAvailableDate(timezone);
  return { tutor, student, profile, agent, date, day, timezone };
}

function scheduledRequest(date: string, timezone: string): IRequest {
  return {
    subject: "Mathematics", level: "Matric (9th & 10th)", teachingMode: "online",
    currency: "PKR", budget: 1500, pricingUnit: "hour",
    selectedDate: date, timezone, scheduleTimezone: timezone,
    scheduledStartAt: zonedDateTimeToUtc(date, "09:00", timezone),
    scheduledEndAt: zonedDateTimeToUtc(date, "10:00", timezone),
  } as unknown as IRequest;
}

async function booked(f: Awaited<ReturnType<typeof fixture>>, startTime: string, endTime: string) {
  const booking = await Booking.create({
    student: f.student._id, tutor: f.tutor._id, amount: 1000, finalAgreedRate: 1000,
    subtotal: 1000, studentTotal: 1000, tutorNet: 800, feeConfig: { version: "test" },
    schedule: "Confirmed lesson", paymentStatus: "confirmed",
  });
  return BookedSlot.create({
    tutor: f.tutor._id, student: f.student._id, booking: booking._id,
    date: new Date(`${f.date}T00:00:00.000Z`),
    startTime, endTime, timezone: f.timezone,
    startAt: zonedDateTimeToUtc(f.date, startTime, f.timezone),
    endAt: zonedDateTimeToUtc(f.date, endTime, f.timezone),
  });
}

describe("Fix 2 — one tutor calendar for matching and public availability", () => {
  it("hides a partially overlapping confirmed booking and retains the adjacent open slot", async () => {
    const f = await fixture();
    await TutorAvailability.create({ tutor: f.tutor._id, weeklySlots: [
      { day: f.day, startTime: "09:00", endTime: "10:00" },
      { day: f.day, startTime: "11:00", endTime: "12:00" },
    ], blockedDates: [] });
    await booked(f, "09:30", "10:30");
    const response = await request(app).get(`/api/v1/tutors/${f.tutor._id}/availability`).expect(200);
    const today = response.body.slots.filter((slot: any) => slot.date === f.date);
    expect(today).toEqual([{ date: f.date, dayName: f.day, startTime: "11:00", endTime: "12:00" }]);
    expect(response.body.timezone).toBe(f.timezone);
  });

  it("keeps a slot available when an earlier confirmed lesson ends exactly at its start", async () => {
    const f = await fixture();
    await TutorAvailability.create({ tutor: f.tutor._id, weeklySlots: [
      { day: f.day, startTime: "10:30", endTime: "11:30" },
    ], blockedDates: [] });
    await booked(f, "09:30", "10:30");
    const response = await request(app).get(`/api/v1/tutors/${f.tutor._id}/availability`).expect(200);
    expect(response.body.slots).toContainEqual({ date: f.date, dayName: f.day, startTime: "10:30", endTime: "11:30" });
  });

  it("honors blocked dates and does not erase them when weekly hours are updated", async () => {
    const f = await fixture("Asia/Dubai");
    await TutorAvailability.create({ tutor: f.tutor._id, weeklySlots: [
      { day: f.day, startTime: "09:00", endTime: "10:00" },
    ], blockedDates: [f.date] });
    await f.agent.post("/api/v1/tutors/availability").send({
      weeklySlots: [{ day: f.day, startTime: "10:00", endTime: "11:00" }],
    }).expect(200);
    const response = await request(app).get(`/api/v1/tutors/${f.tutor._id}/availability`).expect(200);
    expect(response.body.slots.some((slot: any) => slot.date === f.date)).toBe(false);
    expect((await TutorAvailability.findOne({ tutor: f.tutor._id }))?.blockedDates).toHaveLength(1);
  });

  it("rejects reversed and overlapping weekly hours", async () => {
    const f = await fixture();
    await f.agent.post("/api/v1/tutors/availability")
      .send({ weeklySlots: [{ day: f.day, startTime: "13:00", endTime: "12:00" }] }).expect(400);
    await f.agent.post("/api/v1/tutors/availability")
      .send({ weeklySlots: [
        { day: f.day, startTime: "09:00", endTime: "11:00" },
        { day: f.day, startTime: "10:00", endTime: "12:00" },
      ] }).expect(400);
  });

  it("matches against the saved calendar, even if old profile hours disagree", async () => {
    const f = await fixture();
    await TutorAvailability.create({ tutor: f.tutor._id, weeklySlots: [
      { day: f.day, startTime: "09:00", endTime: "12:00" },
    ], blockedDates: [] });
    const matches = await MatchingService.calculateMatchScore(
      scheduledRequest(f.date, f.timezone), f.profile.toObject() as ITutorProfile,
    );
    expect(matches).not.toBeNull();
    expect((matches?.scoreBreakdown.availability || 0)).toBeGreaterThan(0);
    expect(matches?.reasons).toContain("Available during your requested schedule");
  });

  it("scores hydrated tutor profile documents without losing subject and rate fields", async () => {
    const f = await fixture();
    await TutorAvailability.create({ tutor: f.tutor._id, weeklySlots: [
      { day: f.day, startTime: "08:00", endTime: "12:00" },
    ], blockedDates: [] });
    const result = await MatchingService.calculateMatchScore(scheduledRequest(f.date, f.timezone), f.profile as ITutorProfile);
    expect(result).not.toBeNull();
    expect(result?.scoreBreakdown.subject).toBeGreaterThan(0);
    expect(result?.scoreBreakdown.availability).toBeGreaterThan(0);
  });

  it("does not recommend a calendar-blocked or occupied tutor for an exact interval", async () => {
    const f = await fixture();
    await TutorAvailability.create({ tutor: f.tutor._id, weeklySlots: [
      { day: f.day, startTime: "08:00", endTime: "12:00" },
    ], blockedDates: [f.date] });
    const wanted = scheduledRequest(f.date, f.timezone);
    expect(await MatchingService.calculateMatchScore(wanted, f.profile.toObject() as ITutorProfile)).toBeNull();
    await TutorAvailability.updateOne({ tutor: f.tutor._id }, { $set: { blockedDates: [] } });
    await booked(f, "09:30", "10:30");
    expect(await MatchingService.calculateMatchScore(wanted, f.profile.toObject() as ITutorProfile)).toBeNull();
  });

  it("treats an explicitly empty calendar as unavailable, without using legacy profile hours", async () => {
    const f = await fixture();
    await TutorAvailability.create({ tutor: f.tutor._id, weeklySlots: [], blockedDates: [] });
    expect(await MatchingService.calculateMatchScore(
      scheduledRequest(f.date, f.timezone), f.profile.toObject() as ITutorProfile,
    )).toBeNull();
  });

  it("preserves legacy profile matching when a tutor has never saved a calendar", async () => {
    const f = await fixture();
    const result = await MatchingService.calculateMatchScore(
      scheduledRequest(f.date, f.timezone), f.profile.toObject() as ITutorProfile,
    );
    expect(result).not.toBeNull();
  });
});
