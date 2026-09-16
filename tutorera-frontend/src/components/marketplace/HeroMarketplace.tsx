import Link from "next/link";
import { ArrowRight, BadgeCheck, CheckCircle, Sparkles, ShieldCheck } from "lucide-react";
import QuickRequestComposer from "./QuickRequestComposer";
import AskTutoreraInput from "./AskTutoreraInput";

export default function HeroMarketplace() {
  return (
    <section
      style={{
        position: "relative",
        background: "radial-gradient(circle at 50% 0%, #eef5ff 0%, #f8faff 50%, #ffffff 100%)",
        padding: "clamp(2rem, 5vw, 3.5rem) 1rem 2.5rem",
        borderBottom: "1px solid #e2e8f0",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: "clamp(1.5rem, 4vw, 2.5rem)",
            alignItems: "center",
            marginBottom: "2.5rem",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "#eef5ff",
                border: "1px solid #bfdbfe",
                padding: "0.3rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.72rem",
                fontWeight: 800,
                color: "#0329b2",
                marginBottom: "1rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <BadgeCheck size={15} /> A Global Student-Led Tutoring Marketplace
            </div>

            <h1
              style={{
                fontSize: "clamp(1.85rem, 4.5vw, 3rem)",
                fontWeight: 900,
                color: "#021550",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                marginBottom: "1rem",
              }}
            >
              You Set the Requirement. <br />
              <span style={{ color: "#016ef8" }}>Tutors Make Offers. You Choose.</span>
            </h1>

            <p
              style={{
                fontSize: "clamp(0.92rem, 2vw, 1.05rem)",
                color: "#475569",
                lineHeight: 1.6,
                marginBottom: "1.5rem",
                maxWidth: 540,
              }}
            >
              Post your subject, learning mode, schedule, and preferred budget. TUTORERA matches your requirement with suitable tutors who can accept your rate or send an offer. Compare, negotiate, and choose with confidence.
            </p>

            <div style={{ marginBottom: "1.25rem" }}>
              <Link
                href="/first-session-guarantee"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "999px",
                  backgroundColor: "#ecfdf5",
                  border: "1.5px solid #a7f3d0",
                  color: "#065f46",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
              >
                <ShieldCheck size={16} color="#10b981" />
                <span>
                  <strong>First-session protection:</strong> replacement, credit, or refund review where eligible
                </span>
                <ArrowRight size={13} color="#059669" />
              </Link>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: "1.25rem",
              }}
            >
              <Link
                href="/post-tuition-request"
                id="hero-post-request-btn"
                style={{
                  background: "#0329b2",
                  color: "white",
                  padding: "0.95rem 1.85rem",
                  borderRadius: "0.75rem",
                  fontWeight: 800,
                  fontSize: "1rem",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  textDecoration: "none",
                  boxShadow: "0 10px 28px rgba(3, 41, 178, 0.4)",
                  minHeight: "50px",
                  flex: "1 1 auto",
                  maxWidth: "320px",
                  transition: "transform 0.15s ease, background 0.15s ease",
                }}
              >
                <span>Post My Tuition Request</span>
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/tutors"
                style={{
                  background: "white",
                  color: "#021550",
                  padding: "0.95rem 1.5rem",
                  borderRadius: "0.75rem",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  border: "1.5px solid #cbd5e1",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "50px",
                  flex: "1 1 auto",
                  maxWidth: "240px",
                }}
              >
                Browse Tutors
              </Link>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <Link
                href="/tuition-requests"
                style={{
                  color: "#64748b",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                Prefer browsing? Browse Tuition Requests →
              </Link>
            </div>

            <p style={{ margin: "0 0 1.25rem", color: "#021550", fontSize: "0.9rem", fontWeight: 800 }}>
              Budget bhi aap ka. Time bhi aap ka. Tutor bhi aap ki choice.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                fontSize: "0.82rem",
                color: "#64748b",
              }}
            >
              <Link
                href="/how-tutor-offers-work"
                style={{
                  color: "#0329b2",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <Sparkles size={15} color="#016ef8" /> How Tutor Offers Work →
              </Link>
              <span>•</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <CheckCircle size={15} color="#10b981" /> 0% student marketplace fee
              </span>
            </div>
          </div>

          <div>
            <div
              style={{
                background: "white",
                borderRadius: "1.25rem",
                padding: "clamp(1.25rem, 3vw, 1.75rem)",
                border: "1.5px solid #bfdbfe",
                boxShadow: "0 12px 36px rgba(1, 110, 248, 0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ background: "#ecfdf5", color: "#059669", padding: "0.25rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 800 }}>
                  STUDENT-LED DEMAND MARKETPLACE
                </span>
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
                You Decide the Budget. Tutors Compete for You.
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: "1.5", margin: "0 0 1rem 0" }}>
                Unlike traditional agencies, on TUTORERA students and parents propose their preferred rate. Eligible matching tutors can accept or counter transparently.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.78rem" }}>
                <div style={{ background: "#f8fafc", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                  <strong style={{ display: "block", color: "#021550" }}>Home Tuition</strong>
                  <span style={{ color: "#64748b" }}>Eligible local tutors where enabled</span>
                </div>
                <div style={{ background: "#f8fafc", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                  <strong style={{ display: "block", color: "#021550" }}>Online Tuition</strong>
                  <span style={{ color: "#64748b" }}>Worldwide 1-on-1 tutor discovery</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: "0.85rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.78rem",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#166534", fontWeight: 700 }}>
                  <ShieldCheck size={15} color="#16a34a" /> First-session protection where eligible
                </span>
                <Link href="/first-session-guarantee" style={{ color: "#0329b2", fontWeight: 700, textDecoration: "none" }}>
                  Policy details →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <AskTutoreraInput />
        </div>

        <QuickRequestComposer />
      </div>
    </section>
  );
}
