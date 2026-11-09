import { createHash } from "node:crypto";
import type mongoose from "mongoose";
import MigrationLedger from "../models/MigrationLedger.model";

type Mongoose = typeof mongoose;

export interface SchemaSyncFailure { model: string; error: string }
export interface SchemaSyncResult { models: number; failures: SchemaSyncFailure[] }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Changes whenever any registered model's collection name or index set changes. */
export function schemaFingerprint(instance: Mongoose): string {
  const parts = instance.modelNames().sort().map((name) => {
    const model = instance.model(name);
    return [name, model.collection.collectionName, JSON.stringify(model.schema.indexes())];
  });
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

/**
 * Creates every missing collection and declared index. Additive only: it never
 * drops or changes an existing index (unlike Model.syncIndexes), and a failure
 * on one model (for example a unique index over duplicate data) is recorded
 * without stopping the others.
 */
export async function syncSchema(instance: Mongoose, options: { only?: string[]; delayMs?: number } = {}): Promise<SchemaSyncResult> {
  const names = instance.modelNames().filter((name) => !options.only || options.only.includes(name));
  const failures: SchemaSyncFailure[] = [];
  for (const name of names) {
    const model = instance.model(name);
    try {
      try { await model.createCollection(); }
      catch (error) { if ((error as { code?: number }).code !== 48) throw error; } // 48 = already exists
      await model.createIndexes();
    } catch (error) {
      failures.push({ model: name, error: (error as Error).message.slice(0, 300) });
    }
    if (options.delayMs) await sleep(options.delayMs);
  }
  return { models: names.length, failures };
}

const RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000;

/**
 * Runtime entry point (Cloudflare worker, where autoIndex/autoCreate are off).
 * Builds missing collections/indexes once per schema fingerprint, in the
 * background, gently (a short pause between models keeps the single pooled
 * connection available to requests). Returns what it did, or why it skipped.
 */
export async function ensureSchemaOnce(instance: Mongoose, options: { readOnly?: boolean } = {}): Promise<"skipped-read-only" | "up-to-date" | "retry-later" | "applied" | "failed"> {
  if (options.readOnly) return "skipped-read-only";
  const name = `schema-sync:${schemaFingerprint(instance)}`;
  const previous = await MigrationLedger.findOne({ name }).sort({ updatedAt: -1 }).lean();
  if (previous?.status === "applied") return "up-to-date";
  if (previous?.status === "failed" && Date.now() - new Date(previous.updatedAt).getTime() < RETRY_AFTER_FAILURE_MS) return "retry-later";

  const startedAt = Date.now();
  const result = await syncSchema(instance, { delayMs: 25 });
  const status = result.failures.length === 0 ? "applied" : "failed";
  await MigrationLedger.findOneAndUpdate({ name }, {
    $set: {
      name, status, plannedAt: new Date(startedAt), appliedAt: new Date(), durationMs: Date.now() - startedAt,
      matched: result.models, modified: result.models - result.failures.length,
      report: { failures: result.failures }, error: result.failures.length ? `${result.failures.length} model(s) failed` : undefined,
    },
  }, { upsert: true });
  if (result.failures.length) console.error("schema_sync_failures", JSON.stringify(result.failures));
  return status;
}
