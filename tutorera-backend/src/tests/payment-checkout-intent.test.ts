import request from "supertest";
import app from "../app";
import { paymentProvider } from "../services/paymentProvider.service";
import { rapidPayProvider } from "../services/rapidPayProvider.service";
import PaymentCheckoutIntent from "../models/PaymentCheckoutIntent.model";
import PaymentWebhookEvent from "../models/PaymentWebhookEvent.model";
import PaymentLedger from "../models/PaymentLedger.model";

const params = { amount: 500, currency: "PKR", marketCountryCode: "PK", customerMobileNo: "03001234567", customerEmail: "student@example.test", basketId: "BID-intent-test", description: "Lesson", successUrl: "https://example.test/success", failureUrl: "https://example.test/failure", checkoutUrl: "https://example.test/checkout" };
afterEach(() => jest.restoreAllMocks());

describe("durable checkout intent and payment event", () => {
 it("records the intended amount before dispatch and blocks concurrent reuse", async () => {
   let began!: () => void; let finish!: (value: { checkoutUrl: string }) => void;
   const started = new Promise<void>(resolve => { began = resolve; });
   const gateway = new Promise<{checkoutUrl: string}>(resolve => { finish = resolve; });
   const send = jest.spyOn(rapidPayProvider, "createCheckout").mockImplementation(() => { began(); return gateway; });
   const first = paymentProvider.createCheckout(params); await started;
   expect(await PaymentCheckoutIntent.findById(params.basketId).lean()).toMatchObject({ state: "dispatched", amount: 500, currency: "PKR" });
   await expect(paymentProvider.createCheckout(params)).rejects.toMatchObject({ code: "PAYMENT_ATTEMPT_BLOCKED" });
   finish({ checkoutUrl: "https://gateway.example.test/checkout" }); await first;
   expect(send).toHaveBeenCalledTimes(1); expect((await PaymentCheckoutIntent.findById(params.basketId))?.state).toBe("responded");
   expect(await PaymentLedger.countDocuments({ providerTransactionId: params.basketId, eventType: "checkout.created" })).toBe(1);
 });
 it("retains an unknown intent after gateway timeout and records an unmatched verified event", async () => {
   jest.spyOn(rapidPayProvider, "createCheckout").mockRejectedValue(new Error("timeout"));
   await expect(paymentProvider.createCheckout(params)).rejects.toMatchObject({ code: "PAYMENT_OUTCOME_UNKNOWN" });
   expect((await PaymentCheckoutIntent.findById(params.basketId))?.state).toBe("unknown");
   jest.spyOn(paymentProvider, "verifyWebhookSignature").mockReturnValue(true);
   const payload = { eventId: "intent-event", eventType: "transaction.completed", merchantTransactionId: params.basketId, status: "SUCCESS", amount: 500, currency: "PKR" };
   const result = await request(app).post("/api/v1/payments/webhook").set("X-RapidGateway-Signature", "fixture").set("X-RapidGateway-Timestamp", "1").send(payload);
   expect(result.status).toBe(409); expect(result.body.code).toBe("PAYMENT_RECONCILIATION_FAILED");
   let stored = await PaymentWebhookEvent.findById("rapidpay:intent-event").lean();
   for (let attempt = 0; attempt < 20 && stored?.state === "pending"; attempt++) { await new Promise(resolve => setTimeout(resolve, 25)); stored = await PaymentWebhookEvent.findById("rapidpay:intent-event").lean(); }
   expect(stored).toMatchObject({ reference: params.basketId, amount: 500, currency: "PKR", state: "unmatched", reviewReason: "CHECKOUT_LEDGER_MISSING" });
   expect(await PaymentLedger.countDocuments({ providerTransactionId: params.basketId, eventType: "payment.succeeded" })).toBe(0);
   const conflicting = await request(app).post("/api/v1/payments/webhook").set("X-RapidGateway-Signature", "fixture").set("X-RapidGateway-Timestamp", "1").send({ ...payload, amount: 501 });
   expect(conflicting.status).toBe(409); expect(conflicting.body.code).toBe("PAYMENT_EVENT_CONFLICT");
 });
 it("does not acknowledge a verified event when durable storage fails", async () => {
   jest.spyOn(paymentProvider, "verifyWebhookSignature").mockReturnValue(true);
   jest.spyOn(PaymentWebhookEvent, "findOneAndUpdate").mockImplementationOnce(() => { throw new Error("database unavailable"); });
   const payload = { eventId: "storage-failure", eventType: "transaction.completed", merchantTransactionId: params.basketId, status: "SUCCESS", amount: 500, currency: "PKR" };
   const result = await request(app).post("/api/v1/payments/webhook").set("X-RapidGateway-Signature", "fixture").set("X-RapidGateway-Timestamp", "1").send(payload);
   expect(result.status).toBe(503); expect(await PaymentLedger.countDocuments()).toBe(0);
 });
 it("does not infer a missing currency or settle a payment", async () => {
   await PaymentLedger.create({ provider: "rapidpay", providerTransactionId: params.basketId, eventType: "checkout.created", status: "pending", grossAmount: 500, currency: "PKR" });
   jest.spyOn(paymentProvider, "verifyWebhookSignature").mockReturnValue(true);
   const payload = { eventId: "missing-currency", eventType: "transaction.completed", merchantTransactionId: params.basketId, status: "SUCCESS", amount: 500 };
   const result = await request(app).post("/api/v1/payments/webhook").set("X-RapidGateway-Signature", "fixture").set("X-RapidGateway-Timestamp", "1").send(payload);
   expect(result.status).toBe(409); expect(result.body.code).toBe("PAYMENT_RECONCILIATION_FAILED");
   expect(await PaymentLedger.countDocuments({ eventType: "payment.succeeded" })).toBe(0);
   expect((await PaymentWebhookEvent.findById("rapidpay:missing-currency"))?.currency).toBeUndefined();
 });
 it("retains unmatched failures and contradictory success events for review", async () => {
   jest.spyOn(paymentProvider, "verifyWebhookSignature").mockReturnValue(true);
   const post = (payload: object) => request(app).post("/api/v1/payments/webhook").set("X-RapidGateway-Signature", "fixture").set("X-RapidGateway-Timestamp", "1").send(payload);
   const failed = await post({ eventId: "unmatched-failure", eventType: "transaction.failed", merchantTransactionId: params.basketId, status: "FAILED", amount: 500, currency: "PKR" });
   expect(failed.status).toBe(409); expect(failed.body.code).toBe("PAYMENT_RECONCILIATION_FAILED");
   const contradiction = await post({ eventId: "contradictory-event", eventType: "transaction.completed", merchantTransactionId: params.basketId, status: "FAILED", amount: 500, currency: "PKR" });
   expect(contradiction.status).toBe(409); expect(contradiction.body.code).toBe("PAYMENT_EVENT_CONFLICT");
   expect(await PaymentWebhookEvent.countDocuments()).toBe(2); expect(await PaymentLedger.countDocuments()).toBe(0);
 });
 it("does not store unauthenticated webhook payloads", async () => {
   jest.spyOn(paymentProvider, "verifyWebhookSignature").mockReturnValue(false);
   const result = await request(app).post("/api/v1/payments/webhook").set("X-RapidGateway-Signature", "invalid").set("X-RapidGateway-Timestamp", "1").send({ eventId: "unauthenticated", eventType: "transaction.completed", merchantTransactionId: params.basketId });
   expect(result.status).toBe(401); expect(await PaymentWebhookEvent.countDocuments()).toBe(0);
 });
 it("blocks checkout dispatch when a legacy ledger already has the basket", async () => {
   await PaymentLedger.create({ provider: "rapidpay", providerTransactionId: params.basketId, eventType: "checkout.created", status: "pending", grossAmount: 500, currency: "PKR" });
   const send = jest.spyOn(rapidPayProvider, "createCheckout");
   await expect(paymentProvider.createCheckout(params)).rejects.toMatchObject({ code: "PAYMENT_ATTEMPT_BLOCKED" }); expect(send).not.toHaveBeenCalled();
 });
 it("does not dispatch when required local details are invalid", async () => {
   const send = jest.spyOn(rapidPayProvider, "createCheckout");
   await expect(paymentProvider.createCheckout({ ...params, customerMobileNo: "bad" })).rejects.toMatchObject({ code: "PHONE_REQUIRED" });
   expect(send).not.toHaveBeenCalled(); expect(await PaymentCheckoutIntent.countDocuments()).toBe(0);
 });
});
