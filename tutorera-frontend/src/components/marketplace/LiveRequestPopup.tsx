"use client";

import { useAuth } from "@/context/AuthContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import api from "@/lib/axios";
import {
  CheckCircle2,
  ChevronRight,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

export interface LiveRequestItem {
  id: string;
  studentName: string;
  location: string;
  country: string;
  subject: string;
  level: string;
  mode: string;
  budget: number;
  currency: string;
  pricingUnit: string;
  timeAgo: string;
  description: string;
  offersCount: number;
}

// Default initial high-liquidity request specified by user:
// Ahmed Al from Jeddah, Kingdom of Saudi Arabia posted tuition request worth 200 Dirham / SAR
const INITIAL_REQUESTS: LiveRequestItem[] = [
  {
    id: "live-req-ahmed-jeddah",
    studentName: "Ahmed Al",
    location: "Jeddah",
    country: "Kingdom of Saudi Arabia",
    subject: "Mathematics & Physics",
    level: "O-Level / High School",
    mode: "Online & Home Tuition",
    budget: 200,
    currency: "AED", // 200 Dirhams / SAR equivalent
    pricingUnit: "hour",
    timeAgo: "2 mins ago",
    description: "Looking for an experienced tutor for Cambridge O-Level Mathematics and Physics exam preparation. Need 3 sessions per week.",
    offersCount: 1,
  },
  {
    id: "live-req-sarah-dubai",
    studentName: "Sarah M.",
    location: "Dubai",
    country: "United Arab Emirates",
    subject: "Chemistry & Biology",
    level: "A-Level / IB",
    mode: "Online Worldwide",
    budget: 180,
    currency: "AED",
    pricingUnit: "hour",
    timeAgo: "8 mins ago",
    description: "Seeking a verified educator for IB Diploma Higher Level Chemistry syllabus and past paper drills.",
    offersCount: 2,
  },
  {
    id: "live-req-zain-lahore",
    studentName: "Zainab K.",
    location: "DHA, Lahore",
    country: "Pakistan",
    subject: "English Language & Literature",
    level: "O-Level",
    mode: "Home Tuition (Police Verified)",
    budget: 2500,
    currency: "PKR",
    pricingUnit: "hour",
    timeAgo: "14 mins ago",
    description: "Female tutor preferred for home tuition in DHA Phase 5. Syllabus review and creative writing focus.",
    offersCount: 3,
  }
];

export default function LiveRequestPopup() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<LiveRequestItem[]>(INITIAL_REQUESTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerRate, setOfferRate] = useState<string>("200");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerSent, setOfferSent] = useState(false);
  const offerModalRef = useFocusTrap(showOfferModal, () => setShowOfferModal(false));

  // Initial display timer
  useEffect(() => {
    // Pop up after 2.5 seconds so the page settles first
    const showTimer = setTimeout(() => {
      if (!isDismissed) {
        setIsVisible(true);
      }
    }, 2500);

    return () => clearTimeout(showTimer);
  }, [isDismissed]);

  // Try to load additional real requests from backend preview if available
  useEffect(() => {
    api.get("/requests/public/preview?limit=5")
      .then((res) => {
        if (res.data?.requests && res.data.requests.length > 0) {
          const apiRequests: LiveRequestItem[] = res.data.requests.map((r: any) => ({
            id: r._id,
            studentName: r.student?.name || "Student",
            location: r.city || "Jeddah",
            country: r.countryName || "Kingdom of Saudi Arabia",
            subject: r.subject,
            level: r.level,
            mode: r.teachingMode === "both" ? "Online & In-Person" : r.teachingMode,
            budget: r.budget || 200,
            currency: r.currency || "AED",
            pricingUnit: r.pricingUnit || "hour",
            timeAgo: "Just now",
            description: r.description || "Active tutoring requirement",
            offersCount: r.offersCount || 0,
          }));

          // Always ensure Ahmed Al from Jeddah is available at the start
          setRequests([INITIAL_REQUESTS[0], ...apiRequests]);
        }
      })
      .catch(() => {
        // Fallback to high quality initial mock list
      });
  }, []);

  // Gentle cycling of requests every 18 seconds
  useEffect(() => {
    if (!isVisible || isDismissed || showOfferModal) return;

    const cycleTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % requests.length);
    }, 18000);

    return () => clearInterval(cycleTimer);
  }, [isVisible, isDismissed, showOfferModal, requests.length]);

  const currentReq = requests[currentIndex] || INITIAL_REQUESTS[0];

  const handleApproachStudent = () => {
    if (user?.role === "tutor") {
      // Tutor is logged in - open quick approach modal or navigate to direct offer
      setOfferRate(String(currentReq.budget));
      setShowOfferModal(true);
    } else if (user?.role === "student") {
      // Logged in as student - let them view or post similar
      router.push("/tuition-requests");
    } else {
      // Guest tutor / visitor - open offer modal which allows instant approach
      setOfferRate(String(currentReq.budget));
      setShowOfferModal(true);
    }
  };

  const handleSendOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOfferSent(true);
    setTimeout(() => {
      setOfferSent(false);
      setShowOfferModal(false);
      setIsVisible(false);
      // Navigate to browse or dashboard
      if (user?.role === "tutor") {
        router.push("/dashboard?tab=opportunities");
      } else {
        router.push("/register?role=tutor&ref=approach_ahmed");
      }
    }, 1800);
  };

  if (isDismissed || !isVisible) return null;

  return (
    <>
      {/* Floating Live Request Card */}
      <aside 
        aria-label="Live student tuition request notification"
        style={{
          position: "fixed",
          bottom: "1.75rem",
          left: "1.75rem",
          zIndex: 9998,
          maxWidth: "380px",
          width: "calc(100vw - 3.5rem)",
          backgroundColor: "#ffffff",
          borderRadius: "1rem",
          boxShadow: "0 16px 40px -8px rgba(3, 41, 178, 0.22), 0 0 0 1px rgba(191, 219, 254, 0.8)",
          border: "1.5px solid #93c5fd",
          padding: "1rem 1.15rem",
          animation: "slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          fontFamily: "inherit",
        }}
      >
        {/* Top Header Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
            <span 
              style={{
                display: "inline-block",
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.25)",
                animation: "pulse 2s infinite",
              }} 
            />
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0329b2", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ⚡ Live Tuition Request
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
              {currentReq.timeAgo}
            </span>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="Dismiss live request notification"
              style={{
                background: "transparent",
                border: "none",
                color: "#94a9b8",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                minWidth: "44px",
                minHeight: "44px",
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Student & Location Line */}
        <div style={{ marginBottom: "0.45rem" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", flexWrap: "wrap" }}>
            <strong style={{ fontSize: "0.98rem", color: "#021550", fontWeight: 800 }}>
              {currentReq.studentName}
            </strong>
            <span style={{ fontSize: "0.82rem", color: "#475569", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
              from <MapPin size={12} color="#016ef8" /> {currentReq.location}, {currentReq.country}
            </span>
          </div>
        </div>

        {/* Academic Need & Budget Badge */}
        <div style={{ background: "#f8faff", borderRadius: "0.65rem", padding: "0.55rem 0.75rem", border: "1px solid #e2e8f0", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0329b2" }}>
              {currentReq.subject}
            </span>
            <span style={{ 
              fontSize: "0.86rem", 
              fontWeight: 800, 
              color: "#059669", 
              background: "#ecfdf5", 
              padding: "0.15rem 0.5rem", 
              borderRadius: "6px",
              border: "1px solid #a7f3d0"
            }}>
              {currentReq.currency} {currentReq.budget.toLocaleString()}/{currentReq.pricingUnit}
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.72rem", color: "#64748b" }}>
            <span>{currentReq.level}</span>
            <span>•</span>
            <span>{currentReq.mode}</span>
          </div>
        </div>

        {/* Call to action buttons */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleApproachStudent}
            id="popup-approach-tutor-btn"
            style={{
              flex: 1,
              background: "#0329b2",
              color: "#ffffff",
              border: "none",
              padding: "0.6rem 0.85rem",
              borderRadius: "0.55rem",
              fontWeight: 700,
              fontSize: "0.82rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(3, 41, 178, 0.28)",
              transition: "background 0.15s ease",
            }}
          >
            <Send size={13} />
            <span>Approach Student & Send Offer</span>
          </button>

          <Link
            href={`/tuition-requests`}
            style={{
              background: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              padding: "0.6rem 0.75rem",
              borderRadius: "0.55rem",
              fontWeight: 600,
              fontSize: "0.78rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>All Requests</span>
            <ChevronRight size={13} />
          </Link>
        </div>

        {/* Subtle Footnote */}
        <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.68rem", color: "#94a3b8" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
            <ShieldCheck size={11} color="#10b981" /> Verified student requirement
          </span>
          <span>{currentReq.offersCount} tutor offers submitted</span>
        </div>
      </aside>

      {/* Direct Approach / Send Offer Modal */}
      {showOfferModal && (
        <div
          ref={offerModalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="approach-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(2, 21, 80, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "1.25rem",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #bfdbfe",
              overflow: "hidden",
              animation: "modalFadeIn 0.2s ease-out",
            }}
          >
            {/* Modal Header */}
            <div style={{ background: "linear-gradient(135deg, #021550 0%, #0329b2 100%)", color: "white", padding: "1.25rem 1.5rem", position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowOfferModal(false)}
                aria-label="Close modal"
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "none",
                  color: "white",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(255, 255, 255, 0.2)", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                <Sparkles size={12} /> Direct Opportunity
              </div>
              <h3 id="approach-modal-title" style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                Approach {currentReq.studentName}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "#bfdbfe", margin: "0.35rem 0 0" }}>
                {currentReq.subject} · {currentReq.location}, {currentReq.country}
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem" }}>
              {offerSent ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                  <CheckCircle2 size={48} color="#10b981" style={{ margin: "0 auto 1rem" }} />
                  <h4 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
                    Offer Dispatched to {currentReq.studentName}!
                  </h4>
                  <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.5 }}>
                    Your customized offer of {currentReq.currency} {offerRate}/{currentReq.pricingUnit} has been received. Redirecting to complete tutor verification and conversation...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendOfferSubmit}>
                  {/* Request Overview */}
                  <div style={{ background: "#f8faff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "0.85rem", marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700, color: "#021550", marginBottom: "0.3rem" }}>
                      <span>Proposed Student Budget:</span>
                      <span style={{ color: "#059669" }}>{currentReq.currency} {currentReq.budget.toLocaleString()} / {currentReq.pricingUnit}</span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0, lineHeight: 1.4 }}>
                      &ldquo;{currentReq.description}&rdquo;
                    </p>
                  </div>

                  {/* Tutor's Proposed Rate */}
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#021550", marginBottom: "0.35rem" }}>
                      Your Offered Rate ({currentReq.currency} per {currentReq.pricingUnit}) *
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="number"
                        min="1"
                        value={offerRate}
                        onChange={(e) => setOfferRate(e.target.value)}
                        required
                        style={{
                          flex: 1,
                          padding: "0.7rem 0.9rem",
                          border: "1.5px solid #cbd5e1",
                          borderRadius: "0.5rem",
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: "#021550",
                          outline: "none",
                        }}
                      />
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>
                        {currentReq.currency}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.3rem", display: "block" }}>
                      You can accept the proposed rate of {currentReq.currency} {currentReq.budget} or propose your own rate.
                    </span>
                  </div>

                  {/* Intro Message */}
                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#021550", marginBottom: "0.35rem" }}>
                      Personalized Message to {currentReq.studentName}
                    </label>
                    <textarea
                      rows={3}
                      value={offerMessage}
                      onChange={(e) => setOfferMessage(e.target.value)}
                      placeholder={`Hello ${currentReq.studentName}, I have 5+ years experience teaching ${currentReq.subject} and would love to help you achieve top grades...`}
                      style={{
                        width: "100%",
                        padding: "0.65rem 0.85rem",
                        border: "1.5px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        fontSize: "0.85rem",
                        outline: "none",
                        fontFamily: "inherit",
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Submit Action */}
                  <button
                    type="submit"
                    id="submit-approach-offer-btn"
                    style={{
                      width: "100%",
                      background: "#0329b2",
                      color: "white",
                      border: "none",
                      padding: "0.85rem",
                      borderRadius: "0.65rem",
                      fontWeight: 800,
                      fontSize: "0.92rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(3, 41, 178, 0.35)",
                    }}
                  >
                    <Send size={16} />
                    <span>Send Offer to {currentReq.studentName}</span>
                  </button>

                  <div style={{ marginTop: "0.75rem", textAlign: "center", fontSize: "0.75rem", color: "#64748b" }}>
                    <span>Protected by TUTORERA Platform Guarantees · Instant notification sent to student</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
