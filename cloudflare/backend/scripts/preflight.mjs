import { readFileSync } from "node:fs";
import { checkPaymentRelease } from "./payment-release-policy.mjs";

const accountId = "e0f40de5e1f6ab0e29c9b1cb3f9a7102";
const zoneId = "161f01664efbf705463b1d4460a16675";
const production = process.argv.includes("--production");

async function check() {
  const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  checkPaymentRelease(production ? config.env.production.vars : config.vars);
  if (config.containers || config.env.production.containers) throw new Error("Free-tier policy prohibits deploying Cloudflare Containers.");
  const rate = Number((production ? config.env.production.vars : config.vars).USD_PKR_RATE);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("An approved positive USD_PKR_RATE is required.");
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("Set a scoped CLOUDFLARE_API_TOKEN in the local environment or CI secrets; never paste it into chat.");
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID does not match the approved account.");
  }
  async function cloudflare(path) {
    const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (response.status === 404 && path.endsWith("/secrets")) {
      throw new Error("The target backend Worker is not provisioned. Create it and securely populate its backend secrets before deployment.");
    }
    if (!response.ok || !data.success) throw new Error(`Cloudflare access check failed (${response.status}); verify token scopes and resource restrictions.`);
    return data.result;
  }
  const zone = await cloudflare(`/zones/${zoneId}`);
  if (zone.name !== "tutorera.ac.pk" || zone.account?.id !== accountId) {
    throw new Error("The supplied zone does not belong to the approved account/domain; deployment is blocked.");
  }
  const workerName = production ? "tutorera-backend" : "tutorera-backend-preview";
  const secrets = await cloudflare(`/accounts/${accountId}/workers/scripts/${workerName}/secrets`);
  const required = [
    "MONGO_URI", "JWT_SECRET", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET",
    "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
    "EMAIL_USER", "EMAIL_PASS", "RESEND", "GROQ_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
    "RAPID_GATEWAY_MERCHANT_ID", "RAPID_GATEWAY_CLIENT_SECRET", "RAPID_GATEWAY_WEBHOOK_SECRET",
    ...(!production ? ["PREVIEW_AUTH_TOKEN"] : []),
  ];
  const missing = required.filter((name) => !secrets.some((secret) => secret.name === name));
  if (missing.length) throw new Error(`Missing Worker secret names: ${missing.join(", ")}. Populate them securely before deployment.`);
  if (production && !config.env.production.routes.every((route) => route.custom_domain === true)) {
    const records = await cloudflare(`/zones/${zoneId}/dns_records?name=api.tutorera.ac.pk`);
    if (!records.some((record) => record.proxied === true && ["A", "AAAA", "CNAME"].includes(record.type))) {
      throw new Error("api.tutorera.ac.pk needs an existing proxied DNS record before deploying its Worker route.");
    }
  }
  console.log(`Preflight passed for the approved account and zone (${production ? "production" : "preview"}).`);
}

check().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
