"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { ArrowLeft } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type MoneyByCurrency = { currency: string; marketplaceGMV: number; platformRevenue: number; averageAgreedRate: number };
type Metrics = Record<string, number | null> & { lossReasons?: Record<string, number>; moneyByCurrency?: MoneyByCurrency[] };
type RequestRow = { _id: string; subject?: string; city?: string; level?: string; teachingMode?: string; budget?: number; currency?: string; status?: string; lossReason?: string; lossReasonDetail?: string; moderationStatus?: string; moderationReason?: string; student?: { name?: string } };
type OfferRow = { _id: string; amount?: number; initialStudentRate?: number; pricingUnit?: string; status?: string; flaggedForModeration?: boolean; moderationReasons?: string[]; tutor?: { name?: string }; request?: { subject?: string; city?: string; level?: string; teachingMode?: string; budget?: number; status?: string; currency?: string } };
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

function formatMoney(value: unknown, currency?: string) {
  return `${currency || "USD"} ${toNumber(value).toLocaleString()}`;
}

function formatMetric(key: string, value: number | null | undefined) {
  const n = toNumber(value, Number.NaN);
  if (value === null || value === undefined || Number.isNaN(n)) return "-";
  const lower = key.toLowerCase();
  if (lower.includes("rate") || lower.includes("discount") || ["conversionRate", "completionRate", "cancellationRate", "disputeRate"].includes(key)) return `${n.toFixed(1)}%`;
  return n.toFixed(lower.includes("average") ? 1 : 0);
}

