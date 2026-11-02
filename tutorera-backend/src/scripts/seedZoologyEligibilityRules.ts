/**
 * Seed: Zoology teaching eligibility rules
 *
 * Zoology graduates have demonstrable subject-matter competence in Biology,
 * General Science, and Environmental Science (direct), and may teach Chemistry
 * or Botany conditionally (they share foundational content but the degree is
 * not the primary credential for those subjects).
 *
 * Default mode is dry-run. Pass --commit to persist.
 * Safe to re-run; existing rules are never duplicated (upsert by discipline+subject).
 */
import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db";
import AcademicDiscipline from "../models/AcademicDiscipline.model";
import Subject from "../models/Subject.model";
import TeachingEligibilityRule from "../models/TeachingEligibilityRule.model";

const commit = process.argv.includes("--commit");

interface RuleSpec {
  subjectName: string;
  eligibilityType: "direct" | "conditional";
  evidenceRequired: boolean;
  notes: string;
}

const ZOOLOGY_RULES: RuleSpec[] = [
  {
    subjectName: "Biology",
    eligibilityType: "direct",
    evidenceRequired: false,
    notes: "Biology is the core subject of a Zoology degree — direct eligibility.",
  },
  {
    subjectName: "General Science",
    eligibilityType: "direct",
    evidenceRequired: false,
    notes: "General Science at school level is fully covered by a Zoology qualification.",
  },
  {
    subjectName: "Environmental Science",
    eligibilityType: "direct",
    evidenceRequired: false,
    notes: "Ecology and environmental biology are core components of a Zoology degree.",
  },
  {
    subjectName: "Chemistry",
    eligibilityType: "conditional",
    evidenceRequired: true,
    notes: "Biochemistry and organic chemistry are studied within Zoology; conditional — tutor must provide transcript evidence of relevant chemistry coursework.",
  },
  {
    subjectName: "Botany",
    eligibilityType: "conditional",
    evidenceRequired: true,
    notes: "Plant biology overlaps significantly with zoology curricula; conditional — evidence of botany coursework required.",
  },
];

async function main() {
  await connectDB();

  const zoologyDiscipline = await AcademicDiscipline.findOne({
    name: /^zoology$/i,
    status: "active",
  }).lean();

  if (!zoologyDiscipline) {
    console.error(
      "No active AcademicDiscipline named 'Zoology' found.\n" +
      "Create it via /admin/academic-framework/disciplines first, then re-run this script."
    );
    process.exit(1);
  }

  console.log(`Found discipline: ${zoologyDiscipline.name} (${zoologyDiscipline._id})`);

  const report = {
    mode: commit ? "commit" : "dry-run",
    created: 0,
    skipped: 0,
    missing_subjects: [] as string[],
  };

  for (const spec of ZOOLOGY_RULES) {
    const subject = await Subject.findOne({
      name: new RegExp(`^${spec.subjectName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      status: "active",
    }).lean();

    if (!subject) {
      console.warn(`  Subject not found in DB: "${spec.subjectName}" — skipping`);
      report.missing_subjects.push(spec.subjectName);
      continue;
    }

    const exists = await TeachingEligibilityRule.exists({
      discipline: zoologyDiscipline._id,
      subject: subject._id,
    });

    if (exists) {
      console.log(`  [SKIP] Rule already exists: Zoology → ${spec.subjectName}`);
      report.skipped++;
      continue;
    }

    console.log(
      `  [${commit ? "CREATE" : "DRY-RUN"}] Zoology → ${spec.subjectName} ` +
      `(${spec.eligibilityType}, evidenceRequired=${spec.evidenceRequired})`
    );

    if (commit) {
      await TeachingEligibilityRule.create({
        discipline: zoologyDiscipline._id,
        subject: subject._id,
        eligibilityType: spec.eligibilityType,
        evidenceRequired: spec.evidenceRequired,
        notes: spec.notes,
        status: "active",
      });
    }
    report.created++;
  }

  console.log("\nReport:", JSON.stringify(report, null, 2));
  if (!commit) {
    console.log("\nDry-run complete. Re-run with --commit to persist changes.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
