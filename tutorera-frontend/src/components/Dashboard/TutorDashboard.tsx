"use client";
import Image from "next/image";
import { UI_COLORS } from "@/lib/brand";
// components/dashboard/TutorDashboard.tsx
import s from "@/app/dashboard/dashboard.module.css";
import MatchScoreBadge from "@/components/marketplace/MatchScoreBadge";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import axiosInstance from "@/lib/axios";
import { formatPKR } from "@/lib/site";
import { showError,showSuccess } from "@/lib/toast";
import { DashBooking,DashDirectRequest,DashRequest,RankedRequestMatch,TutorProfileData } from "@/types/dashboard";
import { AuthenticatedTrackingPayload } from "@/types/tracking";
import { Calculator,Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback,useEffect,useState } from "react";
import AvailabilityManager from "./AvailabilityManager";
import CommissionCalculator from "./CommissionCalculator";
import PlaceBidModal from "./PlaceBidModal";
import RatingModal from "./RatingModal";

const C = UI_COLORS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    upcoming: s.badgeUpcoming, ongoing: s.badgeOngoing,
    completed: s.badgeCompleted, cancelled: s.badgeCancelled,
    open: s.badgeOpen, closed: s.badgeClosed,
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

function TutorApplicationStatusCard() {
  const [data, setData] = useState<AuthenticatedTrackingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosInstance.get("/tracking/application-status");
        if (!cancelled) setData(res.data.payload);
      } catch {
        if (!cancelled) setError(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || error || !data) return null;

  const isActionRequired = data.canonicalStatus === "ACTION_REQUIRED" || data.canonicalStatus === "RE_VERIFICATION_REQUIRED" || data.actionRequired != null;
  const isSuccess = data.canonicalStatus === "APPROVED_FOR_MARKETPLACE" || data.canonicalStatus === "HOME_TUITION_ELIGIBLE";
  const isDanger = data.canonicalStatus === "REJECTED" || data.canonicalStatus === "SUSPENDED";
  const cardClass = `${s.dashboardCard || ""} ${isActionRequired ? s.dashboardCardWarning || "" : isDanger ? s.dashboardCardDanger || "" : isSuccess ? s.dashboardCardSuccess || "" : ""}`.trim();

  return (
    <div className={cardClass} style={{
      background: isActionRequired ? "linear-gradient(135deg, #b45309 0%, #d97706 100%)" :
                  isDanger ? "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)" :
                  isSuccess ? "linear-gradient(135deg, #065f46 0%, #16a34a 100%)" :
                  "linear-gradient(135deg, #021550 0%, #0329B2 100%)",
      color: "#fff",
      borderRadius: 16,
      padding: "18px 20px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 800, color: "rgba(255,255,255,0.7)", margin: "0 0 4px" }}>My tutor application</p>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#fff" }}>{data.canonicalStatusLabel}</h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", margin: "4px 0 0" }}>
            Application ID: <strong>{data.applicationId}</strong> · Last updated {new Date(data.lastUpdatedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div style={{ minWidth: 120, textAlign: "right" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", margin: 0 }}>Verification</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>{data.progress.percent}%</p>
          <div style={{ height: 6, background: "rgba(255,255,255,0.18)", borderRadius: 999, overflow: "hidden", marginTop: 4 }}>
            <div style={{ width: `${data.progress.percent}%`, height: "100%", background: "rgba(255,255,255,0.85)" }} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <Link href="/tutor/application-status" style={{
          background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)",
          borderRadius: 999, padding: "8px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none",
        }}>Track Application →</Link>
        {isActionRequired && (
          <Link href={data.actionRequired?.cta.href || "/onboarding/tutor"} style={{
            background: "#fff", color: "#b45309", borderRadius: 999, padding: "8px 14px", fontSize: 12, fontWeight: 700, textDecoration: "none",
          }}>Complete Verification →</Link>
        )}
      </div>
    </div>
  );
}


// ─── Booking Card (tutor perspective) ────────────────────────────────────────

function BookingCard({ booking }: { booking: DashBooking }) {
  const [creatingChat, setCreatingChat] = useState(false);
  const [showStudentRatingModal, setShowStudentRatingModal] = useState(false);
  const [studentRated, setStudentRated] = useState(false);
  const router = useRouter();

  const handleRateStudent = async (rating: number, comment: string) => {
    try {
      await axiosInstance.post("/reviews/student-ratings", {
        studentId: booking.student._id,
        bookingId: booking._id,
        rating,
        comment,
      });
      setStudentRated(true);
      setShowStudentRatingModal(false);
      showSuccess("Rating submitted successfully");
    } catch (err) {
      showError(err, "Failed to submit rating. Please try again.");
    }
  };

  const handleChatClick = async () => {
  setCreatingChat(true);
  try {
    const res = await axiosInstance.post("/chat/conversation", {
      bookingId: booking._id,
    });
    const conversationId = res.data.conversation._id;
    router.push(`/chat/${conversationId}`);
  } catch (err) {
    console.error("Failed to create conversation:", err);
    showError(err, "Failed to open chat. Please try again.");
  } finally {
    setCreatingChat(false);
  }
};

  return (
    <>
    <div className={s.card}>
      <div className={s.cardHeader}>
        <div className={s.personRow} style={{ margin: 0 }}>
          <div className={s.personAvatar}>
            {booking.student.avatar
              ? <Image src={booking.student.avatar} alt={booking.student.name}  width={100} height={100} unoptimized/>
              : booking.student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className={s.personName}>{booking.student.name}</p>
            <p className={s.personSub}>Student</p>
          </div>
        </div>
        <span className={statusBadgeClass(booking.status)}>{booking.status}</span>
      </div>

      {/* Action buttons row */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
      <button
        onClick={handleChatClick}
        disabled={creatingChat}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1rem', backgroundColor: creatingChat ? '#e5e7eb' : '#EEF5FF',
          color: creatingChat ? '#9ca3af' : '#0329B2', borderRadius: '0.5rem',
          border: '1px solid #bfdbfe', fontSize: '0.8rem', fontWeight: '600',
          cursor: creatingChat ? 'not-allowed' : 'pointer', marginBottom: '0.5rem'
        }}>
        {creatingChat ? "Opening..." : "💬 Chat"}
      </button>

      {/* ── NEW: Need Help button ── */}
        <button type="button" className={s.btnWarning} style={{ marginBottom: '0.5rem' }} onClick={() => router.push(`/support?bookingId=${booking._id}`)}>
          🆘 Need Help?
        </button>

        {booking.status === "completed" && !studentRated && (
          <button type="button" className={s.btnPurple} onClick={() => setShowStudentRatingModal(true)}>
            ⭐ Rate Student
          </button>
        )}

        {studentRated && (
          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, padding: '0.5rem 0' }}>
            ✓ Student Rated
          </span>
        )}
      </div>
      <div className={s.infoRow} style={{ marginTop: 12 }}>
        <span className={s.infoChip}>
          <svg width={12} height={12} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
          </svg>
          PKR {(booking.finalAgreedRate||booking.amount).toLocaleString()}/{booking.pricingUnit||"hour"} · Net PKR {(booking.tutorNet||booking.amount).toLocaleString()}
        </span>
        <span className={s.infoChip}>
          <svg width={12} height={12} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          {booking.schedule}
        </span>
        <span className={s.infoChip}>{booking.teachingMode}</span>
      </div>
      <details style={{marginTop:"0.75rem",background:"#f8fafc",padding:"0.75rem",borderRadius:"0.5rem"}}><summary style={{fontWeight:700,cursor:"pointer"}}>Booking & fee summary</summary><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:10,fontSize:12}}><span>Subject: <b>{typeof booking.request==="object"?booking.request.subject:"Tutoring session"}</b></span><span>Mode: <b>{booking.teachingMode}</b></span><span>Rate: <b>PKR {(booking.finalAgreedRate||booking.amount).toLocaleString()}/{booking.pricingUnit||"hour"}</b></span><span>Sessions: <b>{booking.sessionCount||1}</b></span><span>Subtotal: <b>PKR {(booking.subtotal||booking.amount).toLocaleString()}</b></span><span>Tutor fee: <b>PKR {(booking.tutorFee||0).toLocaleString()}</b></span><span>Tax: <b>PKR {(booking.tax||0).toLocaleString()}</b></span><span>Tutor net: <b>PKR {(booking.tutorNet||booking.amount).toLocaleString()}</b></span><span>Payment: <b>{booking.paymentStatus}</b></span></div><p style={{fontSize:11,color:"#64748b",marginTop:8}}>The stored cancellation and refund policy applies to this booking.</p></details>
      <p className={s.cardMeta} style={{ marginTop: 8 }}>Booked {timeAgo(booking.createdAt)}</p>
    </div>

    {/* Rating modal rendered OUTSIDE the card div */}
      {showStudentRatingModal && (
        <RatingModal
          title={`Rate ${booking.student.name.split(' ')[0]}`}
          subtitle="How was this student? This helps us maintain platform quality."
          onSubmit={handleRateStudent}
          onClose={() => setShowStudentRatingModal(false)}
        />
      )}
    </>
  );
}

