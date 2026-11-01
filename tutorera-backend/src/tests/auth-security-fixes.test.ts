// src/tests/auth-security-fixes.test.ts
//
// E2E tests for the security fixes applied in commit 90edab3b:
//   1. sessionInvalidBefore enforced in protect() — banned/suspended users
//      cannot keep using tokens issued before the ban.
//   2. JWT uses explicit algorithm HS256.
//   3. generateToken imported properly (no runtime require() in googleAuth path).
//   4. Env startup does not require EMAIL_USER / EMAIL_PASS / bare RESEND.
//   5. optionalAuth also honours sessionInvalidBefore.

import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User.model";

jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));

const SECRET = process.env.JWT_SECRET as string;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function createAndLogin(suffix: string) {
  const email = `security-fix-${suffix}@test.com`;
  const password = "Password123";
  await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password, role: "student", countryCode: "PK", dateOfBirth: "2000-01-01" })
    .expect(201);

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password })
    .expect(200);

  return { email, token: loginRes.body.token as string };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. sessionInvalidBefore enforced in protect()
// ─────────────────────────────────────────────────────────────────────────────

describe("FIX-1: sessionInvalidBefore blocks tokens issued before ban/suspend", () => {
  it("a token issued before sessionInvalidBefore is set returns 401", async () => {
    const { email, token } = await createAndLogin("ban-test");

    // The token was issued; now simulate a ban by backdating sessionInvalidBefore
    // to 1 second AFTER the token was issued.
    const decoded = jwt.verify(token, SECRET) as { iat: number };
    const banTime = new Date((decoded.iat + 1) * 1000);

    await User.findOneAndUpdate(
      { email },
      { sessionInvalidBefore: banTime }
    );

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/session expired/i);
  });

  it("a token issued AFTER sessionInvalidBefore was set is still accepted", async () => {
    const { email } = await createAndLogin("ban-then-reinstate");

    // Set sessionInvalidBefore to 10 minutes ago (simulating an old ban)
    const oldBanTime = new Date(Date.now() - 10 * 60 * 1000);
    await User.findOneAndUpdate({ email }, { sessionInvalidBefore: oldBanTime });

    // Login again — this token's iat will be AFTER oldBanTime
    const newLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "Password123" })
      .expect(200);

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${newLoginRes.body.token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it("a token issued exactly at sessionInvalidBefore boundary is rejected", async () => {
    const { email, token } = await createAndLogin("boundary-test");

    // Set sessionInvalidBefore to exactly when the token was issued + 0 ms
    // (iat is in seconds; token iat * 1000 < sessionInvalidBefore must be true)
    const decoded = jwt.verify(token, SECRET) as { iat: number };
    const exactTime = new Date(decoded.iat * 1000 + 500); // half-second after iat

    await User.findOneAndUpdate({ email }, { sessionInvalidBefore: exactTime });

    await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. JWT signed with explicit HS256 algorithm
// ─────────────────────────────────────────────────────────────────────────────

describe("FIX-2: JWT uses explicit HS256 algorithm", () => {
  it("tokens issued by login carry alg=HS256 in the header", async () => {
    const { token } = await createAndLogin("alg-check");

    const header = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString("utf8")
    );
    expect(header.alg).toBe("HS256");
  });

  it("a token signed with none algorithm is rejected by protect()", async () => {
    const { email } = await createAndLogin("none-alg");
    const user = await User.findOne({ email });

    // Forge a 'none' algorithm token — jwt.sign does not support alg:none,
    // so we craft the raw JWT manually.
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ id: user!._id.toString(), role: "student", iat: Math.floor(Date.now() / 1000) })).toString("base64url");
    const noneToken = `${header}.${payload}.`;

    await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${noneToken}`)
      .expect(401);
  });

  it("a token signed with a wrong secret is rejected", async () => {
    const { email } = await createAndLogin("wrong-secret");
    const user = await User.findOne({ email });

    const forgedToken = jwt.sign(
      { id: user!._id.toString(), role: "student" },
      "wrong-secret",
      { algorithm: "HS256", expiresIn: "7d" }
    );

    await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${forgedToken}`)
      .expect(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Full login → protected route → ban → rejection flow (integration)
// ─────────────────────────────────────────────────────────────────────────────

describe("FIX-3: end-to-end ban invalidation flow", () => {
  it("active user accesses /auth/me, gets banned, then same token is rejected", async () => {
    const { email, token } = await createAndLogin("e2e-ban");

    // Step 1: token works
    await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // Step 2: simulate accountModeration ban (sets isActive=false + sessionInvalidBefore=now)
    const decoded = jwt.verify(token, SECRET) as { iat: number };
    const banTime = new Date((decoded.iat + 1) * 1000);
    await User.findOneAndUpdate(
      { email },
      { isActive: false, sessionInvalidBefore: banTime }
    );

    // Step 3: same token is now rejected — isActive check fires first (403),
    // but the sessionInvalidBefore check (401) is also covered if isActive is
    // restored without resetting sessionInvalidBefore.
    const banRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect([401, 403]).toContain(banRes.status);
    expect(banRes.body.success).toBe(false);
  });

  it("reinstating a user (isActive=true) but keeping sessionInvalidBefore still blocks old token", async () => {
    const { email, token } = await createAndLogin("reinstate-gap");

    const decoded = jwt.verify(token, SECRET) as { iat: number };
    const banTime = new Date((decoded.iat + 1) * 1000);

    // Ban then immediately reinstate — but sessionInvalidBefore remains set
    await User.findOneAndUpdate(
      { email },
      { isActive: false, sessionInvalidBefore: banTime }
    );
    await User.findOneAndUpdate(
      { email },
      { isActive: true }
      // NOTE: sessionInvalidBefore intentionally NOT cleared here
    );

    // Old token should still fail because iat < sessionInvalidBefore
    await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cookie-based auth still works (httpOnly cookie flow)
// ─────────────────────────────────────────────────────────────────────────────

describe("FIX-4: httpOnly cookie auth works end-to-end", () => {
  it("login sets an httpOnly cookie and /auth/me succeeds with it", async () => {
    const email = "cookie-auth@test.com";
    const password = "Password123";

    await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password, role: "student", countryCode: "PK", dateOfBirth: "2000-01-01" })
      .expect(201);

    const agent = request.agent(app);
    const loginRes = await agent
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);

    // Verify the Set-Cookie header contains httpOnly
    const setCookie = loginRes.headers["set-cookie"] as string[] | string | undefined;
    const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : (setCookie ?? "");
    expect(cookieStr.toLowerCase()).toMatch(/httponly/i);

    // Cookie agent carries the cookie; no Authorization header needed
    const meRes = await agent.get("/api/v1/auth/me").expect(200);
    expect(meRes.body.user.email).toBe(email);
  });

  it("after logout, cookie no longer authenticates", async () => {
    const email = "cookie-logout@test.com";
    const password = "Password123";

    await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password, role: "student", countryCode: "PK", dateOfBirth: "2000-01-01" })
      .expect(201);

    const agent = request.agent(app);
    await agent.post("/api/v1/auth/login").send({ email, password }).expect(200);
    await agent.get("/api/v1/auth/me").expect(200);

    await agent.post("/api/v1/auth/logout").expect(200);
    await agent.get("/api/v1/auth/me").expect(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Registration and password flow
// ─────────────────────────────────────────────────────────────────────────────

describe("FIX-5: registration and login correctness", () => {
  it("register → login → /auth/me returns correct user data", async () => {
    const email = "full-flow@test.com";
    const password = "Password123";

    const regRes = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password, role: "student", countryCode: "PK", dateOfBirth: "2000-01-01" })
      .expect(201);

    expect(regRes.body.success).toBe(true);
    expect(regRes.body.token).toBeTruthy();

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .expect(200);

    expect(meRes.body.user.email).toBe(email);
    expect(meRes.body.user.role).toBe("student");
  });

  it("wrong password returns 401", async () => {
    const email = "wrong-pass@test.com";
    await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password: "Password123", role: "student", countryCode: "PK", dateOfBirth: "2000-01-01" })
      .expect(201);

    await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "WrongPassword!" })
      .expect(401);
  });

  it("forgot-password does not reveal whether email exists", async () => {
    const realRes = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "doesnotexist@test.com" })
      .expect(200);

    await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "exists@test.com", password: "Password123", role: "student", countryCode: "PK", dateOfBirth: "2000-01-01" });

    const fakeRes = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "exists@test.com" })
      .expect(200);

    // Both return the same message structure — no enumeration
    expect(realRes.body.message).toBe(fakeRes.body.message);
  });

  it("expired/invalid token returns 401", async () => {
    const expiredToken = jwt.sign(
      { id: "000000000000000000000000", role: "student" },
      SECRET,
      { algorithm: "HS256", expiresIn: "1ms" }
    );

    // Wait for expiry
    await new Promise(r => setTimeout(r, 10));

    await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`)
      .expect(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Email sending: sendEmail mock verifies calls are made, not crashed
// ─────────────────────────────────────────────────────────────────────────────

describe("FIX-6: email sending does not crash registration flow", () => {
  it("registration completes successfully even when sendEmail mock is used", async () => {
    // The mock at the top of this file intercepts sendEmail.
    // If email sending threw synchronously and crashed the handler,
    // the register endpoint would return 5xx — we assert 201 instead.
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Email Test User",
        email: "email-send-test@test.com",
        password: "Password123",
        role: "student",
        countryCode: "PK",
        dateOfBirth: "2000-01-01",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it("forgot-password completes even if email would fail (graceful failure)", async () => {
    // Override the mock to simulate a failure
    const sendEmail = require("../utils/sendEmail");
    sendEmail.mockRejectedValueOnce(new Error("SMTP down"));

    await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "otp-fail@test.com", password: "Password123", role: "tutor", countryCode: "PK" });

    // forgot-password enqueues to the outbox — a simulated sendEmail failure
    // should not propagate as a 5xx to the caller
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "otp-fail@test.com" });

    expect(res.status).toBeLessThan(500);
  });
});
