// src/lib/geoService.ts
// Dynamic Geolocation, Subjects, Levels, Curricula, and PKR Base Pricing Service

import api from "@/lib/axios";
import {
  COUNTRIES,
  CountryData,
  MASTER_LEVELS,
  MASTER_SUBJECTS,
  convertToPKR,
} from "@/lib/location";
import { useEffect,useState } from "react";

export interface GeoMasterData {
  countries: CountryData[];
  subjects: string[];
  levels: string[];
  curricula: string[];
  currencies: Array<{
    code: string;
    symbol: string;
    name: string;
    rateToUSD: number;
    rateToPKR: number;
  }>;
}

const STATIC_FALLBACK: GeoMasterData = {
  countries: COUNTRIES,
  subjects: MASTER_SUBJECTS,
  levels: MASTER_LEVELS,
  curricula: Array.from(new Set(COUNTRIES.flatMap((c) => c.curricula))),
  currencies: [
    { code: "PKR", symbol: "Rs.", name: "Pakistani Rupee", rateToUSD: 0.0036, rateToPKR: 1 },
    { code: "AED", symbol: "AED", name: "UAE Dirham", rateToUSD: 0.272, rateToPKR: 75.5556 },
    { code: "USD", symbol: "$", name: "US Dollar", rateToUSD: 1.0, rateToPKR: 277.7778 },
    { code: "GBP", symbol: "£", name: "British Pound", rateToUSD: 1.31, rateToPKR: 363.8889 },
    { code: "SAR", symbol: "SAR", name: "Saudi Riyal", rateToUSD: 0.266, rateToPKR: 73.8889 },
    { code: "EUR", symbol: "€", name: "Euro", rateToUSD: 1.09, rateToPKR: 302.7778 },
    { code: "CAD", symbol: "CA$", name: "Canadian Dollar", rateToUSD: 0.74, rateToPKR: 205.5556 },
    { code: "AUD", symbol: "AU$", name: "Australian Dollar", rateToUSD: 0.67, rateToPKR: 186.1111 },
    { code: "QAR", symbol: "QAR", name: "Qatari Riyal", rateToUSD: 0.274, rateToPKR: 76.1111 },
    { code: "KWD", symbol: "KWD", name: "Kuwaiti Dinar", rateToUSD: 3.27, rateToPKR: 908.3333 },
    { code: "OMR", symbol: "OMR", name: "Omani Rial", rateToUSD: 2.6, rateToPKR: 722.2222 },
    { code: "BHD", symbol: "BHD", name: "Bahraini Dinar", rateToUSD: 2.65, rateToPKR: 736.1111 },
    { code: "INR", symbol: "₹", name: "Indian Rupee", rateToUSD: 0.012, rateToPKR: 3.3333 },
    { code: "SGD", symbol: "SG$", name: "Singapore Dollar", rateToUSD: 0.77, rateToPKR: 213.8889 },
    { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", rateToUSD: 0.23, rateToPKR: 63.8889 },
  ],
};

let inMemoryCache: GeoMasterData | null = null;
let fetchPromise: Promise<GeoMasterData> | null = null;

export async function fetchGeoMasterData(): Promise<GeoMasterData> {
  if (inMemoryCache) return inMemoryCache;

  // Check browser sessionStorage if available
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("tutorera_geo_master");
      if (stored) {
        inMemoryCache = JSON.parse(stored);
        return inMemoryCache!;
      }
    } catch {}
  }

  if (!fetchPromise) {
    fetchPromise = api
      .get("/geo/countries")
      .then((res) => {
        if (res.data?.success && res.data?.countries) {
          const data: GeoMasterData = {
            countries: res.data.countries,
            subjects: res.data.subjects || MASTER_SUBJECTS,
            levels: res.data.levels || MASTER_LEVELS,
            curricula: res.data.curricula || STATIC_FALLBACK.curricula,
            currencies: res.data.currencies || STATIC_FALLBACK.currencies,
          };
          inMemoryCache = data;
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem("tutorera_geo_master", JSON.stringify(data));
            } catch {}
          }
          return data;
        }
        return STATIC_FALLBACK;
      })
      .catch((err) => {
        console.warn("Falling back to static geo data:", err);
        return STATIC_FALLBACK;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }

  return fetchPromise;
}

/**
 * React hook for consuming dynamic Geo datasets (countries, subjects, levels, curricula, currencies)
 */
export function useGeoData() {
  const [data, setData] = useState<GeoMasterData>(inMemoryCache || STATIC_FALLBACK);
  const [loading, setLoading] = useState(!inMemoryCache);

  useEffect(() => {
    let isMounted = true;
    fetchGeoMasterData().then((res) => {
      if (isMounted) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return { ...data, loading };
}

/**
 * Formats an amount with local currency and transparent PKR settlement equivalent.
 * Example: `AED 80 (~Rs. 6,044 PKR) / hr` or `Rs. 2,000 / hr`
 */
export function formatDualCurrency(
  amount: number,
  currency: string = "PKR",
  unit?: string
): string {
  const code = (currency || "PKR").toUpperCase();
  const { amountPKR } = convertToPKR(amount, code);

  let formatted = "";
  if (code === "PKR") {
    formatted = `Rs. ${Math.round(amount).toLocaleString()}`;
  } else {
    formatted = `${code} ${Math.round(amount).toLocaleString()} (~Rs. ${amountPKR.toLocaleString()} PKR)`;
  }

  return unit ? `${formatted} / ${unit}` : formatted;
}

export { convertToPKR };
