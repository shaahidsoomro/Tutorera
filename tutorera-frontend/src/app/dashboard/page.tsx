"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import ParentDashboard from "@/components/Dashboard/ParentDashboard";
import StudentDashboard from "@/components/Dashboard/StudentDashboard";
import TutorDashboard from "@/components/Dashboard/TutorDashboard";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { SUPPORT_EMAIL } from "@/lib/site";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <DashboardLayout>
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#F5F7FF",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid #e5e7eb",
          borderTopColor: "#0329B2",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
        Loading your dashboard…
      </p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
    </DashboardLayout>
  );
}

// ─── Pending approval screen ──────────────────────────────────────────────────

function PendingApprovalScreen() {
  return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F7FF", padding: "2rem" }}>
        <div style={{ backgroundColor: "white", borderRadius: "1.25rem", border: "1px solid #e5e7eb", padding: "3rem 2.5rem", maxWidth: "500px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

          {/* Icon */}
          <div style={{ width: 72, height: 72, backgroundColor: "#fffbeb", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", fontSize: "2rem" }}>
            ⏳
          </div>

          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#021550", marginBottom: "0.75rem" }}>
            Profile Under Review
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "2rem" }}>
            Your tutor profile has been submitted and is currently being reviewed by our team.
            This typically takes <strong>24–48 hours</strong>. You'll receive an email notification once approved.
          </p>

          {/* Steps */}
          <div style={{ backgroundColor: "#F5F7FF", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "2rem", textAlign: "left" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#021550", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>What happens next?</p>
            {[
              { icon: "✅", text: "Profile submitted successfully" },
              { icon: "🔍", text: "Admin reviews your documents (24–48 hrs)", active: true },
              { icon: "📧", text: "You receive an approval email" },
              { icon: "🚀", text: "Full dashboard access unlocked" },
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", borderBottom: i < 3 ? "1px solid #e5e7eb" : "none" }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{step.icon}</span>
                <span style={{ fontSize: "0.85rem", color: step.active ? "#021550" : "#6b7280", fontWeight: step.active ? 600 : 400 }}>
                  {step.text}
                </span>
                {step.active && (
                  <span style={{ marginLeft: "auto", backgroundColor: "#fffbeb", color: "#d97706", fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", flexShrink: 0 }}>
                    In Progress
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.75rem" }}>
            <Link
              href="/tutor/application-status"
              style={{
                padding: "0.75rem 1.25rem",
                backgroundColor: "#0329B2",
                color: "white",
                borderRadius: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              🔍 Track Application Status
            </Link>
            <Link
              href="/onboarding/tutor"
              style={{
                padding: "0.75rem 1.25rem",
                backgroundColor: "white",
                color: "#021550",
                border: "1.5px solid #cbd5e1",
                borderRadius: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              ✏️ Correct Info / Documents
            </Link>
          </div>

          <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
            Questions? Contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#0329B2", fontWeight: 600 }}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
  );
}

// ─── Rejected screen ──────────────────────────────────────────────────────────

function RejectedScreen({ reason }: { reason?: string }) {
   const router = useRouter();
   return (
       <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F7FF", padding: "2rem" }}>
         <div style={{ backgroundColor: "white", borderRadius: "1.25rem", border: "1px solid #fecaca", padding: "3rem 2.5rem", maxWidth: "520px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

           <div style={{ width: 72, height: 72, backgroundColor: "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", fontSize: "2rem" }}>
             ❌
           </div>

           <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#021550", marginBottom: "0.75rem" }}>
             Action Required: Profile Not Approved
           </h2>
           <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
             One or more submitted documents or details need correction. Review the admin note below and re-submit your documents.
           </p>

           {/* Rejection reason from admin */}
           {reason && (
             <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.75rem", padding: "1rem", marginBottom: "1.5rem", textAlign: "left" }}>
               <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ef4444", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reason from admin:</p>
               <p style={{ fontSize: "0.875rem", color: "#b91c1c", lineHeight: 1.6, margin: 0 }}>{reason}</p>
             </div>
           )}

           <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
             <button
               onClick={() => router.push("/onboarding/tutor")}
               style={{ padding: "0.75rem 1.5rem", backgroundColor: "#0329b2", color: "white", border: "none", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
               Fix & Re-submit Documents
             </button>
             <button
               onClick={() => router.push("/tutor/application-status")}
               style={{ padding: "0.75rem 1.25rem", backgroundColor: "white", color: "#021550", border: "1.5px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
               View Status Details
             </button>
             <a href={`mailto:${SUPPORT_EMAIL}`}
               style={{ padding: "0.75rem 1.25rem", backgroundColor: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
               Contact Support
             </a>
           </div>
         </div>
       </div>
   );
 }

 // ─── Error screen ─────────────────────────────────────────────────────────────

 function ErrorScreen({ message }: { message?: string }) {
   return (
       <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F7FF", padding: "2rem" }}>
         <div style={{ backgroundColor: "white", borderRadius: "1.25rem", border: "1px solid #fecaca", padding: "3rem 2.5rem", maxWidth: "500px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

           <div style={{ width: 72, height: 72, backgroundColor: "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", fontSize: "2rem" }}>
             ⚠️
           </div>

           <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#021550", marginBottom: "0.75rem" }}>
             Unable to Load Status
           </h2>
           <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
             {message || "We couldn't load your verification status. Please check your connection and try again."}
           </p>

           <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
             <a href={`mailto:${SUPPORT_EMAIL}`}
               style={{ padding: "0.75rem 1.5rem", backgroundColor: "#021550", color: "white", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none" }}>
               Contact Support
             </a>
             <button
               onClick={() => window.location.reload()}
               style={{ padding: "0.75rem 1.5rem", backgroundColor: "white", color: "#021550", border: "1.5px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
               Retry
             </button>
           </div>
         </div>
       </div>
   );
 }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && user?.role === "pending") {
      router.replace("/select-role");
    }
    if (!loading && user?.role === "admin") {
      router.replace("/admin");
    }
    if (!loading && user?.role === "parent") {
      // Parent goes directly to dashboard — no verification gate needed
    }
  }, [user, loading, router]);

   // For tutors: fetch verification status
  useEffect(() => {
    if (!user || user.role !== "tutor") return;

    const fetchStatus = async () => {
      setCheckingStatus(true);
      try {
        const res = await api.get("/tracking/application-status");
        const payload = res.data?.payload;
        const eligible = payload?.marketplaceEligibility?.eligible;
        const canonicalStatus = payload?.canonicalStatus;
        setVerificationStatus(eligible ? "approved" : (canonicalStatus === "REJECTED" || canonicalStatus === "SUSPENDED" ? "rejected" : "pending"));
        setRejectionReason(payload?.marketplaceEligibility?.reasonIfBlocked || payload?.actionRequired?.body || "");
      } catch {
        setVerificationStatus("error");
        setRejectionReason("Unable to load verification status. Please try again later or contact support.");
      } finally {
        setCheckingStatus(false);
      }
    };

    fetchStatus();
  }, [user]);

  // Show loading while auth or status check is in progress
  if (loading || !user || user.role === "pending" || user.role === "admin" || (user.role === "tutor" && (checkingStatus || verificationStatus === null))) {
    return <LoadingScreen />;
  }

   // Tutor-specific verification gates
   if (user.role === "tutor") {
     if (verificationStatus === "pending") {
       return <PendingApprovalScreen />;
     }
     if (verificationStatus === "rejected") {
       return <RejectedScreen reason={rejectionReason} />;
     }
     if (verificationStatus === "error") {
       return <ErrorScreen message={rejectionReason} />;
     }
   }

   // Approved tutor or student — show dashboard
  if (user.role === "tutor") {
    return (
      <DashboardLayout>
        <TutorDashboard
          userId={user._id}
          userName={user.name}
          userAvatar={user.avatar}
        />
      </DashboardLayout>
    );
  }

  if (user.role === "parent") {
    return (
      <DashboardLayout>
        <ParentDashboard userId={user._id} userName={user.name} userAvatar={user.avatar} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <StudentDashboard
        userName={user.name}
        userAvatar={user.avatar}
      />
    </DashboardLayout>
  );
}
