/// <reference types="node" />
// Swaps the sparse unique BookedSlot index for a partial one. The sparse
// version still indexes legacy slots that have `tutor` but no `startAt`, so it
// rejects valid legacy bookings as duplicates.
//
// Dry run (default) reports what would happen. Apply with:
//   npm run migrate:booked-slot-index -- --apply --confirm=REBUILD_BOOKED_SLOT_INDEX
import "dotenv/config";
import mongoose from "mongoose";

type Db = mongoose.mongo.Db;

export const OLD_INDEX_NAME = "tutor_1_startAt_1";
export const NEW_INDEX_NAME = "tutor_1_startAt_1_dated";

export async function rebuildBookedSlotStartAtIndex(db: Db, apply: boolean) {
  const slots = db.collection("bookedslots");
  const indexes = await slots.indexes().catch((error: { code?: number }) => {
    if (error.code === 26) return [];
    throw error;
  });
  const hasOld = indexes.some((index) => index.name === OLD_INDEX_NAME);
  const hasNew = indexes.some((index) => index.name === NEW_INDEX_NAME);

  // The new index cannot build if dated slots already collide.
  const [duplicates] = await slots.aggregate<{ count: number }>([
    { $match: { startAt: { $type: "date" } } },
    { $group: { _id: { tutor: "$tutor", startAt: "$startAt" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: "count" },
  ]).toArray();
  const report = { mode: apply ? "apply" : "dry-run", hasOldSparseIndex: hasOld, hasNewPartialIndex: hasNew, duplicateDatedGroups: duplicates?.count || 0, created: false, dropped: false };
  if (report.duplicateDatedGroups > 0) throw Object.assign(new Error("Duplicate dated slots exist; reconcile them before rebuilding the index. No changes made."), { report });
  if (!apply) return report;

  if (!hasNew) {
    await slots.createIndex({ tutor: 1, startAt: 1 }, { name: NEW_INDEX_NAME, unique: true, partialFilterExpression: { startAt: { $type: "date" } } });
    report.created = true;
  }
  // Drop the old index only once the replacement exists, so uniqueness never lapses.
  if (hasOld) {
    await slots.dropIndex(OLD_INDEX_NAME);
    report.dropped = true;
  }
  return report;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  if (apply && !process.argv.includes("--confirm=REBUILD_BOOKED_SLOT_INDEX")) {
    throw new Error("Refusing write: use --apply --confirm=REBUILD_BOOKED_SLOT_INDEX after reviewing the dry run.");
  }
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false });
  try {
    console.log(JSON.stringify(await rebuildBookedSlotStartAtIndex(mongoose.connection.db!, apply), null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
