"use client";

import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft,Bell,PlusCircle,Search } from "lucide-react";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";

const ROUTE_TITLES: Record<string, string> = {
  "/tutors": "Find Verified Tutors",
  "/post-tuition-request": "Post Tuition Request",
  "/post-home-tuition-request": "Home Tuition Request",
  "/post-online-tuition-request": "Online Tuition Request",
  "/offers": "Tutor Offers",
  "/dashboard": "My Dashboard",
  "/profile": "My Profile",
  "/settings": "Account Settings",
  "/chat": "Messages",
  "/browse-requests": "Student Requests",
  "/notifications": "Notifications",
  "/pricing": "Pricing & Fees",
  "/how-it-works": "How It Works",
  "/safety": "Trust & Safety Center",
  "/legal": "Legal & Compliance",
  "/terms": "Terms of Service",
  "/privacy": "Privacy Policy",
  "/cookies": "Cookie Preferences",
  "/child-safety": "Child Safeguarding",
  "/verification-policy": "Tutor Verification",
  "/background-check-policy": "Background Screening",
  "/academic-integrity": "Academic Integrity",
  "/community-guidelines": "Community Guidelines",
  "/contact": "Support & Contact",
};

const HIDE_TOP_BAR_PATHS = [
  "/admin",
  "/login",
  "/register",
  "/onboarding",
];

export default function MobileTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const shouldHide = HIDE_TOP_BAR_PATHS.some((p) => pathname.startsWith(p));
  if (shouldHide) return null;

  const isHome = pathname === "/";
  const title = ROUTE_TITLES[pathname] || (pathname.startsWith("/tutors/") ? "Tutor Profile" : pathname.startsWith("/chat/") ? "Direct Chat" : "TUTORERA");

  return (
    <header
      className="mobile-top-bar"
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        right: 0,
        height: "3.5rem",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e2e8f0",
        display: "none",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1rem",
        zIndex: 49,
        boxShadow: "0 1px 3px rgba(2, 21, 80, 0.04)",
      }}
      aria-label="Mobile Header"
    >
      {isHome ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BrandLogo variant="light" size="sm" showByline={false} />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            style={{
              background: "none",
              border: "none",
              padding: "0.4rem",
              borderRadius: "50%",
              color: "#021550",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: "#021550",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </h1>
        </div>
      )}

      {/* Right Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {isHome ? (
          <>
            <Link
              href="/tutors"
              aria-label="Search tutors"
              style={{
                background: "#f1f5f9",
                color: "#334155",
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              <Search size={18} />
            </Link>
            <Link
              href="/post-tuition-request"
              style={{
                background: "#0329b2",
                color: "white",
                padding: "0.4rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <PlusCircle size={14} /> Post
            </Link>
          </>
        ) : (
          <>
            {user?.role && (
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "999px",
                  background: user.role === "tutor" ? "#eef2ff" : "#ecfdf5",
                  color: user.role === "tutor" ? "#4338ca" : "#059669",
                  border: user.role === "tutor" ? "1px solid #c7d2fe" : "1px solid #a7f3d0",
                }}
              >
                {user.role}
              </span>
            )}
            <Link
              href="/notifications"
              aria-label="Notifications"
              style={{
                background: "transparent",
                color: "#475569",
                padding: "0.4rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              <Bell size={19} />
            </Link>
          </>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-top-bar {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
