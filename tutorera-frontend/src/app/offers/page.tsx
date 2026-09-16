"use client";

import Image from "next/image";
import OfferComparisonModal from "@/components/marketplace/OfferComparisonModal";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { calculateMarketplaceFees } from "@/lib/site";
import { showError,showSuccess } from "@/lib/toast";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  CreditCard,
  MessageSquare,
  RotateCcw,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import { Suspense,useCallback,useEffect,useState } from "react";

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
  initialStudentRate: number;
  pricingUnit: string;
  status: string;
  expiresAt: string;
  message: string;
  availability?: string;
  renewalCount?: number;
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

import CounterOfferSheet from "@/components/marketplace/CounterOfferSheet";


function OffersContent() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [countering, setCountering] = useState<Offer | null>(null);
  const [sortBy, setSortBy] = useState("best_match");
  const [now, setNow] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const load = useCallback(() => {
    setLoading(true);
    api.get("/offers/my")
      .then((r) => setOffers(r.data.offers || []))
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
    if (!payment) return;
    if (payment === "success") {
      showSuccess("Payment received! Confirming your booking now — this can take a few seconds.");
      load();
      const retry = setTimeout(load, 3000);
      router.replace("/offers");
      return () => clearTimeout(retry);
    } else if (payment === "failed") {
      showError(new Error("Payment failed"), "Payment failed or was cancelled. You can try accepting the offer again.");
      router.replace("/offers");
    } else if (payment === "processing") {
      showSuccess("Finishing up your payment…");
      router.replace("/offers");
    }
  }, [searchParams, load, router]);

  async function view(o: Offer) {
    if (user?.role === "student" && o.status === "submitted") {
      try {
        await api.post(`/offers/${o._id}/view`);
        setOffers((rows) => rows.map((row) => (row._id === o._id ? { ...row, status: "viewed" } : row)));
      } catch {}
    }
  }

  async function action(o: Offer, type: "accept" | "decline" | "withdraw") {
    try {
      const res = await api.post(`/offers/${o._id}/${type}`);
      if (type === "accept" && res.data?.checkoutUrl) {
        window.location.assign(res.data.checkoutUrl);
        return;
      }
      showSuccess(type === "accept" ? "Rate agreed! Proceeding to booking." : "Offer updated.");
      load();
    } catch (e) {
      showError(e, "Unable to update offer.");
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
  async function retryPayment(o: Offer) {
    try {
      const res = await api.post(`/offers/${o._id}/retry-payment`);
      if (res.data?.checkoutUrl) {
        window.location.assign(res.data.checkoutUrl);
        return;
      }
      showError(new Error("No checkout URL"), "Unable to resume payment. Please try again.");
    } catch (e) {
      showError(e, "Unable to resume payment. Please try again.");
    }
  }

  // Sorted offers
  const sortedOffers = [...offers].sort((a, b) => {
    if (sortBy === "lowest_rate") return a.amount - b.amount;
    if (sortBy === "best_match") return (b.matchScore || 80) - (a.matchScore || 80);
    return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
  });

  return (
    <main style={{ padding: "2.5rem 1.5rem 5rem", maxWidth: 1080, margin: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0329b2", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Marketplace Offers
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#021550", margin: "0.25rem 0 0.5rem" }}>
            {user?.role === "tutor" ? "My Sent Offers & Negotiations" : "Tutor Offers & Negotiations"}
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
            Compare rates, Match Scores, and immutable negotiation timelines before locking in your tutor.
          </p>
        </div>

        {offers.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: "0.5rem 0.85rem", borderRadius: "0.5rem", border: "1.5px solid #cbd5e1", fontSize: "0.85rem", color: "#021550", background: "white" }}
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
        <div style={{ padding: "4rem 0", textAlign: "center", color: "#64748b" }}>
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
            const last = o.history[o.history.length - 1];
            const tutorCanAccept = user?.role === "tutor" && last?.senderRole === "student";
            const canCounter = active.includes(o.status) && o.request.allowCounterOffers && last?.senderRole !== user?.role;
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
                      PKR {o.amount.toLocaleString()}<span style={{ fontSize: "0.85rem", fontWeight: 500 }}>/{o.pricingUnit}</span>
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
                      {o.tutor.avatar ? <Image src={o.tutor.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}  width={100} height={100} unoptimized/> : o.tutor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: "1rem", color: "#021550", display: "block" }}>{o.tutor.name}</strong>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        Student proposed: PKR {(o.initialStudentRate ?? 0).toLocaleString()}/{o.pricingUnit}
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
                    Platform fee PKR {fees.tutorFee.toLocaleString()} + Tax PKR {fees.tax.toLocaleString()} · Estimated net payout: <strong>PKR {fees.tutorNet.toLocaleString()}</strong>
                  </div>
                )}

                {/* Payment pending banner — shown while a checkout for this
                    offer is in flight or was abandoned/failed but the
                    30-minute hold hasn't expired yet */}
                {o.status === "payment_pending" && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.825rem", color: "#1d4ed8", marginBottom: "1rem" }}>
                    {user?.role === "student"
                      ? "Payment in progress. If your last attempt didn't go through, you can pick up where you left off."
                      : "The student is completing payment for this offer. The booking will be created once payment is confirmed."}
                  </div>
                )}

                {/* Immutable Negotiation Timeline */}
                <details style={{ background: "#f8fafc", padding: "0.85rem 1rem", borderRadius: "0.625rem", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                  <summary style={{ fontWeight: 700, fontSize: "0.85rem", color: "#021550", cursor: "pointer" }}>
                    Negotiation History ({o.history.length} events)
                  </summary>
                  <ol style={{ borderLeft: "2px solid #bfdbfe", paddingLeft: 18, margin: "0.75rem 0 0 0.5rem", listStyle: "none" }}>
                    {o.history.map((h) => (
                      <li key={h._id} style={{ marginBottom: "0.75rem", position: "relative" }}>
                        <span style={{ position: "absolute", left: -24, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#0329b2" }} />
                        <strong style={{ fontSize: "0.85rem", color: "#021550" }}>
                          {h.senderRole === "student" ? "Student" : "Tutor"} proposed PKR {h.amount.toLocaleString()}
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
                      ✓ Final agreed rate locked: PKR {o.amount.toLocaleString()}/{o.pricingUnit}
                    </div>
                  )}
                </details>

                {/* Action Buttons */}
                {active.includes(o.status) && (
                  <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginTop: "1rem" }}>
                    {(user?.role === "student" || tutorCanAccept) && (
                      <button
                        onClick={() => action(o, "accept")}
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
                        <CheckCircle size={18} /> Accept PKR {o.amount.toLocaleString()}
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

                {o.status === "payment_pending" && user?.role === "student" && (
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

      {countering && (
        <CounterOfferSheet
          isOpen={!!countering}
          offerId={countering._id}
          currentAmount={countering.amount}
          initialRate={countering.initialStudentRate}
          pricingUnit={countering.pricingUnit}
          currency="PKR"
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
          currency="PKR"
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
            currency: o.request?.pricingUnit === "month" ? "PKR" : "PKR",
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
              action(offer, "accept");
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
    </main>
  );
}

export default function OffersPage() {
  return (
    <Suspense fallback={<main style={{ padding: "3rem 1.5rem", maxWidth: 1080, margin: "auto", textAlign: "center" }}><p>Loading offers...</p></main>}>
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
