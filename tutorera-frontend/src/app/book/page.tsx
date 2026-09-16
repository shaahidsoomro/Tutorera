"use client";
// app/book/page.tsx
// Rebooking page - pre-fills DirectBookingModal with tutor info from query params

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import DirectBookingModal from "@/components/Dashboard/DirectBookingModal";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axios";
import { useRouter,useSearchParams } from "next/navigation";
import { Suspense,useEffect,useState } from "react";

interface TutorDetails {
  _id: string;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  hourlyRate: number;
  currency: string;
  subjects: string[];
  teachingMode: "online" | "in-person" | "both";
  city: string;
}

function LoadingScreen() {
  return (
    <DashboardLayout>
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#F5F7FF",
        gap: 16,
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: "3px solid #e5e7eb",
          borderTopColor: "#0329B2",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
          Loading booking...
        </p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </DashboardLayout>
  );
}

function BookPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tutor, setTutor] = useState<TutorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const tutorId = searchParams.get("tutor");
  const subject = searchParams.get("subject") || "";
  const level = searchParams.get("level") || "";

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.replace("/login?redirect=/book");
      return;
    }

    if (!tutorId) {
      setError("No tutor specified for booking.");
      setLoading(false);
      return;
    }

    async function fetchTutor() {
      try {
        const res = await axiosInstance.get(`/tutors/${tutorId}`);
        const tutorData = res.data?.tutor || res.data;
        if (!tutorData) {
          setError("Tutor not found.");
        } else {
          setTutor(tutorData);
          setShowModal(true);
        }
      } catch (err) {
        console.error("Failed to fetch tutor:", err);
        setError("Unable to load tutor details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchTutor();
  }, [tutorId, user, authLoading, router]);

  const handleSuccess = () => {
    router.push("/dashboard?tab=requests");
  };

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <DashboardLayout>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5F7FF",
          padding: "2rem",
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "1.25rem",
            border: "1px solid #fecaca",
            padding: "2.5rem 2rem",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              width: 72,
              height: 72,
              backgroundColor: "#fef2f2",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "2rem",
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#021550", marginBottom: "0.75rem" }}>
              Unable to Load Booking
            </h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              {error}
            </p>
            <button
              onClick={() => router.back()}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#0329B2",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!tutor) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout>
      {showModal && tutor && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}>
          <DirectBookingModal
            tutorId={tutor._id}
            tutorUserId={tutor.user._id}
            tutorName={tutor.user.name}
            hourlyRate={tutor.hourlyRate}
            currency={tutor.currency || "PKR"}
            tutorSubjects={tutor.subjects}
            tutorTeachingMode={tutor.teachingMode}
            tutorCity={tutor.city}
            initialSubject={subject}
            initialLevel={level}
            onClose={() => router.back()}
            onSuccess={handleSuccess}
          />
        </div>
      )}
    </DashboardLayout>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <BookPageContent />
    </Suspense>
  );
}
