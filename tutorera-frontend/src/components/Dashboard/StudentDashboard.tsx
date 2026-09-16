"use client";
import Image from "next/image";
import { UI_COLORS } from "@/lib/brand";
// components/dashboard/StudentDashboard.tsx
import s from "@/app/dashboard/dashboard.module.css";
import OfferComparisonModal from "@/components/Dashboard/OfferComparisonModal";
import MatchScoreBadge from "@/components/marketplace/MatchScoreBadge";
import MatchedTutorsModal from "@/components/marketplace/MatchedTutorsModal";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import axiosInstance from "@/lib/axios";
import { SUPPORT_EMAIL,formatPKR } from "@/lib/site";
import { showError,showSuccess } from "@/lib/toast";
import { tutorProfileHref } from "@/lib/tutor-directory";
import { DashBid,DashBooking,DashRequest } from "@/types/dashboard";
import { TutorProfile } from "@/types/tutor";
import { Clock,ShieldCheck,Trash2,Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback,useEffect,useState } from "react";
import PostRequestModal from "./PostRequestModal";
import RatingModal from "./RatingModal";

const C = UI_COLORS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    open: s.badgeOpen, closed: s.badgeClosed, cancelled: s.badgeCancelled,
    upcoming: s.badgeUpcoming, ongoing: s.badgeOngoing, completed: s.badgeCompleted,
  };
  return `${s.badge} ${map[status] ?? s.badgeOpen}`;
}

function timeAgo(dateStr: string, nowMs: number = 0): string {
  const then = new Date(dateStr).getTime();
  if (!nowMs || isNaN(then)) {
    return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  }
  const diff = nowMs - then;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function formatExpiryBadge(expiresAt?: string, isExpired?: boolean, expiredAt?: string, nowMs: number = 0) {
  if (isExpired || !expiresAt) {
    return {
      text: "⚠️ Expired",
      detail: expiredAt ? `Expired on ${new Date(expiredAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}` : "Expired",
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
    };
  }
  if (!nowMs) {
    return {
      text: "⏱️ Active",
      detail: `Expires: ${new Date(expiresAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}`,
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    };
  }
  const diffMs = new Date(expiresAt).getTime() - nowMs;
  if (diffMs <= 0) {
    return {
      text: "⚠️ Expired",
      detail: "No longer active",
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
    };
  }
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const localizedTime = new Date(expiresAt).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffHours < 24) {
    return {
      text: `⚡ Closes in ${Math.max(1, diffHours)}h`,
      detail: `Expires: ${localizedTime}`,
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
    };
  }
  return {
    text: `⏱️ ${diffDays} ${diffDays === 1 ? "day" : "days"} left`,
    detail: `Expires: ${localizedTime}`,
    color: "#059669",
    bg: "#ecfdf5",
    border: "#a7f3d0",
  };
}

