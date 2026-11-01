// src/config/legal.ts
// Authoritative Global Legal, Entity, and Compliance Configuration

export const LEGAL_CONFIG = Object.freeze({
  LEGAL_ENTITY_NAME: "MENTISERA (SMC-Private) Limited",
  TRADING_NAME: "TUTORERA",
  REGISTERED_COUNTRY: "Pakistan",
  REGISTERED_ADDRESS: "House 387, Street 11, Phase 5-b, Ghauri Town, Islamabad, Islamabad Capital Territory, Pakistan",
  SUPPORT_EMAIL: "hello@mentisera.pk",
  PLATFORM_SUPER_ADMIN_EMAIL: "mentiserapk@gmail.com",
  LEGAL_CONTACT_EMAIL: "hello@mentisera.pk",
  PRIVACY_CONTACT_EMAIL: "hello@mentisera.pk",
  SAFETY_CONTACT_EMAIL: "hello@mentisera.pk",
  SUPPORT_PHONE: "+92 334 8880859",
  CURRENT_TERMS_VERSION: "2026.2-GLOBAL",
  CURRENT_PRIVACY_VERSION: "2026.2-GLOBAL",
  CURRENT_SAFEGUARDING_VERSION: "2026.2-GLOBAL",
  EFFECTIVE_DATE: "2026-09-01",
});

export const AGE_THRESHOLDS: Record<string, { minAccountAge: number; parentalConsentAge: number; adultAge: number }> = {
  DEFAULT: { minAccountAge: 13, parentalConsentAge: 18, adultAge: 18 },
  US: { minAccountAge: 13, parentalConsentAge: 13, adultAge: 18 }, // COPPA
  GB: { minAccountAge: 13, parentalConsentAge: 18, adultAge: 18 }, // UK GDPR / AADC
  PK: { minAccountAge: 13, parentalConsentAge: 18, adultAge: 18 },
  AE: { minAccountAge: 13, parentalConsentAge: 18, adultAge: 21 },
  SA: { minAccountAge: 13, parentalConsentAge: 18, adultAge: 18 },
  EU: { minAccountAge: 16, parentalConsentAge: 16, adultAge: 18 },
};

export const DATA_RETENTION_SCHEDULES = {
  ACTIVE_ACCOUNT: "Duration of account existence",
  DELETED_ACCOUNT_PII: "Purged within 30 days of deletion request",
  TRANSACTION_TAX_RECORDS: "Retained for 7 years for statutory accounting and tax compliance",
  COMMUNICATION_DISPUTE_RECORDS: "Retained for 2 years following resolution for fraud prevention and trust & safety",
  VERIFICATION_AUDIT_LOGS: "Retained for 3 years post-verification for regulatory compliance",
};
