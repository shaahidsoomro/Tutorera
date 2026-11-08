// src/scripts/backfillRequestExpiry.ts
// Migration script to backfill expiresAt and handle legacy request records safely.
// Run dry-run: npx tsx src/scripts/backfillRequestExpiry.ts --dry-run
// Apply:       npx tsx src/scripts/backfillRequestExpiry.ts --apply

import mongoose from "mongoose";
import dotenv from "dotenv";
import Request from "../models/Request.model";
import { MARKETPLACE_REQUEST_EXPIRY_DAYS, MAX_REQUEST_EXTENSIONS } from "../config/marketplace";

dotenv.config();

async function runBackfill() {
  const isApply = process.argv.includes("--apply");
  const isDryRun = !isApply;

  console.log(`\n======================================================`);
  console.log(`TUTORERA REQUEST EXPIRY BACKFILL MIGRATION`);
  console.log(`Mode: ${isDryRun ? "DRY-RUN (No changes applied)" : "APPLY (Writing changes to database)"}`);
  console.log(`Default Expiry: ${MARKETPLACE_REQUEST_EXPIRY_DAYS} days`);
  console.log(`======================================================\n`);

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ Error: MONGO_URI environment variable is not defined.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { autoIndex: false, autoCreate: false });
  console.log(" Connected to MongoDB.\n");

  const now = new Date();
  const legacyRequests = await Request.find({
    expiresAt: { $exists: false },
  }).lean();

  console.log(`Found ${legacyRequests.length} legacy requests without expiresAt.\n`);

  let willRemainActive = 0;
  let willExpireNow = 0;
  let skippedTerminal = 0;
  let updatedCount = 0;

  for (const r of legacyRequests) {
    const baseDate = r.createdAt ? new Date(r.createdAt) : now;
    const computedExpiresAt = new Date(baseDate.getTime() + MARKETPLACE_REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const isCurrentlyActive = ["open", "published", "receiving_offers", "negotiating"].includes(r.status);

    if (!isCurrentlyActive) {
      skippedTerminal++;
      if (isApply) {
        const result = await Request.updateOne(
          { _id: r._id, expiresAt: { $exists: false }, status: r.status },
          {
            $set: {
              publishedAt: baseDate,
              expiresAt: computedExpiresAt,
              extensionCount: 0,
              maxExtensions: MAX_REQUEST_EXTENSIONS,
            },
          }
        );
        updatedCount += result.modifiedCount;
      }
      continue;
    }

    if (computedExpiresAt <= now) {
      willExpireNow++;
      if (isApply) {
        const result = await Request.updateOne(
          { _id: r._id, expiresAt: { $exists: false }, status: r.status },
          {
            $set: {
              status: "expired",
              publishedAt: baseDate,
              expiresAt: computedExpiresAt,
              expiredAt: now,
              extensionCount: 0,
              maxExtensions: MAX_REQUEST_EXTENSIONS,
            },
          }
        );
        updatedCount += result.modifiedCount;
      }
    } else {
      willRemainActive++;
      if (isApply) {
        const result = await Request.updateOne(
          { _id: r._id, expiresAt: { $exists: false }, status: r.status },
          {
            $set: {
              publishedAt: baseDate,
              expiresAt: computedExpiresAt,
              extensionCount: 0,
              maxExtensions: MAX_REQUEST_EXTENSIONS,
            },
          }
        );
        updatedCount += result.modifiedCount;
      }
    }
  }

  console.log(`--- Migration Summary ---`);
  console.log(`Total legacy requests examined: ${legacyRequests.length}`);
  console.log(`Would remain active:           ${willRemainActive}`);
  console.log(`Would expire now:              ${willExpireNow}`);
  console.log(`Terminal/Inactive preserved:   ${skippedTerminal}`);
  if (isApply) {
    console.log(`Database records updated:      ${updatedCount}`);
    console.log(`✅ Backfill migration completed successfully.`);
  } else {
    console.log(`\nTo apply these changes, run with: --apply`);
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from database.");
  process.exit(0);
}

runBackfill().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
