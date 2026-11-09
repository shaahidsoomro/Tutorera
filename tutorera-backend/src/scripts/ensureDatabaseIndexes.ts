import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { syncSchema } from "../services/schemaSync.service";

/**
 * Creates every missing collection and index declared by the Mongoose models.
 * Additive only (never drops an index). Use `npm run audit:indexes` first to
 * see what is missing. Usage:  MONGO_URI=<uri> npm run db:ensure-indexes
 */
async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGO_URI is required");
  const ext = __filename.endsWith(".ts") ? ".ts" : ".js";
  for (const file of readdirSync(join(__dirname, "../models")).filter((f) => f.endsWith(`.model${ext}`))) require(join(__dirname, "../models", file));
  await mongoose.connect(mongoUri, { autoIndex: false, autoCreate: false });
  const result = await syncSchema(mongoose);
  console.log(`Processed ${result.models} model(s); ${result.failures.length} failure(s).`);
  for (const failure of result.failures) console.error(`  ${failure.model}: ${failure.error}`);
  await mongoose.disconnect();
  if (result.failures.length) process.exit(1);
}
main().catch(async (error) => { console.error(error); await mongoose.disconnect().catch(() => undefined); process.exit(1); });
