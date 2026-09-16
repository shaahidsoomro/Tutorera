"use client";

import { useAuth } from "@/context/AuthContext";
import { Briefcase,CreditCard,Home,LayoutDashboard,LogIn,PlusCircle,Search,User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide on active chat conversation to allow bottom composer full viewport and avoid keyboard collision
  const isChatRoom = pathname.startsWith("/chat/") && pathname !== "/chat";
  const shouldHide = pathname.startsWith("/admin") || isChatRoom;

  if (shouldHide) return null;

  const role = user?.role;
  const isTutor = role === "tutor";
  const isStudent = role === "student";

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "calc(3.85rem + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid #e2e8f0",
        display: "none",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 50,
        paddingLeft: "0.5rem",
        paddingRight: "0.5rem",
        boxShadow: "0 -4px 20px rgba(2, 21, 80, 0.08)",
      }}
      aria-label="Mobile Navigation"
    >
      {isTutor ? (
        // ─── 1. TUTOR BOTTOM NAVIGATION ───
        <>
          <Link
            href="/dashboard"
            style={navItemStyle(pathname === "/dashboard")}
            aria-label="Tutor Dashboard"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/browse-requests"
            style={navItemStyle(pathname === "/browse-requests")}
            aria-label="Browse Student Requests"
          >
            <Search size={20} />
            <span>Requests</span>
          </Link>

          {/* Elevated Center Tutor Action: Browse Open Demands */}
          <Link
            href="/browse-requests"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #0329b2 0%, #016ef8 100%)",
              color: "white",
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              marginTop: "-20px",
              boxShadow: "0 8px 20px rgba(1, 110, 248, 0.45)",
              border: "3px solid white",
              textDecoration: "none",
              flexShrink: 0,
            }}
            aria-label="Explore Matching Requests"
          >
            <Briefcase size={22} />
          </Link>

          <Link
            href="/offers"
            style={navItemStyle(pathname.startsWith("/offers"))}
            aria-label="Sent Offers & Negotiations"
          >
            <CreditCard size={20} />
            <span>Offers</span>
          </Link>

          <Link
            href="/profile"
            style={navItemStyle(pathname.startsWith("/profile"))}
            aria-label="Tutor Profile"
          >
            <User size={20} />
            <span>Profile</span>
          </Link>
        </>
      ) : isStudent ? (
        // ─── 2. STUDENT BOTTOM NAVIGATION ───
        <>
          <Link
            href="/"
            style={navItemStyle(pathname === "/")}
            aria-label="Home"
          >
            <Home size={20} />
            <span>Home</span>
          </Link>

          <Link
            href="/dashboard?tab=requests"
            style={navItemStyle(pathname === "/dashboard" && pathname.includes("tab=requests"))}
            aria-label="My Tuition Requests"
          >
            <Briefcase size={20} />
            <span>My Requests</span>
          </Link>

          {/* Elevated Center Student Action: Post Tuition Request */}
          <Link
            href="/post-tuition-request"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #0329b2 0%, #016ef8 100%)",
              color: "white",
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              marginTop: "-22px",
              boxShadow: "0 8px 24px rgba(3, 41, 178, 0.45)",
              border: "3px solid white",
              textDecoration: "none",
              flexShrink: 0,
            }}
            aria-label="Post Tuition Requirement"
          >
            <PlusCircle size={26} />
          </Link>

          <Link
            href="/offers"
            style={navItemStyle(pathname.startsWith("/offers"))}
            aria-label="Tutor Offers"
          >
            <CreditCard size={20} />
            <span>Offers</span>
          </Link>

          <Link
            href="/dashboard"
            style={navItemStyle(pathname === "/dashboard")}
            aria-label="Student Profile"
          >
            <User size={20} />
            <span>Profile</span>
          </Link>
        </>
      ) : (
        // ─── 3. PUBLIC GUEST (ANONYMOUS) BOTTOM NAVIGATION ───
        <>
          <Link
            href="/"
            style={navItemStyle(pathname === "/")}
            aria-label="Home"
          >
            <Home size={20} />
            <span>Home</span>
          </Link>

          <Link
            href="/tuition-requests"
            style={navItemStyle(pathname.startsWith("/tuition-requests") || pathname.startsWith("/requests"))}
            aria-label="Tuition Requests"
          >
            <Briefcase size={20} />
            <span>Requests</span>
          </Link>

          {/* Elevated Center Action: Post Request */}
          <Link
            href="/post-tuition-request"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #0329b2 0%, #016ef8 100%)",
              color: "white",
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              marginTop: "-22px",
              boxShadow: "0 8px 24px rgba(3, 41, 178, 0.45)",
              border: "3px solid white",
              textDecoration: "none",
              flexShrink: 0,
            }}
            aria-label="Post Tuition Requirement"
          >
            <PlusCircle size={26} />
          </Link>

          <Link
            href="/tutors"
            style={navItemStyle(pathname.startsWith("/tutors"))}
            aria-label="Find Verified Tutors"
          >
            <Search size={20} />
            <span>Tutors</span>
          </Link>

          <Link
            href="/login"
            style={navItemStyle(pathname.startsWith("/login") || pathname.startsWith("/register"))}
            aria-label="Sign In"
          >
            <LogIn size={20} />
            <span>Sign In</span>
          </Link>
        </>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex !important;
          }
        }
      `}</style>
    </nav>
  );
}

function navItemStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "3px",
    color: isActive ? "#0329b2" : "#64748b",
    textDecoration: "none",
    fontSize: "0.68rem",
    fontWeight: isActive ? 800 : 500,
    minWidth: "54px",
    minHeight: "44px",
    transition: "color 0.15s ease",
  };
}
