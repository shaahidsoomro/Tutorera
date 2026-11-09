import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from "miniflare";

const backendRequire = createRequire(new URL("../../../tutorera-backend/package.json", import.meta.url));
const dotenv = backendRequire("dotenv");
const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const local = dotenv.parse(readFileSync(new URL("../../../tutorera-backend/.env", import.meta.url)));
const allowlist = ["MONGO_URI", "JWT_SECRET", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "EMAIL_USER", "EMAIL_PASS", "RESEND", "GROQ_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "RAPID_GATEWAY_MERCHANT_ID", "RAPID_GATEWAY_CLIENT_SECRET", "RAPID_GATEWAY_WEBHOOK_SECRET", "GEONAMES_USERNAME"];
let worker;

try {
  if (!process.env.RENDER_API_KEY) throw new Error("Source runtime access is not configured");
  const response = await fetch("https://api.render.com/v1/services/srv-d82n6thkh4rs73fef0mg/env-vars?limit=100", {
    headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`, Accept: "application/json" }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Source runtime access failed");
  const rows = await response.json();
  const source = Object.fromEntries(rows.map((row) => { const item = row.envVar || row; return [item.key, item.value]; }));
  const bindings = { ...config.vars, LOG_LEVEL: "silent", ENABLE_SCHEDULED_JOBS: "false" };
  for (const key of allowlist) if (source[key]) bindings[key] = source[key];
  for (const key of ["RAPID_GATEWAY_BASE_URL"]) {
    const value = source[key] || local[key];
    const url = new URL(value);
    if (url.protocol !== "https:" || /sandbox/i.test(url.hostname)) throw new Error("Approved live RapidPay host is missing");
    bindings[key] = value;
  }
  // Runtime secrets stay in this process; no env file, Worker or DNS is written.
  worker = new Miniflare(convertV4MiniflareOptions({
    modules: true, scriptPath: fileURLToPath(new URL("../.wrangler/native-test/worker.js", import.meta.url)),
    compatibilityDate: "2026-10-30", compatibilityFlags: ["nodejs_compat"],
    durableObjects: { BACKEND: { className: "TutoreraBackend", useSQLite: true } },
    log: new Log(LogLevel.ERROR), bindings,
  }));
  for (const [path, expected] of [["/health/ready", 200], ["/api/v1/auth/me", 401], ["/internal/jobs/email-outbox-delivery", 404]]) {
    const result = await worker.dispatchFetch(`https://native-readonly.test${path}`, { headers: { "CF-Connecting-IP": "192.0.2.40" } });
    await result.body?.cancel();
    console.log(JSON.stringify({ check: "native-authoritative-readonly", path, status: result.status, expected }));
    if (result.status !== expected) throw new Error("Native authoritative read-only check failed");
  }
  console.log("Native authoritative configuration checks passed; no production data, schedules, email, payments, deployment or DNS were changed.");
} catch (error) {
  console.error("Native authoritative check failed:", /^(Source|Approved|Native)/.test(error.message || "") ? error.message : "runtime/database failure");
  process.exitCode = 1;
} finally {
  await worker?.dispose();
}
