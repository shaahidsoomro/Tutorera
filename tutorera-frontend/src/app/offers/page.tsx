"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/lib/toast";
import { calculateMarketplaceFees, formatMoney } from "@/lib/site";
import { 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  CreditCard
} from "lucide-react";
import OfferComparisonModal from "@/components/marketplace/OfferComparisonModal";
import WhatsAppChatButton from "@/components/WhatsAppChatButton";
import RapidPayCheckoutModal from "@/components/payments/RapidPayCheckoutModal";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { UI_COLORS, TEXT_COLORS } from "@/lib/brand";

type History = { 
  _id: string; 
  senderRole: "student" | "tutor"; 
  amount: number; 
  message?: string; 
  createdAt: string; 
  status: string; 
  sequenceNumber: number 
};

type Offer = {
  _id: string;
  amount: number;
  currency?: string;
  initialStudentRate: number;
  pricingUnit: string;
  status: string;
  expiresAt: string;
  message: string;
  availability?: string;
  renewalCount?: number;
  shortlistedAt?: string;
  matchScore?: number;
  profile?: {
    averageRating?: number;
    totalReviews?: number;
    experience?: number;
    degreeVerificationStatus?: string;
    policeVerificationStatus?: string;
    videoIntro?: string;
    demoVideoStatus?: string;
    homeTuitionEligible?: boolean;
  };
  tutor: { 
    _id: string; 
    name: string; 
    avatar?: string;
    city?: string;
    teachingMode?: string;
  };
  request: {
    _id: string;
    subject: string;
    level: string;
    budget: number;
    currency?: string;
    pricingUnit: string;
    teachingMode: string;
    city?: string;
    area?: string;
    schedule: string;
    status: string;
    allowCounterOffers: boolean;
  };
  history: History[];
};

const active = ["pending", "submitted", "viewed", "countered"];