// ─── Open Request Card (for tutor to browse + bid) ────────────────────────────

function OpenRequestCard({
  request,
  onBidPlaced,
  matchScore,
  matchTier,
  matchReasons,
  matchBreakdown,
}: {
  request: DashRequest;
  onBidPlaced: () => void;
  matchScore?: number;
  matchTier?: "excellent" | "great" | "good" | "fair";
  matchReasons?: string[];
  matchBreakdown?: Record<string, number>;
}) {
  const [showBidModal, setShowBidModal] = useState(false);

  const now = useCurrentTime();
  const isExpired = request.status === "expired" || Boolean(request.expiresAt && now > 0 && new Date(request.expiresAt).getTime() <= now);
  const diffHours = request.expiresAt && now > 0 ? Math.floor((new Date(request.expiresAt).getTime() - now) / (1000 * 60 * 60)) : 0;
  const diffDays = Math.floor(diffHours / 24);
  const closingText = isExpired
    ? "⚠️ Closed"
    : now > 0
    ? diffHours < 24
      ? `⚡ Closes in ${Math.max(1, diffHours)}h`
      : `⏱️ Closes in ${diffDays}d`
    : "⏱️ Active";

  return (
    <>
      <div className={s.card}>
        <div className={s.cardHeader}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <h3 className={s.cardTitle} style={{ margin: 0 }}>{request.subject}</h3>
              {matchScore ? (
                <MatchScoreBadge
                  score={matchScore}
                  tier={matchTier}
                  reasons={matchReasons}
                  breakdown={matchBreakdown}
                  showBreakdown={true}
                />
              ) : null}
            </div>
            <div className={s.cardMeta}>
              <span>{request.level}</span>
              <span>·</span>
              <span>{request.city}</span>
              <span>·</span>
              <span>{timeAgo(request.createdAt)}</span>
              <span>·</span>
              <span
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "0.25rem",
                  backgroundColor: isExpired ? "#fef2f2" : diffHours < 24 ? "#fffbeb" : "#ecfdf5",
                  color: isExpired ? "#dc2626" : diffHours < 24 ? "#d97706" : "#059669",
                  border: `1px solid ${isExpired ? "#fecaca" : diffHours < 24 ? "#fde68a" : "#a7f3d0"}`,
                }}
              >
                {closingText}
              </span>
            </div>
          </div>
          <span className={statusBadgeClass(request.status)}>{request.status}</span>
        </div>

        <p className={s.cardDesc}>{request.description}</p>

        {matchReasons && matchReasons.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0 12px" }}>
            {matchReasons.slice(0, 3).map((r, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "#f0fdf4",
                  color: "#166534",
                  border: "1px solid #bbf7d0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                ✓ {r}
              </span>
            ))}
          </div>
        )}

        <div className={s.infoRow}>
          <span className={s.infoChip}>
            <svg width={12} height={12} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
            </svg>
            Student proposed: PKR {request.budget.toLocaleString()}/{request.pricingUnit || "hour"}
          </span>
          <span className={s.infoChip}>{request.teachingMode}</span>
          <span className={s.infoChip}>{request.schedule}</span>
          {typeof request.offersCount === "number" && (
            <span className={s.infoChip}>
              {request.offersCount === 0
                ? "🎯 No offers yet — be first!"
                : `${request.offersCount} offer${request.offersCount === 1 ? "" : "s"} already received`}
            </span>
          )}
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {isExpired ? (
            <span style={{ fontSize: "0.82rem", color: "#dc2626", fontWeight: 600, padding: "6px 10px", background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>
              This request has expired and is no longer accepting offers.
            </span>
          ) : request.bid ? (
            <Link href="/offers" className={s.btnOutline} style={{ textDecoration: "none" }}>
              Offer sent: PKR {request.bid.amount.toLocaleString()}/{request.bid.pricingUnit || "hour"} · {request.bid.status.replaceAll("_", " ")}
            </Link>
          ) : (
            <button
              onClick={() => setShowBidModal(true)}
              className={s.btnPrimary}
            >
              Send Offer
            </button>
          )}
          <span className={s.infoChip} style={{ alignSelf: "center" }}>
            Student: {request.student.name}
          </span>
        </div>
      </div>

      {showBidModal && (
        <PlaceBidModal
          request={request}
          onClose={() => setShowBidModal(false)}
          onSuccess={onBidPlaced}
        />
      )}
    </>
  );
}

