import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Deployment scripts execute as native JavaScript.
import { assertPaymentReleasePolicy, checkPaymentRelease } from "../scripts/payment-release-policy.mjs";

test("accepts the verified RapidPay production configuration", () => {
  assert.doesNotThrow(() => checkPaymentRelease({ PAYMENT_PROVIDER: "rapidpay" }));
});

test("blocks provider mismatch and unverified replacement contract", () => {
  const verified = { requestedProvider: "rapidpay", implementedProvider: "rapidpay", contractVerified: true };
  assert.throws(() => assertPaymentReleasePolicy(verified, { PAYMENT_PROVIDER: "swich" }), /does not match/);
  assert.throws(() => assertPaymentReleasePolicy({ ...verified, contractVerified: false }, { PAYMENT_PROVIDER: "rapidpay" }), /migration is incomplete/);
  assert.doesNotThrow(() => assertPaymentReleasePolicy(verified, { PAYMENT_PROVIDER: "rapidpay" }));
});
