import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User.model";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import PaymentLedger from "../models/PaymentLedger.model";
import PaymentWebhookEvent from "../models/PaymentWebhookEvent.model";
import PaymentCheckoutIntent from "../models/PaymentCheckoutIntent.model";

async function actor(role: "admin" | "student", adminRole?: string) {
 const user = await User.create({ name: role, email: `holds-${Math.random()}@test.local`, password: "password123", role, ...(adminRole ? { adminRole } : {}) });
 return { user, token: jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: "1h" }) };
}
describe("finance payment hold review", () => {
 it("limits access and shows uncertain and overdue holds with ledger evidence", async () => {
  const finance = await actor("admin", "finance"); const support = await actor("admin", "support"); const student = await actor("student");
  const tutor = await User.create({ name: "Tutor", email: `hold-tutor-${Math.random()}@test.local`, password: "password123", role: "tutor" });
  const requirement = await Request.create({ student: student.user._id, subject: "Mathematics", level: "Matric", description: "Mathematics tutoring", budget: 1000, currency: "PKR", schedule: "Evenings", teachingMode: "online", status: "awaiting_payment" });
  const base = { request: requirement._id, tutor: tutor._id, amount: 1000, initialStudentRate: 1000, currency: "PKR", message: "Available", status: "payment_pending", expiresAt: new Date(Date.now() + 60000) };
  const hold = await Bid.create({ ...base, paymentOutcomeUnknown: true, paymentReservationId: "private-token", paymentPendingExpiresAt: new Date(Date.now() + 60000) });
  await Request.updateOne({ _id: requirement._id }, { $set: { acceptedOffer: hold._id } });
  await PaymentLedger.create({ provider: "rapidpay", providerTransactionId: "BID-REF", eventType: "checkout.created", status: "pending", grossAmount: 1000, currency: "PKR", bid: hold._id });
  expect((await request(app).get("/api/v1/admin/finance/payment-holds")).status).toBe(401);
  expect((await request(app).get("/api/v1/admin/finance/payment-holds").set("Authorization", `Bearer ${support.token}`)).status).toBe(403);
  const result = await request(app).get("/api/v1/admin/finance/payment-holds").set("Authorization", `Bearer ${finance.token}`);
  expect(result.status).toBe(200); expect(result.headers["cache-control"]).toContain("no-store"); expect(result.body.total).toBe(1);
  expect(result.body.holds[0]).toMatchObject({ outcomeUnknown: true, hasReservationId: true, request: { selected: true, subject: "Mathematics" }, latestLedger: { reference: "BID-REF", eventType: "checkout.created" } });
  expect(JSON.stringify(result.body)).not.toContain("private-token");
  await PaymentWebhookEvent.create({ _id: "rapidpay:review-test", provider: "rapidpay", payloadHash: "fixture-hash", reference: "BID-REF", eventType: "transaction.completed", status: "SUCCESS", amount: 1000, currency: "PKR", state: "unmatched", reviewReason: "CHECKOUT_LEDGER_MISSING", verifiedAt: new Date() });
  expect((await request(app).get("/api/v1/admin/finance/payment-events").set("Authorization", `Bearer ${support.token}`)).status).toBe(403);
  const events = await request(app).get("/api/v1/admin/finance/payment-events").set("Authorization", `Bearer ${finance.token}`);
  expect(events.status).toBe(200); expect(events.body.events).toHaveLength(1); expect(events.body.events[0]).toMatchObject({ reference: "BID-REF", state: "unmatched", reviewReason: "CHECKOUT_LEDGER_MISSING" });
  expect(JSON.stringify(events.body)).not.toContain("fixture-hash");
  await PaymentCheckoutIntent.create({ _id: "BID-intent", provider: "rapidpay", amount: 1000, currency: "PKR", state: "unknown", student: student.user._id });
  expect((await request(app).get("/api/v1/admin/finance/checkout-intents").set("Authorization", `Bearer ${support.token}`)).status).toBe(403);
  const intents = await request(app).get("/api/v1/admin/finance/checkout-intents").set("Authorization", `Bearer ${finance.token}`);
  expect(intents.status).toBe(200); expect(intents.body.intents).toHaveLength(1); expect(intents.body.intents[0]).toMatchObject({ _id: "BID-intent", state: "unknown", amount: 1000 });
  expect(intents.body.intents[0].student).toBeUndefined();
  await PaymentCheckoutIntent.create({ _id: "BID-REF", provider: "rapidpay", amount: 1000, currency: "PKR", state: "unknown", bid: hold._id, student: student.user._id });
  const path = `/api/v1/admin/finance/payment-events/${encodeURIComponent("rapidpay:review-test")}/evidence`;
  expect((await request(app).get(path).set("Authorization", `Bearer ${support.token}`)).status).toBe(403);
  const evidence = await request(app).get(path).set("Authorization", `Bearer ${finance.token}`);
  expect(evidence.status).toBe(200); expect(evidence.headers["cache-control"]).toContain("no-store");
  expect(evidence.body.intent).toMatchObject({ _id: "BID-REF", state: "unknown", amount: 1000 });
  expect(evidence.body.ledger).toHaveLength(1); expect(evidence.body.bid).toMatchObject({ status: "payment_pending" });
  expect(JSON.stringify(evidence.body)).not.toContain("private-token"); expect(evidence.body.intent.student).toBeUndefined();
  expect((await request(app).get("/api/v1/admin/finance/payment-events/missing/evidence").set("Authorization", `Bearer ${finance.token}`)).status).toBe(404);

 });
});
