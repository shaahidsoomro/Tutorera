"use client";

// src/i18n/I18nProvider.tsx
// Wraps the app in react-i18next so all components can call useTranslation()

import i18n from "i18next";
import React,{ useEffect } from "react";
import { I18nextProvider,initReactI18next } from "react-i18next";
import { defaultLocale,directionFor } from "./config";
import { ar } from "./messages/ar";
import { en } from "./messages/en";

// Flatten nested messages object into dot-key pairs that i18next expects
function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) {
      Object.assign(result, flatten(v as Record<string, unknown>, key));
    } else {
      result[key] = String(v);
    }
  }
  return result;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: flatten(en as unknown as Record<string, unknown>) },
      ar: { translation: flatten(ar as unknown as Record<string, unknown>) },
    },
    lng: defaultLocale,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

interface I18nProviderProps {
  locale?: string;
  children: React.ReactNode;
}

export function I18nProvider({ locale = defaultLocale, children }: I18nProviderProps) {
  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
    // Update document direction for RTL languages
    if (typeof document !== "undefined") {
      document.documentElement.dir = directionFor(locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export { i18n };
