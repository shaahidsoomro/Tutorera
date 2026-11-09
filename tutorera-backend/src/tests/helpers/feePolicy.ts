import FeeConfig from "../../models/FeeConfig.model";

/**
 * Fee policies are per currency and never applied to an offer in another
 * currency, and the test database is wiped between tests. Suites that create
 * offers or bookings in `currency` seed a matching policy first. Rates mirror
 * the legacy defaults (0% student, 20% tutor, 15% tax) so amounts stay stable.
 */
export async function seedFeePolicy(currency = "USD", countryCode = "GLOBAL") {
  return FeeConfig.create({
    version: `test-${currency}`, countryCode, currency,
    studentFeePercent: 0, tutorFeePercent: 20, taxPercent: 15,
    minimumFee: 0, maximumFee: 1_000_000, isActive: true,
  });
}
