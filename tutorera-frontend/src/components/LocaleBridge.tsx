"use client";

import { useAuth } from "@/context/AuthContext";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ReactNode } from "react";

/**
 * Applies a signed-in user's saved language preference to the existing i18n
 * provider. English remains the only published locale for launch; this bridge
 * keeps direction and locale state ready for a reviewed RTL locale later.
 */
export default function LocaleBridge({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const locale = user?.preferredLanguage === "ar" ? "ar" : "en";
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