function Avatar({ name, avatar, size = 40 }: { name: string; avatar?: string; size?: number }) {
  return (
    <div className={size === 40 ? s.personAvatar : s.bidAvatar}>
      {avatar
        ? <Image src={avatar} alt={name}  width={100} height={100} unoptimized/>
        : name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({ booking, onClaimSubmitted }: {
  booking: DashBooking;
  onClaimSubmitted?: () => void;
}) {
  const [creatingChat, setCreatingChat] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimReason, setClaimReason] = useState("");
  const [claimDetails, setClaimDetails] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [rebooking, setRebooking] = useState(false);

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await axiosInstance.post(`/payments/booking/${booking._id}/checkout`);
      if (res.data?.checkoutUrl) {
        window.location.assign(res.data.checkoutUrl);
      } else {
        showError("Unable to initiate checkout session. Please try again.");
      }
    } catch (err: unknown) {
      showError(err, "Payment service temporarily unavailable. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const handleChatClick = async () => {
    setCreatingChat(true);
    try {
      const res = await axiosInstance.post("/chat/conversation", { bookingId: booking._id });
      router.push(`/chat/${res.data.conversation._id}`);
    } catch (err) {
      console.error("Failed to create conversation:", err);
      showError("Failed to open chat. Please try again.");
    } finally {
      setCreatingChat(false);
    }
  };

  const handleBookAgain = async () => {
    setRebooking(true);
    try {
      const res = await axiosInstance.post(`/bookings/${booking._id}/book-again`);
      const prefill = res.data?.prefill;
      if (prefill) {
        sessionStorage.setItem("tutorera_quick_request", JSON.stringify(prefill));
      }
      showSuccess("Repeat booking details prepared. Review the schedule and submit when ready.");
      router.push(res.data?.redirectTo || "/post-tuition-request");
    } catch (err: unknown) {
      showError(err, "Could not prepare repeat booking. Please try again.");
    } finally {
      setRebooking(false);
    }
  };

  const handleRateSubmit = async (rating: number, comment: string) => {
    try {
    await axiosInstance.post(`/reviews/${booking.tutor._id}`, {
      rating,
      comment,
      bookingId: booking._id,
    });
    setAlreadyRated(true);
    setShowRatingModal(false);
    showSuccess("Thank you for your feedback!");
    } catch (err) {
      showError(err, "Failed to submit rating. Please try again.");
    }
  };

  const handleClaimSubmit = async () => {
    if (!claimReason) return;
    setSubmittingClaim(true);
    try {
      await axiosInstance.post("/guarantee/claim", {
        bookingId: booking._id,
        reason: claimReason,
        details: claimDetails,
      });
      setClaimSubmitted(true);
      setShowClaimForm(false);
      onClaimSubmitted?.();
      showSuccess("Claim submitted successfully. We'll review it within 24–48 hours.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showError(e.response?.data?.message || "Failed to submit claim. Please try again.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  // Show "Not Satisfied?" only on completed first sessions that haven't been claimed yet
  const showGuaranteeButton = booking.isFirstSession
    && booking.status === "completed"
    && !claimSubmitted;

  return (
    <>
    <div className={s.card}>
      <div className={s.personRow}>
        <Avatar name={booking.tutor.name} avatar={booking.tutor.avatar} />
        <div>
          <p className={s.personName}>{booking.tutor.name}</p>
          <p className={s.personSub}>Your Tutor</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
          <span className={statusBadgeClass(booking.status)}>{booking.status}</span>
          {/* First session badge */}
          {booking.isFirstSession && (
            <span style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#EEF5FF', color: '#0329B2', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid #bfdbfe' }}>
              1st Session
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <button type="button" onClick={handleChatClick} disabled={creatingChat}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', backgroundColor: creatingChat ? '#e5e7eb' : '#EEF5FF', color: creatingChat ? '#9ca3af' : '#0329B2', borderRadius: '0.5rem', border: '1px solid #bfdbfe', fontSize: '0.8rem', fontWeight: '600', cursor: creatingChat ? 'not-allowed' : 'pointer' }}>
          {creatingChat ? "Opening..." : "💬 Chat"}
        </button>

        <button type="button" className={s.btnWarning} onClick={() => router.push(`/support?bookingId=${booking._id}`)}>
          🆘 Need Help?
        </button>

        {/* ── Rate Tutor — only on completed bookings ── */}
        {booking.status === "completed" && !alreadyRated && (
          <button type="button" className={s.btnWarning} onClick={() => setShowRatingModal(true)}>
            ⭐ Rate Tutor
          </button>
        )}

        {booking.status === "completed" && (
          <button
            type="button"
            onClick={handleBookAgain}
            disabled={rebooking}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1rem', backgroundColor: rebooking ? '#dbeafe' : '#EEF5FF',
              color: rebooking ? '#64748b' : '#0329B2', borderRadius: '0.5rem',
              border: '1px solid #bfdbfe', fontSize: '0.8rem', fontWeight: '700',
              cursor: rebooking ? 'wait' : 'pointer',
            }}>
            {rebooking ? "Preparing..." : "↻ Book Again"}
          </button>
        )}

        {alreadyRated && (
          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, padding: '0.5rem 0' }}>
            ✓ Rated
          </span>
        )}

        {/* ── First Session Guarantee button ── */}
        {showGuaranteeButton && (
          <button type="button" onClick={() => setShowClaimForm(!showClaimForm)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', backgroundColor: showClaimForm ? '#fef2f2' : '#fff1f2', color: '#C81B7F', borderRadius: '0.5rem', border: '1px solid #fecdd3', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
            😕 Not Satisfied?
          </button>
        )}
      </div>

      {booking.status === "completed" && (
        <div style={{ background: "linear-gradient(135deg, #EEF5FF 0%, #F8FAFF 100%)", border: "1px solid #bfdbfe", borderRadius: "0.75rem", padding: "0.9rem", marginBottom: "0.75rem" }}>
          <p style={{ margin: "0 0 0.5rem", color: "#021550", fontWeight: 800, fontSize: "0.85rem" }}>
            Continue Learning
          </p>
          <p style={{ margin: "0 0 0.75rem", color: "#475569", fontSize: "0.75rem", lineHeight: 1.5 }}>
            Rebook this tutor by posting a new requirement using the previous subject, mode, and agreed rate as a starting point. Tutors can then respond with a fresh offer.
          </p>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }} aria-label="Future learning options">
            {["Book Again"].map((option) => (
              <span key={option} style={{ border: "1px solid #dbeafe", background: "#0329B2", color: "white", borderRadius: 999, padding: "0.35rem 0.65rem", fontSize: "0.7rem", fontWeight: 800 }}>
                {option}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Secure checkout instructions — only when payment is pending ── */}
      {booking.paymentStatus === "pending" && booking.status !== "cancelled" && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '1rem', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            💳 Payment Required
          </p>
          <p style={{ fontSize: '0.75rem', color: '#15803d', marginBottom: '0.875rem', lineHeight: 1.5 }}>
            Review the final PKR amount below. Secure online payment will be processed through TUTORERA&apos;s authorized payment gateway upon merchant activation. TUTORERA verifies payment server-side before marking a booking paid.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {[
              { label: "Tutor Session", value: formatPKR(booking.subtotal || booking.amount || booking.totalAmount || 0) },
              { label: "Student Marketplace Fee", value: formatPKR(booking.studentFee || 0) },
              { label: "Tax", value: formatPKR(0) },
              { label: "Total Payable", value: formatPKR(booking.studentTotal || booking.amount || booking.totalAmount || 0) },
              { label: "Currency", value: "PKR — Pakistani Rupees" },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.75rem', backgroundColor: 'white', borderRadius: '0.375rem', border: '1px solid #bbf7d0', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#14532d', fontFamily: 'monospace' }}>{item.value}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.7rem', color: '#15803d', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handlePay}
              disabled={paying}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "0.55rem 1.25rem",
                background: paying ? "#86efac" : "#16a34a",
                color: "#ffffff",
                fontWeight: 800,
                cursor: paying ? "wait" : "pointer",
                boxShadow: "0 2px 4px rgba(22, 101, 52, 0.2)",
              }}
            >
              {paying ? "Starting Checkout..." : "Pay Securely →"}
            </button>{" "}
            <span>I agree to TUTORERA&apos;s <Link href="/terms">Terms & Conditions</Link>, <Link href="/refund-policy">Refund Policy</Link> and <Link href="/cancellation-policy">Cancellation Policy</Link>. Payment support: <strong>{SUPPORT_EMAIL}</strong></span>
          </p>
        </div>
      )}

      <details style={{marginBottom:"0.75rem",background:"#f8fafc",padding:"0.75rem",borderRadius:"0.5rem"}}><summary style={{fontWeight:700,cursor:"pointer"}}>Booking & fee summary</summary><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:10,fontSize:12}}><span>Subject: <b>{typeof booking.request==="object"?booking.request.subject:"Tutoring session"}</b></span><span>Mode: <b>{booking.teachingMode || "online"}</b></span><span>Rate: <b>PKR {((booking.finalAgreedRate || booking.amount || booking.totalAmount || 0)).toLocaleString()}/{booking.pricingUnit||"hour"}</b></span><span>Sessions: <b>{booking.sessionCount||1}</b></span><span>Subtotal: <b>PKR {((booking.subtotal || booking.amount || booking.totalAmount || 0)).toLocaleString()}</b></span><span>Student fee: <b>PKR {(booking.studentFee||0).toLocaleString()}</b></span><span>Total: <b>PKR {((booking.studentTotal || booking.amount || booking.totalAmount || 0)).toLocaleString()}</b></span><span>Payment: <b>{booking.paymentStatus || "pending"}</b></span></div><p style={{fontSize:11,color:"#64748b",marginTop:8}}>The cancellation and refund policy applies to this booking.</p></details>

      {/* Claim submitted confirmation */}
      {claimSubmitted && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
          ✅ Guarantee claim submitted. We'll review it within 24–48 hours.
        </div>
      )}

      {/* Claim form — expands inline */}
      {showClaimForm && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C81B7F', marginBottom: '0.75rem' }}>
            First Session Guarantee Claim
          </p>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.875rem', lineHeight: 1.5 }}>
            Not happy with your first session? Tell us why and we'll make it right — credit to try another tutor or a refund.
          </p>

          {/* Reason select */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#021550', marginBottom: '0.3rem' }}>
              What went wrong? *
            </label>
            <select title="Claim reasons" value={claimReason} onChange={e => setClaimReason(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.875rem', border: '1.5px solid #fecaca', borderRadius: '0.5rem', fontSize: '0.8rem', outline: 'none', color: '#021550', backgroundColor: 'white', boxSizing: 'border-box' }}>
              <option value="">Select a reason</option>
              <option value="Tutor didn't show up">Tutor didn't show up</option>
              <option value="Tutor was unprepared">Tutor was unprepared</option>
              <option value="Teaching quality was poor">Teaching quality was poor</option>
              <option value="Tutor was rude or unprofessional">Tutor was rude or unprofessional</option>
              <option value="Session was too short">Session was too short</option>
              <option value="Subject knowledge was insufficient">Subject knowledge was insufficient</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Optional details */}
          <div style={{ marginBottom: '0.875rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#021550', marginBottom: '0.3rem' }}>
              Additional details <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea value={claimDetails} onChange={e => setClaimDetails(e.target.value)} rows={3}
              placeholder="Tell us more about what happened..."
              style={{ width: '100%', padding: '0.6rem 0.875rem', border: '1.5px solid #fecaca', borderRadius: '0.5rem', fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: '#021550', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={handleClaimSubmit} disabled={!claimReason || submittingClaim}
              style={{ flex: 1, padding: '0.6rem', backgroundColor: !claimReason || submittingClaim ? '#fca5a5' : '#C81B7F', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: !claimReason || submittingClaim ? 'not-allowed' : 'pointer' }}>
              {submittingClaim ? "Submitting..." : "Submit Claim"}
            </button>
            <button type="button" className={s.btnOutline} onClick={() => { setShowClaimForm(false); setClaimReason(""); setClaimDetails(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={s.infoRow}>
        <span className={s.infoChip}>PKR {(booking.finalAgreedRate||booking.amount).toLocaleString()}/{booking.pricingUnit||"hour"}</span>
        <span className={s.infoChip}>{booking.schedule}</span>
        <span className={s.infoChip}>{booking.teachingMode}</span>
      </div>
      <p className={s.cardMeta} style={{ marginTop: 8 }}>Booked {timeAgo(booking.createdAt)}</p>
    </div>

      {showRatingModal && (
        <RatingModal
          title={`Rate ${booking.tutor.name.split(' ')[0]}`}
          subtitle="How was your session? Your review helps other students."
          onSubmit={handleRateSubmit}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </>
  );
}

// -------- Add a SavedTutorCard component -------------------------

function SavedTutorCard({ tutor, onRemove }: { tutor: TutorProfile; onRemove: (id: string) => void }) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    setRemoving(true);
    try {
      await axiosInstance.post(`/students/favourites/${tutor._id}`);
      onRemove(tutor._id);
    } catch {
      setRemoving(false);
    }
  };

  return (
    <div className={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <Link href={tutorProfileHref(tutor)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flex: 1 }}>
          <Avatar name={tutor.user.name} avatar={tutor.user.avatar} />
          <div>
            <p className={s.personName}>{tutor.user.name}</p>
            <p className={s.personSub}>{tutor.city} · {formatPKR(tutor.hourlyRate, "hour")}</p>
          </div>
        </Link>
        <button type="button" className={s.btnIcon} onClick={handleRemove} disabled={removing}
          style={{ color: '#C81B7F' }}
          aria-label="Remove from favourites">
          <Trash2 size={16} />
        </button>
      </div>
      <div className={s.infoRow} style={{ marginTop: 10 }}>
        {tutor.subjects?.slice(0, 3).map((sub: string) => (
          <span key={sub} className={s.infoChip}>{sub}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Request Card (with expandable bids) ─────────────────────────────────────

function RequestCard({
  request,
  onRefresh,
}: {
  request: DashRequest;
  onBidAccepted: () => void;
  onRefresh?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMatchedTutors, setShowMatchedTutors] = useState(false);
  const [bids, setBids] = useState<DashBid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [offerSort, setOfferSort] = useState("best_match");
  const [countering, setCountering] = useState<DashBid | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [extending, setExtending] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [selectedBids, setSelectedBids] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [acceptingCompare, setAcceptingCompare] = useState<string | null>(null);

  async function handleExtend() {
    setExtending(true);
    try {
      const res = await axiosInstance.post(`/requests/${request._id}/extend`);
      showSuccess(res.data.message || "Request extended by 7 days!");
      onRefresh?.();
    } catch (err: any) {
      showError(err, "Failed to extend request.");
    } finally {
      setExtending(false);
    }
  }

  async function handleRepost() {
    setReposting(true);
    try {
      const res = await axiosInstance.post(`/requests/${request._id}/repost`);
      showSuccess(res.data.message || "Request reposted with fresh 7-day visibility!");
      onRefresh?.();
    } catch (err: any) {
      showError(err, "Failed to repost request.");
    } finally {
      setReposting(false);
    }
  }

  async function handleClose() {
    if (!confirm("Are you sure you want to close this tuition request? Tutors will no longer be able to send offers.")) return;
    setClosing(true);
    try {
      await axiosInstance.patch(`/requests/${request._id}/close`);
      showSuccess("Tuition request closed.");
      onRefresh?.();
    } catch (err: any) {
      showError(err, "Failed to close request.");
    } finally {
      setClosing(false);
    }
  }

  const now = useCurrentTime();
  const expiryBadge = formatExpiryBadge(request.expiresAt, request.isExpired, request.expiredAt, now);

  async function loadBids(force = false, sort = offerSort) {
    if (!force && bids.length > 0) { setExpanded(!expanded); return; }
    setExpanded(true);
    setBidsLoading(true);
    try {
      const res = await axiosInstance.get(`/offers/request/${request._id}`, { params: { sort } });
      setBids(res.data.offers ?? []);
      await Promise.all((res.data.offers ?? []).filter((o: DashBid) => o.status === "submitted").map((o: DashBid) => axiosInstance.post(`/offers/${o._id}/view`).catch(() => undefined)));
    } catch {
      setBids([]);
    } finally {
      setBidsLoading(false);
    }
  }

  async function acceptBid(bidId: string) {
    setAccepting(bidId);
    try {
      const res = await axiosInstance.post(`/offers/${bidId}/accept`);
      const checkoutUrl = res.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
      } else {
        console.error("Accept-offer response had no checkoutUrl:", res.data);
        setAccepting(null);
      }
    } catch (err) {
      console.error("Failed to accept bid:", err);
      setAccepting(null);
    }
  }

  async function retryPayment(bidId: string) {
    setAccepting(bidId);
    try {
      const res = await axiosInstance.post(`/offers/${bidId}/retry-payment`);
      const checkoutUrl = res.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.assign(checkoutUrl); // reuses the same useEffect-based redirect from acceptBid
      } else {
        console.error("Retry-payment response had no checkoutUrl:", res.data);
        setAccepting(null);
      }
    } catch (err) {
      console.error("Failed to retry payment:", err);
      setAccepting(null);
    }
  }
  
  async function counterOffer() {
    if (!countering || Number(counterAmount) <= 0) return;
    try { await axiosInstance.post(`/offers/${countering._id}/counter`, { amount: Number(counterAmount), message: counterMessage }); setCountering(null); setCounterAmount(""); setCounterMessage(""); await loadBids(true); }
    catch (err) { showError(err, "Unable to send counter offer."); }
  }

  const counterLimitText = countering
    ? `${Math.max(0, 3 - (countering.counterCounts?.student ?? 0))} counter-offers remaining for you.${(countering.counterCounts?.student ?? 0) >= 2 ? " This is your final counter-offer." : ""}`
    : "";

  async function declineOffer(id: string) {
    try { await axiosInstance.post(`/offers/${id}/decline`); setBids(current => current.map(item => item._id === id ? { ...item, status: "rejected" } : item)); }
    catch (err) { showError(err, "Unable to decline offer."); }
  }

  return (
    <div className={s.card}>
      <div className={s.cardHeader}>
        <div style={{ flex: 1 }}>
          <h3 className={s.cardTitle}>{request.subject}</h3>
          <div className={s.cardMeta}>
            <span>{request.level}</span>
            <span>·</span>
            <span>{request.city}</span>
            <span>·</span>
            <span>{timeAgo(request.createdAt)}</span>
          </div>
        </div>
        <span className={statusBadgeClass(request.status)}>{request.status}</span>
      </div>

      {/* Expiry countdown badge & localized status indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "6px 0 10px" }}>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: "0.375rem",
            color: expiryBadge.color,
            backgroundColor: expiryBadge.bg,
            border: `1px solid ${expiryBadge.border}`,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
          title={expiryBadge.detail}
        >
          {expiryBadge.text}
        </span>
        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
          {expiryBadge.detail}
        </span>
        {(request.extensionCount || 0) > 0 && (
          <span style={{ fontSize: "0.72rem", color: "#64748b", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
            Extended {request.extensionCount}x
          </span>
        )}
      </div>

      <p className={s.cardDesc}>{request.description}</p>

      <div className={s.infoRow}>
        <span className={s.infoChip}>
          <svg width={12} height={12} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
          </svg>
          Budget: PKR {request.budget.toLocaleString()}/hr
        </span>
        <span className={s.infoChip}>{request.teachingMode}</span>
        <span className={s.infoChip}>{request.schedule}</span>
        {request.sessionDurationMinutes && request.sessionsPerWeek && (
          <span className={s.infoChip}>
            <Clock size={12} aria-hidden="true" /> {request.sessionsPerWeek}x/wk · {request.sessionDurationMinutes} min
          </span>
        )}
      </div>

      {/* Action triggers: Expand tutor offers, Extend, Repost, Close, & Smart matched tutors */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem", alignItems: "center" }}>
        {["open", "published", "receiving_offers", "negotiating", "awaiting_payment", "booked", "closed"].includes(request.status) && (
          <button
            onClick={() => loadBids()}
            className={s.expandBtn}
            style={{ margin: 0 }}
          >
            <svg
              width={12} height={12} viewBox="0 0 20 20" fill="currentColor"
              style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {expanded ? "Hide Tutor Offers" : "View Tutor Offers"}
          </button>
        )}

        {request.canExtend && (
          <button
            type="button"
            onClick={handleExtend}
            disabled={extending}
            style={{
              padding: "0.5rem 0.85rem",
              backgroundColor: "#0329b2",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: extending ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 2px 6px rgba(3, 41, 178, 0.25)",
            }}
          >
            {extending ? "Extending..." : `+ Extend 7 Days (${request.extensionCount || 0}/${request.maxExtensions || 2})`}
          </button>
        )}

        {request.canRepost && (
          <button
            type="button"
            onClick={handleRepost}
            disabled={reposting}
            style={{
              padding: "0.5rem 0.85rem",
              backgroundColor: "#059669",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: reposting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
            }}
          >
            {reposting ? "Reposting..." : "🔄 Repost Request"}
          </button>
        )}

        {!request.isExpired && ["open", "published", "receiving_offers"].includes(request.status) && (
          <button
            type="button"
            onClick={handleClose}
            disabled={closing}
            style={{
              padding: "0.5rem 0.75rem",
              backgroundColor: "white",
              color: "#6b7280",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: closing ? "not-allowed" : "pointer",
            }}
          >
            {closing ? "Closing..." : "Close Request"}
          </button>
        )}

        {["open", "published", "receiving_offers", "negotiating"].includes(request.status) && (
          <button
            type="button"
            onClick={() => setShowMatchedTutors(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 0.85rem",
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ⚡ View AI Matched Tutors
          </button>
        )}
      </div>

          {expanded && (
            <div className={s.bidsSection}>
              <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><p className={s.bidsSectionTitle}>Tutor Offers ({bids.length})</p><label style={{fontSize:12}}>Sort by <select value={offerSort} onChange={e=>{setOfferSort(e.target.value);loadBids(true,e.target.value)}}><option value="best_match">Best Match</option><option value="lowest_rate">Lowest Rate</option><option value="highest_rated">Highest Rated</option><option value="most_experienced">Most Experienced</option><option value="fastest_response">Fastest Response</option><option value="most_sessions">Most Sessions Completed</option></select></label>{selectedBids.length >= 2 && (
              <button
                onClick={() => setShowCompare(true)}
                style={{padding:"0.35rem 0.85rem",background:"#0329b2",color:"white",border:"none",borderRadius:"0.4rem",fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}
              >
                Compare ({selectedBids.length}) Offers
              </button>
            )}</div>
              {bidsLoading ? (
                <div className={s.spinner} />
              ) : bids.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                  No offers yet. Matching verified tutors can respond soon.
                </p>
              ) : (
                bids.map((bid) => (
                  <div key={bid._id} className={s.bidCard}>
                    {["pending", "submitted", "viewed", "countered"].includes(bid.status) && (
                      <input
                        type="checkbox"
                        checked={selectedBids.includes(bid._id)}
                        onChange={(e) => {
                          setSelectedBids(prev =>
                            e.target.checked
                              ? [...prev, bid._id]
                              : prev.filter(id => id !== bid._id)
                          );
                        }}
                        aria-label={`Select ${bid.tutor.name} for comparison`}
                        style={{marginTop:4,cursor:"pointer",width:16,height:16,accentColor:"#0329b2"}}
                      />
                    )}
                    <div className={s.bidAvatar}>
                      {bid.tutor.avatar
                        ? <Image src={bid.tutor.avatar} alt={bid.tutor.name}  width={100} height={100} unoptimized/>
                        : bid.tutor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={s.bidBody}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                        <div>
                          <p className={s.bidTutorName}>{bid.tutor.name}</p>
                          <p className={s.bidAmount}>PKR {bid.amount.toLocaleString()}/{bid.pricingUnit || "hour"}</p>
                        </div>
                        {bid.matchScore ? (
                          <MatchScoreBadge
                            score={bid.matchScore}
                            tier={bid.matchTier as any}
                            reasons={bid.matchReasons}
                            breakdown={bid.matchScoreBreakdown}
                            showBreakdown={true}
                          />
                        ) : null}
                      </div>

                      <p className={s.bidMessage}>{bid.profile?.isVerified ? "✓ Fully Verified · " : ""}{bid.profile?.averageRating?.toFixed(1) || "New"} rating ({bid.profile?.totalReviews || 0} reviews) · {bid.profile?.experience || 0} years · {bid.completedSessions || 0} completed · {bid.responseRate || 0}% response</p>
                      {!!bid.profile?.education?.length && <p className={s.bidMessage}>{bid.profile.education[0].degree} · {bid.profile.subjects?.join(", ")}</p>}
                      <p className={s.bidMessage} aria-label="Tutor trust and eligibility checks">
                        {bid.profile?.degreeVerificationStatus === "approved" && <><ShieldCheck size={13} aria-hidden="true" /> Educational Documents Verified · </>}
                        {bid.profile?.cnicVerificationStatus === "approved" && <>Identity Verified · </>}
                        {bid.profile?.policeVerificationStatus === "approved" && <>Background Check Approved · </>}
                        {bid.profile?.homeTuitionEligible && <>Home Tuition Eligible</>}
                      </p>
                      {bid.availability && <p className={s.bidMessage}>Availability: {bid.availability}</p>}
                      <p className={s.bidMessage}>{bid.message}</p>
                      <div className={s.bidActions}>
                        <Link href={tutorProfileHref({ _id: bid.tutor._id, user: { name: bid.tutor.name }, subjects: [], city: "Pakistan" })} className={s.btnOutline}
                          style={{ fontSize: 12, padding: "6px 12px", textDecoration: "none",
                            display: "inline-flex", border: "1.5px solid #e5e7eb",
                            borderRadius: 8, color: "#374151", fontWeight: 500 }}>
                          View Profile
                        </Link>
                        {bid.profile?.demoVideoStatus === "approved" && bid.profile.videoIntro && (
                          <a href={bid.profile.videoIntro} target="_blank" rel="noopener noreferrer" className={s.btnOutline}>
                            <Video size={14} aria-hidden="true" /> Watch Demo
                          </a>
                        )}
                        {["pending", "submitted", "viewed", "countered"].includes(bid.status) && (<>
                          <button
                            onClick={() => acceptBid(bid._id)}
                            disabled={accepting === bid._id}
                            className={s.btnSuccess}
                          >
                            {accepting === bid._id ? "Accepting…" : "Accept Offer"}
                          </button>
                          {request.allowCounterOffers && bid.latestSenderRole !== "student" && (bid.counterCounts?.student ?? 0) < 3 && <button type="button" onClick={() => {setCountering(bid);setCounterAmount(String(bid.amount))}} className={s.btnOutline}>Counter Offer</button>}
                          <Link href="/chat" className={s.btnOutline}>Message</Link>
                          <button type="button" onClick={() => declineOffer(bid._id)} className={s.btnOutline}>Decline</button>
                          <Link href={`/support?topic=report-tutor&offer=${bid._id}`} className={s.btnOutline}>Report</Link>
                        </>)}
                        {(bid.status as string) === "payment_pending" && (
                          <button
                            onClick={() => retryPayment(bid._id)}
                            disabled={accepting === bid._id}
                            className={s.btnSuccess}
                          >
                            {accepting === bid._id ? "Redirecting…" : "Complete Payment"}
                          </button>
                        )}
                        {!(["pending", "submitted", "viewed", "countered", "payment_pending"].includes(bid.status)) && (
                          <span className={`${s.badge} ${bid.status === "accepted" ? s.badgeAccepted : s.badgeCancelled}`}>
                            {bid.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
      {countering && <div role="dialog" aria-modal="true" aria-label="Counter offer" style={{marginTop:12,padding:14,border:"1px solid #bfdbfe",borderRadius:10,background:"#EEF5FF"}}><strong>Counter tutor offer of PKR {countering.amount.toLocaleString()}</strong><p style={{fontSize:12,color:"#64748b"}}>Student proposed PKR {countering.initialStudentRate.toLocaleString()}/{countering.pricingUnit}. Current tutor offer is PKR {countering.amount.toLocaleString()}/{countering.pricingUnit}. {counterLimitText}</p><div style={{display:"grid",gap:8}}><input aria-label="Counter amount" type="number" min="1" value={counterAmount} onChange={e=>setCounterAmount(e.target.value)} placeholder="Amount in PKR"/><textarea aria-label="Counter message" maxLength={500} value={counterMessage} onChange={e=>setCounterMessage(e.target.value)} placeholder="Optional message"/><div><button type="button" onClick={counterOffer} className={s.btnSuccess}>Send Counter Offer</button> <button type="button" onClick={()=>setCountering(null)} className={s.btnOutline}>Cancel</button></div></div></div>}

      {/* AI Matched Tutors Drawer Modal */}
      {showMatchedTutors && (
        <MatchedTutorsModal
          isOpen={showMatchedTutors}
          onClose={() => setShowMatchedTutors(false)}
          requestId={request._id}
          subject={request.subject}
          teachingMode={request.teachingMode}
          budget={request.budget}
        />
      )}

      {/* Offer Comparison Modal */}
      {showCompare && (
        <OfferComparisonModal
          offers={bids}
          selected={selectedBids}
          onClose={() => setShowCompare(false)}
          onAccept={async (id) => {
            setAcceptingCompare(id);
            try {
              const res = await axiosInstance.post(`/offers/${id}/accept`);
              const checkoutUrl = res.data?.checkoutUrl;
              if (checkoutUrl) {
                window.location.assign(checkoutUrl);
              }
            } catch (err) {
              console.error("Failed to accept bid:", err);
            } finally {
              setAcceptingCompare(null);
            }
          }}
          acceptingId={acceptingCompare}
        />
      )}
    </div>
  );
}

// ─── Student Dashboard ────────────────────────────────────────────────────────

type Tab = "requests" | "bookings" | "favourites";

interface Props {
  userName: string;
  userAvatar?: string;
}

export default function StudentDashboard({ userName, userAvatar }: Props) {
  const [tab, setTab]                   = useState<Tab>("requests");
  const [requests, setRequests]         = useState<DashRequest[]>([]);
  const [bookings, setBookings]         = useState<DashBooking[]>([]);
  const [loadingR, setLoadingR]         = useState(true);
  const [loadingB, setLoadingB]         = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [favourites, setFavourites]     = useState<TutorProfile[]>([]);
  const [loadingF, setLoadingF]         = useState(false);
  const [bookingsHasMore, setBookingsHasMore] = useState(false);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [loadingMoreBookings, setLoadingMoreBookings] = useState(false);
  const [requestFilter, setRequestFilter] = useState<"active" | "expired" | "all">("active");

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "requests" || requestedTab === "bookings" || requestedTab === "favourites") {
      setTab(requestedTab);
    }
  }, []);

  const fetchFavourites = useCallback(async () => {
    setLoadingF(true);
    try {
      const res = await axiosInstance.get("/students/favourites");
      setFavourites(res.data.tutors ?? []);
    } catch { setFavourites([]); }
    finally { setLoadingF(false); }
  }, []);

  // Lazy load on tab switch
  useEffect(() => {
    if (tab === "favourites" && favourites.length === 0) fetchFavourites();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

const fetchRequests = useCallback(async () => {
  setLoadingR(true);
  try {
    const res = await axiosInstance.get("/requests/my");
    setRequests(res.data.requests ?? []);
  } catch { setRequests([]); }
  finally { setLoadingR(false); }
}, []);

  const fetchBookings = useCallback(async () => {
    setLoadingB(true);
    try {
      const res = await axiosInstance.get("/bookings");
      setBookings(res.data.bookings ?? []);
      setBookingsHasMore(res.data.pagination ? res.data.pagination.page < res.data.pagination.pages : false);
      setBookingsPage(1);
    } catch { setBookings([]); }
    finally { setLoadingB(false); }
  }, []);

  const loadMoreBookings = async () => {
    if (loadingMoreBookings) return;
    setLoadingMoreBookings(true);
    try {
      const nextPage = bookingsPage + 1;
      const res = await axiosInstance.get(`/bookings?page=${nextPage}`);
      setBookings(prev => [...prev, ...(res.data.bookings ?? [])]);
      setBookingsHasMore(res.data.pagination.page < res.data.pagination.pages);
      setBookingsPage(nextPage);
    } catch (err) {
      console.error("Failed to load more bookings:", err);
    } finally {
      setLoadingMoreBookings(false);
    }
  };

  useEffect(() => { fetchRequests(); fetchBookings(); }, [fetchRequests, fetchBookings]);

  const now = useCurrentTime();
  const activeRequests = requests.filter(r => !r.isExpired && r.status !== "expired" && (!r.expiresAt || !now || new Date(r.expiresAt).getTime() > now));
  const expiredRequests = requests.filter(r => r.isExpired || r.status === "expired" || Boolean(r.expiresAt && now > 0 && new Date(r.expiresAt).getTime() <= now));
  const displayedRequests = requestFilter === "active" ? activeRequests : requestFilter === "expired" ? expiredRequests : requests;

  const openCount     = activeRequests.length;
  const upcomingCount = bookings.filter((b) => b.status === "upcoming").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  return (
    <>
      {/* Header */}
      <div className={s.header} style={{ background: "linear-gradient(135deg, #021550 0%, #0329b2 100%)", color: "white", padding: "2rem 1.5rem", borderRadius: "1rem", marginBottom: "1.5rem" }}>
        <div className={s.headerInner} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.25rem" }}>
          <div className={s.headerLeft} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div className={s.avatar} style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, border: "2px solid rgba(255,255,255,0.4)" }}>
              {userAvatar ? <Image src={userAvatar} alt={userName} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}  width={100} height={100} unoptimized/> : userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#08bffc", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Student Marketplace Dashboard
              </span>
              <h1 className={s.greeting} style={{ color: "white", fontSize: "1.5rem", fontWeight: 800, margin: "0.2rem 0" }}>
                Need a Tutor, {userName.split(" ")[0]}?
              </h1>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>
                Post what you need with your budget. Matched verified tutors will send offers to you.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", width: "100%", maxWidth: 420 }}>
            <button className={s.btnCyan} onClick={() => setShowModal(true)} style={{ flex: "1 1 180px", minHeight: 48 }}>
              + Post Tuition Request
            </button>
            <Link href="/tutors" className={s.btnGhost} style={{ flex: "1 1 140px", minHeight: 48 }}>
              Browse Tutors
            </Link>
          </div>
        </div>
      </div>

      <div className={s.content}>
        {/* Stats */}
        <div className={s.stats}>
          <div className={s.statCard}>
            <div className={s.statIcon} style={{ background: "rgba(37,99,235,0.1)" }}>
              <svg width={22} height={22} viewBox="0 0 20 20" fill="#0329B2" aria-hidden="true">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className={s.statValue}>{requests.length}</div>
              <div className={s.statLabel}>Total Requests</div>
            </div>
          </div>

          <div className={s.statCard}>
            <div className={s.statIcon} style={{ background: "rgba(16,185,129,0.1)" }}>
              <svg width={22} height={22} viewBox="0 0 20 20" fill="#10b981" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className={s.statValue}>{openCount}</div>
              <div className={s.statLabel}>Open Requests</div>
            </div>
          </div>

          <div className={s.statCard}>
            <div className={s.statIcon} style={{ background: "rgba(245,158,11,0.1)" }}>
              <svg width={22} height={22} viewBox="0 0 20 20" fill="#d97706" aria-hidden="true">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
            <div>
              <div className={s.statValue}>{upcomingCount}</div>
              <div className={s.statLabel}>Upcoming Sessions</div>
            </div>
          </div>

          <div className={s.statCard}>
            <div className={s.statIcon} style={{ background: "rgba(107,114,128,0.1)" }}>
              <svg width={22} height={22} viewBox="0 0 20 20" fill="#6b7280" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <div className={s.statValue}>{completedCount}</div>
              <div className={s.statLabel}>Completed Sessions</div>
            </div>
          </div>
        </div>

        {/* Waiting Offers Urgency Banner */}
        {requests.some(r => Boolean(r.bid || r.status === "receiving_offers" || r.status === "negotiating" || (r as any).bids?.length)) && (
          <div 
            style={{
              background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
              border: "1.5px solid #6ee7b7",
              borderRadius: "0.875rem",
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.08)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>⚡</span>
              <div>
                <strong style={{ color: "#065f46", fontSize: "0.98rem", display: "block" }}>
                  Verified Tutors Have Responded to Your Tuition Request!
                </strong>
                <span style={{ color: "#047857", fontSize: "0.82rem" }}>
                  You have active tutor offers awaiting your decision. Compare rates, qualifications, and background verification.
                </span>
              </div>
            </div>
            <button
              onClick={() => setTab("requests")}
              style={{
                background: "#059669",
                color: "white",
                border: "none",
                padding: "0.6rem 1.25rem",
                borderRadius: "0.5rem",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)"
              }}
            >
              Review Offers Now →
            </button>
          </div>
        )}

        {/* Tabs */}
        <nav aria-label="Dashboard sections" className={s.tabs}>
        <button
          onClick={() => setTab("requests")}
          aria-current={tab === "requests" ? "true" : undefined}
          className={`${s.tab} ${tab === "requests" ? s.tabActive : ""}`}
        >
          My Requests
        </button>

        <button
          onClick={() => setTab("bookings")}
          aria-current={tab === "bookings" ? "true" : undefined}
          className={`${s.tab} ${tab === "bookings" ? s.tabActive : ""}`}
        >
          My Bookings
        </button>
        <button
          onClick={() => setTab("favourites")}
          aria-current={tab === "favourites" ? "true" : undefined}
          className={`${s.tab} ${tab === "favourites" ? s.tabActive : ""}`}
        >
          ❤️ Saved Tutors {favourites.length > 0 && `(${favourites.length})`}
        </button>
        <Link href="/offers" className={s.tab}>Tutor Offers & Negotiations</Link>
        <Link href="/chat" className={s.tab}>Messages</Link>
        <Link href="/transactions" className={s.tab}>Payments</Link>
        <Link href="/notifications" className={s.tab}>Notifications</Link>
        <Link href="/settings" className={s.tab}>Settings</Link>
        </nav>

        {/* Tab: My Requests */}
        {tab === "requests" && (
          <section aria-label="My tuition requests">
            <div className={s.sectionHeader} style={{ alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 className={s.sectionTitle} style={{ margin: 0 }}>My Tuition Requests</h2>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setRequestFilter("active")}
                    style={{
                      padding: "0.35rem 0.85rem",
                      borderRadius: "999px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: requestFilter === "active" ? "#0329b2" : "#e2e8f0",
                      color: requestFilter === "active" ? "white" : "#475569",
                      transition: "all 0.2s",
                    }}
                  >
                    Active Demand ({activeRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestFilter("expired")}
                    style={{
                      padding: "0.35rem 0.85rem",
                      borderRadius: "999px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: requestFilter === "expired" ? "#dc2626" : "#e2e8f0",
                      color: requestFilter === "expired" ? "white" : "#475569",
                      transition: "all 0.2s",
                    }}
                  >
                    Expired ({expiredRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestFilter("all")}
                    style={{
                      padding: "0.35rem 0.85rem",
                      borderRadius: "999px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: requestFilter === "all" ? "#0f172a" : "#e2e8f0",
                      color: requestFilter === "all" ? "white" : "#475569",
                      transition: "all 0.2s",
                    }}
                  >
                    All ({requests.length})
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(true)} className={s.btnPrimary}>
                + New Request
              </button>
            </div>

            {loadingR ? (
              <div className={s.spinner} />
            ) : displayedRequests.length === 0 ? (
              <div className={s.empty}>
                <div className={s.emptyIcon}>📋</div>
                <p className={s.emptyTitle}>
                  {requestFilter === "expired" ? "No expired requests" : requestFilter === "active" ? "No active requests seeking tutors" : "No requests yet"}
                </p>
                <p className={s.emptyDesc}>
                  {requestFilter === "expired"
                    ? "Requests stay active for 7 days. When expired, you can review past offers and easily repost anytime."
                    : "Post your tuition requirement with budget and schedule. Matched verified tutors will send proposals to you."}
                </p>
                <button type="button" onClick={() => setShowModal(true)} className={s.btnPrimary}>
                  Post a Request
                </button>
              </div>
            ) : (
              displayedRequests.map((r) => (
                <RequestCard
                  key={r._id}
                  request={r}
                  onRefresh={fetchRequests}
                  onBidAccepted={() => {
                    fetchRequests();
                    fetchBookings();
                  }}
                />
              ))
            )}
          </section>
        )}

        {/* Tab: My Bookings */}
        {tab === "bookings" && (
          <section aria-label="My bookings">
            <div className={s.sectionHeader}>
              <h2 className={s.sectionTitle}>My Bookings</h2>
            </div>

            {loadingB ? (
              <div className={s.spinner} />
            ) : bookings.length === 0 ? (
              <div className={s.empty}>
                <div className={s.emptyIcon}>📅</div>
                <p className={s.emptyTitle}>No bookings yet</p>
                <p className={s.emptyDesc}>Accept a tutor offer from your requests to create a booking.</p>
              </div>
            ) : (
              <>
                {bookings.map((b) => <BookingCard key={b._id} booking={b} onClaimSubmitted={fetchBookings} />)}
                {bookingsHasMore && (
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button type="button" onClick={loadMoreBookings} disabled={loadingMoreBookings}
                      style={{ padding: '0.65rem 1.5rem', backgroundColor: 'white', color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: loadingMoreBookings ? 'not-allowed' : 'pointer' }}>
                      {loadingMoreBookings ? "Loading..." : "Load More Bookings"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Tab: Saved Tutors */}
        {tab === "favourites" && (
          <section aria-label="Saved tutors">
            <div className={s.sectionHeader}>
              <h2 className={s.sectionTitle}>Saved Tutors</h2>
            </div>

            {loadingF ? (
              <div className={s.spinner} />
            ) : favourites.length === 0 ? (
              <div className={s.empty}>
                <div className={s.emptyIcon}>❤️</div>
                <p className={s.emptyTitle}>No saved tutors yet</p>
                <p className={s.emptyDesc}>Browse tutors and tap the heart icon to save your favourites here.</p>
                <Link href="/tutors" className={s.btnPrimary} style={{ textDecoration: 'none' }}>
                  Browse Tutors
                </Link>
              </div>
            ) : (
              favourites.map((t) => (
                <SavedTutorCard
                  key={t._id}
                  tutor={t}
                  onRemove={(id) => setFavourites(prev => prev.filter(f => f._id !== id))}
                />
              ))
            )}
          </section>
        )}
      </div>

      {showModal && (
        <PostRequestModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchRequests}
        />
      )}
    </>
  );
}
