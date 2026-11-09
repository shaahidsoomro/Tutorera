import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import MarketConfig from "../models/MarketConfig.model";
import { ensureLaunchMarkets } from "../services/market.service";
import { googleAuthSchema, registerSchema } from "../validators/auth.validator";
import { googleIdToken, installGoogleJwksMock } from "./helpers/googleIdToken";

// No network, outbound emails or external identity service in these tests.
jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));
beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; installGoogleJwksMock(); });
let counter = 0;
const email = () => `market-signup-${Date.now()}-${++counter}@example.test`;
const register = (countryCode: string, role: "student" | "tutor" | "parent" = "student") => ({
  name: "Market Signup Test", email: email(), password: "password123", role, countryCode, preferredLanguage: "en", dateOfBirth: "1999-03-15",
});

describe("Fix 3 — registration market integrity", () => {
  beforeEach(async () => { await ensureLaunchMarkets(); });

  it.each([
    ["AE", "AED", "Asia/Dubai", "United Arab Emirates"],
    ["GB", "GBP", "Europe/London", "United Kingdom"],
    ["PK", "PKR", "Asia/Karachi", "Pakistan"],
  ])("persists selected %s market rather than silently falling back to Pakistan", async (countryCode, currency, timezone, countryName) => {
    const userData = register(countryCode);
    const response = await request(app).post("/api/v1/auth/register").send(userData).expect(201);
    expect(response.body.success).toBe(true);
    const user = await User.findOne({ email: userData.email });
    expect(user).toMatchObject({ countryCode, currency, timezone, countryName, preferredLanguage: "en" });
  });

  it("accepts case-insensitive two-letter market codes but rejects unknown or malformed markets", async () => {
    const countryUser = register("ae");
    await request(app).post("/api/v1/auth/register").send(countryUser).expect(201);
    expect((await User.findOne({ email: countryUser.email }))?.countryCode).toBe("AE");

    const unknown = register("ZZ");
    await request(app).post("/api/v1/auth/register").send(unknown).expect(422);
    expect(await User.findOne({ email: unknown.email })).toBeNull();

    const malformed = register("UAE");
    await request(app).post("/api/v1/auth/register").send(malformed).expect(400);
    expect(await User.findOne({ email: malformed.email })).toBeNull();
  });

  it("rejects registration when the selected market is paused or denies the requested role", async () => {
    await MarketConfig.updateOne({ countryCode: "AE" }, { $set: { studentRegistration: false } });
    const blockedStudent = register("AE");
    await request(app).post("/api/v1/auth/register").send(blockedStudent).expect(422);
    expect(await User.findOne({ email: blockedStudent.email })).toBeNull();

    await MarketConfig.updateOne({ countryCode: "GB" }, { $set: { isActive: false } });
    const pausedTutor = register("GB", "tutor");
    await request(app).post("/api/v1/auth/register").send(pausedTutor).expect(422);
    expect(await User.findOne({ email: pausedTutor.email })).toBeNull();
  });

  it("does not alter default Pakistan behavior for older API clients that omit the country", async () => {
    const data = register("PK");
    const { countryCode: _countryCode, ...legacy } = data;
    await request(app).post("/api/v1/auth/register").send(legacy).expect(201);
    expect((await User.findOne({ email: data.email }))?.countryCode).toBe("PK");
  });

  it("accepts selected AE country for a new verified Google account", async () => {
    const selectedEmail = email();
    const response = await request(app).post("/api/v1/auth/google")
      .send({ idToken: googleIdToken(selectedEmail), role: "tutor", countryCode: "AE", preferredLanguage: "en" })
      .expect(201);
    expect(response.body.user.countryCode).toBe("AE");
    expect(response.body.user.currency).toBe("AED");
    const created = await User.findOne({ email: selectedEmail });
    expect(created).toMatchObject({ countryCode: "AE", countryName: "United Arab Emirates", timezone: "Asia/Dubai", role: "tutor" });
  });

  it("does not silently register Google users into unsupported markets or accept unverified identities", async () => {
    const unsupportedEmail = email();
    await request(app).post("/api/v1/auth/google")
      .send({ idToken: googleIdToken(unsupportedEmail), role: "student", countryCode: "ZZ", dateOfBirth: "1998-01-15" }).expect(422);
    expect(await User.findOne({ email: unsupportedEmail })).toBeNull();

    const unverifiedEmail = email();
    await request(app).post("/api/v1/auth/google")
      .send({ idToken: googleIdToken(unverifiedEmail, { verified: false }), role: "student", countryCode: "AE", dateOfBirth: "1998-01-15" }).expect(401);
    expect(await User.findOne({ email: unverifiedEmail })).toBeNull();
  });

  it("retains an existing user's original country when they sign in from another market", async () => {
    const existing = register("PK");
    await request(app).post("/api/v1/auth/register").send(existing).expect(201);
    const response = await request(app).post("/api/v1/auth/google")
      .send({ idToken: googleIdToken(existing.email), role: "student", countryCode: "GB" }).expect(200);
    expect(response.body.user.countryCode).toBe("PK");
    expect((await User.findOne({ email: existing.email }))?.currency).toBe("PKR");
  });

  it("cannot select a tutor role after market administrators disable tutor registrations", async () => {
    const candidateEmail = email();
    const agent = request.agent(app);
    await agent.post("/api/v1/auth/google")
      .send({ idToken: googleIdToken(candidateEmail), countryCode: "AE" }).expect(201);
    await MarketConfig.updateOne({ countryCode: "AE" }, { $set: { tutorRegistration: false } });
    await agent.patch("/api/v1/auth/select-role").send({ role: "tutor" }).expect(422);
    expect((await User.findOne({ email: candidateEmail }))?.role).toBe("pending");
  });

  it("retains country and language through the validated signup contract", () => {
    expect(registerSchema.parse(register("ae"))).toMatchObject({ countryCode: "AE", preferredLanguage: "en" });
    expect(googleAuthSchema.parse({ idToken: "test", countryCode: "gb" }).countryCode).toBe("GB");
  });
});
