"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/lib/toast";
import { ArrowLeft, Clock, Sparkles, ShieldCheck, BookOpen, MapPin, Calendar, DollarSign } from "lucide-react";
import OfferComparisonModal from "@/components/marketplace/OfferComparisonModal";

type Badge = { identityVerified?: boolean; credentialsVerified?: boolean; videoVerified?: boolean; experiencedTutor?: boolean; topPerformer?: boolean };
type TutorProfile = { averageRating?: number; totalReviews?: number; experience?: number; degreeVerificationStatus?: string; cnicVerificationStatus?: string; demoVideoStatus?: string; policeVerificationStatus?: string; homeTuitionEligible?: boolean; videoIntro?: string; badges?: Badge };
type Tutor = { _id: string; name: string; avatar?: string; city?: string; tutorProfile?: TutorProfile };
type Bid = { _id: string; amount: number; currency?: string; pricingUnit?: string; status: string; message?: string; expiresAt?: string; matchScore?: number; tutor: Tutor };
type Request = {
  _id: string; subject: string; description?: string; level?: string; city?: string; teachingMode?: string; schedule?: string; budget: number; currency?: string; pricingUnit?: string; status: string; expiresAt?: string; offersCount: number; isExpired: boolean; canExtend: boolean; canRepost: boolean; secondsRemaining: number; createdAt: string; bids?: Bid[]; student?: { name: string; avatar?: string };
};

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
      if (res.data?.checkoutUrl) {
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

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/requests/${id}`);
      setRequest(res.data.request);
    } catch (err) {
      showError(err, "Could not load request details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

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
            <button onClick={() => setShowComparison(true)} style={{ padding: "7px 14px", background: "#0329b2", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
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

      {/* Active offers */}
      {isOwner && (
        <>
          {activeBids.length > 0 ? (
            <section>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#021550", margin: "0 0 12px" }}>Active Offers ({activeBids.length})</h2>
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

      {/* Timeline link */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link href={`/requests/${id}/timeline`} style={{ fontSize: 13, color: "#64748b", fontWeight: 600, textDecoration: "underline" }}>
          View full request timeline →
        </Link>
      </div>

      {showComparison && request.bids && (
        <OfferComparisonModal
          offers={request.bids as any}
          requestId={id}
          requestCurrency={request.currency || "PKR"}
          onClose={() => setShowComparison(false)}
          onOfferAccepted={load}
        />
      )}
    </main>
  );
}
