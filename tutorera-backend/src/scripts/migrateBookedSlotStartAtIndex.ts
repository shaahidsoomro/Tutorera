/// <reference types="node" />
// Swaps the sparse unique BookedSlot index for a partial one. The sparse
// version still indexes legacy slots that have `tutor` but no `startAt`, so it
// rejects valid legacy bookings as duplicates. MongoDB does not allow a sparse
// and partial index with the same key pattern to coexist on this Atlas tier;
// production replacement therefore needs an explicitly acknowledged, brief
// uniqueness gap after a duplicate preflight succeeds.
//
// Dry run (default) reports what would happen. Apply with:
//   npm run migrate:booked-slot-index -- --apply --confirm=REBUILD_BOOKED_SLOT_INDEX --acknowledge-brief-uniqueness-gap
import "dotenv/config";
import mongoose from "mongoose";

type Db = mongoose.mongo.Db;

export const OLD_INDEX_NAME = "tutor_1_startAt_1";
export const NEW_INDEX_NAME = "tutor_1_startAt_1_dated";

export async function rebuildBookedSlotStartAtIndex(db: Db, apply: boolean, allowBriefUniquenessGap = false) {
  const slots = db.collection("bookedslots");
  const indexes = await slots.indexes().catch((error: { code?: number }) => {
    if (error.code === 26) return [];
    throw error;
  });
  // Index names are not authoritative: an earlier deployment may have
  // created the correct partial index under MongoDB's default legacy name.
  // Inspect the definition so that migration is idempotent across both cases.
  const hasOld = indexes.some((index) =>
    index.name === OLD_INDEX_NAME && index.sparse === true && index.unique === true
  );
  const hasNew = indexes.some((index) => {
    const partial = index.partialFilterExpression as Record<string, unknown> | undefined;
    const startAt = partial?.startAt as Record<string, unknown> | undefined;
    return index.unique === true &&
      JSON.stringify(index.key) === JSON.stringify({ tutor: 1, startAt: 1 }) &&
      startAt?.$type === "date";
  });

  // The new index cannot build if dated slots already collide.
  const [duplicates] = await slots.aggregate<{ count: number }>([
    { $match: { startAt: { $type: "date" } } },
    { $group: { _id: { tutor: "$tutor", startAt: "$startAt" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: "count" },
  ]).toArray();
  const report = {
    mode: apply ? "apply" : "dry-run",
    hasOldSparseIndex: hasOld,
    hasNewPartialIndex: hasNew,
    duplicateDatedGroups: duplicates?.count || 0,
    requiresBriefUniquenessGap: hasOld && !hasNew,
    created: false,
    dropped: false,
  };
  if (report.duplicateDatedGroups > 0) throw Object.assign(new Error("Duplicate dated slots exist; reconcile them before rebuilding the index. No changes made."), { report });
  if (!apply) return report;

  if (hasOld && !hasNew && !allowBriefUniquenessGap) {
    throw new Error("Replacing the old sparse index requires a brief uniqueness gap. Schedule a write pause and rerun with --acknowledge-brief-uniqueness-gap. No changes made.");
  }

  if (hasOld && !hasNew) {
    // Atlas rejects creating the partial replacement while this sparse index
    // exists. Duplicate preflight above must be clean and application writes
    // must be paused for this short replacement window.
    await slots.dropIndex(OLD_INDEX_NAME);
    report.dropped = true;
  }
  if (!hasNew) {
    try {
      await slots.createIndex({ tutor: 1, startAt: 1 }, { name: NEW_INDEX_NAME, unique: true, partialFilterExpression: { startAt: { $type: "date" } } });
      report.created = true;
    } catch (error) {
      // Restore the legacy guard if creation fails after its removal. Preserve
      // existing data safety rather than leaving this collection unprotected.
      if (report.dropped) {
        await slots.createIndex({ tutor: 1, startAt: 1 }, { name: OLD_INDEX_NAME, unique: true, sparse: true });
      }
      throw error;
    }
  }
  if (hasOld && hasNew) {
    await slots.dropIndex(OLD_INDEX_NAME);
    report.dropped = true;
  }
  return report;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const allowBriefUniquenessGap = process.argv.includes("--acknowledge-brief-uniqueness-gap");
  if (apply && !process.argv.includes("--confirm=REBUILD_BOOKED_SLOT_INDEX")) {
    throw new Error("Refusing write: use --apply --confirm=REBUILD_BOOKED_SLOT_INDEX after reviewing the dry run.");
  }
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false });
  try {
    console.log(JSON.stringify(await rebuildBookedSlotStartAtIndex(mongoose.connection.db!, apply, allowBriefUniquenessGap), null, 2));
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
