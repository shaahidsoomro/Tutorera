"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, ShieldCheck, Sparkles, Star, X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface TutorOfferItem {
  _id: string;
  tutor: {
    _id: string;
    name: string;
    avatar?: string;
    title?: string;
    city?: string;
    countryName?: string;
    policeVerificationStatus?: string;
    degreeVerificationStatus?: string;
    rating?: number;
    reviewsCount?: number;
    experience?: number;
    videoIntro?: string;
    demoVideoStatus?: string;
    homeTuitionEligible?: boolean;
  };
  amount: number;
  currency?: string;
  pricingUnit?: string;
  message?: string;
  availability?: string;
  matchScore?: number;
  matchReasons?: string[];
  status: "pending" | "accepted" | "rejected" | "countered" | "withdrawn";
  createdAt: string;
}

interface OfferComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestTitle: string;
  proposedBudget: number;
  currency: string;
  pricingUnit: string;
  offers: TutorOfferItem[];
  onAcceptOffer: (offerId: string) => void;
  onCounterOffer: (offerId: string, counterAmount: number) => void;
  onDeclineOffer?: (offerId: string) => void;
}

const money = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function OfferComparisonModal({
  isOpen,
  onClose,
  requestTitle,
  proposedBudget,
  currency,
  pricingUnit,
  offers,
  onAcceptOffer,
  onCounterOffer,
  onDeclineOffer,
}: OfferComparisonModalProps) {
  const [counteringOfferId, setCounteringOfferId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [confirmingOfferId, setConfirmingOfferId] = useState<string | null>(null);
  const modalRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const sendCounter = (offerId: string) => {
    const amount = Number(counterAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    onCounterOffer(offerId, amount);
    setCounteringOfferId(null);
    setCounterAmount("");
  };

  const confirmingOffer = offers.find((offer) => offer._id === confirmingOfferId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(2, 21, 80, 0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "90vh",
          overflow: "hidden",
          borderRadius: "1.25rem",
          background: "white",
          border: "1px solid #bfdbfe",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "center",
            padding: "1.25rem 1.5rem",
            color: "white",
            background: "linear-gradient(135deg,#021550,#0329b2)",
          }}
        >
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", fontSize: ".75rem", fontWeight: 800 }}>
              <Sparkles size={14} /> Compare Tutor Offers
            </div>
            <h2 id="comparison-title" style={{ margin: ".25rem 0 0", fontSize: "1.3rem" }}>{requestTitle}</h2>
            <p style={{ margin: ".25rem 0 0", color: "#bfdbfe", fontSize: ".82rem" }}>
              Your budget: <strong style={{ color: "#86efac" }}>{currency} {money(proposedBudget)}/{pricingUnit}</strong> · {offers.length} offer{offers.length === 1 ? "" : "s"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close offer comparison" style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "rgba(255,255,255,.15)", color: "white", cursor: "pointer" }}>
            <X size={19} />
          </button>
        </header>

        <div style={{ overflowY: "auto", padding: "1.25rem" }}>
          {offers.length === 0 ? (
            <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
              No tutor offers have been received for this request yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {offers.map((offer) => {
                const tutor = offer.tutor;
                const rating = typeof tutor.rating === "number" && tutor.rating > 0 ? tutor.rating : null;
                const reviews = typeof tutor.reviewsCount === "number" && tutor.reviewsCount > 0 ? tutor.reviewsCount : 0;
                const degreeApproved = tutor.degreeVerificationStatus === "approved";
                const policeApproved = tutor.policeVerificationStatus === "approved";
                const isCountering = counteringOfferId === offer._id;

                return (
                  <article key={offer._id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: "1rem", background: "#fff" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,1.4fr) minmax(120px,.7fr) minmax(160px,1fr) auto", gap: "1rem", alignItems: "center" }} className="offer-comparison-row">
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                          <strong style={{ color: "#021550", fontSize: "1rem" }}>{tutor.name || "Tutor"}</strong>
                          {typeof offer.matchScore === "number" && (
                            <span style={{ padding: ".15rem .45rem", borderRadius: 999, background: "#eef5ff", color: "#0329b2", fontSize: ".72rem", fontWeight: 800 }}>{offer.matchScore}% match</span>
                          )}
                        </div>
                        <div style={{ color: "#64748b", fontSize: ".8rem", marginTop: ".2rem" }}>
                          {tutor.title || "Tutor"}{tutor.city ? ` · ${tutor.city}` : ""}{tutor.countryName ? `, ${tutor.countryName}` : ""}
                        </div>
                        {offer.message && <p style={{ color: "#475569", fontSize: ".82rem", lineHeight: 1.5, margin: ".6rem 0 0" }}>&ldquo;{offer.message}&rdquo;</p>}
                      </div>

                      <div>
                        <div style={{ color: "#021550", fontWeight: 900, fontSize: "1.05rem" }}>{offer.currency || currency} {money(offer.amount)}</div>
                        <div style={{ color: "#64748b", fontSize: ".75rem" }}>/{offer.pricingUnit || pricingUnit}</div>
                        {offer.availability && <div style={{ marginTop: ".3rem", color: "#475569", fontSize: ".75rem" }}>{offer.availability}</div>}
                      </div>

                      <div style={{ display: "grid", gap: ".3rem", color: "#475569", fontSize: ".78rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
                          {rating ? <><Star size={14} fill="#f59e0b" color="#f59e0b" /> {rating.toFixed(1)} ({reviews} review{reviews === 1 ? "" : "s"})</> : <><Star size={14} color="#94a3b8" /> No reviews yet</>}
                        </span>
                        <span>{tutor.experience && tutor.experience > 0 ? `${tutor.experience} year${tutor.experience === 1 ? "" : "s"} experience` : "Experience not specified"}</span>
                        <span style={{ color: degreeApproved ? "#047857" : "#64748b", display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
                          {degreeApproved ? <ShieldCheck size={14} /> : <AlertCircle size={14} />} {degreeApproved ? "Degree verification approved" : "Degree verification not published"}
                        </span>
                        <span style={{ color: policeApproved ? "#047857" : "#64748b" }}>{policeApproved ? "Police verification approved" : "Police verification not published"}</span>
                      </div>

                      <div style={{ display: "grid", gap: ".4rem", minWidth: 130 }}>
                        <button type="button" onClick={() => setConfirmingOfferId(offer._id)} disabled={offer.status !== "pending" && offer.status !== "countered"} style={{ padding: ".55rem .7rem", border: 0, borderRadius: 8, background: "#0329b2", color: "white", fontWeight: 800, cursor: "pointer" }}>
                          <Check size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> Accept
                        </button>
                        <button type="button" onClick={() => { setCounteringOfferId(offer._id); setCounterAmount(String(offer.amount)); }} style={{ padding: ".5rem .7rem", borderRadius: 8, border: "1px solid #cbd5e1", background: "white", color: "#021550", fontWeight: 700, cursor: "pointer" }}>
                          Counter
                        </button>
                        <Link href={`/tutors/${tutor._id}`} style={{ color: "#0329b2", textAlign: "center", textDecoration: "none", fontWeight: 700, fontSize: ".8rem" }}>View profile</Link>
                        {onDeclineOffer && offer.status === "pending" && (
                          <button type="button" onClick={() => onDeclineOffer(offer._id)} style={{ border: 0, background: "transparent", color: "#b91c1c", fontWeight: 700, cursor: "pointer", fontSize: ".78rem" }}>Decline</button>
                        )}
                      </div>
                    </div>

                    {isCountering && (
                      <div style={{ marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem", display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
                        <label htmlFor={`counter-${offer._id}`} style={{ color: "#334155", fontWeight: 700, fontSize: ".82rem" }}>Your counter-offer</label>
                        <input id={`counter-${offer._id}`} type="number" min="1" value={counterAmount} onChange={(event) => setCounterAmount(event.target.value)} style={{ width: 150, padding: ".55rem .7rem", border: "1px solid #94a3b8", borderRadius: 8 }} />
                        <button type="button" onClick={() => sendCounter(offer._id)} style={{ padding: ".55rem .8rem", border: 0, borderRadius: 8, background: "#0329b2", color: "white", fontWeight: 800, cursor: "pointer" }}>Send counter</button>
                        <button type="button" onClick={() => { setCounteringOfferId(null); setCounterAmount(""); }} style={{ padding: ".55rem .8rem", border: "1px solid #cbd5e1", borderRadius: 8, background: "white", color: "#475569", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirmingOffer && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-offer-title" style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(2,21,80,.75)" }}>
          <div style={{ width: "min(480px,100%)", borderRadius: 16, background: "white", padding: "1.25rem", boxShadow: "0 25px 50px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
              <ShieldCheck size={26} color="#047857" />
              <div>
                <h3 id="confirm-offer-title" style={{ margin: 0, color: "#021550" }}>Confirm tutor offer</h3>
                <p style={{ margin: ".2rem 0 0", color: "#64748b", fontSize: ".82rem" }}>Review the tutor profile and booking terms before confirming.</p>
              </div>
            </div>
            <div style={{ margin: "1rem 0", padding: "1rem", borderRadius: 10, background: "#f8fafc", color: "#334155", lineHeight: 1.6, fontSize: ".85rem" }}>
              You are accepting <strong>{confirmingOffer.tutor.name || "this tutor"}</strong>&apos;s offer of <strong>{confirmingOffer.currency || currency} {money(confirmingOffer.amount)}/{confirmingOffer.pricingUnit || pricingUnit}</strong>. Eligibility for refunds, credits, replacements, or other protection is governed by the published policies and the specific booking circumstances.
            </div>
            <p style={{ color: "#64748b", fontSize: ".78rem", lineHeight: 1.5 }}>
              By continuing, you agree to TUTORERA&apos;s <Link href="/terms" style={{ color: "#0329b2" }}>Terms of Service</Link> and should review the <Link href="/first-session-guarantee" style={{ color: "#0329b2" }}>First Session Guarantee</Link>.
            </p>
            <div style={{ display: "flex", gap: ".6rem", marginTop: "1rem" }}>
              <button type="button" onClick={() => setConfirmingOfferId(null)} style={{ flex: 1, padding: ".65rem", borderRadius: 8, border: "1px solid #cbd5e1", background: "white", color: "#475569", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={() => { const id = confirmingOffer._id; setConfirmingOfferId(null); onAcceptOffer(id); }} style={{ flex: 1, padding: ".65rem", borderRadius: 8, border: 0, background: "#047857", color: "white", fontWeight: 800, cursor: "pointer" }}>Confirm offer</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 760px) {
          .offer-comparison-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
