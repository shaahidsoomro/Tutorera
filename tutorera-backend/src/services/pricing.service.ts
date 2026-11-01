// Authoritative pricing service for new TUTORERA bookings. Both checkout
// and booking creation must use the same versioned quote.
import FeeConfig from "../models/FeeConfig.model";
import TaxConfig from "../models/TaxConfig.model";
import { MARKETPLACE_FEES, calculateMarketplaceFees } from "../config/constants";
import { convertAmount } from "./exchangeRate.service";

export interface MarketplaceFeeQuote {
  subtotal: number;
  studentFee: number;
  tutorFee: number;
  tax: number;
  studentTotal: number;
  tutorNet: number;
  currency?: string;
  feeConfig: Record<string, unknown>;
}

export interface FeeBreakdown {
  grossAmount: number;
  currency: string;
  studentFeeRate: number;
  studentFee: number;
  studentTotal: number;
  platformFeeRate: number;
  platformFee: number;
  taxRate: number;
  taxAmount: number;
  taxType: string;
  tutorNet: number;
  tutorFee: number;
  platformNet: number;
  amountUSD?: number;
}

// Applies approved FeeConfig rates. Historical bookings retain fee snapshots;
// country TaxConfig describes regulatory classification but must never silently
// override an explicit pricing policy or substitute for legal tax validation.
export async function resolveMarketplaceFees(amount: number, countryCode = "PK"): Promise<MarketplaceFeeQuote> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error("A positive tuition amount is required."), { statusCode: 422 });
  }
  const code = countryCode.toUpperCase();
  const config = await FeeConfig.findOne({ countryCode: code, isActive: true }).sort("-effectiveDate").lean()
    || await FeeConfig.findOne({ countryCode: "GLOBAL", isActive: true }).sort("-effectiveDate").lean();
  if (!config) {
    // Existing production rates until an admin actively publishes a version.
    const fallback = calculateMarketplaceFees(amount);
    return { ...fallback, currency: MARKETPLACE_FEES.currency, feeConfig: { ...MARKETPLACE_FEES, version: "legacy-2026-08-30", countryCode: code } };
  }
  const cap = config.maximumFee;
  const charge = (rate: number) => Math.min(cap, Math.max(config.minimumFee, Math.round(amount * rate / 100)));
  const studentFee = charge(config.studentFeePercent);
  const tutorFee = charge(config.tutorFeePercent);
  const tax = Math.round(tutorFee * config.taxPercent / 100);
  const tutorNet = amount - tutorFee - tax;
  if (tutorNet < 0) {
    throw Object.assign(new Error("Configured tutor fee and tax exceed the agreed amount."), { statusCode: 422 });
  }
  return {
    subtotal: amount, studentFee, tutorFee, tax,
    studentTotal: amount + studentFee, tutorNet,
    currency: config.currency,
    feeConfig: { version: config.version, countryCode: config.countryCode, currency: config.currency,
      studentFeePercent: config.studentFeePercent, tutorFeePercent: config.tutorFeePercent,
      minimumFee: config.minimumFee, maximumFee: config.maximumFee, taxPercent: config.taxPercent,
      effectiveDate: config.effectiveDate },
  };
}

export async function calculateFees(amount: number, currency: string, countryCode = "PK", mode: "online" | "in-person" | "both" = "online"): Promise<FeeBreakdown> {
  const quote = await resolveMarketplaceFees(amount, countryCode);
  const cfg = quote.feeConfig;
  const taxCfg = await TaxConfig.findOne({ countryCode: countryCode.toUpperCase(), isActive: true }).lean();
  let amountUSD: number | undefined;
  try { amountUSD = Math.round(await convertAmount(amount, currency, "USD") * 100) / 100; } catch { /* analytics optional */ }
  return {
    grossAmount: amount, currency: currency.toUpperCase(),
    studentFeeRate: Number(cfg.studentFeePercent || 0), studentFee: quote.studentFee, studentTotal: quote.studentTotal,
    platformFeeRate: Number(cfg.tutorFeePercent || 0), platformFee: quote.tutorFee,
    taxRate: Number(cfg.taxPercent || 0), taxAmount: quote.tax,
    taxType: taxCfg?.taxType || "unclassified",
    tutorNet: quote.tutorNet, tutorFee: quote.tutorFee,
    platformNet: quote.studentFee + quote.tutorFee,
    amountUSD,
  };
}

// Legacy calculations only: never use a synchronous fallback to price a
// checkout once the database-backed admin configuration is operational.
export function calculateFeesSync(amount: number, currency = "PKR"): FeeBreakdown {
  const quote = calculateMarketplaceFees(amount);
  return {
    grossAmount: amount, currency: currency.toUpperCase(),
    studentFeeRate: MARKETPLACE_FEES.studentPlatformFeePercent,
    studentFee: quote.studentFee, studentTotal: quote.studentTotal,
    platformFeeRate: MARKETPLACE_FEES.tutorPlatformFeePercent, platformFee: quote.tutorFee,
    taxRate: MARKETPLACE_FEES.taxRatePercent, taxAmount: quote.tax, taxType: "unclassified",
    tutorNet: quote.tutorNet, tutorFee: quote.tutorFee, platformNet: quote.studentFee + quote.tutorFee,
  };
}

/**
 * Seed default TaxConfig records for launch markets (idempotent — uses upsert).
 * Call this from a migration script or server boot (dev-only).
 */
export async function seedTaxConfigs(): Promise<void> {
  const configs = [
    { countryCode: "PK", taxType: "none",        rate: 0,   name: "No Tax",           platformCollects: true,  invoiceRequired: false, appliesOnlineServices: true, appliesHomeTuition: true  },
    { countryCode: "AE", taxType: "VAT",          rate: 5,   name: "VAT (5%)",          platformCollects: true,  invoiceRequired: true,  appliesOnlineServices: true, appliesHomeTuition: true  },
    { countryCode: "GB", taxType: "VAT",          rate: 20,  name: "VAT (20%)",         platformCollects: true,  invoiceRequired: true,  appliesOnlineServices: true, appliesHomeTuition: true  },
    { countryCode: "AU", taxType: "GST",          rate: 10,  name: "GST (10%)",         platformCollects: true,  invoiceRequired: true,  appliesOnlineServices: true, appliesHomeTuition: true  },
    { countryCode: "CA", taxType: "GST",          rate: 5,   name: "GST (5%)",          platformCollects: true,  invoiceRequired: true,  appliesOnlineServices: true, appliesHomeTuition: false },
    { countryCode: "IN", taxType: "GST",          rate: 18,  name: "GST (18%)",         platformCollects: true,  invoiceRequired: true,  appliesOnlineServices: true, appliesHomeTuition: false },
    { countryCode: "SA", taxType: "VAT",          rate: 15,  name: "VAT (15%)",         platformCollects: true,  invoiceRequired: true,  appliesOnlineServices: true, appliesHomeTuition: true  },
    { countryCode: "US", taxType: "service_tax",  rate: 0,   name: "No Federal Tax",    platformCollects: false, invoiceRequired: false, appliesOnlineServices: false, appliesHomeTuition: false },
  ];

  for (const cfg of configs) {
    await TaxConfig.findOneAndUpdate(
      { countryCode: cfg.countryCode },
      { $setOnInsert: { ...cfg, isActive: true } },
      { upsert: true, new: true }
    );
  }

  console.log("[TaxConfig] Seeded default tax configs for", configs.length, "countries.");
}

// Alias kept for backward compatibility with controllers that import this name.
export { resolveMarketplaceFees as calculateMarketplaceFees };
