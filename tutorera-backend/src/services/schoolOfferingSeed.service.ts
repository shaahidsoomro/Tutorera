import mongoose from "mongoose";
import Subject from "../models/Subject.model";
import SchoolOffering from "../models/SchoolOffering.model";
import { SCHOOL_OFFERINGS } from "../config/schoolOfferings";

const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const subjectAliases: Record<string, string[]> = { Mathematics: ["Maths", "Math"], "Further Mathematics": ["Further Maths", "Further Math"], "Computer Science": ["CS", "Computing"], English: ["English Language"], "Business Studies": ["Business"], Islamiyat: ["Islamic Education"] };
const newSubjects: Record<string, { code: string; slug: string; category: string }> = {
  "Further Mathematics": { code: "SUB-FURTHER-MATHEMATICS", slug: "further-mathematics", category: "Sciences" },
  Ethics: { code: "SUB-ETHICS", slug: "ethics", category: "Humanities" },
};

/** Read-only by default. Existing subject and offering rows are never rewritten. */
export async function seedSchoolOfferings(apply = false) {
  const names = [...new Set(SCHOOL_OFFERINGS.map((row) => row.subject))];
  const subjects = await Subject.find().select("name code slug status").lean();
  const matched = new Map<string, typeof subjects[number]>();
  const errors: string[] = [];
  for (const name of names) {
    const equivalent = new Set([name, ...(subjectAliases[name] || [])].map(clean));
    const rows = subjects.filter((row) => equivalent.has(clean(row.name)));
    if (rows.length > 1) errors.push(`Ambiguous subject: ${name}`);
    else if (rows.length === 1) {
      if (rows[0].status !== "active") errors.push(`Subject is not active: ${name}`);
      else matched.set(name, rows[0]);
    } else if (!newSubjects[name]) errors.push(`Missing existing subject: ${name}`);
    else if (subjects.some((row) => row.code === newSubjects[name].code || row.slug === newSubjects[name].slug)) errors.push(`Subject code or slug conflict: ${name}`);
  }
  const existing = await SchoolOffering.find({ _id: { $in: SCHOOL_OFFERINGS.map((row) => row.id) } }).select("_id").lean();
  const plan = { total: SCHOOL_OFFERINGS.length, existing: existing.length, newOfferings: SCHOOL_OFFERINGS.length - existing.length, newSubjects: names.filter((name) => !matched.has(name) && newSubjects[name]), errors };
  if (!apply || errors.length) return { ...plan, applied: false };
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const name of plan.newSubjects) {
        const definition = newSubjects[name];
        const row = await Subject.findOneAndUpdate({ code: definition.code }, { $setOnInsert: { name, ...definition, status: "active", isActive: true, level: [] } }, { upsert: true, returnDocument: "after", session }).lean();
        if (!row || clean(row.name) !== clean(name)) throw new Error(`Subject collision: ${name}`);
        matched.set(name, row as typeof subjects[number]);
      }
      const seededAt = new Date();
      const operations = SCHOOL_OFFERINGS.map(row => {
        const subject = matched.get(row.subject);
        if (!subject) throw new Error(`Missing subject: ${row.subject}`);
        const { id, ...data } = row;
        return { updateOne: { filter: { _id: id }, update: { $setOnInsert: { ...data, subject: subject.name, subjectRef: subject._id, status: "active" as const, createdAt: seededAt, updatedAt: seededAt } }, upsert: true, timestamps: false } };
      });
      // Bound each command while keeping all chunks in the same transaction.
      for (let offset = 0; offset < operations.length; offset += 250) {
        await SchoolOffering.bulkWrite(operations.slice(offset, offset + 250), { session });
      }
    });
    return { ...plan, applied: true };
  } finally { await session.endSession(); }
}
