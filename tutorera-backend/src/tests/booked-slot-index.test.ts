import mongoose from "mongoose";
import BookedSlot from "../models/BookedSlot.model";

it("preserves legacy slots while preventing duplicate normalized tutor start times", async () => {
  await BookedSlot.syncIndexes();
  const tutor = new mongoose.Types.ObjectId();
  const base = { tutor, student: new mongoose.Types.ObjectId(), booking: new mongoose.Types.ObjectId(), startTime: "09:00", endTime: "10:00" };
  await BookedSlot.create({ ...base, date: new Date("2026-01-01T00:00:00Z") });
  await BookedSlot.create({ ...base, date: new Date("2026-01-02T00:00:00Z") });
  const startAt = new Date("2026-01-03T09:00:00Z");
  await BookedSlot.create({ ...base, date: new Date("2026-01-03T00:00:00Z"), startAt });
  await expect(BookedSlot.create({ ...base, date: new Date("2026-01-04T00:00:00Z"), startAt })).rejects.toMatchObject({ code: 11000 });
});
