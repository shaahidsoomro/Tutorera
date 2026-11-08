import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.model";
import Referral from "../models/Referral.model";
import ReferralConfig from "../models/ReferralConfig.model";
import { recordMigrationRun } from "../services/migrationLedger.service";

// The referral program was hard-coded to PKR before it became currency-aware.
// The schema default is now USD, so without this pass historic balances would
// silently be relabelled USD while keeping their PKR numbers. Idempotent: it
// only stamps rows that have no recorded currency.
//
//   npm run migrate:referral-currency            # dry run
//   npm run migrate:referral-currency -- --apply
const MIGRATION_NAME = "referral-currency";
const apply = process.argv.includes("--apply");
const LEGACY_REFERRAL_CURRENCY = "PKR";

async function run() {
  const startedAt = Date.now();
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI is required.");
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });

  try {
    // Count the same records that the write targets. Restricting this to
    // positive balances made the historic report claim a negative number of
    // "already stamped" users even though the migration itself was correct.
    const usersWithoutCurrency = await User.countDocuments({ referralCreditCurrency: { $exists: false } });
    const referralsWithoutCurrency = await Referral.countDocuments({ creditCurrency: { $exists: false } });
    const configsWithoutCurrency = await ReferralConfig.countDocuments({ currency: { $exists: false } });
    const ambiguousUsers = await User.countDocuments({ referralCreditCurrency: { $exists: false }, countryCode: { $ne: "PK" } });

    if (apply) {
      // Country alone does not establish the currency of a historical referral
      // or configuration. Require manual reconciliation for ambiguous rows.
      if (usersWithoutCurrency || referralsWithoutCurrency || configsWithoutCurrency) {
        throw new Error(`Currency evidence required for ${usersWithoutCurrency} users, ${referralsWithoutCurrency} referrals and ${configsWithoutCurrency} configurations; ${ambiguousUsers} users are non-PK or unlocated.`);
      }
      const stampedUsers = await User.updateMany(
        { referralCreditCurrency: { $exists: false } },
        { $set: { referralCreditCurrency: LEGACY_REFERRAL_CURRENCY } }
      );
      const stampedReferrals = await Referral.updateMany(
        { creditCurrency: { $exists: false } },
        { $set: { creditCurrency: LEGACY_REFERRAL_CURRENCY } }
      );
      await ReferralConfig.updateMany(
        { currency: { $exists: false } },
        { $set: { currency: LEGACY_REFERRAL_CURRENCY } }
      );

      const report = {
        usersStamped: stampedUsers.modifiedCount,
        usersAlreadyStamped: usersWithoutCurrency - stampedUsers.modifiedCount,
        referralsStamped: stampedReferrals.modifiedCount,
        configsStamped: configsWithoutCurrency,
      };
      console.log(JSON.stringify({ mode: "apply", ...report }, null, 2));

      await recordMigrationRun({
        name: MIGRATION_NAME,
        status: "applied",
        matched: usersWithoutCurrency + referralsWithoutCurrency + configsWithoutCurrency,
        modified: report.usersStamped + report.referralsStamped + report.configsStamped,
        durationMs: Date.now() - startedAt,
        report,
      });
    } else {
      const report = {
        usersWithBalanceMissingCurrency: usersWithoutCurrency,
        referralsMissingCurrency: referralsWithoutCurrency,
        configsMissingCurrency: configsWithoutCurrency,
        ambiguousUsers,
      };
      console.log(JSON.stringify({ mode: "dry-run", ...report }, null, 2));
    }
  } catch (error) {
    if (apply) await recordMigrationRun({
      name: MIGRATION_NAME,
      status: "failed",
      durationMs: Date.now() - startedAt,
      error: String((error as Error)?.message || error),
    });
    throw error;
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
