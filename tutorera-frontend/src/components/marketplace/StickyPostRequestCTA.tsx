"use client";

import { useAuth } from "@/context/AuthContext";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDE_ON_PATHS = [
  "/login",
  "/register",
  "/post-tuition-request",
  "/post-home-tuition-request",
  "/post-online-tuition-request",
  "/admin",
  "/payment",
  "/settings"
];

export default function StickyPostRequestCTA() {
  const pathname = usePathname();
  const { user } = useAuth();

  const shouldHide = HIDE_ON_PATHS.some((p) => pathname.startsWith(p)) || user?.role === "tutor";

  if (shouldHide) return null;

  return (
    <div
      className="mobile-sticky-cta"
      style={{
        position: "fixed",
        bottom: "4.5rem",
        right: "1rem",
        zIndex: 40,
        display: "none"
      }}
    >
      <Link
        href="/post-tuition-request"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "#0329b2",
          color: "white",
          padding: "0.75rem 1.25rem",
          borderRadius: "999px",
          fontWeight: 800,
          fontSize: "0.85rem",
          boxShadow: "0 8px 24px rgba(3, 41, 178, 0.4)",
          textDecoration: "none",
          border: "1.5px solid rgba(255, 255, 255, 0.25)"
        }}
      >
        <PlusCircle size={18} />
        <span>Post Tuition Request</span>
      </Link>

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-sticky-cta {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
