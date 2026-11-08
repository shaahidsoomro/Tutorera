import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db";
import User from "../models/User.model";

async function checkPermissions() {
  await connectDB();

  console.log("=" .repeat(80));
  console.log("🔍 ADMIN USER PERMISSIONS CHECK");
  console.log("=" .repeat(80));

  // Find all admin users
  const admins = await User.find({ role: "admin" }).select(
    "email name adminRole adminPermissions role"
  );

  console.log(`\nFound ${admins.length} admin users:\n`);

  for (const admin of admins) {
    console.log(`📧 ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.adminRole || "Not set"}`);
    console.log(`   Permissions: ${admin.adminPermissions?.length || 0} custom`);

    if (admin.adminPermissions && admin.adminPermissions.length > 0) {
      console.log(`   ├─ ${admin.adminPermissions.join("\n   ├─ ")}`);
    }

    // Check for market.configure
    const hasMarketConfigure = admin.adminPermissions?.includes("market.configure");
    console.log(
      `   └─ market.configure: ${hasMarketConfigure ? "✓ YES" : "✗ NO"}`
    );
    console.log();
  }

  console.log("=" .repeat(80));
  console.log("🔧 FIX OPTIONS");
  console.log("=" .repeat(80));

  console.log(`
Option 1: Add permission via MongoDB (quick fix)
  - Run this MongoDB query to add market.configure to all super_admin roles:

  db.users.updateMany(
    { role: "admin", adminRole: "super_admin" },
    { $addToSet: { adminPermissions: "market.configure" } }
  )

Option 2: Use Admin Panel (recommended)
  1. Go to /admin/roles
  2. Find your admin role
  3. Add "market.configure" permission
  4. Try the seed again

Option 3: Grant permission to specific user
  db.users.updateOne(
    { email: "your.email@example.com" },
    { $addToSet: { adminPermissions: "market.configure" } }
  )
`);

  process.exit(0);
}

checkPermissions().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
