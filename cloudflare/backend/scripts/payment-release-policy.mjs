import { readFileSync } from "node:fs";

/** Release intent is separate from the still-running legacy adapter. */
export function assertPaymentReleasePolicy(policy, vars) {
  if (policy.requestedProvider !== "rapidpay") throw new Error("Release policy must select RapidPay exclusively.");
  if (vars.PAYMENT_PROVIDER !== policy.requestedProvider) throw new Error("Worker payment selection does not match the RapidPay release policy.");
  if (policy.implementedProvider !== policy.requestedProvider || !policy.contractVerified) {
    throw new Error("RapidPay migration is incomplete: verify the merchant API and webhook contract before deploying.");
  }
}

export function checkPaymentRelease(vars) {
  const policy = JSON.parse(readFileSync(new URL("../payment-release-policy.json", import.meta.url), "utf8"));
  assertPaymentReleasePolicy(policy, vars);
}
