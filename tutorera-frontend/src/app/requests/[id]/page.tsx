"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/lib/toast";
import { trackMarketplaceEvent } from "@/lib/analytics";
import { ArrowLeft, Clock, Sparkles, ShieldCheck, BookOpen, MapPin, Calendar, DollarSign } from "lucide-react";
import OfferComparisonModal from "@/components/marketplace/OfferComparisonModal";
import TrustEvidencePanel from "@/components/marketplace/TrustEvidencePanel";
import ProgressReportPanel from "@/components/Dashboard/ProgressReportPanel";
import MatchScoreBadge from "@/components/marketplace/MatchScoreBadge";

type Badge = { identityVerified?: boolean; credentialsVerified?: boolean; videoVerified?: boolean; experiencedTutor?: boolean; topPerformer?: boolean };
type TutorProfile = { averageRating?: number; totalReviews?: number; experience?: number; degreeVerificationStatus?: string; cnicVerificationStatus?: string; demoVideoStatus?: string; policeVerificationStatus?: string; homeTuitionEligible?: boolean; videoIntro?: string; badges?: Badge };
type Tutor = { _id: string; name: string; avatar?: string; city?: string; tutorProfile?: TutorProfile };
type Bid = { _id: string; amount: number; currency?: string; pricingUnit?: string; status: string; message?: string; expiresAt?: string; matchScore?: number; matchTier?: "excellent" | "great" | "good" | "fair"; matchReasons?: string[]; matchScoreBreakdown?: Record<string, number | undefined>; shortlistedAt?: string; tutor: Tutor };
type StudentReputation = { totalBookings: number; completedBookings: number; cancelledByStudent: number; paymentSuccessRate: number; averageRatingByTutors: number | null; totalRatingsByTutors: number; reliabilityTier: "excellent" | "good" | "fair" | "new"; reliabilityScore: number };
type Request = {
  _id: string; subject: string; description?: string; learningObjectives?: string; learningNeed?: string; level?: string; city?: string; teachingMode?: string; schedule?: string; budget: number; currency?: string; pricingUnit?: string; status: string; expiresAt?: string; offersCount: number; isExpired: boolean; canExtend: boolean; canRepost: boolean; secondsRemaining: number; createdAt: string; bids?: Bid[]; student?: { name: string; avatar?: string }; studentReputation?: StudentReputation;
};
type TimelineEntry = { _id: string; fromStatus: string; toStatus: string; action: string; reason?: string; createdAt: string };
type BookingReference = { _id: string; request?: { _id?: string } };
type OfferSort = "best_match" | "lowest_rate" | "highest_rated" | "most_experienced" | "fastest_response" | "most_sessions";

function statusColor(status: string) {
  const map: Record<string, string> = { open: "#059669", receiving_offers: "#0329b2", negotiating: "#d97706", awaiting_payment: "#7c3aed", booked: "#059669", completed: "#6b7280", closed: "#6b7280", cancelled: "#dc2626", expired: "#dc2626" };
  return map[status] ?? "#6b7280";
}

function TrustBadges({ badges, profile }: { badges?: Badge; profile?: TutorProfile }) {
  const list = [
    badges?.identityVerified || profile?.cnicVerificationStatus === "approved" ? "🛡️ Identity Verified" : null,
    badges?.credentialsVerified || profile?.degreeVerificationStatus === "approved" ? "🎓 Credentials Verified" : null,
    badges?.videoVerified || profile?.demoVideoStatus === "approved" ? "🎬 Video Verified" : null,
    badges?.experiencedTutor ? "⭐ Experienced Tutor" : null,
    badges?.topPerformer ? "🏆 Top Performer" : null,
    profile?.policeVerificationStatus === "approved" ? "✓ Police Cleared" : null,
  ].filter(Boolean) as string[];
  if (!list.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
      {list.map((b) => (
        <span key={b} style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "#f0fdf4", color: "#065f46", border: "1px solid #bbf7d0" }}>{b}</span>
      ))}
    </div>
  );
}

