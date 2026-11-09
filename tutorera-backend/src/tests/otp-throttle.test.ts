// src/tests/otp-throttle.test.ts
//
// Covers BE-05 (no rate limiting on OTP requests) from the audit. Confirms
// otpRequestLimiter (max 5 per 15 min, per IP) actually blocks a 6th
// request rather than just existing in code but not being wired to the route.

import request from "supertest";
import app from "../app";

describe("BE-05: forgot-password OTP requests are rate-limited", () => {
  // The limiters skip themselves under NODE_ENV=test so other suites are not throttled;
  // lift that skip (evaluated per request) for this suite only.
  const originalEnv = process.env.NODE_ENV;
  beforeAll(() => { process.env.NODE_ENV = "development"; });
  afterAll(() => { process.env.NODE_ENV = originalEnv; });

  it("allows up to 5 requests, then blocks the 6th with 429", async () => {
    const email = "otp-throttle-test@test.com";

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post("/api/v1/auth/forgot-password").send({ email });
      // Generic success response every time (even for a non-existent email,
      // by design — see BE-05's related email-enumeration protection).
      expect(res.status).toBe(200);
    }

    const sixthAttempt = await request(app).post("/api/v1/auth/forgot-password").send({ email });

    expect(sixthAttempt.status).toBe(429);
    expect(sixthAttempt.body.message).toMatch(/too many/i);
  });
});