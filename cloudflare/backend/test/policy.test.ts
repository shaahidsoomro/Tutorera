import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { forwardToBackend, isInternalPath } from "../src/policy.ts";
import { JOB_SCHEDULES } from "../../../tutorera-backend/src/config/scheduledJobs.ts";

test("proxy removes forged job and identity headers while retaining authentication and raw body", async () => {
  const raw = '{ "payment": 1, "ref": "a" }';
  const forwarded = forwardToBackend(new Request("https://api.tutorera.ac.pk/api/v1/payments/rapidpay/webhook?signature=test", {
    method: "POST", body: raw,
    headers: { "X-Tutorera-Job-Token": "forged", "X-Tutorera-Preview-Token": "private-preview", "X-Forwarded-For": "forged", Forwarded: "forged", "CF-Connecting-IP": "192.0.2.1", Authorization: "Bearer test", Cookie: "token=test", "Content-Type": "application/json" },
  }));
  assert.equal(forwarded.headers.get("X-Tutorera-Job-Token"), null);
  assert.equal(forwarded.headers.get("X-Tutorera-Preview-Token"), null);
  assert.equal(forwarded.headers.get("forwarded"), null);
  assert.equal(forwarded.headers.get("X-Forwarded-For"), "192.0.2.1");
  assert.equal(forwarded.headers.get("X-Forwarded-Proto"), "https");
  assert.equal(forwarded.headers.get("Authorization"), "Bearer test");
  assert.equal(forwarded.headers.get("Cookie"), "token=test");
  assert.equal(await forwarded.text(), raw);
  assert.equal(new URL(forwarded.url).search, "?signature=test");
});

test("proxy retains WebSocket upgrade headers", () => {
  const forwarded = forwardToBackend(new Request("https://api.tutorera.ac.pk/socket.io/?transport=websocket", { headers: { Upgrade: "websocket", Connection: "Upgrade" } }));
  assert.equal(forwarded.headers.get("upgrade"), "websocket");
});

test("internal job paths cannot be invoked through the public worker", () => {
  assert.equal(isInternalPath(new Request("https://api.tutorera.ac.pk/internal/jobs/email-outbox-delivery")), true);
  assert.equal(isInternalPath(new Request("https://api.tutorera.ac.pk/INTERNAL/jobs/test")), true);
  assert.equal(isInternalPath(new Request("https://api.tutorera.ac.pk/api/v1/tutors")), false);
});

test("every backend schedule has a production Cron trigger without paid Containers", () => {
  const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  for (const job of JOB_SCHEDULES) assert.ok(config.env.production.triggers.crons.includes(job.cron), job.name);
  assert.equal(config.containers, undefined);
  assert.equal(config.env.production.containers, undefined);
  assert.equal(config.queues, undefined);
  assert.ok(config.migrations[0].new_sqlite_classes.includes("TutoreraBackend"));
});

test("preview cannot claim the production API route or start scheduled jobs", () => {
  const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.account_id, "e0f40de5e1f6ab0e29c9b1cb3f9a7102");
  assert.ok(config.routes.every((route) => route.pattern === "api-preview.tutorera.ac.pk" && route.custom_domain));
  assert.equal(config.vars.PREVIEW_READ_ONLY, "true");
  assert.equal(config.triggers, undefined);
  assert.equal(config.vars.SCHEDULER_MODE, "disabled");
  assert.equal(config.vars.ENABLE_SCHEDULED_JOBS, "false");
  assert.equal(config.env.production.routes[0].pattern, "api.tutorera.ac.pk");
  assert.equal(config.env.production.routes[0].custom_domain, true);
});
