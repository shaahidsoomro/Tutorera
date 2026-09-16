// src/i18n/index.ts
// Central i18n message loader — returns typed locale messages

import { defaultLocale,Locale } from "./config";
import { ar } from "./messages/ar";
import { en } from "./messages/en";

// ar is typed loosely (Record<string, any>) to support Arabic strings.
// We cast it here so callers get the full English type for autocomplete,
// while still allowing translated values at runtime.
const resources: Record<Locale, typeof en> = {
  en,
  ar: ar as typeof en,
};

export function messages(locale: Locale = defaultLocale): typeof en {
  return resources[locale] ?? resources[defaultLocale];
}

export type { Messages } from "./messages/en";
