/**
 * Additive academic-framework reconciliation.
 *
 * Default mode is dry-run. Pass --commit only after reviewing the generated
 * report. Existing free-text subject and discipline snapshots are preserved.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import Subject from "../models/Subject.model";
import SubjectCategory from "../models/SubjectCategory.model";
import AcademicDiscipline from "../models/AcademicDiscipline.model";
import TeachingEligibilityRule from "../models/TeachingEligibilityRule.model";
import DisciplineSubjectMap from "../models/DisciplineSubjectMap.model";
import { MASTER_SUBJECTS } from "../config/geo/location";

dotenv.config();

const commit = process.argv.includes("--commit");
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const codeify = (prefix: string, value: string) => `${prefix}-${value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
const normal = (value: string) => value.trim().toLowerCase();

const categoryCode = (name: string) => {
  const known: Record<string, string> = {
    "stem": "CAT-STEM", "computing": "CAT-COMP", "languages": "CAT-LANG",
    "business & economics": "CAT-BUS", "business & commerce": "CAT-BUS",
    "social studies": "CAT-SOC", "religious studies": "CAT-HUM", "test preparation": "CAT-TEST",
  };
  return known[normal(name)] || codeify("CAT", name);
};

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  // A preview must not implicitly create collections or indexes.
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false });
  const report = { mode: commit ? "commit" : "dry-run", categories: { create: 0 }, subjects: { create: 0, backfillCode: 0, backfillCategoryRef: 0 }, disciplines: { create: 0 }, rules: { create: 0, unmappedSubjects: [] as string[] } };
  const session = commit ? await Subject.startSession() : null;

  const work = async () => {
    const existingSubjects = await Subject.find().lean();
    const names = new Map(existingSubjects.map((subject) => [normal(subject.name), subject]));
    const categoryNames = new Set(existingSubjects.map((subject) => subject.category).filter(Boolean));
    for (const subject of MASTER_SUBJECTS) categoryNames.add("Uncategorized");

    const categories = new Map<string, any>();
    for (const name of categoryNames) {
      const code = categoryCode(name);
      let category = await SubjectCategory.findOne({ $or: [{ code }, { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }] }).session(session).lean();
      if (!category) {
        report.categories.create++;
        if (commit) category = (await SubjectCategory.create([{ code, name, slug: slugify(name), status: "active" }], { session }))[0].toObject();
      }
      if (category) categories.set(normal(name), category);
    }

    for (const subjectName of MASTER_SUBJECTS) {
      const existing = names.get(normal(subjectName));
      if (!existing) {
        report.subjects.create++;
        if (commit) {
          const category = categories.get(normal("Uncategorized"));
          await Subject.create([{ code: codeify("SUB", subjectName), name: subjectName, slug: slugify(subjectName), category: category?.name || "Uncategorized", categoryRef: category?._id, status: "active", isActive: true }], { session });
        }
      } else if (!existing.code) {
        report.subjects.backfillCode++;
        if (commit) {
          const category = categories.get(normal(existing.category));
          await Subject.updateOne({ _id: existing._id }, { $set: { code: codeify("SUB", existing.name), categoryRef: category?._id, status: existing.isActive ? "active" : "inactive", displayOrder: existing.sortOrder || 0 } }, { session: session || undefined });
        }
      }
    }

    // Categories may be added after a subject already received its code.
    // Fill only missing references and leave existing administrative choices intact.
    for (const subject of existingSubjects) {
      const category = subject.category && categories.get(normal(subject.category));
      if (!subject.categoryRef && category) {
        report.subjects.backfillCategoryRef++;
        if (commit) await Subject.updateOne({ _id: subject._id, $or: [{ categoryRef: { $exists: false } }, { categoryRef: null }] }, { $set: { categoryRef: category._id } }, { session: session || undefined });
      }
    }

    const canonicalSubjects = await Subject.find().session(session).lean();
    const subjectByName = new Map(canonicalSubjects.map((subject) => [normal(subject.name), subject]));
    const maps = await DisciplineSubjectMap.find().lean();
    for (const map of maps) {
      const disciplineCode = codeify("DISC", map.discipline);
      let discipline = await AcademicDiscipline.findOne({ $or: [{ code: disciplineCode }, { name: new RegExp(`^${map.discipline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }] }).session(session).lean();
      if (!discipline) {
        report.disciplines.create++;
        if (commit) discipline = (await AcademicDiscipline.create([{ code: disciplineCode, name: map.discipline, slug: slugify(map.discipline), status: map.isActive ? "active" : "inactive" }], { session }))[0].toObject();
      }
      if (!discipline) continue;
      for (const subjectName of map.eligibleSubjects || []) {
        const subject = subjectByName.get(normal(subjectName));
        if (!subject) { report.rules.unmappedSubjects.push(`${map.discipline} -> ${subjectName}`); continue; }
        const exists = await TeachingEligibilityRule.exists({ discipline: discipline._id, subject: subject._id }).session(session);
        if (!exists) {
          report.rules.create++;
          if (commit) await TeachingEligibilityRule.create([{ discipline: discipline._id, subject: subject._id, eligibilityType: "direct", evidenceRequired: false, notes: map.notes || "Migrated from legacy discipline-subject map", status: map.isActive ? "active" : "inactive" }], { session });
        }
      }
    }
  };

  try {
    if (session) await session.withTransaction(work); else await work();
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await session?.endSession();
    await mongoose.disconnect();
  }
}

main().catch((error) => { console.error("Academic-framework reconciliation failed:", error); process.exit(1); });
