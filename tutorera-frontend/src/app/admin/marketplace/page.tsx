"use client";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { useEffect,useState } from "react";

type Metrics = Record<string, number | null> & { lossReasons?: Record<string, number> };
type RequestRow = { _id: string; subject?: string; city?: string; level?: string; teachingMode?: string; budget?: number; status?: string; lossReason?: string; lossReasonDetail?: string; flaggedForModeration?: boolean; moderationReasons?: string[]; student?: { name?: string } };
type OfferRow = { _id: string; amount?: number; initialStudentRate?: number; pricingUnit?: string; status?: string; flaggedForModeration?: boolean; moderationReasons?: string[]; tutor?: { name?: string }; request?: { subject?: string; city?: string; level?: string; teachingMode?: string; budget?: number; status?: string } };
type HistoryRow = { _id: string; senderRole?: string; amount?: number; message?: string; status?: string; flaggedForModeration?: boolean; createdAt?: string };

const labels: Record<string, string> = {
  totalRequests: "Total requests",
  activeRequests: "Active requests",
  totalOffers: "Tutor offers",
  zeroOfferRequests: "Zero-offer active requests",
  threeOfferCoverageRate: "3+ offer coverage",
  averageOffersPerRequest: "Average offers / request",
  averageMinutesToFirstOffer: "Minutes to first offer",
  offerAcceptanceRate: "Offer acceptance",
  bookingsGenerated: "Bookings generated",
  conversionRate: "Request conversion",
  marketplaceGMV: "Marketplace GMV",
  platformRevenue: "Platform revenue",
  completionRate: "Completion rate",
  cancellationRate: "Cancellation rate",
  disputeRate: "Dispute rate",
  negotiationEvents: "Negotiation events",
  activeRelationships: "Active learning relationships",
  repeatRelationships: "Repeat relationships",
  repeatRelationshipRate: "Repeat relationship rate",
  activeRelationships30d: "30-day active relationships",
  activeRelationships60d: "60-day active relationships",
  activeRelationships90d: "90-day active relationships",
  averageNegotiatedDiscount: "Negotiated discount",
  averageAgreedRate: "Agreed hourly rate",
  averageAgreedHourlyRate: "Agreed hourly rate",
  averageTutorResponseMinutes: "Tutor response minutes",
  classifiedLostRequests: "Classified lost requests",
  unclassifiedLostRequests: "Unclassified lost requests",
};

const lossReasonLabels: Record<string, string> = {
  no_tutor_supply: "No tutor supply",
  no_tutor_response: "No tutor response",
  budget_mismatch: "Budget mismatch",
  offers_too_expensive: "Offers too expensive",
  location_restriction: "Location restriction",
  student_abandoned: "Student abandoned",
  student_cancelled: "Student cancelled",
  payment_failed: "Payment failed",
  tutor_cancelled: "Tutor cancelled",
  request_expired: "Request expired",
  other: "Other",
};

function toNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatPKR(value: unknown) {
  return `PKR ${toNumber(value).toLocaleString("en-PK")}`;
}

function formatMetric(key: string, value: number | null | undefined) {
  const n = toNumber(value, Number.NaN);
  if (value === null || value === undefined || Number.isNaN(n)) return "-";
  const lower = key.toLowerCase();
  if (lower.includes("rate") || lower.includes("discount") || ["conversionRate", "completionRate", "cancellationRate", "disputeRate"].includes(key)) return `${n.toFixed(1)}%`;
  if (key.includes("GMV") || key.includes("Revenue") || key.includes("HourlyRate")) return formatPKR(n);
  return n.toFixed(lower.includes("average") ? 1 : 0);
}

