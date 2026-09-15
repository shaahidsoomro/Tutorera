export type MarketStatus = "LIVE" | "DISCOVERY_BETA" | "CHECKOUT_BETA" | "COMING_SOON" | "DISABLED";

export interface MarketConfig {
  route: string;
  isoCountryCode: string;
  marketCode: string;
  countryName: string;
  locale: string;
  currency: string;
  currencySymbol: string;
  status: MarketStatus;
  onlineTuitionEnabled: boolean;
  homeTuitionEnabled: boolean;
  checkoutEnabled: boolean;
  legalSchedule: string;
}

/**
 * Canonical public market configuration.
 * Keep market identity separate from language and from transaction currency.
 * Historical requests/bookings must retain their stored currency regardless of
 * the visitor's currently selected market.
 */
export const MARKETS = Object.freeze({
  pk: {
    route: "pk",
    isoCountryCode: "PK",
    marketCode: "PK",
    countryName: "Pakistan",
    locale: "en-PK",
    currency: "PKR",
    currencySymbol: "Rs.",
    status: "LIVE",
    onlineTuitionEnabled: true,
    homeTuitionEnabled: true,
    checkoutEnabled: true,
    legalSchedule: "/legal/country/pk",
  },
  uk: {
    route: "uk",
    isoCountryCode: "GB",
    marketCode: "UK",
    countryName: "United Kingdom",
    locale: "en-GB",
    currency: "GBP",
    currencySymbol: "£",
    status: "DISCOVERY_BETA",
    onlineTuitionEnabled: true,
    homeTuitionEnabled: false,
    checkoutEnabled: false,
    legalSchedule: "/legal/country/gb",
  },
  ae: {
    route: "ae",
    isoCountryCode: "AE",
    marketCode: "AE",
    countryName: "United Arab Emirates",
    locale: "en-AE",
    currency: "AED",
    currencySymbol: "AED",
    status: "DISCOVERY_BETA",
    onlineTuitionEnabled: true,
    homeTuitionEnabled: false,
    checkoutEnabled: false,
    legalSchedule: "/legal/country/ae",
  },
} satisfies Record<string, MarketConfig>);

export type MarketRoute = keyof typeof MARKETS;

export function getMarketByRoute(route?: string): MarketConfig | undefined {
  if (!route) return undefined;
  const normalized = route.toLowerCase() === "gb" ? "uk" : route.toLowerCase();
  return MARKETS[normalized as MarketRoute];
}

export function getMarketByCountryCode(countryCode?: string): MarketConfig | undefined {
  if (!countryCode) return undefined;
  const normalized = countryCode.toUpperCase();
  return Object.values(MARKETS).find((market) => market.isoCountryCode === normalized);
}

export function canonicalMarketRoute(routeOrCountryCode: string): string | undefined {
  const market = getMarketByRoute(routeOrCountryCode) || getMarketByCountryCode(routeOrCountryCode);
  return market ? `/${market.route}` : undefined;
}