function remaining(value: string, now: number) {
  const ms = new Date(value).getTime() - now;
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const offerMoney = (offer: Offer, amount: number, unit?: string) =>
  formatMoney(amount, offer.currency || offer.request.currency || "USD", unit);

import CounterOfferSheet from "@/components/marketplace/CounterOfferSheet";


function OffersContent() {
  const { user } = useAuth();
  const isRequester = user?.role === "student" || user?.role === "parent";
  // Negotiations store the demand-side actor as "student" for compatibility;
  // a parent who owns a requirement has the same authority in the UI.
  const negotiationRole = user?.role === "tutor" ? "tutor" : "student";
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [countering, setCountering] = useState<Offer | null>(null);
  const [sortBy, setSortBy] = useState("best_match");
  const [now, setNow] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<{ offerId: string; sessionId: string; clientSecret: string; publishableKey: string } | null>(null);
  const [startingPayment, setStartingPayment] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoState, setPromoState] = useState<{ code: string; discountAmount: number; finalAmount: number; description: string } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState<Offer | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/offers/my")
      // An offer whose tutor or request no longer exists (deleted account or
      // request) comes back with a null reference. Skip those rows instead of
      // crashing the whole page on o.tutor.avatar.
      .then((r) => setOffers(((r.data.offers || []) as Offer[]).filter((o) => o && o.tutor && o.request)))
      .catch((e) => showError(e, "Unable to load offers."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const offerId = searchParams.get("offer");
    if (!payment) return;

    if (payment === "success" && offerId) {
      // Swich's Payment Session has no push webhook — the booking is only
      // finalized once THIS confirm call succeeds, so this replaces the old
      // "show a toast and hope the webhook already fired" behavior. See
      // payment.controller.ts's confirmSwichPayment / paymentProvider.service.ts's
      // confirmCheckout.
      showSuccess("Payment received! Confirming your booking now — this can take a few seconds.");
      router.replace("/offers");

      let cancelled = false;
      let attempt = 0;

      const poll = async () => {
        if (cancelled) return;
        attempt += 1;
        try {
          const res = await api.get(`/payments/status/bid/${encodeURIComponent(offerId)}`, { headers: { "Cache-Control": "no-cache" } });
          if (res.data?.verified) {
            showSuccess("Booking confirmed!");
            load();
            return;
          }
          // sessionStatus "Pending" means Swich hasn't settled the payment
          // yet (e.g. bank transfer can take longer than card) — keep
          // checking a few more times before giving up and telling the
          // student to check back later rather than polling forever.
          if (res.data?.paymentStatus === "pending" && attempt < 6 && !cancelled) {
            setTimeout(poll, 3000);
          } else if (res.data?.paymentStatus && res.data.paymentStatus !== "pending") {
            // Failed / Expired / Cancelled — nothing more to wait for.
            showError(new Error(res.data.paymentStatus), "Payment was not completed. You can try accepting the offer again.");
            load();
          }
        } catch (e) {
          if (attempt < 3 && !cancelled) {
            setTimeout(poll, 3000);
          } else {
            showError(e, "We couldn't confirm your payment automatically. If money was deducted, contact support with your offer reference.");
            load();
          }
        }
      };

      poll();
      return () => { cancelled = true; };
    } else if (payment === "failed") {
      showError(new Error("Payment failed"), "Payment failed or was cancelled. You can try accepting the offer again.");
      router.replace("/offers");
    } else if (payment === "processing") {
      showSuccess("Finishing up your payment…");
      router.replace("/offers");
    }
  }, [searchParams, load, router]);

  async function view(o: Offer) {
    if (isRequester && o.status === "submitted") {
      try {
        await api.post(`/offers/${o._id}/view`);
        setOffers((rows) => rows.map((row) => (row._id === o._id ? { ...row, status: "viewed" } : row)));
      } catch {}
    }
  }

  async function validatePromo(amount: number) {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    setPromoError("");
    setPromoState(null);
    try {
      const res = await api.post("/promo-codes/validate", { code: promoInput.trim(), amount });
      if (res.data?.valid) {
        setPromoState({ code: res.data.promoCode.code, discountAmount: res.data.discountAmount, finalAmount: res.data.finalAmount, description: res.data.promoCode.description });
      }
    } catch (e: any) {
      setPromoError(e?.response?.data?.message || "Invalid promo code.");
    } finally {
      setPromoChecking(false);
    }
  }

  // Returns true when the request was handled (including a redirect to the
  // payment page) and false when it failed, so callers can keep a dialog open.
  async function action(o: Offer, type: "accept" | "decline" | "withdraw"): Promise<boolean> {
    try {
      const body: Record<string, unknown> = {};
      if (type === "accept" && promoState) body.promoCode = promoState.code;
      const res = await api.post(`/offers/${o._id}/${type}`, body);
      if (type === "accept" && res.data?.sessionId) {
        setCheckoutSession({ offerId: o._id, sessionId: res.data.sessionId, clientSecret: res.data.clientSecret, publishableKey: res.data.publishableKey });
        return true;
      }
      if (type === "accept" && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return true;
      }
      showSuccess(type === "accept" ? (res.data?.message || "Rate agreed! Proceeding to booking.") : "Offer updated.");
      load();
      return true;
    } catch (e) {
      showError(e, "Unable to update offer.");
      return false;
    }
  }

  function requestAccept(o: Offer) {
    setShowAcceptConfirm(o);
  }

  function confirmAccept(o: Offer) {
    setStartingPayment(true);
    action(o, "accept").finally(() => {
      setStartingPayment(false);
      setShowAcceptConfirm(null);
    });
  }

  async function toggleShortlist(o: Offer) {
    try {
      const res = await api.post(`/offers/${o._id}/shortlist`);
      const shortlisted = Boolean(res.data?.shortlisted);
      setOffers((rows) => rows.map((row) => (
        row._id === o._id
          ? { ...row, shortlistedAt: shortlisted ? (res.data?.offer?.shortlistedAt || new Date().toISOString()) : undefined }
          : row
      )));
      showSuccess(shortlisted ? "Offer saved to your shortlist." : "Offer removed from your shortlist.");
    } catch (e) {
      showError(e, "Unable to update your shortlist.");
    }
  }

  async function renew(o: Offer) {
    try {
      await api.post(`/offers/${o._id}/renew`, { amount: o.amount, message: o.message, availability: o.availability });
      showSuccess("Offer renewed for 24 hours.");
      load();
    } catch (e) {
      showError(e, "Unable to renew offer.");
    }
  }

  // Retries checkout for an offer already "payment_pending" — e.g. the
  // student's earlier attempt failed (declined card, insufficient balance,
  // closed the tab) but the 30-minute hold hasn't expired yet. Without this,
  // there's no visible action for a payment_pending offer at all.
  async function retryPayment(o: Offer): Promise<void> {
    setStartingPayment(true);
    try {
      const res = await api.post(`/offers/${o._id}/retry-payment`);
      if (res.data?.sessionId) {
        setCheckoutSession({ offerId: o._id, sessionId: res.data.sessionId, clientSecret: res.data.clientSecret, publishableKey: res.data.publishableKey });
      } else {
        showError(new Error("No session"), "Unable to resume payment. Please try again.");
      }
    } catch (e) {
      showError(e, "Unable to resume payment. Please try again.");
    } finally {
      setStartingPayment(false);
    }
  }

  // Sorted offers
  const sortedOffers = [...offers].sort((a, b) => {
    if (sortBy === "lowest_rate") return a.amount - b.amount;
    if (sortBy === "best_match") return (b.matchScore || 80) - (a.matchScore || 80);
    return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
  });

  return (
    <DashboardLayout>
    <div style={{ padding: "2rem 1.5rem 5rem", maxWidth: 1080, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: UI_COLORS.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Marketplace Offers
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0.25rem 0 0.5rem" }}>
            {user?.role === "tutor" ? "My Sent Offers & Negotiations" : "Tutor Offers & Negotiations"}
          </h1>
          <p style={{ color: TEXT_COLORS.muted, margin: 0, fontSize: "0.95rem" }}>
            Compare rates, Match Scores, and immutable negotiation timelines before locking in your tutor.
          </p>
        </div>

        {offers.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT_COLORS.muted }}>Sort by:</label>
            <select
              aria-label="Sort offers"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: "0.5rem 0.85rem", borderRadius: "0.5rem", border: `1.5px solid ${UI_COLORS.border}`, fontSize: "0.85rem", color: TEXT_COLORS.body, background: UI_COLORS.surface }}
            >
              <option value="best_match">Best Match (Recommended)</option>
              <option value="lowest_rate">Lowest Proposed Rate</option>
              <option value="expiry">Expiry Time</option>
            </select>
            <button
              type="button"
              onClick={() => setShowComparison(true)}
              style={{
                background: "#0329B2",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <Sparkles size={14} /> Compare Offers
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div role="status" aria-label="Loading offers" style={{ padding: "4rem 0", textAlign: "center", color: TEXT_COLORS.muted }}>
          Loading marketplace offers...
        </div>
      ) : sortedOffers.length === 0 ? (
        <div style={{
          background: "white",
          borderRadius: "1.25rem",
          padding: "4rem 2rem",
          textAlign: "center",
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 30px rgba(2, 21, 80, 0.04)"
        }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#eef5ff", color: "#0329b2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
            <Sparkles size={32} />
          </div>
          <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
            No Active Offers Yet
          </h3>
          <p style={{ color: "#64748b", maxWidth: 460, margin: "0 auto 1.75rem", fontSize: "0.95rem" }}>
            {user?.role === "tutor"
              ? "Browse live student tuition requests matching your subjects and send your first offer."
              : "Post a tuition requirement with your proposed budget and verified tutors will send offers."}
          </p>
          <Link
            href={user?.role === "tutor" ? "/browse-requests" : "/post-tuition-request"}
            style={{
              background: "#0329b2",
              color: "white",
              padding: "0.85rem 1.75rem",
              borderRadius: "0.625rem",
              fontWeight: 800,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            {user?.role === "tutor" ? "Browse Matching Requests" : "Post a Tuition Request"} <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {sortedOffers.map((o) => {
            const history = o.history || [];
            const last = history[history.length - 1];
            const tutorCanAccept = user?.role === "tutor" && last?.senderRole === "student";
            const canCounter = active.includes(o.status) && o.request.allowCounterOffers && last?.senderRole !== negotiationRole;
            const fees = calculateMarketplaceFees(o.amount);
            const timeLeft = now === null ? "Calculating" : remaining(o.expiresAt, now);
            const isAccepted = o.status === "accepted";

            return (
              <article key={o._id} onMouseEnter={() => view(o)} style={card}>
                {/* Header Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0329b2", textTransform: "uppercase", background: "#eef5ff", padding: "0.2rem 0.6rem", borderRadius: "999px" }}>
                      {o.request.teachingMode} · {o.request.area || o.request.city || "Online"}
                    </span>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#021550", margin: "0.4rem 0 0.2rem" }}>
                      {o.request.subject} ({o.request.level})
                    </h2>
                    <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
                      Schedule: {o.request.schedule}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Offered Rate</span>
                    <strong style={{ fontSize: "1.4rem", color: "#0329b2", fontWeight: 900 }}>
                      {o.currency || o.request.currency || "Market currency"} {o.amount.toLocaleString()}<span style={{ fontSize: "0.85rem", fontWeight: 500 }}>/{o.pricingUnit}</span>
                    </strong>
                    <div style={{ marginTop: "0.25rem" }}>
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        background: isAccepted ? "#ecfdf5" : "#f1f5f9",
                        color: isAccepted ? "#059669" : "#475569",
                        textTransform: "capitalize"
                      }}>
                        {o.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tutor info & comparison row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#0329b2", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 800, overflow: "hidden" }}>
                      {o.tutor.avatar ? <img src={o.tutor.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : o.tutor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: "1rem", color: "#021550", display: "block" }}>{o.tutor.name}</strong>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        Student proposed: {o.currency || o.request.currency || "Market currency"} {(o.initialStudentRate ?? 0).toLocaleString()}/{o.pricingUnit}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.825rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: timeLeft === "Expired" ? "#dc2626" : "#475569", fontWeight: 600 }}>
                      <Clock size={16} />
                      <span>{timeLeft === "Expired" ? "Offer Expired" : `Expires in ${timeLeft}`}</span>
                    </div>
                  </div>
                </div>

                {/* Tutor Earnings Box for Tutor View */}
                {user?.role === "tutor" && (
                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.825rem", color: "#92400e", marginBottom: "1rem" }}>
                    Platform fee {offerMoney(o, fees.tutorFee)} + Tax {offerMoney(o, fees.tax)} · Estimated net payout: <strong>{offerMoney(o, fees.tutorNet)}</strong>
                  </div>
                )}

                {/* Payment pending banner — shown while a checkout for this
                    offer is in flight or was abandoned/failed but the
                    30-minute hold hasn't expired yet */}
                {o.status === "payment_pending" && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.825rem", color: "#1d4ed8", marginBottom: "1rem" }}>
                    {isRequester
                      ? "Payment in progress. If your last attempt didn't go through, you can pick up where you left off."
                      : "The student is completing payment for this offer. The booking will be created once payment is confirmed."}
                  </div>
                )}

                {/* Immutable Negotiation Timeline */}
                <details style={{ background: "#f8fafc", padding: "0.85rem 1rem", borderRadius: "0.625rem", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                  <summary style={{ fontWeight: 700, fontSize: "0.85rem", color: "#021550", cursor: "pointer" }}>
                    Negotiation History ({history.length} events)
                  </summary>
                  <ol style={{ borderLeft: "2px solid #bfdbfe", paddingLeft: 18, margin: "0.75rem 0 0 0.5rem", listStyle: "none" }}>
                    {history.map((h) => (
                      <li key={h._id} style={{ marginBottom: "0.75rem", position: "relative" }}>
                        <span style={{ position: "absolute", left: -24, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#0329b2" }} />
                        <strong style={{ fontSize: "0.85rem", color: "#021550" }}>
                          {h.senderRole === "student" ? "Student" : "Tutor"} proposed {offerMoney(o, h.amount)}
                        </strong>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {new Date(h.createdAt).toLocaleString("en-PK")} · {h.status}
                        </div>
                        {h.message && <p style={{ fontSize: "0.8rem", color: "#334155", margin: "0.25rem 0 0" }}>&ldquo;{h.message}&rdquo;</p>}
                      </li>
                    ))}
                  </ol>
                  {isAccepted && (
                    <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "#ecfdf5", borderRadius: "0.375rem", color: "#065f46", fontSize: "0.85rem", fontWeight: 700 }}>
                      ✓ Final agreed rate locked: {offerMoney(o, o.amount)}/{o.pricingUnit}
                    </div>
                  )}
                </details>

                {/* Promo code entry — shown to students on active offers */}
                {isRequester && active.includes(o.status) && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <details>
                      <summary style={{ fontSize: "0.8rem", color: "#64748b", cursor: "pointer", fontWeight: 600, userSelect: "none" }}>
                        Have a promo code?
                      </summary>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                        <input
                          type="text"
                          aria-label="Enter promotional code"
                          value={promoInput}
                          onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoState(null); setPromoError(""); }}
                          placeholder="Enter code"
                          style={{ flex: 1, minWidth: 120, padding: "0.4rem 0.75rem", border: `1.5px solid ${UI_COLORS.border}`, borderRadius: 6, fontSize: "0.85rem", textTransform: "uppercase" }}
                        />
                        <button
                          type="button"
                          disabled={promoChecking || !promoInput.trim()}
                          onClick={() => validatePromo(o.amount)}
                          style={{ padding: "0.4rem 0.9rem", background: "#0329b2", color: "white", border: "none", borderRadius: 6, fontSize: "0.8rem", fontWeight: 700, cursor: promoChecking || !promoInput.trim() ? "not-allowed" : "pointer", opacity: promoChecking || !promoInput.trim() ? 0.6 : 1 }}
                        >
                          {promoChecking ? "Checking…" : "Apply"}
                        </button>
                        {promoState && (
                          <button type="button" onClick={() => { setPromoState(null); setPromoInput(""); }} style={{ padding: "0.4rem 0.7rem", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>✕</button>
                        )}
                      </div>
                      {promoError && <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "#dc2626" }}>{promoError}</p>}
                      {promoState && (
                        <div style={{ marginTop: "0.4rem", padding: "0.5rem 0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: "0.8rem", color: "#065f46" }}>
                          ✓ <strong>{promoState.code}</strong>{promoState.description ? ` — ${promoState.description}` : ""}: save {o.currency || o.request.currency || "PKR"} {promoState.discountAmount.toLocaleString()} → you pay <strong>{promoState.finalAmount.toLocaleString()}</strong>
                        </div>
                      )}
                    </details>
                  </div>
                )}

                {/* Action Buttons */}
                {active.includes(o.status) && (
                  <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginTop: "1rem" }}>
                    {(isRequester || tutorCanAccept) && (
                      <button
                        onClick={() => requestAccept(o)}
                        style={{
                          background: "#10b981",
                          color: "white",
                          border: "none",
                          padding: "0.85rem 1.5rem",
                          borderRadius: "0.625rem",
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                          minHeight: "48px",
                          flex: "1 1 auto",
                          minWidth: "160px",
                          boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                        }}
                      >
                        <CheckCircle size={18} /> Accept {offerMoney(o, o.amount)}
                      </button>
                    )}

                    {isRequester && (
                      <button
                        type="button"
                        onClick={() => toggleShortlist(o)}
                        aria-pressed={Boolean(o.shortlistedAt)}
                        style={{
                          background: o.shortlistedAt ? "#eff6ff" : "white",
                          color: "#0329b2",
                          border: "1.5px solid #93c5fd",
                          padding: "0.85rem 1.15rem",
                          borderRadius: "0.625rem",
                          fontWeight: 800,
                          fontSize: "0.88rem",
                          cursor: "pointer",
                          minHeight: "48px",
                        }}
                      >
                        {o.shortlistedAt ? "Shortlisted" : "Shortlist"}
                      </button>
                    )}

                    {canCounter && (
                      <button
                        onClick={() => setCountering(o)}
                        style={{
                          background: "white",
                          color: "#0329b2",
                          border: "2px solid #0329b2",
                          padding: "0.85rem 1.25rem",
                          borderRadius: "0.625rem",
                          fontWeight: 800,
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          minHeight: "48px",
                          flex: "1 1 auto",
                        }}
                      >
                        Counter-Offer
                      </button>
                    )}

                    <Link
                      href="/chat"
                      style={{
                        background: "white",
                        color: "#475569",
                        border: "1.5px solid #cbd5e1",
                        padding: "0.85rem 1.15rem",
                        borderRadius: "0.625rem",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem",
                        minHeight: "48px",
                      }}
                    >
                      <MessageSquare size={16} /> Message
                    </Link>

                    <WhatsAppChatButton
                      variant="outline"
                      label="WhatsApp"
                      message={`Hi TUTORERA, I have a question about my ${o.request.subject} offer from ${o.tutor.name} (offer ${o._id}).`}
                    />

                    <button
                      onClick={() => action(o, user?.role === "tutor" ? "withdraw" : "decline")}
                      style={{
                        background: "none",
                        color: "#94a3b8",
                        border: "none",
                        padding: "0.65rem 0.85rem",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        minHeight: "44px",
                      }}
                    >
                      {user?.role === "tutor" ? "Withdraw" : "Decline"}
                    </button>
                  </div>
                )}

                {o.status === "payment_pending" && isRequester && (
                  <button
                    onClick={() => retryPayment(o)}
                    style={{
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      padding: "0.85rem 1.5rem",
                      borderRadius: "0.625rem",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      minHeight: "48px",
                      marginTop: "1rem",
                      boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                    }}
                  >
                    <CreditCard size={18} /> Complete Payment
                  </button>
                )}

                {o.status === "expired" && user?.role === "tutor" && (
                  <button
                    onClick={() => renew(o)}
                    style={{
                      background: "#0329b2",
                      color: "white",
                      border: "none",
                      padding: "0.75rem 1.25rem",
                      borderRadius: "0.5rem",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      minHeight: "48px",
                    }}
                  >
                    <RotateCcw size={15} /> Renew Offer for 24h
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {showAcceptConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "0.75rem", boxShadow: "0 20px 25px rgba(0,0,0,0.1)", maxWidth: 500, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#021550", margin: 0 }}>Confirm Booking</h2>
              <p style={{ color: "#64748b", marginTop: "0.5rem", fontSize: "0.9rem" }}>Review terms before accepting this offer</p>
            </div>

            <div style={{ padding: "1.5rem", display: "grid", gap: "1.25rem" }}>
              <div>
                <strong style={{ fontSize: "0.95rem", color: "#021550" }}>Rate Agreement</strong>
                <p style={{ margin: "0.5rem 0 0", color: "#475569", fontSize: "0.9rem" }}>
                  Final agreed rate: <strong>{showAcceptConfirm.currency || showAcceptConfirm.request.currency} {showAcceptConfirm.amount.toLocaleString()}</strong> per {showAcceptConfirm.pricingUnit}
                </p>
              </div>

              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                <strong style={{ fontSize: "0.9rem", color: "#021550", display: "block", marginBottom: "0.5rem" }}>📋 Cancellation Policy</strong>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
                  <li>Cancel up to 24 hours before session: Full refund</li>
                  <li>Cancel 1-24 hours before: 50% refund</li>
                  <li>No-show or cancel within 1 hour: No refund</li>
                </ul>
                <a href="/cancellation-policy" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "0.5rem", color: "#0329b2", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>
                  View full policy →
                </a>
              </div>

              <div style={{ background: "#fef2f2", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #fecaca" }}>
                <strong style={{ fontSize: "0.9rem", color: "#991b1b", display: "block", marginBottom: "0.5rem" }}>💰 First Session Guarantee</strong>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#7f1d1d", lineHeight: 1.6 }}>
                  If you're not satisfied with the first session, you can get a full refund or switch tutors at no extra cost within 48 hours.
                </p>
                <a href="/first-session-guarantee" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "0.5rem", color: "#dc2626", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>
                  Learn more →
                </a>
              </div>

              <div style={{ background: "#eff6ff", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #bfdbfe" }}>
                <strong style={{ fontSize: "0.9rem", color: "#1e40af", display: "block", marginBottom: "0.5rem" }}>✓ By accepting this offer, you:</strong>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem", color: "#1e3a8a", lineHeight: 1.6 }}>
                  <li>Agree to the cancellation policy above</li>
                  <li>Confirm receipt of the first session guarantee</li>
                  <li>Will proceed to payment for {showAcceptConfirm.currency || showAcceptConfirm.request.currency} {showAcceptConfirm.amount.toLocaleString()}</li>
                </ul>
              </div>
            </div>

            <div style={{ padding: "1.5rem", borderTop: "1px solid #e2e8f0", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowAcceptConfirm(null)}
                style={{ padding: "0.75rem 1.5rem", background: "white", border: "1.5px solid #cbd5e1", borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", color: "#475569" }}
              >
                Cancel
              </button>
              <button
                onClick={() => confirmAccept(showAcceptConfirm)}
                disabled={startingPayment}
                style={{ padding: "0.75rem 1.5rem", background: "#10b981", border: "none", borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.9rem", cursor: startingPayment ? "not-allowed" : "pointer", color: "white", opacity: startingPayment ? 0.6 : 1 }}
              >
                {startingPayment ? "Processing…" : "Accept & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {countering && (
        <CounterOfferSheet
          isOpen={!!countering}
          offerId={countering._id}
          currentAmount={countering.amount}
          initialRate={countering.initialStudentRate}
          pricingUnit={countering.pricingUnit}
          currency={countering.currency || countering.request.currency || ""}
          tutorName={countering.tutor?.name || "Tutor"}
          role={user?.role === "tutor" ? "tutor" : "student"}
          onClose={() => setCountering(null)}
          onDone={load}
        />
      )}

      {offers.length > 1 && (
        <OfferComparisonModal
          isOpen={showComparison}
          onClose={() => setShowComparison(false)}
          requestTitle={offers[0]?.request?.subject || "Tuition Request"}
          proposedBudget={offers[0]?.request?.budget || 0}
          currency={offers[0]?.currency || offers[0]?.request?.currency || ""}
          pricingUnit={offers[0]?.request?.pricingUnit || "hour"}
          offers={offers.map((o) => ({
            _id: o._id,
            tutor: {
              _id: o.tutor._id,
              name: o.tutor.name,
              avatar: o.tutor.avatar,
              city: o.tutor.city,
              teachingMode: o.tutor.teachingMode,
              policeVerificationStatus: o.profile?.policeVerificationStatus,
              degreeVerificationStatus: o.profile?.degreeVerificationStatus,
              rating: o.profile?.averageRating,
              reviewsCount: o.profile?.totalReviews,
              experience: o.profile?.experience,
              videoIntro: o.profile?.videoIntro,
              demoVideoStatus: o.profile?.demoVideoStatus,
              homeTuitionEligible: o.profile?.homeTuitionEligible,
            },
            amount: o.amount,
            currency: o.currency || o.request?.currency || "",
            pricingUnit: o.request?.pricingUnit || "hour",
            message: o.message,
            matchScore: o.matchScore,
            matchReasons: [],
            status: o.status as any,
            createdAt: o.expiresAt,
          }))}
          onAcceptOffer={(offerId) => {
            const offer = offers.find((o) => o._id === offerId);
            if (offer) {
              requestAccept(offer);
              setShowComparison(false);
            }
          }}
          onCounterOffer={(offerId, amount) => {
            const offer = offers.find((o) => o._id === offerId);
            if (offer) {
              setCountering({ ...offer, amount });
              setShowComparison(false);
            }
          }}
          onDeclineOffer={(offerId) => {
            const offer = offers.find((o) => o._id === offerId);
            if (offer) action(offer, "decline");
            setShowComparison(false);
          }}
        />
      )}
      {checkoutSession && (
        <RapidPayCheckoutModal
          sessionId={checkoutSession.sessionId}
          clientSecret={checkoutSession.clientSecret}
          publishableKey={checkoutSession.publishableKey}
          onSuccess={() => {
            setCheckoutSession(null);
            showSuccess("Payment received! Confirming your booking now…");
            let attempt = 0;
            let cancelled = false;
            const poll = async () => {
              if (cancelled) return;
              attempt += 1;
              try {
                const r = await api.get(`/payments/status/bid/${encodeURIComponent(checkoutSession.offerId)}`, { headers: { "Cache-Control": "no-cache" } });
                if (r.data?.verified) { showSuccess("Booking confirmed!"); load(); return; }
                if (r.data?.paymentStatus === "pending" && attempt < 6 && !cancelled) setTimeout(poll, 3000);
                else { showError(new Error(r.data?.paymentStatus || "pending"), "Payment verification is still in progress. Check back in a moment."); load(); }
              } catch (e) {
                if (attempt < 3 && !cancelled) setTimeout(poll, 3000);
                else { showError(e, "Payment received but we couldn't confirm your booking automatically. Contact support with your offer reference."); load(); }
              }
            };
            poll();
            return () => { cancelled = true; };
          }}
          onPending={() => {
            setCheckoutSession(null);
            showSuccess("Payment is awaiting approval. You'll be notified when it completes.");
            load();
          }}
          onError={(e) => {
            showError(new Error(e?.message || "Payment failed"), "Payment was not completed. You can try again.");
          }}
          onClose={() => setCheckoutSession(null)}
        />
      )}
    </div>
    </DashboardLayout>
  );
}

export default function OffersPage() {
  return (
    <Suspense fallback={<DashboardLayout><div role="status" aria-label="Loading offers" style={{ padding: "3rem 1.5rem", textAlign: "center", color: TEXT_COLORS.muted }}><p>Loading offers...</p></div></DashboardLayout>}>
      <OffersContent />
    </Suspense>
  );
}

const card = {
  background: "white",
  padding: "1.5rem",
  border: "1px solid #e2e8f0",
  borderRadius: "1rem",
  boxShadow: "0 4px 16px rgba(2, 21, 80, 0.04)"
} as const;

const primary = {
  background: "#0329B2",
  color: "white",
  border: 0,
  borderRadius: 8,
  padding: "9px 16px",
  fontWeight: 700,
  cursor: "pointer"
} as const;

const secondary = {
  background: "white",
  color: "#334155",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "9px 16px",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none"
} as const;

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(15,23,42,.6)",
  display: "grid",
  placeItems: "center",
  padding: 20,
  zIndex: 1000
} as const;

const modal = {
  background: "white",
  borderRadius: 14,
  padding: 24,
  maxWidth: 520,
  width: "100%",
  display: "grid",
  gap: 14,
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
} as const;

const label = {
  display: "grid",
  gap: 6,
  fontWeight: 700,
  fontSize: "0.85rem",
  color: "#021550"
} as const;

const input = {
  border: "1.5px solid #cbd5e1",
  borderRadius: 8,
  padding: "10px 12px",
  font: "inherit",
  fontSize: "0.9rem"
} as const;
