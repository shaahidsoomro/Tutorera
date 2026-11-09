// src/utils/rapidGateway.ts
import axios from "axios";
import crypto from "crypto";

const BASE_URL = (process.env.RAPID_GATEWAY_BASE_URL || "https://secure.rapid-gateway.com").replace(/\/$/, "");

// "sandbox" (default) or "live". Switching to live later is just an env
// var change — no code change needed.
const RAPID_GATEWAY_ENV = process.env.RAPID_GATEWAY_ENV || "sandbox";
const IS_SANDBOX = RAPID_GATEWAY_ENV === "sandbox";

const MERCHANT_ID = (process.env.RAPID_GATEWAY_MERCHANT_ID as string) || (IS_SANDBOX ? "1442" : "");
const MERCHANT_NAME = process.env.RAPID_GATEWAY_MERCHANT_NAME || "TUTORERA";

// Sandbox auth is a shared, publicly-documented test credential — the same
// "client"/"secret" pair for every merchant testing on their platform. It is
// NOT a secret specific to Mentisera, and is safe to default here since
// The gateway's own docs publish it openly for sandbox use.
const OAUTH_CLIENT_ID = IS_SANDBOX ? "client" : MERCHANT_ID;
const OAUTH_CLIENT_SECRET = IS_SANDBOX
  ? "secret"
  : ((process.env.RAPID_GATEWAY_CLIENT_SECRET as string) || ""); // real secret — required once we go live

const TRANSACTION_PATH = IS_SANDBOX ? "/sandbox/process-transaction" : "/rapid/process-transaction";

// Simple in-memory token cache — avoids requesting a new OAuth2 token on
// every single checkout creation. Refreshed a little before actual expiry.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.token;
  }

  const basicAuth = Buffer.from(`${OAUTH_CLIENT_ID}:${OAUTH_CLIENT_SECRET}`).toString("base64");

  const response = await axios.post(
    `${BASE_URL}/oauth2/token`,
    new URLSearchParams({ grant_type: "client_credentials" }).toString(),
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const { access_token, expires_in } = response.data;
  cachedToken = {
    token: access_token,
    expiresAt: Date.now() + (expires_in ? expires_in * 1000 : 5 * 60 * 1000),
  };

  return access_token;
}

interface CreateTransactionParams {
  amount: number;
  currency: string;
  customerMobileNo: string;
  customerEmail: string;
  basketId: string; // our own unique reference — MUST equal what we reconcile webhooks against
  description: string;
  successUrl: string;
  failureUrl: string;
  checkoutUrl: string;
}

// Creates a transaction and returns the hosted checkout URL to redirect the
// customer to. The gateway API responds with an HTTP redirect (not a
// JSON body) — we must NOT follow it automatically, only capture the
// Location header, exactly like their documented PHP example
// (CURLOPT_FOLLOWLOCATION => false + CURLINFO_REDIRECT_URL).
export async function createTransaction(params: CreateTransactionParams): Promise<string> {
  const currency = params.currency.toUpperCase();
  if (currency !== "PKR") {
    throw { statusCode: 409, code: "UNSUPPORTED_PAYMENT_CURRENCY", message: "Rapid Gateway checkout is configured for PKR only." };
  }

  const token = await getAccessToken();

  const body = new URLSearchParams({
    MERCHANT_ID, // always the REAL merchant id, even in sandbox
    MERCHANT_NAME,
    TXNAMT: params.amount.toString(),
    CURRENCY_CODE: currency,
    CUSTOMER_MOBILE_NO: params.customerMobileNo,
    CUSTOMER_EMAIL_ADDRESS: params.customerEmail,
    BASKET_ID: params.basketId,
    TXNDESC: params.description,
    ORDER_DATE: new Date().toISOString().slice(0, 10),
    SUCCESS_URL: params.successUrl,
    FAILURE_URL: params.failureUrl,
    CHECKOUT_URL: params.checkoutUrl,
    VERSION: "MY_VER_1.0",
    PROCCODE: "0",
  });

  const response = await axios.post(`${BASE_URL}${TRANSACTION_PATH}`, body.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    maxRedirects: 0, // capture the redirect, don't follow it
    validateStatus: (status) => status >= 200 && status < 400, // 3xx is expected here
  });

  const redirectUrl = response.headers.location;
  if (!redirectUrl) {
    throw { statusCode: 502, message: "Payment gateway did not return a checkout redirect URL." };
  }

  return redirectUrl;
}

// Verifies a webhook's signature exactly per the payment gateway's documented
// recipe: HMAC_SHA256(secret, timestamp + "." + raw_request_body), hex,
// uppercase, compared in constant time, with a 5-minute freshness window
// to reject replayed/stale deliveries.
export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  timestampHeader: string | undefined
): boolean {
  const secret = process.env.RAPID_GATEWAY_WEBHOOK_SECRET as string;
  if (!signatureHeader || !timestampHeader || !secret) return false;

  const timestamp = parseInt(timestampHeader, 10);
  if (Number.isNaN(timestamp)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > 300) return false; // 5-minute window

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody.toString()}`)
    .digest("hex")
    .toUpperCase();

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