export default function Page() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [selected, setSelected] = useState<{ offer: OfferRow; history: HistoryRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);
  const [moderationTarget, setModerationTarget] = useState<{ id: string; action: "approve" | "hold" | "restore"; request: RequestRow } | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const modalRef = useFocusTrap(Boolean(selected), () => setSelected(null));
  const modModalRef = useFocusTrap(Boolean(moderationTarget), () => setModerationTarget(null));

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

      const failed = [metricsResult, requestsResult, offersResult].filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      if (failed.length) {
        const status = (failed[0].reason as any)?.response?.status;
        if (status === 401) setLoadError("Your session has expired. Please sign out and sign in again.");
        else if (status === 403) setLoadError("You do not have permission to view marketplace analytics. Contact your administrator.");
        else setLoadError(`${failed.length} of 3 marketplace data sources failed to load. Partial data may be shown. Refresh to retry.`);
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

  async function moderateRequest(request: RequestRow, action: "approve" | "hold" | "restore") {
    setModerationReason("");
    setModerationTarget({ id: request._id, action, request });
  }

  async function submitModeration() {
    if (!moderationTarget || !moderationReason.trim()) return;
    const { id, action } = moderationTarget;
    setRequestActionLoading(`${id}-${action}`);
    setModerationTarget(null);
    try {
      const result = await api.post(`/admin/marketplace/requests/${id}/moderation`, { action, reason: moderationReason.trim() });
      const updated = result.data.request;
      setRequests((current) => current.map((item) => item._id === updated._id ? { ...item, status: updated.status, moderationStatus: updated.moderationStatus, moderationReason: updated.moderationReason } : item));
    } catch (error: any) {
      setLoadError(error?.response?.data?.message || "Could not update this request.");
    } finally { setRequestActionLoading(null); setModerationReason(""); }
  }

  return (
    <main style={{ padding: "1.75rem 2rem", maxWidth: 1180, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
        <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
          <ArrowLeft size={14} /> Control Tower
        </Link>
        <span style={{ color: UI_COLORS.border }}>/</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: STATUS_COLORS.purple.color }}>Marketplace</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>Marketplace Analytics</h1>
          <p style={{ color: TEXT_COLORS.muted, fontSize: "0.85rem", margin: "0.2rem 0 0" }}>Operational request, offer, negotiation, conversion, pricing and trust signals.</p>
        </div>
      </div>

      {loadError && <p role="alert" style={{ color: STATUS_COLORS.warning.color, background: STATUS_COLORS.warning.bg, border: `1px solid ${STATUS_COLORS.warning.border}`, borderRadius: "0.75rem", padding: 12, marginBottom: "1rem" }}>{loadError}</p>}

      {loading && !metrics ? (
        <div role="status" aria-label="Loading marketplace data" style={{ textAlign: "center", padding: "4rem", color: TEXT_COLORS.muted }}>
          <span aria-hidden="true">Loading…</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
          {Object.entries(metrics ?? {}).filter(([, value]) => typeof value !== "object").map(([key, value]) => <article key={key} style={panel}><p style={muted}>{labels[key] || key}</p><strong style={{ fontSize: 24 }}>{formatMetric(key, value as number | null)}</strong></article>)}
        </div>
      )}

      {metrics?.moneyByCurrency && metrics.moneyByCurrency.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={sectionTitle}>GMV & Revenue by Currency</h2>
          <p style={muted}>Markets settle in their own currency, so these are shown per currency rather than summed together.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
            {metrics.moneyByCurrency.map((bucket) => (
              <article key={`gmv-${bucket.currency}`} style={panel}>
                <p style={muted}>{bucket.currency} Marketplace GMV</p>
                <strong style={{ fontSize: 24 }}>{formatMoney(bucket.marketplaceGMV, bucket.currency)}</strong>
              </article>
            ))}
            {metrics.moneyByCurrency.map((bucket) => (
              <article key={`rev-${bucket.currency}`} style={panel}>
                <p style={muted}>{bucket.currency} Platform Revenue</p>
                <strong style={{ fontSize: 24 }}>{formatMoney(bucket.platformRevenue, bucket.currency)}</strong>
              </article>
            ))}
            {metrics.moneyByCurrency.map((bucket) => (
              <article key={`rate-${bucket.currency}`} style={panel}>
                <p style={muted}>{bucket.currency} Agreed Hourly Rate</p>
                <strong style={{ fontSize: 24 }}>{formatMoney(bucket.averageAgreedRate.toFixed(0), bucket.currency)}</strong>
              </article>
            ))}
          </div>
        </section>
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
                  <strong>{formatMoney(offer.amount, offer.request?.currency)}/{offer.pricingUnit || "hour"}</strong>
                  <p style={muted}>Student rate {formatMoney(offer.initialStudentRate || offer.request?.budget, offer.request?.currency)}</p>
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
              <p style={muted}>{request.student?.name || "Student"} - {request.city || "Online"} - {request.level || "Any level"} - {request.teachingMode || "mode open"} - {formatMoney(request.budget, request.currency)} - {request.status || "status pending"}</p>
              {request.moderationStatus && request.moderationStatus !== "none" && <p style={{ ...muted, color: STATUS_COLORS.warning.color }}>Moderation: {request.moderationStatus}{request.moderationReason ? ` — ${request.moderationReason}` : ""}</p>}
              {request.lossReason && <p style={{ ...muted, color: STATUS_COLORS.warning.color }}>Loss reason: {lossReasonLabels[request.lossReason] || request.lossReason}{request.lossReasonDetail ? ` — ${request.lossReasonDetail}` : ""}</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {request.moderationStatus === "held" ? <button onClick={() => moderateRequest(request, "restore")} disabled={requestActionLoading === `${request._id}-restore`} style={button}>Restore</button> : <><button onClick={() => moderateRequest(request, "approve")} disabled={requestActionLoading === `${request._id}-approve`} style={button}>Approve review</button><button onClick={() => moderateRequest(request, "hold")} disabled={requestActionLoading === `${request._id}-hold`} style={button}>Place on hold</button></>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Moderation reason modal */}
      {moderationTarget && (
        <div ref={modModalRef} role="dialog" aria-modal="true" aria-labelledby="mod-modal-title" style={overlay}>
          <div style={modal}>
            <h2 id="mod-modal-title" style={{ fontSize: "1.1rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 0.5rem" }}>
              {moderationTarget.action === "approve" ? "Approve" : moderationTarget.action === "hold" ? "Place on Hold" : "Restore"} Request
            </h2>
            <p style={{ color: TEXT_COLORS.muted, fontSize: "0.82rem", margin: "0 0 1rem" }}>
              Subject: <strong>{moderationTarget.request.subject || "Tuition request"}</strong>
            </p>
            <label htmlFor="mod-reason" style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: "0.3rem" }}>
              Reason (required)
            </label>
            <textarea
              id="mod-reason"
              value={moderationReason}
              onChange={e => setModerationReason(e.target.value)}
              rows={3}
              placeholder="Enter moderation reason…"
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, fontSize: "0.85rem", resize: "vertical", boxSizing: "border-box", marginBottom: "1rem" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button onClick={() => setModerationTarget(null)} style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, background: "white", color: TEXT_COLORS.muted, fontWeight: 700, cursor: "pointer", minHeight: 44, fontSize: "0.85rem" }}>
                Cancel
              </button>
              <button onClick={submitModeration} disabled={!moderationReason.trim()} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", border: "none", background: UI_COLORS.accent, color: "white", fontWeight: 700, cursor: "pointer", minHeight: 44, fontSize: "0.85rem", opacity: moderationReason.trim() ? 1 : 0.5 }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Offer detail" style={overlay}>
          <div style={modal}>
            <button onClick={() => setSelected(null)} aria-label="Close offer detail" style={{ ...button, marginLeft: "auto", display: "block" }}>Close</button>
            <h2 style={sectionTitle}>Negotiation Inspection</h2>
            <p style={muted}>{selected.offer.tutor?.name || "Tutor"} - {selected.offer.status || "status pending"} - {formatMoney(selected.offer.amount, selected.offer.request?.currency)}/{selected.offer.pricingUnit || "hour"}</p>
            <ol style={{ borderLeft: `2px solid ${UI_COLORS.accentLight}`, paddingLeft: 20 }}>
              {selected.history.map((row) => (
                <li key={row._id} style={{ marginBottom: 12 }}>
                  <strong>{row.senderRole || "User"} proposed {formatMoney(row.amount, selected.offer.request?.currency)}</strong><br />
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

const panel = { background: "white", padding: 18, border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.75rem", boxShadow: "0 14px 34px rgba(2,21,80,.06)" } as const;
const muted = { fontSize: 13, color: UI_COLORS.gray600, margin: "4px 0" } as const;
const sectionTitle = { fontSize: 20, margin: "0 0 12px", fontWeight: 700, color: TEXT_COLORS.body } as const;
const button = { marginTop: 10, border: `1px solid ${UI_COLORS.accentLight}`, borderRadius: "0.5rem", background: "white", color: UI_COLORS.primary, padding: "8px 12px", fontWeight: 700, cursor: "pointer", minHeight: 44 } as const;
const overlay = { position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "grid", placeItems: "center", padding: 20, zIndex: 1000 } as const;
const modal = { background: "white", borderRadius: 16, padding: 24, maxWidth: 640, width: "100%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 24px 80px rgba(2,21,80,.22)" } as const;
