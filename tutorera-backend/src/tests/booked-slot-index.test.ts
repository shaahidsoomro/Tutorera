import mongoose from "mongoose";
import BookedSlot from "../models/BookedSlot.model";
import { NEW_INDEX_NAME, OLD_INDEX_NAME, rebuildBookedSlotStartAtIndex } from "../scripts/migrateBookedSlotStartAtIndex";

const base = () => ({ tutor: new mongoose.Types.ObjectId(), student: new mongoose.Types.ObjectId(), booking: new mongoose.Types.ObjectId(), startTime: "09:00", endTime: "10:00" });

it("preserves legacy slots while preventing duplicate normalized tutor start times", async () => {
  await BookedSlot.syncIndexes();
  const slot = base();
  await BookedSlot.create({ ...slot, date: new Date("2026-01-01T00:00:00Z") });
  await BookedSlot.create({ ...slot, date: new Date("2026-01-02T00:00:00Z") });
  const startAt = new Date("2026-01-03T09:00:00Z");
  await BookedSlot.create({ ...slot, date: new Date("2026-01-03T00:00:00Z"), startAt });
  await expect(BookedSlot.create({ ...slot, date: new Date("2026-01-04T00:00:00Z"), startAt })).rejects.toMatchObject({ code: 11000 });
});

it("migrates the old sparse index to the partial index without losing uniqueness", async () => {
  const collection = mongoose.connection.db!.collection("bookedslots");
  await collection.drop().catch(() => undefined);
  await collection.createIndex({ tutor: 1, startAt: 1 }, { name: OLD_INDEX_NAME, unique: true, sparse: true });
  const slot = base();
  await collection.insertOne({ ...slot, date: new Date("2026-02-01T00:00:00Z") });
  // The old sparse index wrongly treats a second legacy slot as a duplicate.
  await expect(collection.insertOne({ ...slot, date: new Date("2026-02-02T00:00:00Z") })).rejects.toMatchObject({ code: 11000 });

  const dryRun = await rebuildBookedSlotStartAtIndex(mongoose.connection.db!, false);
  expect(dryRun).toMatchObject({ hasOldSparseIndex: true, hasNewPartialIndex: false, created: false, dropped: false });

  const applied = await rebuildBookedSlotStartAtIndex(mongoose.connection.db!, true);
  expect(applied).toMatchObject({ created: true, dropped: true });
  const names = (await collection.indexes()).map((index) => index.name);
  expect(names).toContain(NEW_INDEX_NAME);
  expect(names).not.toContain(OLD_INDEX_NAME);

  await collection.insertOne({ ...slot, date: new Date("2026-02-02T00:00:00Z") });
  const startAt = new Date("2026-02-03T09:00:00Z");
  await collection.insertOne({ ...slot, date: new Date("2026-02-03T00:00:00Z"), startAt });
  await expect(collection.insertOne({ ...slot, date: new Date("2026-02-04T00:00:00Z"), startAt })).rejects.toMatchObject({ code: 11000 });

  // Running again is a no-op.
  expect(await rebuildBookedSlotStartAtIndex(mongoose.connection.db!, true)).toMatchObject({ created: false, dropped: false });
});
