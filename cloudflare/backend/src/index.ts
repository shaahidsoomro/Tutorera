import { DurableObject } from "cloudflare:workers";
import { handleAsNodeRequest } from "cloudflare:node";
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { JOB_SCHEDULES, type ScheduledJobName } from "../../../tutorera-backend/src/config/scheduledJobs";
import { forwardToBackend, isInternalPath } from "./policy";
import { runQueuedJob } from "./job-outcome";
import { inspectJobQueue } from "./queue-inspection";

interface Env {
  BACKEND: DurableObjectNamespace<TutoreraBackend>;
  MONGO_URI: string;
  ENABLE_SCHEDULED_JOBS: string;
  MAINTENANCE_MODE?: string;
  PREVIEW_AUTH_TOKEN?: string;
  PREVIEW_READ_ONLY?: string;
}
interface PendingJob { name: ScheduledJobName; attempts: number; nextAttempt: number }

type BackendModule = typeof import("../../../tutorera-backend/src/runtime/cloudflareBackend");
type NativeRuntime = BackendModule & { io: ReturnType<BackendModule["initSocket"]> };

export class TutoreraBackend extends DurableObject<Env> {
  private connecting?: Promise<unknown>;
  private validated = false;
  private schemaSync?: Promise<void>;
  private initializing?: Promise<NativeRuntime>;

  private runtime(): Promise<NativeRuntime> {
    // Worker bindings are exposed on `env`, whereas the existing Express
    // application correctly reads its configuration from process.env. Populate
    // only string bindings before importing that application so validation and
    // provider modules see the same values in a Durable Object as in Node.
    for (const [key, value] of Object.entries(this.env)) {
      if (typeof value === "string") process.env[key] = value;
    }
    // Existing dependencies initialize timers/random identifiers on import.
    // Evaluate them inside this DO's request context, never Worker global scope.
    this.initializing ??= import("../../../tutorera-backend/src/runtime/cloudflareBackend").then((backend) => {
      const server = http.createServer(backend.app);
      const io = backend.initSocket(server, { pollingOnly: true });
      backend.app.set("io", io);
      backend.app.set("nativeJobQueueInspector", () => inspectJobQueue(this.ctx.storage));
      server.listen(8080);
      return { ...backend, io };
    }).catch((error: unknown) => {
      const failure = error as { name?: string; code?: string; stack?: string };
      console.error("native_runtime_initialization_failed", {
        name: failure.name, code: failure.code,
        frames: failure.stack?.split("\n").slice(1, 4).join("\n"),
      });
      throw error;
    });
    return this.initializing;
  }

  private async ensureDatabase(): Promise<void> {
    const { mongoose, validateEnv, assertRapidPayRuntimeConfiguration, ensureSchemaOnce } = await this.runtime();
    if (!this.validated) {
      validateEnv({ throwOnError: true });
      assertRapidPayRuntimeConfiguration();
      this.validated = true;
    }
    if (mongoose.connection.readyState !== 1) {
      this.connecting ??= mongoose.connect(this.env.MONGO_URI, {
        autoIndex: false, autoCreate: false,
        maxPoolSize: 1, minPoolSize: 0, maxConnecting: 1,
        serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000,
      }).finally(() => { this.connecting = undefined; });
      await this.connecting;
    }
    // autoIndex/autoCreate stay off for fast cold starts, so build missing
    // collections/indexes once per index-definition change, in the background.
    // The read-only preview never writes.
    this.schemaSync ??= ensureSchemaOnce(mongoose, { readOnly: this.env.PREVIEW_READ_ONLY === "true" })
      .then((outcome) => console.log("schema_sync", outcome))
      .catch((error: unknown) => console.error("schema_sync_error", (error as Error).message));
    this.ctx.waitUntil(this.schemaSync);
  }

  async fetch(request: Request): Promise<Response> {
    await this.runtime();
    if (new URL(request.url).pathname !== "/health/live") await this.ensureDatabase();
    return handleAsNodeRequest(8080, request);
  }

  /** Durable RPC is not exposed by the public fetch handler. */
  async enqueue(cron: string, scheduledAt: number): Promise<void> {
    if (this.env.ENABLE_SCHEDULED_JOBS !== "true") return;
    const jobs = JOB_SCHEDULES.filter((job) => job.cron === cron);
    await this.ctx.storage.transaction(async (storage) => {
      for (const job of jobs) {
        const id = scheduledAt + ":" + job.name;
        if (await storage.get("done:" + id) || await storage.get("pending:" + id) || await storage.get("failed:" + id)) continue;
        await storage.put("pending:" + id, { name: job.name, attempts: 0, nextAttempt: Date.now() } satisfies PendingJob);
      }
      const alarm = await storage.getAlarm();
      if (jobs.length && (alarm === null || alarm > Date.now() + 1000)) await storage.setAlarm(Date.now() + 1000);
    });
  }

