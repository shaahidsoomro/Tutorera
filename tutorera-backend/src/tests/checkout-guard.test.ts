import { paymentProvider } from "../services/paymentProvider.service";
import { rapidPayProvider } from "../services/rapidPayProvider.service";
import PaymentCheckoutIntent from "../models/PaymentCheckoutIntent.model";
import PaymentLedger from "../models/PaymentLedger.model";
import User from "../models/User.model";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import { releaseExpiredPaymentHold } from "../controllers/request.controller";

const checkout = {
  amount: 100, currency: "PKR", basketId: "BID-guard-fixture", customerMobileNo: "03001234567",
  customerEmail: "student@example.test", description: "Fixture",
  feeSnapshot: { subtotal: 100, studentFee: 0, tutorFee: 20, tax: 3, studentTotal: 100, tutorNet: 77, platformFee: 23 },
};
const created = { sessionId: "cs_fixture-session", clientSecret: "cs_fixture-session_secret_xyz", publishableKey: "pk_test_0000" } as never;
async function previous() {
  await PaymentLedger.create({ provider: "rapidpay", providerTransactionId: checkout.basketId, eventType: "checkout.created", status: "pending", grossAmount: 100, currency: "USD", metadata: { sessionId: "old-session" } });
}
afterEach(() => jest.restoreAllMocks());

describe("checkout creation safety", () => {
  it("only lets one in-flight attempt create a session for the basket", async () => {
    let started!: () => void; let finish!: (value: typeof created) => void;
    const entered = new Promise<void>((resolve) => { started = resolve; });
    const external = new Promise<typeof created>((resolve) => { finish = resolve; });
    const create = jest.spyOn(rapidPayProvider, "createCheckout").mockImplementation(() => { started(); return external; });
    const first = paymentProvider.createCheckout(checkout);
    await entered;
    try {
      await expect(paymentProvider.createCheckout(checkout)).rejects.toMatchObject({ code: "PAYMENT_ATTEMPT_BLOCKED" });
    } finally { finish(created); }
    const result = await first;
    expect(result).toMatchObject({ sessionId: "cs_fixture-session" });
    expect(create).toHaveBeenCalledTimes(1);
    expect((await PaymentCheckoutIntent.findById(checkout.basketId))?.state).toBe("responded");
  });

  it("blocks retries after an ambiguous provider error", async () => {
    const create = jest.spyOn(rapidPayProvider, "createCheckout").mockRejectedValue(new Error("fixture timeout"));
    await expect(paymentProvider.createCheckout(checkout)).rejects.toMatchObject({ code: "PAYMENT_OUTCOME_UNKNOWN" });
    expect((await PaymentCheckoutIntent.findById(checkout.basketId))?.state).toBe("unknown");
    await expect(paymentProvider.createCheckout(checkout)).rejects.toMatchObject({ code: "PAYMENT_ATTEMPT_BLOCKED" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  // The replacement-checkout flow was removed with the RapidPay migration:
  // a basket that already has a checkout is never dispatched again.
  it("never dispatches a second checkout for a basket that already has one", async () => {
    await previous();
    const create = jest.spyOn(rapidPayProvider, "createCheckout");
    await expect(paymentProvider.createCheckout(checkout)).rejects.toMatchObject({ code: "PAYMENT_ATTEMPT_BLOCKED" });
    expect(create).not.toHaveBeenCalled();
  });

  it("preserves an expired request hold while a checkout outcome remains unknown", async () => {
    const student = await User.create({ name: "Student", email: "guard-student@test.local", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Tutor", email: "guard-tutor@test.local", password: "password123", role: "tutor" });
    const requirement = await Request.create({ student: student._id, subject: "Math", level: "Matric", description: "Math help", budget: 100, schedule: "Evenings", status: "awaiting_payment" });
    const bid = await Bid.create({ request: requirement._id, tutor: tutor._id, amount: 100, initialStudentRate: 100, message: "Available", status: "payment_pending", expiresAt: new Date(Date.now() + 86400000), paymentPendingExpiresAt: new Date(Date.now() - 1000) });
    await Request.updateOne({ _id: requirement._id }, { $set: { acceptedOffer: bid._id } });
    // An unknown checkout outcome keeps the hold, even though it has expired.
    await Bid.updateOne({ _id: bid._id }, { $set: { paymentOutcomeUnknown: true } });
    await releaseExpiredPaymentHold(requirement._id);
    expect((await Request.findById(requirement._id))?.status).toBe("awaiting_payment");
    expect((await Bid.findById(bid._id))?.status).toBe("payment_pending");
    // So does a checkout that has started.
    await Bid.updateOne({ _id: bid._id }, { $unset: { paymentOutcomeUnknown: "" }, $set: { checkoutStartedAt: new Date() } });
    await releaseExpiredPaymentHold(requirement._id);
    expect((await Bid.findById(bid._id))?.status).toBe("payment_pending");
    // Once neither applies, the expired hold is released.
    await Bid.updateOne({ _id: bid._id }, { $unset: { checkoutStartedAt: "" } });
    await releaseExpiredPaymentHold(requirement._id);
    expect((await Request.findById(requirement._id))?.status).toBe("open");
    expect((await Bid.findById(bid._id))?.status).toBe("submitted");
  });
});
