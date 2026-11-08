import "dotenv/config";
import mongoose from "mongoose";
import TutorProfile from "../models/TutorProfile.model";
import { EDUCATION_LEVELS, normalizeEducationLevel } from "../config/educationLevels";

/**
 * Idempotently repairs historic short level labels. Run before deploying the
 * document-review fix so legacy profiles do not block future admin actions.
 */
async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI is required");
  const apply = process.argv.includes("--apply");
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  const profiles = await TutorProfile.find({ levels: { $exists: true, $ne: [] } }).select("levels").lean();
  let profilesWithOtherLabels = 0;
  const operations = profiles.flatMap((profile: any) => {
    let hasOtherLabels = false;
    const normalized = profile.levels.map((level: string) => {
      const candidate = normalizeEducationLevel(level);
      if ((EDUCATION_LEVELS as readonly string[]).includes(candidate)) return candidate;
      hasOtherLabels = true;
      return level;
    });
    if (hasOtherLabels) profilesWithOtherLabels++;
    return JSON.stringify(normalized) === JSON.stringify(profile.levels)
      ? []
      : [{ updateOne: { filter: { _id: profile._id, levels: profile.levels }, update: { $set: { levels: normalized } } } }];
  });
  const result = apply && operations.length ? await TutorProfile.bulkWrite(operations) : null;
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", scanned: profiles.length, candidates: operations.length, profilesWithOtherLabels, modified: result?.modifiedCount || 0 }));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
