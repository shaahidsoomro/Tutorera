import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from "miniflare";

// Fixture-only entry point: exercise the real queue/alarm methods while replacing
// the database and job bodies. Never built into or exposed by production Workers.
const bundle = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL("../src", import.meta.url)),
    contents: `
      import { TutoreraBackend } from './index.ts';
      import { inspectJobQueue } from './queue-inspection.ts';
      Object.defineProperty(TutoreraBackend.prototype, 'runtime', { value: async function () {
        const mode = await this.ctx.storage.get('fixture:mode');
        return {
          validateEnv() {}, assertRapidPayRuntimeConfiguration() {}, io: {},
          mongoose: { connection: { readyState: mode === 'database-down' ? 0 : 1 }, connect: async () => { throw new Error('fixture outage'); } },
          runScheduledJob: async () => {
            await this.ctx.storage.put('fixture:runs', (await this.ctx.storage.get('fixture:runs') || 0) + 1);
            if (mode === 'failure') throw new Error('fixture job failure');
            return { acquired: mode !== 'busy' };
          }
        };
      }});
      export class AlarmFixture extends TutoreraBackend {
        async fetch(request) {
          const body = await request.json();
          if (body.mode) await this.ctx.storage.put('fixture:mode', body.mode);
          if (body.enqueue) await this.enqueue('*/5 * * * *', body.enqueue);
          if (body.seedQueue) {
            for (let i = 0; i < 101; i++) await this.ctx.storage.put('pending:fixture-' + i, {name:'email-outbox-delivery', attempts:0, nextAttempt:Date.now() + 600000, privatePayload:'must-not-be-exposed'});
          }
          if (body.tick) {
            await this.ctx.storage.deleteAlarm();
            for (const [key, value] of await this.ctx.storage.list({prefix:'pending:'})) {
              await this.ctx.storage.put(key, {...value, nextAttempt:0});
            }
            await this.alarm();
          }
          return Response.json({ rows: Object.fromEntries(await this.ctx.storage.list()), alarm: await this.ctx.storage.getAlarm(), queue: await inspectJobQueue(this.ctx.storage) });
        }
      }
      export default { fetch(request, env) { return env.BACKEND.getByName('alarm-fixture').fetch(request); } };
    `,
  },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022",
  external: ["cloudflare:*"],
  plugins: [{ name: "isolate-backend", setup(plugin) {
    plugin.onResolve({ filter: /runtime\/cloudflareBackend$/ }, () => ({ path: "backend", namespace: "fixture" }));
    plugin.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export {};", loader: "js" }));
  } }],
});
const persistence = await mkdtemp(join(tmpdir(), "tutorera-alarm-fixture-"));
let worker;
async function start(enabled) {
  worker = new Miniflare(convertV4MiniflareOptions({
    name: "tutorera-alarm-fixture", modules: true, script: bundle.outputFiles[0].text,
    compatibilityDate: "2026-10-30", compatibilityFlags: ["nodejs_compat"],
    durableObjects: { BACKEND: { className: "AlarmFixture", useSQLite: true, unsafeUniqueKey: "tutorera-isolated-alarm-fixture" } },
    resourcePersistencePath: persistence,
    bindings: { ENABLE_SCHEDULED_JOBS: String(enabled) }, log: new Log(LogLevel.NONE),
  }));
}
async function call(body = {}) {
  const response = await worker.dispatchFetch("https://fixture.test", { method: "POST", body: JSON.stringify(body) });
  assert.equal(response.status, 200);
  return response.json();
}
const pendingKey = (id) => `pending:${id}:email-outbox-delivery`;
try {
  await start(true);
  let result = await call({ enqueue: 100, mode: "busy", tick: true });
  assert.equal(result.rows[pendingKey(100)].attempts, 0);
  assert.ok(result.alarm > Date.now());
  await worker.dispose();
  await start(false);
  result = await call({ tick: true });
  assert.ok(result.rows[pendingKey(100)], `pending queue survives runtime restart: ${JSON.stringify(result)}`);
  assert.equal(result.rows["fixture:runs"], 1, "disabled alarm must not run work");
  assert.equal(result.alarm, null);
  await worker.dispose();
  await start(true);
  result = await call({ enqueue: 100, mode: "database-down", tick: true });
  assert.ok(result.rows[pendingKey(100)]);
  assert.equal(result.rows["fixture:runs"], 1);
  assert.ok(result.alarm > Date.now(), "database outage explicitly rearms alarm");
  result = await call({ mode: "success", tick: true });
  assert.equal(result.rows[pendingKey(100)], undefined);
  assert.ok(result.rows["done:100:email-outbox-delivery"]);
  result = await call({ enqueue: 100 });
  assert.equal(result.rows[pendingKey(100)], undefined, "duplicate dispatch remains completed");
  for (let attempt = 1; attempt <= 3; attempt++) {
    result = await call({ enqueue: 200, mode: "failure", tick: true });
    if (attempt < 3) assert.equal(result.rows[pendingKey(200)].attempts, attempt);
  }
  assert.equal(result.rows[pendingKey(200)], undefined);
  assert.equal(result.rows["failed:200:email-outbox-delivery"].attempts, 3);
  assert.equal(result.queue.pending.length, 0);
  assert.equal(result.queue.failed[0].attempts, 3);
  assert.deepEqual(Object.keys(result.queue.failed[0]).sort(), ["attempts", "id", "name", "nextAttempt"]);
  result = await call({ enqueue: 200 });
  assert.equal(result.rows[pendingKey(200)], undefined, "duplicate Cron cannot silently replay a dead letter");
  result = await call({ seedQueue: true });
  assert.equal(result.queue.pending.length, 100);
  assert.equal(result.queue.pendingTruncated, true);
  assert.equal(JSON.stringify(result.queue).includes("must-not-be-exposed"), false);
  console.log("Native SQLite alarm fixtures passed: restart persistence, pause/resume, busy lease, DB outage, completion deduplication and dead letters. No real jobs or database connections used.");
} finally {
  await worker?.dispose();
  await rm(persistence, { recursive: true, force: true });
}
