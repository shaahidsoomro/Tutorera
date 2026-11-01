import { afterEach, beforeEach } from "@jest/globals";
import MarketConfig from "../models/MarketConfig.model";
import { assertAcceptanceAvailable, ensureLaunchMarkets } from "../services/market.service";

describe("global market capability enforcement", () => {
  beforeEach(() => {
    process.env.RAPIDPAY_SUPPORTED_MARKETS = "PK,AE,GB,US,SA,IN";
  });

  afterEach(() => {
    delete process.env.RAPIDPAY_SUPPORTED_MARKETS;
  });

  it("keeps every approved launch market in its local pricing currency", async () => {
    await ensureLaunchMarkets();
    const markets = await MarketConfig.find().sort("countryCode").lean();
    expect(markets.map((market) => market.countryCode)).toEqual(["AE", "GB", "IN", "PK", "SA", "US"]);
    expect(markets.every((market) => market.paymentsEnabled && market.paymentProvider === "rapidpay" && market.launchStatus === "live")).toBe(true);
    expect(Object.fromEntries(markets.map((market) => [market.countryCode, market.currency]))).toEqual({
      AE: "AED", GB: "GBP", IN: "INR", PK: "PKR", SA: "SAR", US: "USD",
    });
  });

  it("permits acceptance in every approved launch market", async () => {
    await ensureLaunchMarkets();
    for (const countryCode of ["PK", "AE", "GB", "US", "SA", "IN"]) {
      await expect(assertAcceptanceAvailable(countryCode)).resolves.toMatchObject({ countryCode, paymentProvider: "rapidpay" });
    }
  });

  it("enables a non-PK market only when RapidPay explicitly approves its market", async () => {
    const previous = process.env.RAPIDPAY_SUPPORTED_MARKETS;
    process.env.RAPIDPAY_SUPPORTED_MARKETS = "PK,AE";
    try {
      await ensureLaunchMarkets();
      await expect(assertAcceptanceAvailable("AE")).resolves.toMatchObject({
        countryCode: "AE",
        paymentProvider: "rapidpay",
        currency: "AED",
      });
    } finally {
      if (previous === undefined) delete process.env.RAPIDPAY_SUPPORTED_MARKETS;
      else process.env.RAPIDPAY_SUPPORTED_MARKETS = previous;
      await ensureLaunchMarkets();
    }
  });
});
