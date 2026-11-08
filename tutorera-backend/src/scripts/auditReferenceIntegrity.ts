/// <reference types="node" />
import "dotenv/config";
import mongoose from "mongoose";

// Aggregate-only report: do not export user identifiers or delete transaction history.
const references = [
  ["tutorprofiles", "user", "users"],
  ["studentprofiles", "user", "users"],
  ["requests", "student", "users"],
  ["bids", "request", "requests"],
  ["bids", "tutor", "users"],
  ["bookings", "student", "users"],
  ["bookings", "tutor", "users"],
  ["schoolofferings", "subjectRef", "subjects"],
] as const;

async function main() {
  if (process.argv.some((arg) => ["--apply", "--write", "--fix"].includes(arg))) throw new Error("This audit is read-only");
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false });
  try {
    const db = mongoose.connection.db!;
    const report = [];
    for (const [collection, field, target] of references) {
      const counts = await db.collection(collection).aggregate<{ count: number }>([
        { $match: { [field]: { $type: "objectId" } } },
        { $lookup: { from: target, localField: field, foreignField: "_id", as: "_auditRef" } },
        { $match: { _auditRef: { $size: 0 } } },
        { $count: "count" },
      ]).toArray();
      const missingOrInvalid = await db.collection(collection).countDocuments({ [field]: { $not: { $type: "objectId" } } });
      const byStatus = await db.collection(collection).aggregate<{ _id: { status: string; paymentStatus: string }; count: number }>([
        { $match: { [field]: { $type: "objectId" } } },
        { $lookup: { from: target, localField: field, foreignField: "_id", as: "_auditRef" } },
        { $match: { _auditRef: { $size: 0 } } },
        { $group: { _id: { status: { $ifNull: ["$status", "unspecified"] }, paymentStatus: { $ifNull: ["$paymentStatus", "unspecified"] } }, count: { $sum: 1 } } },
      ]).toArray();
      report.push({ collection, field, target, orphaned: counts[0]?.count || 0, missingOrInvalid, byStatus });
    }
    const bookings = db.collection("bookings");
    const missing = (field: string) => ({ $or: [{ [field]: { $exists: false } }, { [field]: null }] });
    const transactionGaps = {
      confirmedWithoutConfirmationTime: await bookings.countDocuments({ paymentStatus: "confirmed", ...missing("paymentConfirmedAt") }),
      completedWithoutCompletionTime: await bookings.countDocuments({ status: "completed", ...missing("completedAt") }),
      confirmedWithoutFeeSnapshot: await bookings.countDocuments({ paymentStatus: "confirmed", $or: [
        { feeConfig: { $exists: false } }, { feeConfig: null }, { studentTotal: { $exists: false } }, { studentTotal: null }, { tutorNet: { $exists: false } }, { tutorNet: null },
      ] }),
    };
    console.log(JSON.stringify({ mode: "read-only", references: report, transactionGaps }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error("Reference audit failed:", error instanceof Error ? error.name : "unknown error");
  await mongoose.disconnect();
  process.exitCode = 1;
});
