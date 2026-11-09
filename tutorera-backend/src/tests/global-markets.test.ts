import { afterEach, beforeEach } from "@jest/globals";
import MarketConfig from "../models/MarketConfig.model";
import { assertAcceptanceAvailable, ensureLaunchMarkets, resolveMarket } from "../services/market.service";

describe("global market capability enforcement", () => {
  beforeEach(() => {
    process.env.RAPIDPAY_SUPPORTED_MARKETS = "PK";
  });

  afterEach(() => {
    delete process.env.RAPIDPAY_SUPPORTED_MARKETS;
  });

  it("keeps local discovery markets available without claiming unavailable checkout", async () => {
    await ensureLaunchMarkets();
    const markets = await MarketConfig.find().sort("countryCode").lean();
    expect(markets.map((market) => market.countryCode)).toEqual(["AE", "GB", "IN", "PK", "SA", "US"]);
    expect(Object.fromEntries(markets.map((market) => [market.countryCode, market.currency]))).toEqual({
      AE: "AED", GB: "GBP", IN: "INR", PK: "PKR", SA: "SAR", US: "USD",
    });
    expect(markets.find((market) => market.countryCode === "PK")).toMatchObject({ paymentProvider: "rapidpay", paymentsEnabled: true, launchStatus: "live" });
    for (const market of markets.filter((market) => market.countryCode !== "PK")) {
      expect(market).toMatchObject({ paymentProvider: "none", paymentsEnabled: false, launchStatus: "beta" });
      expect(market.featureFlags?.acceptance).toBe(false);
    }
  });

  it("allows checkout only where the configured provider can settle the market currency", async () => {
    await ensureLaunchMarkets();
    await expect(assertAcceptanceAvailable("PK")).resolves.toMatchObject({ countryCode: "PK", paymentProvider: "rapidpay" });
    await expect(assertAcceptanceAvailable("AE")).rejects.toMatchObject({ code: "MARKET_DISCOVERY_ONLY" });
  });

  it("repairs a stale launch-market currency without changing other market settings", async () => {
    await MarketConfig.create({
      countryCode: "PK", countryName: "Pakistan", currency: "USD", currencySymbol: "$",
      timezone: "Asia/Karachi", timezones: ["Asia/Karachi"], paymentProvider: "rapidpay",
      paymentsEnabled: true, payoutsEnabled: false, isActive: true, launchStatus: "live",
    });

    await expect(resolveMarket("PK")).resolves.toMatchObject({ currency: "PKR" });
    expect(await MarketConfig.findOne({ countryCode: "PK" }).select("currency currencySymbol").lean()).toMatchObject({ currency: "PKR", currencySymbol: "Rs." });
  });

  it("does not activate checkout merely because a country is listed without currency capability", async () => {
    const previous = process.env.RAPIDPAY_SUPPORTED_MARKETS;
    process.env.RAPIDPAY_SUPPORTED_MARKETS = "PK,AE";
    try {
      await ensureLaunchMarkets();
      await expect(assertAcceptanceAvailable("AE")).rejects.toMatchObject({ code: "MARKET_DISCOVERY_ONLY" });
    } finally {
      if (previous === undefined) delete process.env.RAPIDPAY_SUPPORTED_MARKETS;
      else process.env.RAPIDPAY_SUPPORTED_MARKETS = previous;
      await ensureLaunchMarkets();
    }
  });
});
