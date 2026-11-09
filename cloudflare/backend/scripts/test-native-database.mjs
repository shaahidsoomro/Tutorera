import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from "miniflare";

// All data and credentials below are disposable test fixtures, never production.
const backendRequire = createRequire(new URL("../../../tutorera-backend/package.json", import.meta.url));
const { MongoMemoryReplSet } = backendRequire("mongodb-memory-server");
const mongoose = backendRequire("mongoose");
const User = backendRequire("./dist/models/User.model.js").default;
const TutorProfile = backendRequire("./dist/models/TutorProfile.model.js").default;
let replica;
let worker;

try {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replica.getUri("native_worker_fixture");
  await mongoose.connect(uri);
  await User.create({ name: "Native fixture", email: "native-fixture@example.test", password: "Fixture-password-123", role: "student", isActive: true });
  const roles = {};
  for (const role of ["tutor", "parent", "admin"]) {
    roles[role] = await User.create({ name: `Native ${role}`, email: `native-${role}@example.test`, password: "Fixture-password-123", role, isActive: true, ...(role === "admin" ? { adminRole: "super_admin" } : {}) });
  }
  await TutorProfile.create({ user: roles.tutor._id, fullName: "Native tutor" });

  worker = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    scriptPath: fileURLToPath(new URL("../.wrangler/native-test/worker.js", import.meta.url)),
    compatibilityDate: "2026-10-30", compatibilityFlags: ["nodejs_compat"],
    durableObjects: { BACKEND: { className: "TutoreraBackend", useSQLite: true } },
    log: new Log(LogLevel.ERROR),
    bindings: {
      NODE_ENV: "production", LOG_LEVEL: "silent", PORT: "8080",
      MONGO_URI: uri, JWT_SECRET: "native-fixture-jwt-secret-not-for-production", JWT_EXPIRES_IN: "1h",
      CLIENT_URL: "https://tutorera.ac.pk", USD_PKR_RATE: "1",
      SCHEDULER_MODE: "disabled", ENABLE_SCHEDULED_JOBS: "false", CLOUDFLARE_NATIVE_RUNTIME: "true",
      RESEND_API_KEY: "test-only", RESEND_WEBHOOK_SECRET: "test-only", RESEND: "test-only",
      CLOUDINARY_CLOUD_NAME: "test-only", CLOUDINARY_API_KEY: "test-only", CLOUDINARY_API_SECRET: "test-only",
      EMAIL_USER: "test-only", EMAIL_PASS: "test-only", GROQ_API_KEY: "test-only",
      GOOGLE_CLIENT_ID: "test-only", GOOGLE_CLIENT_SECRET: "test-only",
      RAPID_GATEWAY_MERCHANT_ID: "test-only-merchant", RAPID_GATEWAY_CLIENT_SECRET: "test-only-client-secret",
      RAPID_GATEWAY_WEBHOOK_SECRET: "test-only-webhook-secret", RAPID_GATEWAY_BASE_URL: "https://secure.rapid-gateway.com",
    },
  }));

  async function call(path, options = {}) {
    return worker.dispatchFetch(`https://native-fixture.test${path}`, {
      ...options, headers: { "CF-Connecting-IP": "192.0.2.20", ...options.headers },
    });
  }
  const ready = await call("/health/ready");
  assert.equal(ready.status, 200, "native MongoDB readiness must succeed");
  assert.deepEqual(await ready.json(), { status: "ready" });
  assert.equal((await call("/api/v1/auth/me")).status, 401);
  assert.equal((await call("/api/v1/geo/countries")).status, 200);
  assert.equal(await mongoose.connection.db.collection("marketconfigs").countDocuments(), 0);
  assert.equal(await mongoose.connection.db.collection("taxconfigs").countDocuments(), 0);
  const loggedIn = await call("/api/v1/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "native-fixture@example.test", password: "Fixture-password-123" }),
  });
  const session = await loggedIn.json();
  assert.equal(loggedIn.status, 200, "native bcrypt login must succeed");
  assert.ok(session.token);
  const me = await call("/api/v1/auth/me", { headers: { Authorization: `Bearer ${session.token}` } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.email, "native-fixture@example.test");
  assert.equal((await call("/api/v1/admin/users", { headers: { Authorization: `Bearer ${session.token}` } })).status, 403);
  const tokens = {};
  for (const role of Object.keys(roles)) {
    const result = await call("/api/v1/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `native-${role}@example.test`, password: "Fixture-password-123" }),
    });
    const body = await result.json();
    assert.equal(result.status, 200, `${role} login must succeed`);
    assert.equal(body.user.role, role);
    tokens[role] = body.token;
  }
  assert.equal((await call("/api/v1/admin/users", { headers: { Authorization: `Bearer ${tokens.admin}` } })).status, 200);
  for (const [path, token] of [
    ["/api/v1/earnings/report/pdf", tokens.tutor],
    [`/api/v1/admin/tutors/${roles.tutor._id}/payout-report/pdf`, tokens.admin],
  ]) {
    const response = await call(path, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200, "native payout PDF must render");
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  }
  console.log("Native fixture passed: MongoDB readiness, all four role logins, JWT identity, admin isolation, public-read safety, tutor/admin payout PDFs. No production data, email or payments used.");
} catch (error) {
  console.error("Native fixture failed:", error.name, error.code || "", error instanceof assert.AssertionError || error.code === "ERR_VALIDATION" ? error.message.slice(0, 1800) : "runtime/database failure");
  process.exitCode = 1;
} finally {
  await worker?.dispose();
  await mongoose.disconnect();
  await replica?.stop();
}
