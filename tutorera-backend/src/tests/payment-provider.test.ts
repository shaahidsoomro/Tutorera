import axios from "axios";
import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { paymentProvider } from "../services/paymentProvider.service";
import { rapidpayProvider } from "../services/rapidpayProvider.service";

describe("Rapid Gateway direct integration", () => {
  beforeEach(() => {
    process.env.RAPID_GATEWAY_SECRET_KEY = "rg_test_secret_key_123456";
    process.env.RAPID_GATEWAY_WEBHOOK_SECRET = "rg_webhook_secret_123456789";
    process.env.RAPID_GATEWAY_WEBHOOK_URL = "https://api.example.test/api/v1/payments/webhook";
    process.env.RAPID_GATEWAY_API_BASE_URL = "https://api.rapidgateway.pk";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.RAPID_GATEWAY_SECRET_KEY;
    delete process.env.RAPID_GATEWAY_WEBHOOK_SECRET;
    delete process.env.RAPID_GATEWAY_WEBHOOK_URL;
    delete process.env.RAPID_GATEWAY_API_BASE_URL;
  });

  it("creates checkout directly through Rapid Gateway with an idempotency key", async () => {
    const post = jest.spyOn(axios, "post").mockResolvedValue({
      data: {
        id: "rg_payment_test_1",
        checkout_url: "https://checkout.rapidgateway.pk/test/rg_payment_test_1",
      },
    } as any);

    const checkoutUrl = await paymentProvider.createCheckout({
      amount: 100,
      currency: "PKR",
      customerMobileNo: "03001234567",
      customerEmail: "student@example.test",
      basketId: "BOOKING-1001",
      description: "Test checkout",
      successUrl: "https://example.test/success",
      failureUrl: "https://example.test/failure",
      checkoutUrl: "https://example.test/checkout",
      feeSnapshot: {
        subtotal: 100,
        studentFee: 0,
        tutorFee: 0,
        tax: 0,
        studentTotal: 100,
        tutorNet: 100,
        platformFee: 0,
        gatewayFee: 0,
      },
    });

    expect(checkoutUrl).toBe("https://checkout.rapidgateway.pk/test/rg_payment_test_1");
    expect(post).toHaveBeenCalledWith(
      "https://api.rapidgateway.pk/v1/payments",
      expect.objectContaining({
        amount: 100,
        currency: "PKR",
        methods: ["card", "raast", "easypaisa", "jazzcash"],
        customer: {
          email: "student@example.test",
          phone: "+923001234567",
        },
        return_url: "https://example.test/success",
        webhook_url: "https://api.example.test/api/v1/payments/webhook",
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer rg_test_secret_key_123456",
          "Idempotency-Key": "BOOKING-1001",
        }),
      })
    );
  });

  it("rejects unsupported non-PKR checkout before contacting Rapid Gateway", async () => {
    const post = jest.spyOn(axios, "post");

    await expect(
      rapidpayProvider.createCheckout({
        amount: 100,
        currency: "AED",
        reference: "BOOKING-AED-1",
        metadata: {
          studentMobileNo: "+971500000000",
          studentEmail: "student@example.test",
          successUrl: "https://example.test/success",
        },
      })
    ).rejects.toMatchObject({ code: "RAPID_GATEWAY_CURRENCY_UNSUPPORTED", statusCode: 409 });

    expect(post).not.toHaveBeenCalled();
  });

  it("verifies timestamped Rapid Gateway HMAC signatures and rejects stale deliveries", () => {
    const rawBody = Buffer.from(JSON.stringify({ eventId: "evt_1", eventType: "transaction.completed" }));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto
      .createHmac("sha256", process.env.RAPID_GATEWAY_WEBHOOK_SECRET as string)
      .update(`${timestamp}.${rawBody.toString("utf8")}`)
      .digest("hex")
      .toUpperCase();

    expect(rapidpayProvider.verifyWebhookSignature(rawBody, signature, timestamp)).toBe(true);

    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 10 * 60);
    const staleSignature = crypto
      .createHmac("sha256", process.env.RAPID_GATEWAY_WEBHOOK_SECRET as string)
      .update(`${staleTimestamp}.${rawBody.toString("utf8")}`)
      .digest("hex")
      .toUpperCase();

    expect(rapidpayProvider.verifyWebhookSignature(rawBody, staleSignature, staleTimestamp)).toBe(false);
  });

  it("supports the provider's legacy raw-body X-RG signature during migration", () => {
    const rawBody = Buffer.from(JSON.stringify({ eventId: "evt_legacy", eventType: "transaction.completed" }));
    const signature = crypto
      .createHmac("sha256", process.env.RAPID_GATEWAY_WEBHOOK_SECRET as string)
      .update(rawBody)
      .digest("hex");

    expect(rapidpayProvider.verifyWebhookSignature(rawBody, signature)).toBe(true);
  });
});
