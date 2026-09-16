import MarketplaceFlow from "@/components/marketplace/MarketplaceFlow";
import OfferComparisonDemo from "@/components/marketplace/OfferComparisonDemo";
import QuickRequestComposer from "@/components/marketplace/QuickRequestComposer";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Students | Post Requirements & Receive Tutor Offers | TUTORERA",
  description: "Students and parents set their tuition requirement and proposed budget. Verified tutors respond with transparent offers. Compare, negotiate, and book with zero platform fees.",
  alternates: { canonical: "/students" },
};

export default function StudentsLandingPage() {
  return (
    <div style={{ backgroundColor: "white", minHeight: "100vh" }}>
      {/* Hero Section */}
      <section style={{ background: "linear-gradient(135deg, #021550 0%, #0329b2 100%)", color: "white", padding: "5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(255, 255, 255, 0.15)", padding: "0.3rem 0.85rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, marginBottom: "1.25rem" }}>
            <Sparkles size={14} color="#60a5fa" /> Student-Led Tutoring Demand
          </div>
          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.25rem)", fontWeight: 900, lineHeight: 1.15, marginBottom: "1.25rem", letterSpacing: "-0.02em" }}>
            Tell Us What You Need. <br />
            <span style={{ color: "#60a5fa" }}>Let the Right Tutors Come to You.</span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#bfdbfe", maxWidth: 680, margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
            Stop wasting hours calling unverified tutors. Specify your subject, schedule, learning mode, and preferred budget. Verified tutors submit customized offers directly to you.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/post-tuition-request"
              id="student-landing-post-btn"
              style={{
                background: "white",
                color: "#0329b2",
                padding: "0.95rem 2rem",
                borderRadius: "0.75rem",
                fontWeight: 800,
                fontSize: "1rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25)",
              }}
            >
              <span>Post My Tuition Request</span>
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/tuition-requests"
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                color: "white",
                border: "1.5px solid rgba(255, 255, 255, 0.3)",
                padding: "0.95rem 1.75rem",
                borderRadius: "0.75rem",
                fontWeight: 700,
                fontSize: "0.95rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Browse Active Requests
            </Link>
          </div>
        </div>
      </section>

      {/* Embedded Request Composer */}
      <section style={{ maxWidth: 1120, margin: "-2rem auto 4rem", padding: "0 1.5rem", position: "relative", zIndex: 10 }}>
        <QuickRequestComposer />
      </section>

      {/* 4 Pillars for Students */}
      <section style={{ padding: "4rem 1.5rem", background: "#f8faff" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 3rem" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#021550", marginBottom: "0.75rem" }}>
              Why Students & Parents Choose TUTORERA
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
              Built from the ground up to give learners total control, safety, and price transparency.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <DollarSign size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
                You Decide the Budget
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6 }}>
                Propose what you are comfortable paying in your local currency. Tutors either accept your proposed rate or submit transparent counter-offers.
              </p>
            </div>

            <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", color: "#0329b2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
                Verified Educators
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6 }}>
                Every tutor undergoes manual degree screening and identity checks. In-person home tutors must hold an approved Police Verification Report.
              </p>
            </div>

            <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fdf4ff", color: "#c81b7f", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <CheckCircle2 size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
                0% Student Platform Fee
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6 }}>
                Posting tuition requests, receiving tutor offers, comparing credentials, and messaging tutors is 100% free for students and parents.
              </p>
            </div>

            <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fff7ed", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <Clock size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
                First-Session Guarantee
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6 }}>
                Your payment is protected safely under TUTORERA guarantees and is only settled after your lesson is conducted successfully.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Offer Comparison Demo */}
      <OfferComparisonDemo />

      {/* How it Works */}
      <MarketplaceFlow />

      {/* Final Call to Action */}
      <section style={{ padding: "4rem 1.5rem", background: "white", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#021550", marginBottom: "1rem" }}>
            Ready to Find Your Ideal Tutor?
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.6 }}>
            Join thousands of students and parents receiving transparent, competitive tutor offers.
          </p>
          <Link
            href="/post-tuition-request"
            style={{
              background: "#0329b2",
              color: "white",
              padding: "1rem 2.25rem",
              borderRadius: "0.75rem",
              fontWeight: 800,
              fontSize: "1rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 8px 25px rgba(3, 41, 178, 0.35)",
            }}
          >
            <span>Post My Tuition Request Now</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
