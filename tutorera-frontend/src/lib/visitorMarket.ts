"use client";

import api from "@/lib/axios";
import { getMarketByCountryCode } from "@/lib/markets";

const MARKET_OVERRIDE_KEY = "tutorera_market_override";
const DETECTED_MARKET_KEY = "tutorera_detected_market";

function normalizeCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && getMarketByCountryCode(code) ? code : undefined;
}

function countryFromBrowserPreferences(): string | undefined {
  const language = typeof navigator !== "undefined" ? navigator.language : "";
  const languageCountry = language.split("-")[1] || language.split("_")[1];
  const normalizedLanguageCountry = normalizeCountryCode(languageCountry);
  if (normalizedLanguageCountry) return normalizedLanguageCountry;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (timezone === "Asia/Karachi") return "PK";
  if (timezone === "Europe/London") return "GB";
  if (timezone === "America/New_York" || timezone.startsWith("America/")) return "US";
  if (timezone === "Asia/Dubai") return "AE";
  return undefined;
}

async function countryFromIp(): Promise<string | undefined> {
  try {
    const response = await api.get("/geo/visitor-market", { timeout: 6000 });
    return normalizeCountryCode(response.data?.location?.countryCode);
  } catch {
    return undefined;
  }
}

export function getSavedVisitorMarket(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return normalizeCountryCode(
    window.localStorage.getItem(MARKET_OVERRIDE_KEY) ||
    window.sessionStorage.getItem(DETECTED_MARKET_KEY)
  );
}

export function saveVisitorMarket(countryCode: string): void {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized || typeof window === "undefined") return;
  window.localStorage.setItem(MARKET_OVERRIDE_KEY, normalized);
}

export async function detectVisitorMarket(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  const saved = getSavedVisitorMarket();
  if (saved) return saved;

  const detected = (await countryFromIp()) || countryFromBrowserPreferences();
  if (detected) window.sessionStorage.setItem(DETECTED_MARKET_KEY, detected);
  return detected;
}
