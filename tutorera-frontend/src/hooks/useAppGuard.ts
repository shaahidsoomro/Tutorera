// hooks/useAppGuard.ts
"use client";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

type GuardStatus = "loading" | "ok" | "blocked";

/**
 * Guards pages meant for logged-in students, parents, and tutors (not admins).
 * - Logged-out visitors → redirected to /login
 * - Admins → redirected away (not meant for admin pages)
 * - Students → allowed through immediately
 * - Parents → allowed through immediately
 * - Tutors → must be a fully verified tutor; pending/rejected are redirected to /dashboard
 * - Network/API errors while checking tutor status → fail closed (blocked), not silently approved
 */
export function useAppGuard() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [status, setStatus] = useState<GuardStatus>("loading");

    useEffect(() => {
        if (loading) return;

        if (!user) {
        router.replace("/login");
        return;
        }

        if (user.role === "admin") {
        router.replace("/admin");
        return;
        }

        if (user.role === "student" || user.role === "parent") {
        setStatus("ok");
        return;
        }

        if (user.role === "tutor") {
        setStatus("loading");
        api.get("/tracking/application-status", { timeout: 8000 })
            .then(res => {
            const eligible = res.data?.payload?.marketplaceEligibility?.eligible;
            if (eligible) {
                setStatus("ok");
            } else {
                setStatus("blocked");
                router.replace("/dashboard");
            }
            })
            .catch(() => {
            setStatus("blocked");
            router.replace("/dashboard");
            });
        return;
        }

        // Any other/unknown role (e.g. "pending" role from Google sign-up flow) — block.
        setStatus("blocked");
        router.replace("/select-role");
    }, [user, loading, router]);

    return status;
}
