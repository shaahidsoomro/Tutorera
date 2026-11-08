import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db";
import User from "../models/User.model";

async function grantPermission() {
  await connectDB();

  console.log("🔐 Granting market.configure permission to all super_admin users...\n");

  try {
    // Grant market.configure to all super_admin users
    const result = await User.updateMany(
      { role: "admin", adminRole: "super_admin" },
      { $addToSet: { adminPermissions: "market.configure" } }
    );

    console.log(`✅ Updated ${result.modifiedCount} admin users`);
    console.log(`   Matched: ${result.matchedCount} users`);

    // Verify the update
    const admins = await User.find({ role: "admin", adminRole: "super_admin" }).select(
      "email name adminPermissions"
    );

    console.log("\n📋 Verification:\n");
    for (const admin of admins) {
      const hasPermission = admin.adminPermissions?.includes("market.configure");
      console.log(`  ${admin.email}`);
      console.log(`    ✓ market.configure: ${hasPermission ? "YES" : "NO"}`);
    }

    console.log("\n✨ All set! Try the seed again on the admin panel.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to grant permission:", err);
    process.exit(1);
  }
}

grantPermission();
