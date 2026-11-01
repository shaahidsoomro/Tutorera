import { httpError } from "../utils/httpError";
import { createTransaction } from "../utils/rapidGateway";

// Phone/CNIC normalizers — PK-specific customer data utils reused by
// offer and request controllers regardless of which gateway is active.

/** Pakistani CNIC: exactly 13 digits once dashes/spaces are stripped. */
export function normalizeCnic(raw: string | undefined | null): string | undefined {
  const digits = String(raw || "").replace(/\D/g, "");
  return /^\d{13}$/.test(digits) ? digits : undefined;
}

/**
 * Normalise a Pakistani mobile number to the "03XXXXXXXXX" format
 * RapidGateway accepts. Returns undefined for anything that can't be
 * normalised so the caller omits the field rather than sending a value
 * the gateway rejects.
 */
export function normalizePkMobile(raw: string | undefined | null): string | undefined {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(4);
  else if (digits.startsWith("92")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^3\d{9}$/.test(digits) ? `0${digits}` : undefined;
}

// RapidGateway integration — redirect-based hosted checkout.
//
// Flow:
//   1. POST /oauth2/token (Basic auth: merchantId:clientSecret) → access_token
//   2. POST /rapid/process-transaction (Bearer token, form-encoded) → Location header
//   3. Return checkoutUrl to client; client does window.location.href = checkoutUrl
//
// Credentials (env vars):
//   RAPID_GATEWAY_MERCHANT_ID    — numeric merchant ID
//   RAPID_GATEWAY_CLIENT_SECRET  — OAuth2 client secret (omit in sandbox; uses shared "secret")
//   RAPID_GATEWAY_WEBHOOK_SECRET — HMAC secret for verifying gateway webhooks
//   RAPID_GATEWAY_ENV            — "sandbox" (default) | "live"

export interface RapidPayCheckoutParams {
  amount: number;
  currency: string;
  marketCountryCode?: string;
  reference: string;        // basketId — our unique reference, reconciled on webhook
  customerEmail?: string;
  customerMobile?: string;
  description?: string;
  successUrl: string;
  failureUrl: string;
  checkoutUrl: string;
  metadata?: Record<string, unknown>;
}

export interface RapidPayCheckoutResult {
  checkoutUrl: string;      // hosted checkout page — redirect customer here
}

export function assertRapidPayRuntimeConfiguration(): void {
  // In sandbox mode the shared credentials are used automatically.
  // In live/production mode the env vars must be present.
  if (process.env.NODE_ENV === "production" && process.env.RAPID_GATEWAY_ENV === "live") {
    if (!process.env.RAPID_GATEWAY_MERCHANT_ID) {
      throw httpError("RAPID_GATEWAY_MERCHANT_ID is not configured", 503, "PAYMENT_GATEWAY_NOT_CONFIGURED");
    }
    if (!process.env.RAPID_GATEWAY_CLIENT_SECRET) {
      throw httpError("RAPID_GATEWAY_CLIENT_SECRET is not configured", 503, "PAYMENT_GATEWAY_NOT_CONFIGURED");
    }
  }
}

export function getRapidPayCapabilities() {
  const configured = process.env.RAPIDPAY_SUPPORTED_MARKETS
    ?.split(",").map((m) => m.trim().toUpperCase()).filter(Boolean);
  const markets = new Set(configured && configured.length > 0 ? configured : ["PK"]);
  const currencies = new Set(["PKR"]);
  return { markets, currencies };
}

export function assertRapidPayCheckoutCapability(countryCode: string | undefined, currency: string): void {
  // RapidGateway processes PKR only.
  if (currency.toUpperCase() !== "PKR") {
    throw httpError(
      "RapidGateway checkout supports PKR only.",
      409,
      "RAPIDPAY_MARKET_OR_CURRENCY_UNSUPPORTED"
    );
  }
}

export const rapidPayProvider = {
  async createCheckout(params: RapidPayCheckoutParams): Promise<RapidPayCheckoutResult> {
    assertRapidPayCheckoutCapability(params.marketCountryCode, params.currency);

    const mobile = normalizePkMobile(params.customerMobile)
      || normalizePkMobile(String(params.metadata?.studentMobileNo || ""))
      || "03000000000";

    const email = params.customerEmail
      || String(params.metadata?.studentEmail || "")
      || "";

    const checkoutUrl = await createTransaction({
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      customerMobileNo: mobile,
      customerEmail: email,
      basketId: params.reference,
      description: params.description || "TUTORERA Tutoring Session",
      successUrl: params.successUrl,
      failureUrl: params.failureUrl,
      checkoutUrl: params.checkoutUrl,
    });

    return { checkoutUrl };
  },
};
