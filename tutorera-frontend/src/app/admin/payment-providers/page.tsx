"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Activity, ArrowRight, Settings } from "lucide-react";
import api from "@/lib/axios";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

interface MarketConfig {
  _id: string;
  countryCode: string;
  countryName: string;
  paymentProvider?: string;
  paymentsEnabled: boolean;
  payoutsEnabled: boolean;
  isActive: boolean;
  launchStatus: string;
}

export default function PaymentProvidersPage() {
  const [markets, setMarkets] = useState<MarketConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await api.get("/admin/markets");
        setMarkets(res.data.markets || []);
      } catch (err) {
        console.error("Failed to load markets", err);
        setError("Failed to load payment provider configurations.");
      } finally {
        setLoading(false);
      }
    };
    fetchMarkets();
  }, []);

  // Group markets by payment provider
  const providersMap: Record<string, MarketConfig[]> = {};
  
  markets.forEach(market => {
    if (market.launchStatus !== "live" && market.launchStatus !== "beta") return;
    
    const provider = market.paymentProvider || "none";
    if (!providersMap[provider]) {
      providersMap[provider] = [];
    }
    providersMap[provider].push(market);
  });

  const getProviderDisplayName = (key: string) => {
    switch(key) {
      case "rapidpay": return "RapidPay";
      case "none": return "No Provider Attached";
      default: return "Historical provider";
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: TEXT_COLORS.primary, marginBottom: "0.5rem" }}>
            Payment Providers
          </h1>
          <p style={{ color: TEXT_COLORS.secondary }}>
            View live payment gateway configurations mapped across active global markets.
          </p>
        </div>
        <Link
          href="/admin/markets"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: STATUS_COLORS.neutral.bg, color: TEXT_COLORS.body, borderRadius: "0.5rem", textDecoration: "none", fontWeight: "600", fontSize: "0.9rem" }}
        >
          <Settings size={16} /> Manage in Markets
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: TEXT_COLORS.muted }}>Loading provider configurations...</div>
      ) : error ? (
        <div style={{ padding: "1rem", background: STATUS_COLORS.danger.bg, color: STATUS_COLORS.danger.color, borderRadius: "0.5rem" }}>{error}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
          {Object.entries(providersMap).map(([providerKey, groupedMarkets]) => (
            <div key={providerKey} style={{ padding: "1.5rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.75rem", background: UI_COLORS.surface, boxShadow: UI_COLORS.shadowCard }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ padding: "0.75rem", background: providerKey === "none" ? STATUS_COLORS.neutral.bg : UI_COLORS.accentLight, borderRadius: "0.5rem", color: providerKey === "none" ? TEXT_COLORS.muted : UI_COLORS.accentBright }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: TEXT_COLORS.body }}>
                    {getProviderDisplayName(providerKey)}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: providerKey === "none" ? TEXT_COLORS.muted : STATUS_COLORS.success.color, fontSize: "0.8rem", fontWeight: "600", marginTop: "0.25rem" }}>
                    <Activity size={12} /> {groupedMarkets.length} active market(s)
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "1.5rem" }}>
                <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT_COLORS.muted, fontWeight: "600", marginBottom: "0.75rem" }}>Coverage</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {groupedMarkets.map(m => (
                    <span key={m._id} style={{ display: "inline-flex", alignItems: "center", padding: "0.25rem 0.6rem", background: STATUS_COLORS.neutral.bg, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.375rem", fontSize: "0.85rem", color: TEXT_COLORS.secondary, fontWeight: "500" }}>
                      {m.countryCode} - {m.countryName}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: `1px solid ${UI_COLORS.border}` }}>
                <Link
                  href="/admin/markets"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", color: UI_COLORS.accentBright, fontWeight: "600", textDecoration: "none" }}
                >
                  Configure <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}

          {Object.keys(providersMap).length === 0 && (
            <div style={{ gridColumn: "1 / -1", padding: "3rem", textAlign: "center", color: TEXT_COLORS.muted, background: STATUS_COLORS.neutral.bg, borderRadius: "0.5rem" }}>
              No active payment providers found across any live markets.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
