"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

interface DemoTutorOffer {
  id: string;
  name: string;
  profileSummary: string;
  matchScore: number;
  matchReasons: string[];
  proposedRate: number;
  offeredRate: number;
  currency: string;
  message: string;
}

const DEMO_OFFERS: DemoTutorOffer[] = [
  {
    id: "sample-offer-a",
    name: "Example Tutor A",
    profileSummary: "Lists Mathematics and O-Level teaching experience",
    matchScore: 92,
    matchReasons: ["Subject aligns with request", "Schedule overlaps", "Rate matches proposed budget"],
    proposedRate: 200,
    offeredRate: 200,
    currency: "SAR",
    message: "Sample message: I can cover the requested topics and proposed schedule.",
  },
  {
    id: "sample-offer-b",
    name: "Example Tutor B",
    profileSummary: "Lists Mathematics and Physics teaching experience",
    matchScore: 87,
    matchReasons: ["Subjects align with request", "Online mode available", "Tutor submitted a counter-offer"],
    proposedRate: 200,
    offeredRate: 220,
    currency: "SAR",
    message: "Sample message: I can support both subjects and have proposed a different hourly rate.",
  },
  {
    id: "sample-offer-c",
    name: "Example Tutor C",
    profileSummary: "Lists Mathematics support and evening availability",
    matchScore: 81,
    matchReasons: ["Subject aligns with request", "Evening schedule overlaps", "Offer is below proposed budget"],
    proposedRate: 200,
    offeredRate: 180,
    currency: "SAR",
    message: "Sample message: I am available during the requested evening window.",
  },
];

export default function OfferComparisonDemo() {
  const [selectedOffer, setSelectedOffer] = useState<string>(DEMO_OFFERS[0].id);

  return (
    <section
      style={{ padding: "4.5rem 1.5rem", background: "linear-gradient(180deg, #f8faff 0%, #edf4ff 100%)", borderBottom: "1px solid #e2e8f0" }}
      aria-labelledby="comparison-demo-title"
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 2rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0329b2", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Illustrative Marketplace Example
          </span>
          <h2 id="comparison-demo-title" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.35rem)", fontWeight: 900, color: "#021550", margin: "0.5rem 0 0.85rem" }}>
            Compare Tutor Offers Side-by-Side
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.98rem", lineHeight: 1.6 }}>
            This section uses sample data to demonstrate the comparison workflow. The names, match scores, messages, and rates below are not real tutor profiles, reviews, verification records, or live student requests.
          </p>
        </div>

        <div style={{ background: "white", border: "1.5px solid #cbd5e1", borderRadius: "1rem", padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", boxShadow: "0 4px 12px rgba(2, 21, 80, 0.04)" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#016ef8", textTransform: "uppercase" }}>Sample Student Request</span>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#021550", margin: "0.2rem 0" }}>Mathematics & Physics (O-Level) · Online</h3>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Illustrative proposed budget: <strong style={{ color: "#059669" }}>SAR 200 / hour</strong></span>
          </div>
          <Link href="/post-tuition-request" style={{ background: "#0329b2", color: "white", padding: "0.65rem 1.25rem", borderRadius: "0.6rem", fontSize: "0.85rem", fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", boxShadow: "0 4px 12px rgba(3, 41, 178, 0.25)" }}>
            Post Your Real Requirement <ArrowRight size={15} />
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "1.25rem" }}>
          {DEMO_OFFERS.map((offer) => {
            const isSelected = selectedOffer === offer.id;
            return (
              <article
                key={offer.id}
                style={{
                  background: "white",
                  borderRadius: "1rem",
                  border: isSelected ? "2.5px solid #0329B2" : "1.5px solid #e2e8f0",
                  padding: "1.5rem",
                  boxShadow: isSelected ? "0 14px 32px rgba(3, 41, 178, 0.16)" : "0 4px 16px rgba(2, 21, 80, 0.05)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.9rem" }}>
                    <div>
                      <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#021550", margin: 0 }}>{offer.name}</h4>
                      <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0.2rem 0 0" }}>{offer.profileSummary}</p>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#eef5ff", color: "#0329b2", padding: "0.25rem 0.55rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 800 }}>
                      <Sparkles size={12} /> {offer.matchScore}% sample match
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
                    {offer.matchReasons.map((reason) => (
                      <div key={reason} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "#475569" }}>
                        <Check size={13} color="#10b981" /> <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: "0.82rem", color: "#334155", background: "#f1f5f9", borderRadius: "0.5rem", padding: "0.7rem", lineHeight: 1.45, margin: "0 0 1rem" }}>
                    {offer.message}
                  </p>
                </div>

                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.9rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline", marginBottom: "0.8rem" }}>
                    <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Sample offered rate</span>
                    <strong style={{ fontSize: "1.1rem", color: "#021550" }}>{offer.currency} {offer.offeredRate} / hr</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOffer(offer.id)}
                    aria-pressed={isSelected}
                    style={{ width: "100%", background: isSelected ? "#021550" : "#0329b2", color: "white", padding: "0.65rem", borderRadius: "0.55rem", border: 0, fontWeight: 800, cursor: "pointer" }}
                  >
                    {isSelected ? "Selected for comparison" : "Select sample offer"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <p style={{ margin: "1.5rem auto 0", maxWidth: 760, textAlign: "center", color: "#64748b", fontSize: "0.82rem", lineHeight: 1.6 }}>
          Real offer cards should display only information returned by TUTORERA&apos;s live data source. Verification, ratings, reviews, availability, and response metrics are shown only when those records exist.
        </p>
      </div>
    </section>
  );
}