// ─── Direct Booking Request Card (tutor accepts/declines, rate is fixed) ──────

function DirectRequestCard({
  request,
  onActioned,
}: {
  request: DashDirectRequest;
  onActioned: () => void;
}) {
  const [actioning, setActioning] = useState<"accept" | "reject" | null>(null);

  const handleAccept = async () => {
    if (!request.bid) return;
    setActioning("accept");
    try {
      await axiosInstance.patch(`/requests/${request._id}/bids/${request.bid._id}/accept`);
      onActioned();
      showSuccess("Direct booking accepted successfully.");
    } catch (err) {
      console.error("Failed to accept direct booking:", err);
      showError(err, "Failed to accept. Please try again.");
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async () => {
    if (!request.bid) return;
    setActioning("reject");
    try {
      await axiosInstance.patch(`/requests/${request._id}/bids/${request.bid._id}/reject`);
      onActioned();
      showSuccess("Direct booking declined.");
    } catch (err) {
      console.error("Failed to reject direct booking:", err);
      showError(err, "Failed to decline. Please try again.");
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className={s.card} style={{ borderColor: '#bfdbfe', backgroundColor: '#fafbff' }}>
      <div className={s.cardHeader}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <h3 className={s.cardTitle} style={{ margin: 0 }}>{request.subject}</h3>
            <span style={{ backgroundColor: '#EEF5FF', color: '#0329B2', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid #bfdbfe' }}>
              📩 Direct Request
            </span>
          </div>
          <div className={s.cardMeta}>
            <span>{request.level}</span>
            <span>·</span>
            <span>{request.city}</span>
            <span>·</span>
            <span>{timeAgo(request.createdAt)}</span>
          </div>
        </div>
      </div>

      <p className={s.cardDesc}>{request.description}</p>

      <div className={s.infoRow}>
        <span className={s.infoChip}>
          <svg width={12} height={12} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
          </svg>
          {formatPKR(request.budget, "hour")} <span style={{ opacity: 0.6, marginLeft: 4 }}>(your rate)</span>
        </span>
        <span className={s.infoChip}>{request.teachingMode}</span>
        <span className={s.infoChip}>{request.schedule}</span>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleAccept}
          disabled={actioning !== null}
          className={s.btnSuccess}
        >
          {actioning === "accept" ? "Accepting…" : "✓ Accept Booking"}
        </button>
        <button
          onClick={handleReject}
          disabled={actioning !== null}
          className={s.btnDanger}
        >
          {actioning === "reject" ? "Declining…" : "Decline"}
        </button>
        <span className={s.infoChip} style={{ alignSelf: "center", marginLeft: 'auto' }}>
          Student: {request.student.name}
        </span>
      </div>
    </div>
  );
}

// ─── Profile Summary ──────────────────────────────────────────────────────────

function ProfileSection({ profile }: { profile: TutorProfileData }) {
  return (
    <div>
      {/* Top card */}
      <div className={s.card} style={{ marginBottom: 16 }}>
        <div className={s.personRow}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", overflow: "hidden",
            border: "2.5px solid #e5e7eb", background: "#e5e7eb", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, color: "#0329B2",
          }}>
            {profile.user.avatar
              ? <Image src={profile.user.avatar} alt={profile.user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}  width={100} height={100} unoptimized/>
              : profile.user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 3px", fontSize: 17, fontWeight: 700, color: "#021550" }}>
              {profile.user.name}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{profile.city} · {profile.teachingMode}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: "#021550" }}>
              PKR {profile.hourlyRate.toLocaleString()}<span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>/hr</span>
            </p>
            <span className={`${s.badge} ${profile.verificationStatus === "approved" ? s.badgeApproved : s.badgePending}`}>
              {profile.verificationStatus === "approved" ? "✓ Verified" : profile.verificationStatus}
            </span>
          </div>
        </div>

        {profile.bio && (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
            {profile.bio}
          </p>
        )}

        <div style={{ marginTop: 12 }}>
          <Link href="/profile" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "1.5px solid #e5e7eb",
            fontSize: 13, fontWeight: 500, color: "#374151", textDecoration: "none",
            transition: "all 0.15s",
          }}>
            <svg width={13} height={13} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Details grid */}
      <div className={s.profileGrid}>
        <div className={s.profileCard}>
          <p className={s.profileCardTitle}>Subjects</p>
          <div className={s.tagList}>
            {profile.subjects.length > 0
              ? profile.subjects.map((sub) => <span key={sub} className={`${s.tag}`}>{sub}</span>)
              : <span style={{ fontSize: 13, color: "#9ca3af" }}>None added</span>}
          </div>
        </div>

        <div className={s.profileCard}>
          <p className={s.profileCardTitle}>Levels</p>
          <div className={s.tagList}>
            {profile.levels.length > 0
              ? profile.levels.map((lvl) => <span key={lvl} className={`${s.tag} ${s.tagGray}`}>{lvl}</span>)
              : <span style={{ fontSize: 13, color: "#9ca3af" }}>None added</span>}
          </div>
        </div>

        <div className={s.profileCard}>
          <p className={s.profileCardTitle}>Education</p>
          {profile.education.length > 0 ? profile.education.map((edu) => (
            <div key={edu._id} style={{ marginBottom: 8 }}>
              <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 600, color: "#021550" }}>{edu.degree}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{edu.institution} · {edu.year}</p>
            </div>
          )) : <span style={{ fontSize: 13, color: "#9ca3af" }}>None added</span>}
        </div>

        <div className={s.profileCard} style={{ gridColumn: '1 / -1' }}>
          <p className={s.profileCardTitle}>Availability</p>
          <AvailabilityManager />
        </div>
      </div>
    </div>
  );
}

