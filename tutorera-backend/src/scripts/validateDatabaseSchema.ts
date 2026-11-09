import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db";

// Import all models
import User from "../models/User.model";
import StudentProfile from "../models/StudentProfile.model";
import TutorProfile from "../models/TutorProfile.model";
import Booking from "../models/Booking.model";
import Review from "../models/Review.model";
import Request from "../models/Request.model";
import Subject from "../models/Subject.model";
import AcademicDiscipline from "../models/AcademicDiscipline.model";
import TeachingEligibilityRule from "../models/TeachingEligibilityRule.model";
import MarketConfig from "../models/MarketConfig.model";
import FeeConfig from "../models/FeeConfig.model";
import PaymentLedger from "../models/PaymentLedger.model";
import DataIntegrityIssue from "../models/DataIntegrityIssue.model";
import AuditLog from "../models/AuditLog.model";
import Notification from "../models/Notification.model";
import BookedSlot from "../models/BookedSlot.model";
import TutorAvailability from "../models/TutorAvailability.model";
import Conversation from "../models/Conversation.model";
import Message from "../models/Message.model";

const allModels = [
  { name: "User", model: User },
  { name: "StudentProfile", model: StudentProfile },
  { name: "TutorProfile", model: TutorProfile },
  { name: "Booking", model: Booking },
  { name: "Review", model: Review },
  { name: "Request", model: Request },
  { name: "Subject", model: Subject },
  { name: "AcademicDiscipline", model: AcademicDiscipline },
  { name: "TeachingEligibilityRule", model: TeachingEligibilityRule },
  { name: "MarketConfig", model: MarketConfig },
  { name: "FeeConfig", model: FeeConfig },
  { name: "PaymentLedger", model: PaymentLedger },
  { name: "DataIntegrityIssue", model: DataIntegrityIssue },
  { name: "AuditLog", model: AuditLog },
  { name: "Notification", model: Notification },
  { name: "BookedSlot", model: BookedSlot },
  { name: "TutorAvailability", model: TutorAvailability },
  { name: "Conversation", model: Conversation },
  { name: "Message", model: Message },
];

async function validateDatabase() {
  await connectDB();

  console.log("=" .repeat(80));
  console.log("🔍 DATABASE SCHEMA VALIDATION REPORT");
  console.log("=" .repeat(80));

  const db = mongoose.connection.db;
  if (!db) {
    console.error("❌ Database connection failed");
    process.exit(1);
  }

  const collections = await db.listCollections().toArray();
  const collectionNames = new Set(collections.map((c) => c.name));

  console.log(`\n📊 MongoDB Collections: ${collectionNames.size} found\n`);

  const report = {
    totalModels: allModels.length,
    collectionsFound: 0,
    collectionsNotFound: 0,
    documentsPerCollection: {} as Record<string, number>,
    indexesPerCollection: {} as Record<string, number>,
    issues: [] as string[],
  };

  // Validate each model
  for (const { name, model } of allModels) {
    const collectionName = model.collection.name;
    const exists = collectionNames.has(collectionName);

    const status = exists ? "✓" : "⚠";
    console.log(`${status} ${name.padEnd(30)} → ${collectionName}`);

    if (exists) {
      report.collectionsFound++;

      // Count documents
      const count = await model.countDocuments();
      report.documentsPerCollection[collectionName] = count;

      // Get indexes
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      report.indexesPerCollection[collectionName] = indexes.length;

      console.log(
        `  └─ Documents: ${count} | Indexes: ${indexes.length}`
      );
    } else {
      report.collectionsNotFound++;
      report.issues.push(`Collection not found: ${collectionName}`);
      console.log(`  └─ ⚠️  Collection will be created on first write`);
    }
  }

  console.log("\n" + "=" .repeat(80));
  console.log("📈 SUMMARY");
  console.log("=" .repeat(80));

  console.log(`\nCollections Status:`);
  console.log(`  ✓ Found: ${report.collectionsFound}/${allModels.length}`);
  console.log(
    `  ⚠️  Not yet created: ${report.collectionsNotFound}/${allModels.length}`
  );

  console.log(`\nDocument Count by Collection:`);
  const sortedDocs = Object.entries(report.documentsPerCollection)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (sortedDocs.length === 0) {
    console.log(`  (No documents found in any collection)`);
  } else {
    sortedDocs.forEach(([col, count]) => {
      console.log(`  • ${col.padEnd(40)} ${count} docs`);
    });
  }

  console.log(`\nIndex Summary:`);
  const totalIndexes = Object.values(report.indexesPerCollection).reduce(
    (a, b) => a + b,
    0
  );
  console.log(`  Total indexes created: ${totalIndexes}`);

  if (report.issues.length > 0) {
    console.log(`\n⚠️  ISSUES DETECTED:`);
    report.issues.forEach((issue) => console.log(`  • ${issue}`));
  } else {
    console.log(`\n✅ No schema issues detected`);
  }

  // Validate critical collections have data
  console.log(`\n${"-".repeat(80)}`);
  console.log("🎯 CRITICAL VALIDATIONS");
  console.log("-" .repeat(80));

  const criticalChecks = [
    {
      name: "Zoology Discipline",
      test: async () => {
        const discipline = await AcademicDiscipline.findOne({
          name: /zoology/i,
        });
        return discipline ? "✓ Found" : "⚠ Not created yet";
      },
    },
    {
      name: "Zoology Eligibility Rules",
      test: async () => {
        const zoologyDiscipline = await AcademicDiscipline.findOne({
          name: /zoology/i,
        });
        if (!zoologyDiscipline) return "⚠ Discipline not found";
        const ruleCount = await TeachingEligibilityRule.countDocuments({
          discipline: zoologyDiscipline._id,
        });
        return ruleCount > 0
          ? `✓ Found ${ruleCount} rules`
          : "⚠ No rules created";
      },
    },
    {
      name: "Data Integrity Collection",
      test: async () => {
        const count = await DataIntegrityIssue.countDocuments();
        return `✓ Collection ready (${count} issues)`;
      },
    },
    {
      name: "Payment Provider Configs",
      test: async () => {
        const markets = await MarketConfig.countDocuments();
        const rapidPayCount = await MarketConfig.countDocuments({
          paymentProvider: "rapidpay",
        });
        const disabledCount = await MarketConfig.countDocuments({
          paymentProvider: "none",
        });
        return `${markets} markets (RapidPay: ${rapidPayCount}, payments disabled: ${disabledCount})`;
      },
    },
  ];

  for (const check of criticalChecks) {
    const result = await check.test();
    console.log(`  ${check.name.padEnd(35)} ${result}`);
  }

  console.log(`\n${"-".repeat(80)}`);
  console.log("✅ VALIDATION COMPLETE");
  console.log("-" .repeat(80));

  await mongoose.disconnect();
  process.exit(0);
}

validateDatabase().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
