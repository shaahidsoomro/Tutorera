import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.model";
import TutorProfile from "../models/TutorProfile.model";
import StudentProfile from "../models/StudentProfile.model";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import Booking from "../models/Booking.model";
import DataIntegrityIssue, { DataIntegrityIssueType } from "../models/DataIntegrityIssue.model";
import { recordMigrationRun } from "../services/migrationLedger.service";

/**
 * Detects, but never fabricates, broken references and lifecycle evidence.
 *
 * npm run audit:data-integrity                 # read-only
 * npm run audit:data-integrity -- --record     # write/update issue queue
 */
const NAME = "data-integrity-scan";
const record = process.argv.includes("--record");
type Finding = { type: DataIntegrityIssueType; severity: "high" | "critical"; entityType: string; entityId: string; relation?: string; countryCode?: string; details: Record<string, unknown> };

const ids = (rows: Array<{ _id: unknown }>) => new Set(rows.map((row) => String(row._id)));

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI is required.");
  const started = Date.now();
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  try {
    const [userRows, requestRows] = await Promise.all([
      User.find().select("_id").lean(),
      Request.find().select("_id").lean(),
    ]);
    const userIds = ids(userRows);
    const requestIds = ids(requestRows);
    const [tutors, students, requests, bids, bookings] = await Promise.all([
      TutorProfile.find().select("_id user countryCode").lean(),
      StudentProfile.find().select("_id user countryCode").lean(),
      Request.find().select("_id student countryCode").lean(),
      Bid.find().select("_id request tutor status").lean(),
      Booking.find().select("_id student tutor countryCode status paymentStatus paymentConfirmedAt completedAt feeConfig studentTotal tutorNet").lean(),
    ]);
    const findings: Finding[] = [];
    const orphan = (entityType: string, entityId: unknown, relation: string, target: unknown, countryCode?: string) => {
      findings.push({ type: "orphan_reference", severity: "critical", entityType, entityId: String(entityId), relation, countryCode, details: { missingTargetId: String(target) } });
    };
    tutors.filter((row) => !userIds.has(String(row.user))).forEach((row) => orphan("TutorProfile", row._id, "user", row.user, row.countryCode));
    students.filter((row) => !userIds.has(String(row.user))).forEach((row) => orphan("StudentProfile", row._id, "user", row.user, row.countryCode));
    requests.filter((row) => !userIds.has(String(row.student))).forEach((row) => orphan("Request", row._id, "student", row.student, row.countryCode));
    bids.filter((row) => !requestIds.has(String(row.request))).forEach((row) => orphan("Bid", row._id, "request", row.request));
    bids.filter((row) => !userIds.has(String(row.tutor))).forEach((row) => orphan("Bid", row._id, "tutor", row.tutor));
    for (const row of bookings) {
      if (!userIds.has(String(row.student))) orphan("Booking", row._id, "student", row.student, row.countryCode);
      if (!userIds.has(String(row.tutor))) orphan("Booking", row._id, "tutor", row.tutor, row.countryCode);
      if (row.paymentStatus === "confirmed" && !row.paymentConfirmedAt) findings.push({ type: "missing_payment_confirmation", severity: "critical", entityType: "Booking", entityId: String(row._id), countryCode: row.countryCode, details: { paymentStatus: row.paymentStatus } });
      if (row.status === "completed" && !row.completedAt) findings.push({ type: "missing_completion_timestamp", severity: "high", entityType: "Booking", entityId: String(row._id), countryCode: row.countryCode, details: { status: row.status } });
      if (row.paymentStatus === "confirmed" && (!row.feeConfig || row.studentTotal === undefined || row.tutorNet === undefined)) findings.push({ type: "incomplete_fee_snapshot", severity: "critical", entityType: "Booking", entityId: String(row._id), countryCode: row.countryCode, details: { paymentStatus: row.paymentStatus, hasFeeConfig: Boolean(row.feeConfig), hasStudentTotal: row.studentTotal !== undefined, hasTutorNet: row.tutorNet !== undefined } });
    }
    if (record && findings.length) {
      await DataIntegrityIssue.bulkWrite(findings.map((finding) => ({
        updateOne: {
          filter: { fingerprint: `${finding.type}:${finding.entityType}:${finding.entityId}:${finding.relation || ""}` },
          update: { $setOnInsert: { ...finding, fingerprint: `${finding.type}:${finding.entityType}:${finding.entityId}:${finding.relation || ""}`, detectedAt: new Date(), status: "open" } },
          upsert: true,
        },
      })));
    }
    const report = { findings: findings.length, byType: findings.reduce<Record<string, number>>((out, finding) => ({ ...out, [finding.type]: (out[finding.type] || 0) + 1 }), {}) };
    console.log(JSON.stringify({ mode: record ? "record" : "dry-run", ...report }, null, 2));
    if (record) await recordMigrationRun({ name: NAME, status: "applied", matched: findings.length, modified: findings.length, durationMs: Date.now() - started, report });
  } finally { await mongoose.disconnect(); }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