// ─── Tutor Dashboard ──────────────────────────────────────────────────────────

type Tab = "bookings" | "recommended" | "browse" | "profile" | "calculator";

interface Props {
  userId: string;
  userName: string;
  userAvatar?: string;
}

export default function TutorDashboard({ userName, userAvatar, userId }: Props) {
  const [tab, setTab]               = useState<Tab>("bookings");
  const [bookings, setBookings]     = useState<DashBooking[]>([]);
  const [recommended, setRecommended] = useState<RankedRequestMatch[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [requests, setRequests]     = useState<DashRequest[]>([]);
  const [directRequests, setDirectRequests] = useState<DashDirectRequest[]>([]);
  const [loadingD, setLoadingD]     = useState(false);
  const [profile, setProfile]       = useState<TutorProfileData | null>(null);
  const [loadingB, setLoadingB]     = useState(true);
  const [loadingR, setLoadingR]     = useState(false);
  const [loadingP, setLoadingP]     = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);
  const [bookingsHasMore, setBookingsHasMore] = useState(false);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [loadingMoreBookings, setLoadingMoreBookings] = useState(false);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (["bookings", "recommended", "browse", "profile", "calculator"].includes(requestedTab as string)) {
      setTab(requestedTab as Tab);
    }
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

  const fetchRecommended = useCallback(async () => {
    setLoadingRec(true);
    try {
      const res = await axiosInstance.get("/matching/tutors/recommended-requests?limit=15");
      setRecommended(res.data.requests ?? []);
    } catch {
      setRecommended([]);
    } finally {
      setLoadingRec(false);
    }
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

  const fetchRequests = useCallback(async () => {
  setLoadingR(true);
  try {
    const res = await axiosInstance.get("/requests");
    setRequests(res.data.requests ?? []); // ← remove the .filter() that was here
  } catch { setRequests([]); }
  finally { setLoadingR(false); }
  }, []);

  const fetchDirectRequests = useCallback(async () => {
  setLoadingD(true);
  try {
    const res = await axiosInstance.get("/requests/direct/my");
    setDirectRequests(res.data.requests ?? []);
  } catch { setDirectRequests([]); }
  finally { setLoadingD(false); }
  }, []);

  const fetchProfile = useCallback(async () => {
  setLoadingP(true);
  try {
    const res = await axiosInstance.get("/tutors/profile/me");
    setProfile(res.data.profile ?? null);
  } catch (err) {
    console.error("Profile fetch failed:", err); // ← add this
    setProfile(null);
  } finally {
    setLoadingP(false);
  }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchProfile();
    fetchRecommended();
  }, [fetchBookings, fetchProfile, fetchRecommended]);

  // Lazy load on tab switch
  useEffect(() => {
    if (tab === "recommended" && recommended.length === 0) fetchRecommended();
    if (tab === "browse" && requests.length === 0) fetchRequests();
    if (tab === "browse") fetchDirectRequests();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcomingCount  = bookings.filter((b) => b.status === "upcoming").length;
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
                Tutor Opportunity Marketplace
              </span>
              <h1 className={s.greeting} style={{ color: "white", fontSize: "1.5rem", fontWeight: 800, margin: "0.2rem 0" }}>
                Student Requests Match Your Profile!
              </h1>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>
                Browse live student requirements, accept student proposed rates, or send transparent counter-offers.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/browse-requests" className={s.btnCyan}>
              View Matching Requests →
            </Link>
            <Link href={userId ? `/tutors/${userId}` : "/tutors"} className={s.btnGhost}>
              View Public Profile
            </Link>
          </div>
        </div>
      </div>

      <div className={s.content}>
        {/* MY TUTOR APPLICATION — live status from /tutor/application-status */}
        <TutorApplicationStatusCard />

        {/* Stats */}
        <div className={s.stats}>
          <div className={s.statCard}>
            <div className={s.statIcon} style={{ background: "rgba(37,99,235,0.1)" }}>
              <svg width={22} height={22} viewBox="0 0 20 20" fill="#0329B2" aria-hidden="true">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
            <div>
              <div className={s.statValue}>{bookings.length}</div>
              <div className={s.statLabel}>Total Bookings</div>
            </div>
          </div>

          <div className={s.statCard}>
            <div className={s.statIcon} style={{ background: "rgba(16,185,129,0.1)" }}>
              <svg width={22} height={22} viewBox="0 0 20 20" fill="#10b981" aria-hidden="true">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
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
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className={s.statValue}>{completedCount}</div>
              <div className={s.statLabel}>Completed</div>
            </div>
          </div>

          <div className={s.statCard}>
            <div className={s.statIcon} style={{ background: "rgba(245,158,11,0.1)" }}>
              <svg width={22} height={22} viewBox="0 0 20 20" fill="#d97706" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <div className={s.statValue}>{profile?.averageRating?.toFixed(1) ?? "—"}</div>
              <div className={s.statLabel}>Avg. Rating</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {/* Remove role="tablist" — just a nav landmark */}
<nav aria-label="Dashboard sections" className={s.tabs}>
  <button
    onClick={() => setTab("bookings")}
    aria-current={tab === "bookings" ? "true" : undefined}
    className={`${s.tab} ${tab === "bookings" ? s.tabActive : ""}`}
  >
    <svg width={14} height={14} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      <path d="M14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
    </svg>
    My Bookings
    {upcomingCount > 0 && (
      <span className={`${s.tabBadge} ${tab === "bookings" ? s.tabActiveBadge : ""}`}>
        {upcomingCount}
      </span>
    )}
  </button>

  <button
    onClick={() => setTab("recommended")}
    aria-current={tab === "recommended" ? "true" : undefined}
    className={`${s.tab} ${tab === "recommended" ? s.tabActive : ""}`}
    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
  >
    <Sparkles size={14} style={{ color: tab === "recommended" ? "#08bffc" : "#f59e0b" }} />
    ✨ Matched For You
    {recommended.length > 0 && (
      <span className={`${s.tabBadge} ${tab === "recommended" ? s.tabActiveBadge : ""}`} style={{ background: "#f59e0b", color: "#fff" }}>
        {recommended.length}
      </span>
    )}
  </button>

  <button
    onClick={() => setTab("browse")}
    aria-current={tab === "browse" ? "true" : undefined}
    className={`${s.tab} ${tab === "browse" ? s.tabActive : ""}`}
  >
    <svg width={14} height={14} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
    Browse Requests
  </button>

  <button
    onClick={() => setTab("profile")}
    aria-current={tab === "profile" ? "true" : undefined}
    className={`${s.tab} ${tab === "profile" ? s.tabActive : ""}`}
  >
    <svg width={14} height={14} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
    My Profile
  </button>
  <Link href="/offers" className={s.tab}>My Offers & Negotiations</Link>
  <Link href="/chat" className={s.tab}>Messages</Link>
  <Link href="/earnings" className={s.tab}>Earnings</Link>
  <button
    onClick={() => setTab("calculator")}
    aria-current={tab === "calculator" ? "true" : undefined}
    className={`${s.tab} ${tab === "calculator" ? s.tabActive : ""}`}
  >
    <Calculator size={14} />
    Rate Calculator
  </button>
  <Link href="/notifications" className={s.tab}>Notifications</Link>
  <Link href="/settings" className={s.tab}>Settings</Link>
</nav>

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
                <p className={s.emptyDesc}>Browse matching requests and send offers to get your first booking.</p>
                <button type="button" onClick={() => setTab("browse")} className={s.btnPrimary}>Browse Requests</button>
              </div>
            ) : (
              <>
                {bookings.map((b) => <BookingCard key={b._id} booking={b} />)}
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

        {/* Tab: Recommended Requests */}
        {tab === "recommended" && (
          <section aria-label="Smart matched student requests">
            <div className={s.sectionHeader}>
              <div>
                <h2 className={s.sectionTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#f59e0b" }}>✨</span>
                  Smart Matched Student Requests
                </h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                  Ranked by your subject specializations, teaching mode, location feasibility, and schedule compatibility.
                </p>
              </div>
              <button type="button" onClick={fetchRecommended} className={s.btnOutline}>↻ Refresh</button>
            </div>

            {bidSuccess && (
              <div style={{
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
                color: "#059669", borderRadius: 10, padding: "12px 16px", fontSize: 13,
                fontWeight: 500, marginBottom: 16,
              }}>
                ✓ Offer sent successfully. The student will review it shortly.
              </div>
            )}

            {loadingRec ? (
              <div className={s.spinner} />
            ) : recommended.length === 0 ? (
              <div className={s.empty}>
                <div className={s.emptyIcon}>🎯</div>
                <p className={s.emptyTitle}>No personalized matches right now</p>
                <p className={s.emptyDesc}>
                  As students post requests matching your subjects and teaching mode, they will appear here with high match scores. You can also browse all open requests.
                </p>
                <button type="button" onClick={() => setTab("browse")} className={s.btnPrimary}>Browse All Requests</button>
              </div>
            ) : (
              recommended.map((item) => (
                <OpenRequestCard
                  key={item.request._id}
                  request={item.request}
                  matchScore={item.score}
                  matchTier={item.tier}
                  matchReasons={item.reasons}
                  matchBreakdown={item.scoreBreakdown}
                  onBidPlaced={() => {
                    setBidSuccess(true);
                    fetchRecommended();
                    fetchRequests();
                    setTimeout(() => setBidSuccess(false), 5000);
                  }}
                />
              ))
            )}
          </section>
        )}

        {/* Tab: Browse Requests */}
        {tab === "browse" && (
          <section aria-label="Browse student requests">

            {/* ── Direct Booking Requests — shown first, only if any exist ── */}
            {(loadingD || directRequests.length > 0) && (
              <div style={{ marginBottom: 28 }}>
                <div className={s.sectionHeader}>
                  <h2 className={s.sectionTitle}>📩 Direct Booking Requests</h2>
                </div>
                {loadingD ? (
                  <div className={s.spinner} />
                ) : (
                  directRequests.map((r) => (
                    <DirectRequestCard
                      key={r._id}
                      request={r}
                      onActioned={() => {
                        fetchDirectRequests();
                        fetchBookings();
                      }}
                    />
                  ))
                )}
              </div>
            )}
            
            <div className={s.sectionHeader}>
              <h2 className={s.sectionTitle}>Open Student Requests</h2>
              <button type="button" onClick={fetchRequests} className={s.btnOutline}>↻ Refresh</button>
            </div>

            {bidSuccess && (
              <div style={{
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
                color: "#059669", borderRadius: 10, padding: "12px 16px", fontSize: 13,
                fontWeight: 500, marginBottom: 16,
              }}>
                ✓ Offer sent successfully. The student will review it shortly.
              </div>
            )}

            {loadingR ? (
              <div className={s.spinner} />
            ) : requests.length === 0 ? (
              <div className={s.empty}>
                <div className={s.emptyIcon}>🔍</div>
                <p className={s.emptyTitle}>No open requests right now</p>
                <p className={s.emptyDesc}>Check back later — new student requests appear here as they're posted.</p>
              </div>
            ) : (
              requests.map((r) => (
                <OpenRequestCard key={r._id} request={r} onBidPlaced={() => {
                  setBidSuccess(true);
                  fetchRequests();
                  setTimeout(() => setBidSuccess(false), 5000);
                }} />
              ))
            )}
          </section>
        )}

        {/* Tab: My Profile */}
        {tab === "profile" && (
          <section aria-label="My tutor profile">
            <div className={s.sectionHeader}>
              <h2 className={s.sectionTitle}>My Profile</h2>
            </div>
            {loadingP ? (
              <div className={s.spinner} />
            ) : !profile ? (
              <div className={s.empty}>
                <div className={s.emptyIcon}>👤</div>
                <p className={s.emptyTitle}>Profile not found</p>
                <p className={s.emptyDesc}>Complete your tutor profile to start receiving students.</p>
              </div>
            ) : (
              <ProfileSection profile={profile} />
            )}
          </section>
        )}

        {/* Tab: Rate Calculator */}
        {tab === "calculator" && (
          <section aria-label="Commission and earnings calculator">
            <div className={s.sectionHeader}>
              <div>
                <h2 className={s.sectionTitle}>Commission Calculator</h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                  See exactly what you take home after TUTORERA fees — before you accept any booking.
                </p>
              </div>
            </div>
            <CommissionCalculator />
          </section>
        )}
      </div>
    </>
  );
}
