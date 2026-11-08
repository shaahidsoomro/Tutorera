/**
 * auditDatabaseIndexes.ts
 *
 * Connects to the target MongoDB, lists every actual index on every collection,
 * and compares them against what the Mongoose schemas declare.  Surfaces drift
 * between schema declarations and production indexes before a load test or
 * cutover.
 *
 * Usage:
 *   MONGO_URI=<uri> npx ts-node -e "require('./src/scripts/auditDatabaseIndexes')"
 *   Or: npx ts-node src/scripts/auditDatabaseIndexes.ts
 *
 * Exit 0 — no missing indexes found (extras are reported but not fatal).
 * Exit 1 — at least one schema-declared index is absent from the database.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { readdirSync } from "node:fs";
import { join } from "node:path";
dotenv.config();

// Import all models so their schemas are registered and autoIndex metadata is
// available.  Add new models here as they are created.
import "../models/User.model";
import "../models/TutorProfile.model";
import "../models/StudentProfile.model";
import "../models/Booking.model";
import "../models/Request.model";
import "../models/OfferNegotiation.model";
import "../models/PaymentLedger.model";
import "../models/PayoutReport.model";
import "../models/TutorPayout.model";
import "../models/AuditLog.model";
import "../models/TutorApplicationStatusHistory.model";
import "../models/TutorDocumentReview.model";
import "../models/AdminVerificationReview.model";
import "../models/ScheduledJobLease.model";
import "../models/ScheduledJobRun.model";
import "../models/EmailOutbox.model";
import "../models/EmailLog.model";
import "../models/Broadcast.model";
import "../models/Notification.model";
import "../models/Review.model";
import "../models/Contact.model";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is required");
  process.exit(1);
}

interface IndexInfo {
  name: string;
  key: Record<string, unknown>;
  unique?: boolean;
  sparse?: boolean;
  partialFilterExpression?: unknown;
  expireAfterSeconds?: number;
  weights?: Record<string, number>;
}

// MongoDB may simplify {$exists:true,$type:"string"} to {$type:"string"}.
function normalizeFilter(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeFilter);
  if (!value || typeof value !== "object") return value;
  const input = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(input).sort().filter(key => !(key === "$exists" && input[key] === true && "$type" in input)).map(key => [key, normalizeFilter(input[key])]));
}

function matchesIndex(index: IndexInfo, key: Record<string, unknown>, options: Record<string, unknown>): boolean {
  const textFields = Object.entries(key).filter(([, type]) => type === "text").map(([name]) => name);
  const keyMatches = normalizeKey(index.key) === normalizeKey(key) ||
    (textFields.length === Object.keys(key).length && textFields.length > 0 && textFields.every(field => index.weights && field in index.weights));
  return !!keyMatches && !!index.unique === !!options.unique && !!index.sparse === !!options.sparse &&
    (index.expireAfterSeconds ?? null) === (options.expireAfterSeconds ?? null) &&
    JSON.stringify(normalizeFilter(index.partialFilterExpression ?? null)) === JSON.stringify(normalizeFilter(options.partialFilterExpression ?? null));
}

function normalizeKey(key: Record<string, unknown>): string {
  return Object.entries(key)
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
}

async function main(): Promise<void> {
  // Load every model from the same source/build tree as this script.
  for (const file of readdirSync(join(__dirname, "../models")).filter(file => file.endsWith(`.model${__filename.endsWith(".ts") ? ".ts" : ".js"}`))) {
    require(join(__dirname, "../models", file));
  }
  await mongoose.connect(MONGO_URI as string, { autoIndex: false, autoCreate: false });
  const db = mongoose.connection.db!;
  let missingCount = 0;

  console.log("\n=== MongoDB Index Audit ===\n");

  for (const modelName of mongoose.modelNames()) {
    const model = mongoose.model(modelName);
    const collectionName = model.collection.collectionName;

    // Fetch indexes actually present in the database
    let liveIndexes: IndexInfo[] = [];
    try {
      liveIndexes = await db.collection(collectionName).indexes() as IndexInfo[];
    } catch (error) {
      if ((error as { code?: number }).code !== 26) throw error;
      console.warn(`  [MISSING] Collection ${collectionName}`);
      missingCount++;
      continue;
    }

    const liveKeys = new Set(liveIndexes.map((i) => normalizeKey(i.key)));

    // Collect declared indexes from the schema
    const schema = model.schema;
    const declaredIndexes: Array<{ key: Record<string, unknown>; options?: Record<string, unknown> }> = [];

    // Schema-level indexes (from schema.index() calls)
    for (const [fields, opts] of schema.indexes()) {
      declaredIndexes.push({ key: fields as Record<string, unknown>, options: opts as Record<string, unknown> });
    }
    // schema.indexes() includes path-level declarations, preserving their
    // actual types (for example 2dsphere) instead of inventing ascending keys.

    const missing: string[] = [];
    const extra: string[] = [];

    for (const idx of declaredIndexes) {
      const normalised = normalizeKey(idx.key);
      if (!liveIndexes.some(live => matchesIndex(live, idx.key, idx.options || {})) && normalised !== "_id:1") {
        missing.push(normalised);
      }
    }

    const schemaKeys = new Set(declaredIndexes.map((i) => normalizeKey(i.key)));
    for (const live of liveIndexes) {
      const normalised = normalizeKey(live.key);
      if (normalised !== "_id:1" && !schemaKeys.has(normalised)) {
        extra.push(`${normalised}${live.unique ? " [unique]" : ""}${live.partialFilterExpression ? " [partial]" : ""}`);
      }
    }

    if (missing.length || extra.length) {
      console.log(`Collection: ${collectionName}`);
      for (const m of missing) {
        console.log(`  ❌ MISSING  ${m}`);
        missingCount++;
      }
      for (const e of extra) {
        console.log(`  ➕ EXTRA    ${e}  (not declared in schema — may be a legacy index)`);
      }
      console.log();
    } else {
      console.log(`Collection: ${collectionName}  ✅ (${liveIndexes.length - 1} indexes, schema matches live)`);
    }
  }

  console.log("\n=== Summary ===");
  if (missingCount === 0) {
    console.log("✅ All declared indexes are present in the database.");
  } else {
    console.log(`❌ ${missingCount} declared index(es) are absent from the database.`);
    console.log("   Review index options and existing data before applying changes; do not run syncIndexes blindly.");
  }

  await mongoose.disconnect();
  process.exitCode = missingCount > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error("Index audit failed:", err);
  process.exitCode = 1;
  mongoose.disconnect().catch(() => {});
});
