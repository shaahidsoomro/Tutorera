import "dotenv/config";
import mongoose from "mongoose";
import MarketConfig from "../models/MarketConfig.model";
import PaymentLedger from "../models/PaymentLedger.model";
import PaymentCheckoutIntent from "../models/PaymentCheckoutIntent.model";
import { recordMigrationRun } from "../services/migrationLedger.service";

/**
 * Retires the former Switch gateway without altering historical financial
 * evidence. The write is deliberately blocked while any legacy checkout is
 * pending: an operator must reconcile it before its callback path disappears.
 *
 * npm run migrate:retire-swich                    # read-only report
 * npm run migrate:retire-swich -- --apply --confirm=RETIRE_SWICH_MARKETS
 */
const NAME = "retire-swich-market-configs";
const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm=RETIRE_SWICH_MARKETS");

async function run() {
  const startedAt = Date.now();
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI is required.");
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });

  try {
    const [marketConfigs, pendingLedgerRows, pendingIntents, historicalLedgerRows] = await Promise.all([
      MarketConfig.countDocuments({ paymentProvider: "swich" }),
      PaymentLedger.countDocuments({ provider: "swich", status: "pending" }),
      PaymentCheckoutIntent.countDocuments({ provider: "swich", state: { $in: ["prepared", "dispatched", "unknown"] } }),
      PaymentLedger.countDocuments({ provider: "swich" }),
    ]);
    const report = { marketConfigs, pendingLedgerRows, pendingIntents, historicalLedgerRows };

    if (!apply) {
      console.log(JSON.stringify({ mode: "dry-run", ...report }, null, 2));
      return;
    }
    if (!confirmed) throw new Error("Refusing write: pass --confirm=RETIRE_SWICH_MARKETS.");
    if (pendingLedgerRows || pendingIntents) {
      throw new Error(`Refusing gateway retirement: ${pendingLedgerRows} pending legacy ledger row(s) and ${pendingIntents} unresolved checkout intent(s) require finance reconciliation.`);
    }

    const result = await MarketConfig.updateMany(
      { paymentProvider: "swich" },
      { $set: { paymentProvider: "rapidpay" } },
    );
    const finalReport = { ...report, modifiedMarketConfigs: result.modifiedCount };
    await recordMigrationRun({
      name: NAME,
      status: "applied",
      matched: marketConfigs,
      modified: result.modifiedCount,
      durationMs: Date.now() - startedAt,
      report: finalReport,
    });
    console.log(JSON.stringify({ mode: "apply", ...finalReport }, null, 2));
  } catch (error) {
    if (apply) await recordMigrationRun({
      name: NAME,
      status: "failed",
      matched: 0,
      modified: 0,
      durationMs: Date.now() - startedAt,
      error: String((error as Error)?.message || error),
    });
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
