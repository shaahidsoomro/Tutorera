import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.model";
import { LEGAL_CONFIG } from "../config/legal";

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required to promote the platform super admin.");
  }

  await mongoose.connect(mongoUri);
  try {
    const result = await User.updateOne(
      { email: LEGAL_CONFIG.PLATFORM_SUPER_ADMIN_EMAIL },
      { $set: { role: "admin", adminRole: "super_admin" } }
    );

    if (result.matchedCount === 0) {
      throw new Error(`No account found for ${LEGAL_CONFIG.PLATFORM_SUPER_ADMIN_EMAIL}.`);
    }

    console.log(
      result.modifiedCount === 0
        ? `${LEGAL_CONFIG.PLATFORM_SUPER_ADMIN_EMAIL} is already a super admin.`
        : `Promoted ${LEGAL_CONFIG.PLATFORM_SUPER_ADMIN_EMAIL} to super admin.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Failed to promote platform super admin:", error);
  process.exitCode = 1;
});
