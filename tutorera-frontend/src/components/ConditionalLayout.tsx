"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import MobileBottomNav from "./marketplace/MobileBottomNav";
import MobileTopBar from "./marketplace/MobileTopBar";
import StickyPostRequestCTA from "./marketplace/StickyPostRequestCTA";
import Navbar from "./Navbar";

const HIDE_NAVBAR_AND_FOOTER = [
  "/onboarding",
  "/chat",
  "/earnings",
  "/dashboard",
  "/settings",
  "/notifications",
  "/profile",
  "/admin",
  "/login",
  "/register",
  "/support",
];

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideDesktopNavAndFooter = HIDE_NAVBAR_AND_FOOTER.some((path) =>
    pathname.startsWith(path)
  );

  const isDashboardPage = pathname.startsWith("/dashboard");
  const isChatRoom = pathname.startsWith("/chat/") && pathname !== "/chat";

  if (hideDesktopNavAndFooter) {
    return (
      <>
        {/* On non-dashboard authenticated screens, provide MobileTopBar for context & back navigation */}
        {!isDashboardPage && !pathname.startsWith("/admin") && <MobileTopBar />}
        <main id="main-content" className={isChatRoom ? "" : "has-bottom-nav"}>
          {children}
        </main>
        <MobileBottomNav />
      </>
    );
  }

  return (
    <>
      <MobileTopBar />
      <Navbar />
      <main id="main-content" className="has-bottom-nav" style={{ minHeight: "80vh" }}>
        {children}
      </main>
      <Footer />
      <StickyPostRequestCTA />
      <MobileBottomNav />
    </>
  );
}
