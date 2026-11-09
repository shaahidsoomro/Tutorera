import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { checkPaymentRelease } from "./payment-release-policy.mjs";
const require = createRequire(new URL("../../../tutorera-backend/package.json", import.meta.url));
const dotenv = require("dotenv");
const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const account = "e0f40de5e1f6ab0e29c9b1cb3f9a7102";
const name = "tutorera-backend-preview";
const apply = process.argv.includes("--apply");
const previewToken = randomBytes(32).toString("hex");

try {
  checkPaymentRelease(config.vars);
  if (config.account_id !== account || config.name !== name || config.containers) throw new Error("Preview destination is not approved");
  if (!process.env.RENDER_API_KEY || !process.env.CLOUDFLARE_API_TOKEN) throw new Error("Source/destination credentials are missing");
  const response = await fetch("https://api.render.com/v1/services/srv-d82n6thkh4rs73fef0mg/env-vars?limit=100", {
    headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`, Accept: "application/json" }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Source configuration access failed");
  const rows = await response.json();
  const source = Object.fromEntries(rows.map((row) => { const item = row.envVar || row; return [item.key, item.value]; }));
  const allowed = ["MONGO_URI", "JWT_SECRET", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "EMAIL_USER", "EMAIL_PASS", "RESEND", "GROQ_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "RAPID_GATEWAY_MERCHANT_ID", "RAPID_GATEWAY_CLIENT_SECRET", "RAPID_GATEWAY_WEBHOOK_SECRET", "GEONAMES_USERNAME"];
  const secrets = Object.fromEntries(allowed.filter((key) => source[key]).map((key) => [key, source[key]]));
  const missing = allowed.filter((key) => key !== "GEONAMES_USERNAME" && !secrets[key]);
  if (missing.length) throw new Error(`Required source settings missing: ${missing.join(", ")}`);
  const local = dotenv.parse(readFileSync(new URL("../../../tutorera-backend/.env", import.meta.url)));
  for (const key of ["RAPID_GATEWAY_BASE_URL"]) {
    const url = new URL(source[key] || local[key]);
    if (url.protocol !== "https:" || /sandbox/i.test(url.hostname)) throw new Error("Live RapidPay host is not configured");
    secrets[key] = url.origin;
  }
  secrets.PREVIEW_AUTH_TOKEN = previewToken;
  if (!apply) {
    console.log(`Preview provisioning check passed: ${Object.keys(secrets).length} allowlisted secrets available. No values printed or resources changed.`);
  } else {
    const root = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${name}`;
    const auth = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };
    const existing = await fetch(root + "/settings", { headers: auth, signal: AbortSignal.timeout(15000) });
    if (existing.status !== 404) throw new Error("Preview Worker already exists; refusing to overwrite its code or secret bindings during bootstrap");
    const body = new FormData();
    body.set("metadata", JSON.stringify({
      main_module: "bootstrap.mjs", compatibility_date: "2026-10-30",
      bindings: Object.entries(secrets).map(([key, value]) => ({ name: key, type: "secret_text", text: value })),
    }));
    body.set("bootstrap.mjs", new Blob(['export default {fetch(){return new Response("Preview setup pending",{status:503,headers:{"X-Robots-Tag":"noindex, nofollow"}})}}'], { type: "application/javascript+module" }), "bootstrap.mjs");
    const uploaded = await fetch(root, { method: "PUT", headers: auth, body, signal: AbortSignal.timeout(60000) });
    const result = await uploaded.json();
    if (!uploaded.ok || !result.success) throw new Error(`Preview bootstrap failed (HTTP ${uploaded.status}; codes ${(result.errors || []).map((error) => error.code).join(",")})`);
    console.log("Protected preview bootstrap and allowlisted runtime secrets provisioned. No production route, schedules, billing or Render configuration changed.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
