"use client";

import { UI_COLORS } from "@/lib/brand";
import { Cookie,Settings } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

const C = UI_COLORS;

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("tutorera_cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const consentData = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("tutorera_cookie_consent", JSON.stringify(consentData));
    localStorage.setItem("cookie_consent", "accepted");
    setShow(false);
  };

  const handleEssentialOnly = () => {
    const consentData = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("tutorera_cookie_consent", JSON.stringify(consentData));
    localStorage.setItem("cookie_consent", "essential_only");
    setShow(false);
  };

  if (!show) return null;

  return (
    <aside
      aria-label="Cookie consent banner"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "1.5rem",
        right: "5.5rem", // clearance for floating widgets
        maxWidth: "520px",
        backgroundColor: "white",
        borderRadius: "1rem",
        padding: "1.25rem 1.5rem",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        border: "1px solid #e2e8f0",
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header & Text */}
      <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
        <div
          style={{
            backgroundColor: "#eff6ff",
            color: C.accent,
            padding: "0.5rem",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Cookie size={22} />
        </div>
        <div>
          <h3
            style={{
              fontWeight: "700",
              color: C.primary,
              fontSize: "0.95rem",
              marginBottom: "0.25rem",
            }}
          >
            Your Privacy & Cookie Choices
          </h3>
          <p style={{ color: "#4b5563", fontSize: "0.82rem", lineHeight: "1.55", margin: 0 }}>
            TUTORERA uses cookies and secure local storage to maintain authenticated sessions,
            prevent CSRF fraud, and analyze marketplace traffic in accordance with our{" "}
            <Link
              href="/cookies"
              style={{ color: C.accent, textDecoration: "underline", fontWeight: "600" }}
            >
              Cookie Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              style={{ color: C.accent, textDecoration: "underline", fontWeight: "600" }}
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleEssentialOnly}
          style={{
            flex: 1,
            minWidth: "120px",
            padding: "0.55rem 0.85rem",
            border: "1px solid #cbd5e1",
            borderRadius: "0.5rem",
            background: "#f8fafc",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: "600",
            color: "#334155",
          }}
        >
          Essential Only
        </button>

        <Link
          href="/cookies"
          onClick={() => setShow(false)}
          style={{
            padding: "0.55rem 0.85rem",
            border: "1px solid #cbd5e1",
            borderRadius: "0.5rem",
            background: "white",
            fontSize: "0.8rem",
            fontWeight: "600",
            color: "#334155",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <Settings size={14} /> Customize
        </Link>

        <button
          type="button"
          onClick={handleAcceptAll}
          style={{
            flex: 1.5,
            minWidth: "140px",
            padding: "0.55rem 1rem",
            border: "none",
            borderRadius: "0.5rem",
            backgroundColor: C.accent,
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: "white",
          }}
        >
          Accept All
        </button>
      </div>
    </aside>
  );
}