  async alarm(): Promise<void> {
    // Existing alarms survive deployments. Pausing dispatch must also pause
    // already queued work, without discarding it or contacting the database.
    if (this.env.ENABLE_SCHEDULED_JOBS !== "true") {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    try {
      await this.ensureDatabase();
    } catch {
      // Do not exhaust the platform's finite alarm retries during a DB outage.
      await this.ctx.storage.setAlarm(Date.now() + 60_000);
      console.error("scheduled_job_database_unavailable");
      return;
    }
    const { runScheduledJob, io } = await this.runtime();
    const pending = await this.ctx.storage.list<PendingJob>({ prefix: "pending:", limit: 1000 });
    for (const [key, job] of [...pending].filter(([, job]) => job.nextAttempt <= Date.now()).slice(0, 3)) {
      const outcome = await runQueuedJob(async () => {
        if (!JOB_SCHEDULES.some((schedule) => schedule.name === job.name)) throw new Error("Unknown job");
        return runScheduledJob(job.name, io);
      }, job.attempts, Date.now());
      await this.ctx.storage.transaction(async (storage) => {
        if (outcome.state === "done") {
          await storage.put(key.replace("pending:", "done:"), Date.now());
          await storage.delete(key);
        } else if (outcome.state === "failed") {
          await storage.put(key.replace("pending:", "failed:"), { ...job, attempts: outcome.attempts });
          await storage.delete(key);
        } else {
          await storage.put(key, { ...job, attempts: outcome.attempts, nextAttempt: outcome.nextAttempt });
        }
      });
      if (outcome.state === "failed") console.error("scheduled_job_dead_letter", job.name);
    }
    const remaining = await this.ctx.storage.list<PendingJob>({ prefix: "pending:", limit: 1000 });
    if (remaining.size) await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, Math.min(...[...remaining.values()].map((job) => job.nextAttempt))));
    const completed = await this.ctx.storage.list<number>({ prefix: "done:", limit: 1000 });
    const expired = [...completed].filter(([, at]) => at < Date.now() - 7 * 86400_000).map(([key]) => key);
    if (expired.length) await this.ctx.storage.delete(expired);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (env.PREVIEW_READ_ONLY === "true" && (!env.PREVIEW_AUTH_TOKEN || env.PREVIEW_AUTH_TOKEN.length < 32)) {
      return new Response("Preview not configured", { status: 503, headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
    }
    if (env.PREVIEW_AUTH_TOKEN) {
      const supplied = request.headers.get("X-Tutorera-Preview-Token") || "";
      if (Buffer.byteLength(supplied) !== Buffer.byteLength(env.PREVIEW_AUTH_TOKEN) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(env.PREVIEW_AUTH_TOKEN))) {
        return new Response("Private preview", { status: 401, headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
      }
    }
    // Used only for controlled data cutovers. Keep health checks and ordinary
    // reads available, but fence every state-changing request before it can
    // reach Express/MongoDB so a source-to-target copy cannot lose writes.
    if (env.MAINTENANCE_MODE === "true" && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return Response.json({ success: false, code: "MAINTENANCE", message: "TUTORERA is briefly undergoing scheduled maintenance. Please try again shortly." }, {
        status: 503,
        headers: { "Retry-After": "120", "Cache-Control": "no-store" },
      });
    }
    if (isInternalPath(request)) return new Response("Not found", { status: 404 });
    if (env.PREVIEW_READ_ONLY === "true" && (request.method !== "GET" || !["/health/live", "/health/ready", "/api/v1/auth/me", "/api/v1/geo/countries"].includes(new URL(request.url).pathname))) {
      return new Response("Preview operation disabled", { status: 403, headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
    }
    try {
      const response = await env.BACKEND.getByName("api-primary-v2").fetch(forwardToBackend(request));
      if (env.PREVIEW_AUTH_TOKEN) {
        const headers = new Headers(response.headers);
        headers.set("X-Robots-Tag", "noindex, nofollow");
        headers.set("Cache-Control", "no-store");
        return new Response(response.body, { status: response.status, headers });
      }
      return response;
    } catch (error) {
      const failure = error as { name?: string; code?: string; message?: string };
      console.error("backend_unavailable", {
        name: failure.name,
        code: failure.code,
        // Never log a connection string. The driver error message is retained
        // only when it does not contain an URI credential delimiter.
        message: failure.message?.includes("@") ? "redacted connection failure" : failure.message,
      });
      return Response.json({ success: false, message: "Service temporarily unavailable" }, {
        status: 503, headers: { "Retry-After": "30", "Cache-Control": "no-store" },
      });
    }
  },
  async scheduled(event: ScheduledController, env: Env): Promise<void> {
    if (env.ENABLE_SCHEDULED_JOBS === "true") await env.BACKEND.getByName("api-primary-v2").enqueue(event.cron, event.scheduledTime);
  },
} satisfies ExportedHandler<Env>;
