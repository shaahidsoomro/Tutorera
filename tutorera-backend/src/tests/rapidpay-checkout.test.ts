import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { paymentProvider } from "../services/paymentProvider.service";
import { rapidPayProvider } from "../services/rapidPayProvider.service";
import PaymentLedger from "../models/PaymentLedger.model";

describe("RapidPay hosted checkout", () => {
  beforeEach(() => {
    process.env.RAPID_GATEWAY_ENV = "sandbox";
    process.env.RAPIDPAY_SUPPORTED_MARKETS = "PK";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.RAPIDPAY_SUPPORTED_MARKETS;
  });

  it("creates a PKR checkout and archives one pending ledger entry", async () => {
    jest.spyOn(rapidPayProvider, "createCheckout").mockResolvedValueOnce({ checkoutUrl: "https://checkout.example.test/session/1" });
    const checkout = await paymentProvider.createCheckout({
      amount: 100, currency: "PKR", marketCountryCode: "PK", customerMobileNo: "03001234567",
      customerEmail: "student@example.test", basketId: "BID-rp-test1001", description: "Test checkout",
      successUrl: "https://tutorera.ac.pk/payment/success", failureUrl: "https://tutorera.ac.pk/payment/failure",
      checkoutUrl: "https://tutorera.ac.pk/payment/checkout",
    });

    expect(checkout.checkoutUrl).toContain("checkout.example.test");
    expect(await PaymentLedger.findOne({ providerTransactionId: "BID-rp-test1001" }).lean()).toMatchObject({
      provider: "rapidpay", grossAmount: 100, currency: "PKR", status: "pending",
    });
  });

  it("rejects checkout outside the configured market or authoritative currency", async () => {
    await expect(paymentProvider.createCheckout({
      amount: 100, currency: "USD", marketCountryCode: "AE", customerMobileNo: "03001234567",
      customerEmail: "student@example.test", basketId: "BID-rp-unsupported", description: "Test",
      successUrl: "https://tutorera.ac.pk/payment/success", failureUrl: "https://tutorera.ac.pk/payment/failure",
      checkoutUrl: "https://tutorera.ac.pk/payment/checkout",
    })).rejects.toMatchObject({ code: "RAPIDPAY_MARKET_OR_CURRENCY_UNSUPPORTED" });
  });
});
