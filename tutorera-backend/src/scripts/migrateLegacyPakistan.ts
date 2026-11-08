import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.model";
import Request from "../models/Request.model";
import Booking from "../models/Booking.model";
import Bid from "../models/Bid.model";
import OfferNegotiation from "../models/OfferNegotiation.model";
import { ensureLaunchMarkets } from "../services/market.service";
import { recordMigrationRun } from "../services/migrationLedger.service";

const MIGRATION_NAME = "legacy-pakistan-defaults";
const apply = process.argv.includes("--apply");
const normalizePkPhone = (phone?: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (/^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`;
  if (/^3\d{9}$/.test(digits)) return `+92${digits}`;
  if (/^92\d{10}$/.test(digits)) return `+${digits}`;
  return phone;
};

async function run() {
  const startedAt = Date.now();
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI is required.");
  await mongoose.connect(uri);

  try {
    // A dry run must be genuinely read-only. Launch-market seeding creates
    // MarketConfig/TaxConfig rows, so it belongs exclusively to the apply
    // path and must never be triggered merely by inspecting legacy data.
    if (apply) await ensureLaunchMarkets();
    const users = await User.find({ $or: [{ countryCode: { $exists: false } }, { countryCode: "PK" }] }).select("phone countryCode").lean();
    const requests = await Request.countDocuments({ countryCode: { $exists: false } });
    const bookings = await Booking.countDocuments({ countryCode: { $exists: false } });
    const offers = await Bid.countDocuments({ currency: { $exists: false } });
    const negotiations = await OfferNegotiation.countDocuments({ currency: { $exists: false } });

    if (apply) {
      await Promise.all(users.map((user) => User.updateOne({ _id: user._id }, { $set: { countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi", phone: normalizePkPhone(user.phone) } })));
      await Request.updateMany({ countryCode: { $exists: false } }, { $set: { countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" } });
      await Booking.updateMany({ countryCode: { $exists: false } }, { $set: { countryCode: "PK", currency: "PKR", timezone: "Asia/Karachi" } });
      await Bid.updateMany({ currency: { $exists: false } }, { $set: { currency: "PKR", originalCurrency: "PKR", exchangeRate: 1 } });
      await OfferNegotiation.updateMany({ currency: { $exists: false } }, { $set: { currency: "PKR" } });

      const report = { users: users.length, requests, bookings, offers, negotiations };
      console.log(JSON.stringify({ mode: "apply", ...report }, null, 2));
      await recordMigrationRun({
        name: MIGRATION_NAME,
        status: "applied",
        matched: users.length + requests + bookings + offers + negotiations,
        durationMs: Date.now() - startedAt,
        report,
      });
    } else {
      const report = { users: users.length, requests, bookings, offers, negotiations };
      console.log(JSON.stringify({ mode: "dry-run", ...report }, null, 2));
      await recordMigrationRun({
        name: MIGRATION_NAME,
        status: "planned",
        matched: users.length + requests + bookings + offers + negotiations,
        durationMs: Date.now() - startedAt,
        report,
      });
    }
  } catch (error) {
    await recordMigrationRun({
      name: MIGRATION_NAME,
      status: "failed",
      durationMs: Date.now() - startedAt,
      error: String((error as Error)?.message || error),
    });
    throw error;
  }

  await mongoose.disconnect();
}
run().catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
