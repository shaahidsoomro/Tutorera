import { validateContacts } from "../controllers/externalValidation.controller";
import { detectIpCountry, validateContactDetails } from "../services/externalValidation.service";

jest.mock("../services/externalValidation.service", () => ({
  detectIpCountry: jest.fn(),
  validateContactDetails: jest.fn(),
}));

describe("validateContacts", () => {
  it("fails open when the external provider is unavailable", async () => {
    jest.mocked(validateContactDetails).mockRejectedValueOnce(new Error("provider unavailable"));
    const json = jest.fn();
    const res = { json, status: jest.fn().mockReturnThis() } as never;

    await validateContacts({ body: { email: "student@example.com" } } as never, res);

    expect(json).toHaveBeenCalledWith({
      success: true,
      validation: { available: false },
    });
  });

  it("returns an empty location when IP geolocation is unavailable", async () => {
    jest.mocked(detectIpCountry).mockRejectedValueOnce(new Error("provider unavailable"));
    const json = jest.fn();

    const { getVisitorMarket } = await import("../controllers/externalValidation.controller");
    await getVisitorMarket({
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    } as never, { json } as never);

    expect(detectIpCountry).toHaveBeenCalledWith("203.0.113.10");
    expect(json).toHaveBeenCalledWith({ success: true, location: {} });
  });
});
