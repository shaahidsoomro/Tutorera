// hooks/useTutorGuard.ts
"use client";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

export function useTutorGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "approved" | "pending" | "rejected" | "not-tutor" | "error">("loading");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "tutor") {
      setStatus("not-tutor");
      return;
    }

    api.get("/tracking/application-status")
      .then(res => {
        const eligible = res.data?.payload?.marketplaceEligibility?.eligible;
        const canonical = res.data?.payload?.canonicalStatus;
        if (eligible) {
          setStatus("approved");
        } else if (canonical === "REJECTED" || canonical === "SUSPENDED") {
          setStatus(canonical === "SUSPENDED" ? "rejected" : "rejected");
        } else {
          setStatus("pending");
        }
      })
      .catch(() => {
        setStatus("error");
      });
  }, [user, loading, router]);

  useEffect(() => {
    if (status === "pending" || status === "rejected" || status === "not-tutor") {
      router.replace("/dashboard");
    }
    if (status === "error") {
    }
  }, [status, router]);

  return status;
}