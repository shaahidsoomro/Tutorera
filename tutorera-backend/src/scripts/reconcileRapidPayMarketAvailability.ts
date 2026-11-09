/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="node" />
import "dotenv/config";
import mongoose, { ConnectOptions } from "mongoose";
import MarketConfig from "../models/MarketConfig.model";
import { getRapidPayCapabilities } from "../services/rapidPayProvider.service";
import { recordMigrationRun } from "../services/migrationLedger.service";

/**
 * Removes a checkout claim from markets the currently configured RapidPay
 * capability set cannot actually settle. It never enables a market; activation
 * remains an explicit admin/provider-compliance operation.
 *
 * npm run migrate:reconcile-rapidpay-markets
 * npm run migrate:reconcile-rapidpay-markets -- --apply --confirm=RECONCILE_RAPIDPAY_MARKETS
 */
const NAME = "reconcile-rapidpay-market-availability";
const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm=RECONCILE_RAPIDPAY_MARKETS");

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI is required.");
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false } as ConnectOptions);
  const startedAt = Date.now();
  try {
    const capabilities = getRapidPayCapabilities();
    const markets = await MarketConfig.find({ paymentProvider: "rapidpay" }).select("countryCode currency paymentsEnabled launchStatus").lean();
    const unsupported = markets.filter((market) =>
      !capabilities.markets.has(market.countryCode) || !capabilities.currencies.has(market.currency),
    );
    const report = {
      configuredMarkets: [...capabilities.markets].sort(),
      configuredCurrencies: [...capabilities.currencies].sort(),
      unsupportedMarkets: unsupported.map((market) => ({ countryCode: market.countryCode, currency: market.currency })),
    };
    if (!apply) {
      console.log(JSON.stringify({ mode: "dry-run", ...report }, null, 2));
      return;
    }
    if (!confirmed) throw new Error("Refusing write: pass --confirm=RECONCILE_RAPIDPAY_MARKETS.");
    const ids = unsupported.map((market) => market._id);
    const result = ids.length
      ? await MarketConfig.updateMany(
          { _id: { $in: ids } },
          { $set: { paymentProvider: "none", paymentsEnabled: false, launchStatus: "beta", "featureFlags.acceptance": false } },
        )
      : { modifiedCount: 0 };
    await recordMigrationRun({
      name: NAME, status: "applied", matched: unsupported.length, modified: result.modifiedCount,
      durationMs: Date.now() - startedAt, report,
    });
    console.log(JSON.stringify({ mode: "apply", ...report, modified: result.modifiedCount }, null, 2));
  } catch (error) {
    if (apply) await recordMigrationRun({
      name: NAME, status: "failed", matched: 0, modified: 0, durationMs: Date.now() - startedAt,
      error: String((error as Error)?.message || error),
    });
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
