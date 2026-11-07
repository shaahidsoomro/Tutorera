import { rapidPayProvider } from "../services/rapidPayProvider.service";
import { createTransaction } from "../utils/rapidGateway";
jest.mock("../utils/rapidGateway", () => ({ createTransaction: jest.fn() }));

describe("RapidPay customer mobile validation", () => {
  it("does not send a fabricated mobile number to the gateway", async () => {
    await expect(rapidPayProvider.createCheckout({ amount: 500, currency: "PKR", reference: "test", customerMobile: "invalid", successUrl: "https://example.test/success", failureUrl: "https://example.test/failure", checkoutUrl: "https://example.test/checkout" })).rejects.toMatchObject({ statusCode: 422, code: "PHONE_REQUIRED" });
    expect(createTransaction).not.toHaveBeenCalled();
  });
});
