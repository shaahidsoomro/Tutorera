"use client";

import RequestWizard from "@/components/marketplace/RequestWizard";
import { getMarketByRoute } from "@/lib/markets";
import { PostRequestPayload } from "@/types/dashboard";
import { useSearchParams } from "next/navigation";
import { Suspense,useEffect,useMemo,useState } from "react";

const MARKET_DEFAULT_BUDGETS: Record<string, string> = {
  PKR: "2000",
  AED: "80",
  GBP: "25",
  USD: "30",
};

function PostTuitionRequestContent() {
  const searchParams = useSearchParams();
  const [storedPrefill, setStoredPrefill] = useState<Partial<PostRequestPayload>>({});

  const marketPrefill = useMemo<Partial<PostRequestPayload>>(() => {
    const market = getMarketByRoute(searchParams.get("market") || undefined);
    if (!market) return {};
    return {
      countryCode: market.isoCountryCode,
      countryName: market.countryName,
      currency: market.currency,
      budget: MARKET_DEFAULT_BUDGETS[market.currency] || "30",
      teachingMode: market.homeTuitionEnabled ? "both" : "online",
      isWorldwideEligible: true,
    };
  }, [searchParams]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("tutorera_quick_request");
      if (stored) setStoredPrefill(JSON.parse(stored));
    } catch {}
  }, []);

  const prefill = useMemo(
    () => ({ ...storedPrefill, ...marketPrefill }),
    [storedPrefill, marketPrefill]
  );

  return (
    <main style={{ minHeight: "100vh", background: "#f8faff", padding: "3rem 1.5rem 5rem" }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <RequestWizard prefill={prefill} />
      </div>
    </main>
  );
}

function PostTuitionRequestContent() {
  return (
    <Suspense fallback={null}>
      <PostTuitionRequestContent />
    </Suspense>
  );
}

export default function PostTuitionRequestPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#f8faff" }} />}>
      <PostTuitionRequestContent />
    </Suspense>
  );
}