export default function Page() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [selected, setSelected] = useState<{ offer: OfferRow; history: HistoryRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const modalRef = useFocusTrap(Boolean(selected), () => setSelected(null));

  useEffect(() => {
    let cancelled = false;

    async function loadMarketplace() {
      setLoading(true);
      setLoadError("");
      const [metricsResult, requestsResult, offersResult] = await Promise.allSettled([
        api.get("/admin/marketplace-analytics"),
        api.get("/admin/marketplace/requests"),
        api.get("/admin/marketplace/offers", { params: { flagged: true } }),
      ]);

      if (cancelled) return;

      if (metricsResult.status === "fulfilled") setMetrics(metricsResult.value.data?.metrics ?? {});
      if (requestsResult.status === "fulfilled") setRequests(Array.isArray(requestsResult.value.data?.requests) ? requestsResult.value.data.requests : []);
      if (offersResult.status === "fulfilled") setOffers(Array.isArray(offersResult.value.data?.offers) ? offersResult.value.data.offers : []);

      if ([metricsResult, requestsResult, offersResult].some((result) => result.status === "rejected")) {
        setLoadError("Some marketplace admin data could not be loaded. Please refresh or sign in again.");
      }
      setLoading(false);
    }

    loadMarketplace();
    return () => { cancelled = true; };
  }, []);

  async function inspectOffer(id: string) {
    try {
      const res = await api.get(`/admin/marketplace/offers/${id}`);
      const offer = res.data?.offer;
      if (!offer) throw new Error("Missing offer payload");
      setSelected({ offer, history: Array.isArray(res.data?.history) ? res.data.history : [] });
    } catch {
      setLoadError("Could not load this negotiation. Please try again.");
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 1180, margin: "0 auto", color: UI_COLORS.primary }}>
      <h1 style={{ fontSize: "1.8rem" }}>Marketplace Analytics</h1>
      <p style={{ color: UI_COLORS.gray600, margin: ".5rem 0 2rem" }}>Operational request, offer, negotiation, conversion, pricing and trust signals.</p>

      {loadError && <p role="alert" style={{ color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: 12 }}>{loadError}</p>}

      {loading && !metrics ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
          {Object.entries(metrics ?? {}).filter(([, value]) => typeof value !== "object").map(([key, value]) => <article key={key} style={panel}><p style={muted}>{labels[key] || key}</p><strong style={{ fontSize: 24 }}>{formatMetric(key, value as number | null)}</strong></article>)}
        </div>
      )}

      {metrics?.lossReasons && Object.keys(metrics.lossReasons).length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={sectionTitle}>Lost Request Reasons</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
            {Object.entries(metrics.lossReasons).map(([reason, count]) => (
              <article key={reason} style={panel}>
                <p style={muted}>{lossReasonLabels[reason] || reason}</p>
                <strong style={{ fontSize: 22 }}>{count}</strong>
              </article>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>Moderation Queue</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {offers.length === 0 ? <p style={muted}>No flagged offers currently need review.</p> : offers.map((offer) => (
            <article key={offer._id} style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{offer.request?.subject || "Offer"}</strong>
                  <p style={muted}>{offer.tutor?.name || "Tutor"} - {offer.request?.city || "Online"} - {offer.status || "status pending"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong>{formatPKR(offer.amount)}/{offer.pricingUnit || "hour"}</strong>
                  <p style={muted}>Student rate {formatPKR(offer.initialStudentRate || offer.request?.budget)}</p>
                </div>
              </div>
              <p style={{ ...muted, marginTop: 8 }}>Flags: {(offer.moderationReasons || []).join(", ") || "manual review"}</p>
              <button onClick={() => inspectOffer(offer._id)} style={button}>Inspect negotiation</button>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={sectionTitle}>Recent Requests</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {requests.length === 0 ? <p style={muted}>No marketplace requests found.</p> : requests.slice(0, 20).map((request) => (
            <article key={request._id} style={panel}>
              <strong>{request.subject || "Tuition request"}</strong>
              <p style={muted}>{request.student?.name || "Student"} - {request.city || "Online"} - {request.level || "Any level"} - {request.teachingMode || "mode open"} - {formatPKR(request.budget)} - {request.status || "status pending"}</p>
              {request.lossReason && <p style={{ ...muted, color: "#7c2d12" }}>Loss reason: {lossReasonLabels[request.lossReason] || request.lossReason}{request.lossReasonDetail ? ` — ${request.lossReasonDetail}` : ""}</p>}
              {request.flaggedForModeration && <p style={{ color: "#92400e", fontSize: 13 }}>Flags: {(request.moderationReasons || []).join(", ") || "manual review"}</p>}
            </article>
          ))}
        </div>
      </section>

      {selected && (
        <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Offer detail" style={overlay}>
          <div style={modal}>
            <button onClick={() => setSelected(null)} aria-label="Close offer detail" style={{ ...button, marginLeft: "auto", display: "block" }}>Close</button>
            <h2 style={sectionTitle}>Negotiation Inspection</h2>
            <p style={muted}>{selected.offer.tutor?.name || "Tutor"} - {selected.offer.status || "status pending"} - {formatPKR(selected.offer.amount)}/{selected.offer.pricingUnit || "hour"}</p>
            <ol style={{ borderLeft: `2px solid ${UI_COLORS.accentLight}`, paddingLeft: 20 }}>
              {selected.history.map((row) => (
                <li key={row._id} style={{ marginBottom: 12 }}>
                  <strong>{row.senderRole || "User"} proposed {formatPKR(row.amount)}</strong><br />
                  <small>{row.createdAt ? new Date(row.createdAt).toLocaleString("en-PK") : "Date unavailable"} - {row.status || "recorded"}{row.flaggedForModeration ? " - flagged" : ""}</small>
                  {row.message && <p>{row.message}</p>}
                </li>
              ))}
            </ol>
            {selected.history.length === 0 && <p style={muted}>No negotiation events found for this offer.</p>}
          </div>
        </div>
      )}
    </main>
  );
}

const panel = { background: "white", padding: 18, border: "1px solid #dbe5ff", borderRadius: 12, boxShadow: "0 14px 34px rgba(2,21,80,.06)" } as const;
const muted = { fontSize: 13, color: UI_COLORS.gray600, margin: "4px 0" } as const;
const sectionTitle = { fontSize: 20, margin: "0 0 12px" } as const;
const button = { marginTop: 10, border: `1px solid ${UI_COLORS.accentLight}`, borderRadius: 10, background: "white", color: UI_COLORS.primary, padding: "8px 12px", fontWeight: 700, cursor: "pointer" } as const;
const overlay = { position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "grid", placeItems: "center", padding: 20, zIndex: 1000 } as const;
const modal = { background: "white", borderRadius: 16, padding: 24, maxWidth: 640, width: "100%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 24px 80px rgba(2,21,80,.22)" } as const;