function BidCard({ bid, requestId, onAction }: { bid: Bid; requestId: string; onAction: () => void }) {
  const [acting, setActing] = useState<string | null>(null);
  const router = useRouter();
  const profile = bid.tutor?.tutorProfile;
  const rating = profile?.averageRating ?? 0;
  const reviews = profile?.totalReviews ?? 0;
  const experience = profile?.experience ?? 0;

  const handleAccept = async () => {
    setActing("accept");
    try {
      const res = await api.post(`/offers/${bid._id}/accept`);
      trackMarketplaceEvent("tutor_offer_accepted", { requestId, offerId: bid._id, amount: bid.amount, currency: bid.currency });
      if (res.data?.checkoutUrl) {
        trackMarketplaceEvent("checkout_started", { requestId, offerId: bid._id });
        window.location.assign(res.data.checkoutUrl);
      } else {
        showSuccess("Offer accepted! Proceed to payment.");
        onAction();
      }
    } catch (err) {
      showError(err, "Failed to accept offer. Please try again.");
    } finally { setActing(null); }
  };

  const handleShortlist = async () => {
    setActing("shortlist");
    try {
      await api.post(`/offers/${bid._id}/shortlist`);
      trackMarketplaceEvent("offer_shortlisted", { requestId, offerId: bid._id });
      showSuccess("Offer shortlisted.");
      onAction();
    } catch (err) {
      showError(err, "Failed to shortlist.");
    } finally { setActing(null); }
  };

  const isActive = ["pending", "submitted", "viewed", "countered"].includes(bid.status);

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: "1.25rem", marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "#e5e7eb", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#0329b2" }}>
          {bid.tutor.avatar ? <Image src={bid.tutor.avatar} alt={bid.tutor.name} width={44} height={44} unoptimized style={{ objectFit: "cover" }} /> : bid.tutor.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: "#021550", fontSize: 15 }}>{bid.tutor.name}</p>
              {bid.tutor.city && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{bid.tutor.city}</p>}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: isActive ? "#eff6ff" : "#f8fafc", color: isActive ? "#0329b2" : "#6b7280", border: `1px solid ${isActive ? "#bfdbfe" : "#e5e7eb"}` }}>
              {bid.status.replace(/_/g, " ")}
            </span>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#021550" }}>
              {bid.amount.toLocaleString()} {bid.currency || "PKR"}<span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>/{bid.pricingUnit || "hour"}</span>
            </span>
            {rating > 0 && <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>★ {rating.toFixed(1)} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({reviews})</span></span>}
            {experience > 0 && <span style={{ fontSize: 12, color: "#64748b" }}>{experience} yr{experience !== 1 ? "s" : ""} exp.</span>}
          </div>

          <TrustBadges badges={profile?.badges} profile={profile} />
          <TrustEvidencePanel profile={profile} />
          {bid.matchScore !== undefined && (
            <div style={{ marginTop: 8 }}>
              <MatchScoreBadge
                score={bid.matchScore}
                tier={bid.matchTier}
                reasons={bid.matchReasons}
                breakdown={bid.matchScoreBreakdown}
                compact
                showBreakdown
              />
            </div>
          )}

          {bid.message && <p style={{ margin: "10px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.55 }}>{bid.message}</p>}
        </div>
      </div>

      {isActive && (
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={handleAccept} disabled={!!acting} style={{ padding: "8px 18px", background: "#0329b2", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.7 : 1 }}>
            {acting === "accept" ? "Confirming…" : "Accept & Pay"}
          </button>
          <Link href={`/offers?highlight=${bid._id}`} style={{ padding: "8px 18px", background: "#fff", color: "#0329b2", border: "1.5px solid #bfdbfe", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Counter / Negotiate →
          </Link>
          <button onClick={handleShortlist} disabled={!!acting} style={{ padding: "8px 14px", background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {acting === "shortlist" ? "…" : bid.shortlistedAt ? "✓ Shortlisted" : "Shortlist"}
          </button>
          <Link href={`/tutors/${bid.tutor._id}`} style={{ padding: "8px 14px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            View Profile
          </Link>
        </div>
      )}
    </div>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [offerSort, setOfferSort] = useState<OfferSort>("best_match");
  const firstOfferTracked = useRef(false);
  const progressViewedTracked = useRef(false);
  const userRole = user?.role;

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/requests/${id}`);
      let loadedRequest = res.data.request as Request;
      if (userRole === "student" || userRole === "parent") {
        try {
          const offersRes = await api.get(`/offers/request/${id}`, { params: { sort: offerSort } });
          const offers = (offersRes.data.offers ?? []).map((offer: Bid & { profile?: TutorProfile }) => ({
            ...offer,
            tutor: { ...offer.tutor, tutorProfile: offer.profile || offer.tutor?.tutorProfile },
          }));
          if (offers.length > 0 && !firstOfferTracked.current) {
            trackMarketplaceEvent("first_offer_received", { requestId: id, offerCount: offers.length });
            firstOfferTracked.current = true;
          }
          loadedRequest = { ...loadedRequest, bids: offers };
        } catch (err) {
          showError(err, "Could not load offer matching details.");
        }
      }
      setRequest(loadedRequest);
      try {
        const [timelineRes, bookingsRes] = await Promise.all([
          api.get(`/requests/${id}/timeline`),
          api.get("/bookings"),
        ]);
        setTimeline(timelineRes.data.timeline ?? []);
        const booking = (bookingsRes.data.bookings ?? []).find((item: BookingReference) => item.request?._id === id);
        setBookingId(booking?._id ?? null);
      } catch (err) {
        showError(err, "Could not load request activity and learning progress.");
      }
    } catch (err) {
      showError(err, "Could not load request details.");
    } finally {
      setLoading(false);
    }
  }, [id, offerSort, userRole]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (bookingId && !progressViewedTracked.current) {
      trackMarketplaceEvent("progress_report_viewed", { requestId: id, bookingId });
      progressViewedTracked.current = true;
    }
  }, [bookingId, id]);

  const handleExtend = async () => {
    setActing("extend");
    try {
      await api.post(`/requests/${id}/extend`);
      showSuccess("Request extended successfully.");
      load();
    } catch (err) { showError(err, "Failed to extend request."); }
    finally { setActing(null); }
  };

  const handleClose = async () => {
    if (!confirm("Close this request? Tutors will no longer be able to send offers.")) return;
    setActing("close");
    try {
      await api.patch(`/requests/${id}/close`);
      showSuccess("Request closed.");
      load();
    } catch (err) { showError(err, "Failed to close request."); }
    finally { setActing(null); }
  };

  const handleRepost = async () => {
    setActing("repost");
    try {
      const res = await api.post(`/requests/${id}/repost`);
      showSuccess("Request reposted successfully.");
      if (res.data?.request?._id && res.data.request._id !== id) {
        router.push(`/requests/${res.data.request._id}`);
      } else {
        load();
      }
    } catch (err) { showError(err, "Failed to repost."); }
    finally { setActing(null); }
  };

  if (loading) return <main style={{ padding: "3rem 1.5rem", maxWidth: 800, margin: "auto", textAlign: "center", color: "#64748b" }}>Loading request…</main>;
  if (!request) return <main style={{ padding: "3rem 1.5rem", maxWidth: 800, margin: "auto", textAlign: "center", color: "#dc2626" }}>Request not found.</main>;

  const activeBids = (request.bids || []).filter(b => ["pending", "submitted", "viewed", "countered"].includes(b.status));
  const otherBids = (request.bids || []).filter(b => !["pending", "submitted", "viewed", "countered"].includes(b.status));
  const isOwner = user?.role === "student" || user?.role === "parent";
  const journeySteps = [
    { key: "request", label: "Request posted", done: true },
    { key: "offers", label: "Compare offers", done: ["negotiating", "awaiting_payment", "booked", "in_progress", "completed"].includes(request.status) || request.offersCount > 0 },
    { key: "booking", label: "Book a tutor", done: ["awaiting_payment", "booked", "in_progress", "completed"].includes(request.status) },
    { key: "learning", label: "Start learning", done: ["in_progress", "completed"].includes(request.status) },
  ];
  const nextAction = request.status === "completed"
    ? { title: "Learning engagement completed", detail: "Review your tutor and continue from your learning history.", tone: "#059669" }
    : request.status === "booked" || request.status === "in_progress"
      ? { title: "Continue learning", detail: "Review your booking and keep your learning progress up to date.", tone: "#0329b2" }
      : request.status === "awaiting_payment"
        ? { title: "Complete payment", detail: "Your tutor has been selected. Finish payment to confirm the booking.", tone: "#7c3aed" }
        : request.offersCount > 0
          ? { title: "Compare tutor offers", detail: "Review qualifications, trust evidence, availability, and price before choosing.", tone: "#0329b2" }
          : { title: "Waiting for tutor offers", detail: "Matched tutors have been notified. We will show offers here as they arrive.", tone: "#d97706" };

  return (
    <main style={{ padding: "2rem 1.25rem 5rem", maxWidth: 860, margin: "auto" }}>
      {/* Back nav */}
      <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#0329b2", fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: "1.5rem" }}>
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      {/* Request header card */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", padding: "1.5rem", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#021550" }}>{request.subject}</h1>
            {request.level && <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{request.level}</p>}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: statusColor(request.status) + "18", color: statusColor(request.status), border: `1px solid ${statusColor(request.status)}33` }}>
            {request.status.replace(/_/g, " ")}
          </span>
        </div>

        {request.description && <p style={{ margin: "0 0 12px", fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{request.description}</p>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {request.city && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 8px" }}><MapPin size={11} />{request.city}</span>}
          {request.teachingMode && <span style={{ fontSize: 12, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 8px" }}>{request.teachingMode}</span>}
          {request.schedule && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 8px" }}><Calendar size={11} />{request.schedule}</span>}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#0329b2", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "3px 8px" }}><DollarSign size={11} />Budget: {request.budget.toLocaleString()} {request.currency || "PKR"}/{request.pricingUnit || "hr"}</span>
          {request.expiresAt && !request.isExpired && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "3px 8px" }}><Clock size={11} />Closes {new Date(request.expiresAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#021550" }}>
            <BookOpen size={14} style={{ display: "inline", marginRight: 4 }} />
            {request.offersCount} offer{request.offersCount !== 1 ? "s" : ""} received
          </span>
          {activeBids.length > 1 && isOwner && (
            <button onClick={() => { trackMarketplaceEvent("offer_comparison_opened", { requestId: id, offerCount: request.bids?.length ?? 0 }); setShowComparison(true); }} style={{ padding: "7px 14px", background: "#0329b2", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Sparkles size={13} /> Compare Offers
            </button>
          )}
          {isOwner && request.canExtend && (
            <button onClick={handleExtend} disabled={!!acting} style={{ padding: "7px 14px", background: "#fff", color: "#0329b2", border: "1.5px solid #bfdbfe", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer" }}>
              {acting === "extend" ? "Extending…" : "⏱ Extend Request"}
            </button>
          )}
          {isOwner && ["open", "published", "receiving_offers", "negotiating"].includes(request.status) && (
            <button onClick={handleClose} disabled={!!acting} style={{ padding: "7px 14px", background: "#fff", color: "#dc2626", border: "1.5px solid #fecaca", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer" }}>
              {acting === "close" ? "Closing…" : "Close Request"}
            </button>
          )}
          {isOwner && request.canRepost && (
            <button onClick={handleRepost} disabled={!!acting} style={{ padding: "7px 14px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer" }}>
              {acting === "repost" ? "Reposting…" : "↺ Repost Request"}
            </button>
          )}
        </div>
      </div>

      {isOwner && (request.learningObjectives || request.learningNeed) && (
        <section style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #dbeafe", padding: "1.25rem", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <BookOpen size={18} color="#0329b2" />
            <h2 style={{ margin: 0, color: "#021550", fontSize: 17, fontWeight: 800 }}>Learning goal</h2>
          </div>
          {request.learningNeed && <p style={{ margin: "0 0 6px", color: "#0329b2", fontSize: 12, fontWeight: 800, textTransform: "capitalize" }}>{request.learningNeed.replace(/_/g, " ")}</p>}
          {request.learningObjectives && <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.6 }}>{request.learningObjectives}</p>}
          <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
            This goal is shared with your selected tutor and can be revisited through session progress reports.
          </p>
        </section>
      )}

      {isOwner && bookingId && (
        <section style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #dbeafe", padding: "1.25rem", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <BookOpen size={18} color="#0329b2" />
            <h2 style={{ margin: 0, color: "#021550", fontSize: 17, fontWeight: 800 }}>Learning progress</h2>
          </div>
          <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
            Session reports connect your tutor&apos;s work back to the learning goal above.
          </p>
          <ProgressReportPanel bookingId={bookingId} role="student" />
        </section>
      )}

      {isOwner && (
        <section style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", padding: "1.25rem", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, color: nextAction.tone, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Your next step</p>
              <h2 style={{ margin: "4px 0 4px", color: "#021550", fontSize: 18, fontWeight: 800 }}>{nextAction.title}</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>{nextAction.detail}</p>
            </div>
            {request.offersCount > 0 && ["open", "published", "receiving_offers", "negotiating"].includes(request.status) && (
              <button onClick={() => { trackMarketplaceEvent("offer_comparison_opened", { requestId: id, offerCount: request.bids?.length ?? 0 }); setShowComparison(true); }} style={{ padding: "8px 14px", background: "#0329b2", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Open offer comparison
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 18 }}>
            {journeySteps.map((step, index) => (
              <div key={step.key} style={{ position: "relative", paddingTop: 26, color: step.done ? "#0329b2" : "#94a3b8", fontSize: 11, fontWeight: 700 }}>
                <span style={{ position: "absolute", top: 0, left: 0, width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: step.done ? "#dbeafe" : "#f1f5f9", color: step.done ? "#0329b2" : "#94a3b8" }}>
                  {step.done ? "✓" : index + 1}
                </span>
                {index < journeySteps.length - 1 && <span style={{ position: "absolute", top: 9, left: 24, right: 0, height: 2, background: journeySteps[index + 1].done ? "#bfdbfe" : "#e2e8f0" }} />}
                <span style={{ position: "relative" }}>{step.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Student reliability — visible to tutors only */}
      {!isOwner && request.studentReputation && (() => {
        const rep = request.studentReputation!;
        const tierColor = { excellent: "#059669", good: "#0329b2", fair: "#d97706", new: "#6b7280" }[rep.reliabilityTier];
        const tierLabel = { excellent: "✅ Excellent Student", good: "👍 Reliable Student", fair: "⚠️ Fair Track Record", new: "🆕 New Student" }[rep.reliabilityTier];
        return (
          <div style={{ background: "#f8fafc", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "1rem 1.25rem", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#021550" }}>Student Reliability</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: tierColor + "18", color: tierColor, border: `1px solid ${tierColor}33` }}>{tierLabel}</span>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {rep.totalBookings > 0 ? (
                <>
                  <span style={{ fontSize: 12, color: "#475569" }}>📚 <strong>{rep.totalBookings}</strong> booking{rep.totalBookings !== 1 ? "s" : ""}</span>
                  <span style={{ fontSize: 12, color: "#475569" }}>✅ <strong>{rep.completedBookings}</strong> completed</span>
                  <span style={{ fontSize: 12, color: "#475569" }}>💳 <strong>{rep.paymentSuccessRate}%</strong> payment rate</span>
                  {rep.averageRatingByTutors !== null && (
                    <span style={{ fontSize: 12, color: "#475569" }}>⭐ <strong>{rep.averageRatingByTutors}</strong> avg tutor rating ({rep.totalRatingsByTutors})</span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 12, color: "#94a3b8" }}>First time using Tutorera — no booking history yet.</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Active offers */}
      {isOwner && (
        <>
          {activeBids.length > 0 ? (
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#021550", margin: 0 }}>Active Offers ({activeBids.length})</h2>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#64748b", fontSize: 12, fontWeight: 700 }}>
                  Prioritize
                  <select
                    value={offerSort}
                    onChange={(event) => setOfferSort(event.target.value as OfferSort)}
                    style={{ padding: "7px 9px", border: "1px solid #cbd5e1", borderRadius: 8, color: "#334155", background: "#fff", fontSize: 12 }}
                  >
                    <option value="best_match">Best match</option>
                    <option value="lowest_rate">Lowest rate</option>
                    <option value="highest_rated">Highest rated</option>
                    <option value="most_experienced">Most experienced</option>
                    <option value="fastest_response">Fastest response</option>
                    <option value="most_sessions">Most completed sessions</option>
                  </select>
                </label>
              </div>
              {activeBids.map(bid => <BidCard key={bid._id} bid={bid} requestId={id} onAction={load} />)}
            </section>
          ) : (
            <div style={{ background: "#fff", borderRadius: 14, border: "1.5px dashed #e2e8f0", padding: "3rem", textAlign: "center", color: "#64748b", marginBottom: 16 }}>
              <p style={{ fontSize: 20, marginBottom: 8 }}>📬</p>
              <p style={{ fontWeight: 700, color: "#021550", margin: "0 0 4px" }}>No active offers yet</p>
              <p style={{ fontSize: 13, margin: 0 }}>Qualified tutors who match your request will receive notifications and can send offers here.</p>
            </div>
          )}

          {otherBids.length > 0 && (
            <section style={{ marginTop: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#9ca3af", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Past / Declined Offers</h2>
              {otherBids.map(bid => <BidCard key={bid._id} bid={bid} requestId={id} onAction={load} />)}
            </section>
          )}
        </>
      )}

      {isOwner && (
        <section style={{ marginTop: 24, background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, color: "#021550", fontSize: 16, fontWeight: 800 }}>Request activity</h2>
              <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 12 }}>A single view of how your request is progressing.</p>
            </div>
            <Link href={`/requests/${id}/timeline`} style={{ fontSize: 12, color: "#0329b2", fontWeight: 700, textDecoration: "none" }}>View details →</Link>
          </div>
          {timeline.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {timeline.slice(-5).reverse().map((entry) => (
                <div key={entry._id} style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ width: 8, height: 8, marginTop: 5, borderRadius: "50%", background: "#0329b2", flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, color: "#334155", fontSize: 13, fontWeight: 700 }}>{entry.action.replace(/_/g, " ")}</p>
                    <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 12 }}>{entry.fromStatus.replace(/_/g, " ")} → {entry.toStatus.replace(/_/g, " ")} · {new Date(entry.createdAt).toLocaleString()}</p>
                    {entry.reason && <p style={{ margin: "3px 0 0", color: "#94a3b8", fontSize: 12 }}>{entry.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>Activity will appear here as your request progresses.</p>
          )}
        </section>
      )}

      {showComparison && request.bids && (
        <OfferComparisonModal
          isOpen={showComparison}
          offers={request.bids as any}
          requestTitle={request.subject}
          proposedBudget={request.budget}
          currency={request.currency || "PKR"}
          pricingUnit={request.pricingUnit || "hr"}
          onClose={() => setShowComparison(false)}
          onAcceptOffer={async () => { setShowComparison(false); await load(); }}
          onCounterOffer={(offerId) => { trackMarketplaceEvent("offer_counter_sent", { requestId: id, offerId }); setShowComparison(false); }}
        />
      )}
    </main>
  );
}
