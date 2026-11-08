import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db";
import AcademicDiscipline from "../models/AcademicDiscipline.model";

async function main() {
  await connectDB();

  // Check existing disciplines
  const existing = await AcademicDiscipline.find({ status: "active" }).lean();
  console.log("Existing active disciplines:");
  existing.forEach((d) => console.log(`  - ${d.name}`));

  // Check if Zoology exists
  const zoology = await AcademicDiscipline.findOne({ name: /^zoology$/i });

  if (zoology) {
    console.log(`\n✓ Zoology discipline already exists (ID: ${zoology._id})`);
  } else {
    console.log("\n🔨 Creating Zoology discipline...");
    const created = await AcademicDiscipline.create({
      code: "ZOO",
      name: "Zoology",
      slug: "zoology",
      status: "active",
      description: "Zoology degree program",
    });
    console.log(`✓ Zoology discipline created (ID: ${created._id})`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
