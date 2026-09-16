import axios from "axios";
import crypto from "crypto";

// TUTORERA uses Rapid Gateway directly from the trusted backend. There is no
// intermediate payment Worker or second payment authority in the flow.
export interface RapidpayCheckoutParams {
  amount: number;
  currency?: string;
  reference: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_API_BASE_URL = "https://api.rapidgateway.pk";
const DEFAULT_METHODS = ["card", "raast", "easypaisa", "jazzcash"];
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    const error = new Error(`${name} is not configured`) as Error & { statusCode?: number; code?: string };
    error.statusCode = 503;
    error.code = "PAYMENT_GATEWAY_NOT_CONFIGURED";
    throw error;
  }
  return value;
}

function normalizePakistaniPhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed.replace(/[^+\d]/g, "");

  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("92")) return `+${digits}`;
  if (digits.startsWith("03") && digits.length === 11) return `+92${digits.slice(1)}`;
  return trimmed;
}

function paymentMethods(): string[] {
  const configured = process.env.RAPID_GATEWAY_METHODS
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_METHODS;
}

function safeEqualHex(received: string, expected: string): boolean {
  const normalizedReceived = received.replace(/^sha256=/i, "").trim().toUpperCase();
  const normalizedExpected = expected.trim().toUpperCase();
  if (!normalizedReceived || normalizedReceived.length !== normalizedExpected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(normalizedReceived, "utf8"), Buffer.from(normalizedExpected, "utf8"));
}

export const rapidpayProvider = {
  /**
   * Create a hosted Rapid Gateway checkout directly from the Render backend.
   * Rapid Gateway's public integration guide uses POST /v1/payments with a
   * bearer secret and Idempotency-Key. Customer card/wallet data never enters
   * TUTORERA's application servers.
   */
  async createCheckout(params: RapidpayCheckoutParams): Promise<string> {
    const secretKey = requireEnv("RAPID_GATEWAY_SECRET_KEY");
    const webhookUrl = requireEnv("RAPID_GATEWAY_WEBHOOK_URL");
    const apiBaseUrl = (process.env.RAPID_GATEWAY_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

    const currency = (params.currency || "PKR").toUpperCase();
    if (currency !== "PKR") {
      const error = new Error(
        `Rapid Gateway checkout is currently enabled only for PKR transactions; received ${currency}.`
      ) as Error & { statusCode?: number; code?: string };
      error.statusCode = 409;
      error.code = "RAPID_GATEWAY_CURRENCY_UNSUPPORTED";
      throw error;
    }

    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      const error = new Error("Payment amount must be a positive number") as Error & { statusCode?: number; code?: string };
      error.statusCode = 400;
      error.code = "INVALID_PAYMENT_AMOUNT";
      throw error;
    }

    const metadata = params.metadata || {};
    const email = String(metadata.studentEmail || "").trim();
    const phone = normalizePakistaniPhone(String(metadata.studentMobileNo || ""));
    const returnUrl = String(metadata.successUrl || metadata.checkoutUrl || "").trim();

    if (!returnUrl) {
      const error = new Error("Rapid Gateway return URL is missing") as Error & { statusCode?: number; code?: string };
      error.statusCode = 500;
      error.code = "PAYMENT_RETURN_URL_MISSING";
      throw error;
    }

    if (!email && !phone) {
      const error = new Error("A customer email or phone number is required for checkout") as Error & { statusCode?: number; code?: string };
      error.statusCode = 400;
      error.code = "PAYMENT_CUSTOMER_MISSING";
      throw error;
    }

    try {
      const response = await axios.post(
        `${apiBaseUrl}/v1/payments`,
        {
          amount: params.amount,
          currency,
          methods: paymentMethods(),
          customer: {
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
          },
          return_url: returnUrl,
          webhook_url: webhookUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "Idempotency-Key": params.reference,
          },
          timeout: 15_000,
        }
      );

      const checkoutUrl = response.data?.checkout_url || response.data?.checkoutUrl;
      if (!checkoutUrl || typeof checkoutUrl !== "string") {
        throw new Error("Rapid Gateway returned no checkout URL");
      }

      return checkoutUrl;
    } catch (error: any) {
      if (error?.statusCode) throw error;

      const status = error?.response?.status;
      const gatewayMessage = error?.response?.data?.message || error?.response?.data?.error;
      const wrapped = new Error(
        gatewayMessage ? `Rapid Gateway checkout failed: ${gatewayMessage}` : "Rapid Gateway checkout failed"
      ) as Error & { statusCode?: number; code?: string };
      wrapped.statusCode = status && status >= 400 && status < 500 ? status : 502;
      wrapped.code = "RAPID_GATEWAY_CHECKOUT_FAILED";
      throw wrapped;
    }
  },

  /**
   * Verify Rapid Gateway webhook signatures. Current Rapid Gateway deliveries
   * sign `timestamp + "." + rawBody` with HMAC-SHA256 and send uppercase hex.
   * The raw-body-only branch supports Rapid Gateway's older X-RG-Signature
   * delivery format during provider-side migration; it is not a second gateway.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string, timestamp?: string): boolean {
    const webhookSecret = process.env.RAPID_GATEWAY_WEBHOOK_SECRET?.trim();
    if (!webhookSecret || !signature || !rawBody) return false;

    try {
      if (timestamp) {
        if (!/^\d+$/.test(timestamp)) return false;
        const sentAt = Number(timestamp);
        const now = Math.floor(Date.now() / 1000);
        if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > WEBHOOK_TOLERANCE_SECONDS) return false;

        const expected = crypto
          .createHmac("sha256", webhookSecret)
          .update(`${timestamp}.${rawBody.toString("utf8")}`)
          .digest("hex")
          .toUpperCase();
        return safeEqualHex(signature, expected);
      }

      const legacyExpected = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");
      return safeEqualHex(signature, legacyExpected);
    } catch {
      return false;
    }
  },
};
