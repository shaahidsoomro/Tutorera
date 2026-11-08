import { assertRapidPayRuntimeConfiguration } from "../services/rapidPayProvider.service";

describe("RapidPay production runtime configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.RAPID_GATEWAY_ENV = "live";
    process.env.RAPID_GATEWAY_MERCHANT_ID = "0000";
    process.env.RAPID_GATEWAY_CLIENT_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("accepts configured live gateway credentials", () => {
    expect(() => assertRapidPayRuntimeConfiguration()).not.toThrow();
  });

  it("rejects a live configuration without a merchant ID", () => {
    delete process.env.RAPID_GATEWAY_MERCHANT_ID;
    expect(() => assertRapidPayRuntimeConfiguration()).toThrow("RAPID_GATEWAY_MERCHANT_ID is not configured");
  });

  it("rejects a live configuration without a client secret", () => {
    delete process.env.RAPID_GATEWAY_CLIENT_SECRET;
    expect(() => assertRapidPayRuntimeConfiguration()).toThrow("RAPID_GATEWAY_CLIENT_SECRET is not configured");
  });

  it("permits sandbox configuration to rely on its provider-managed test credentials", () => {
    process.env.RAPID_GATEWAY_ENV = "sandbox";
    delete process.env.RAPID_GATEWAY_MERCHANT_ID;
    delete process.env.RAPID_GATEWAY_CLIENT_SECRET;
    expect(() => assertRapidPayRuntimeConfiguration()).not.toThrow();
  });
});
