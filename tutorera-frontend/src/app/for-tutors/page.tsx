import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  DollarSign,
  Globe,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Tutors | Find Real Student Demand & Send Offers | TUTORERA",
  description: "Join TUTORERA's global network of verified educators. Receive matched student requests, submit transparent offers, and teach online worldwide or in-person locally.",
  alternates: { canonical: "/for-tutors" },
};

export default function ForTutorsPage() {
  return (
    <div style={{ backgroundColor: "white", minHeight: "100vh" }}>
      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #021550 0%, #0329b2 100%)", color: "white", padding: "5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(255, 255, 255, 0.15)", padding: "0.3rem 0.85rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, marginBottom: "1.25rem" }}>
            <Sparkles size={14} color="#60a5fa" /> Real Student Demand Marketplace
          </div>
          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.25rem)", fontWeight: 900, lineHeight: 1.15, marginBottom: "1.25rem", letterSpacing: "-0.02em" }}>
            Find Real Students Looking for Tutors. <br />
            <span style={{ color: "#60a5fa" }}>No Cold Calling. Send Transparent Offers.</span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#bfdbfe", maxWidth: 660, margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
            Browse active student tuition requests across subjects and curricula. Accept the student&apos;s proposed budget or submit your own custom offer. Teach online worldwide or home tuition locally.
          </p>
          <div style={{ display: "inline-flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "1.5rem" }} aria-label="Tutor marketplace economics">
            {["No lead fees", "No bidding credits", "No coins to contact students"].map((item) => (
              <span key={item} style={{ background: "rgba(8, 191, 252, 0.16)", border: "1px solid rgba(191, 219, 254, 0.45)", color: "white", borderRadius: 999, padding: "0.45rem 0.8rem", fontSize: "0.82rem", fontWeight: 800 }}>
                {item}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/register?role=tutor"
              id="join-tutor-btn"
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
              <span>Join as a Verified Tutor</span>
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
              Browse Open Student Requests
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Pillars for Tutors */}
      <section style={{ padding: "4.5rem 1.5rem", background: "#f8faff" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 3rem" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#021550", marginBottom: "0.75rem" }}>
              How Tutors Grow on TUTORERA
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
              A high-liquidity marketplace designed to bring active students directly to your fingertips.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", color: "#0329b2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <Briefcase size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
                1. Matched Demand Opportunities
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6 }}>
                Our Smart Matching Engine scores your qualifications, subjects, and availability against incoming student requirements so you see high-probability opportunities first.
              </p>
            </div>

            <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <DollarSign size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
                2. Transparent Offer Negotiation
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6 }}>
                You are never asked to buy leads or bidding credits. If a student&apos;s proposed budget is too low, send a counter-offer with your rate and personalized value proposition.
              </p>
            </div>

            <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
                3. Guaranteed Platform Payouts
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6 }}>
                Payment status, booking records, and payout eligibility are tracked in the platform so finance exceptions can be handled with clear records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Online vs Home Tuition Teaching Modes */}
      <section style={{ padding: "4rem 1.5rem", background: "white" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>
              Teach Online or In-Person
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
              Clear standards and verification criteria tailored to your chosen teaching format.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            <div style={{ background: "#f8faff", padding: "1.5rem", borderRadius: "1rem", border: "1.5px solid #bfdbfe" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#0329b2", fontWeight: 800, marginBottom: "0.75rem" }}>
                <Globe size={18} /> Online Tutoring Worldwide
              </div>
              <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5, margin: "0 0 1rem" }}>
                Teach students across Saudi Arabia, UAE, UK, US, and Pakistan from home. Requires verified university degree and identity screening.
              </p>
              <div style={{ fontSize: "0.78rem", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <CheckCircle2 size={14} /> No Police Certificate Required
              </div>
            </div>

            <div style={{ background: "#f8faff", padding: "1.5rem", borderRadius: "1rem", border: "1.5px solid #cbd5e1" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#021550", fontWeight: 800, marginBottom: "0.75rem" }}>
                <ShieldCheck size={18} color="#10b981" /> Home Tuition (In-Person)
              </div>
              <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5, margin: "0 0 1rem" }}>
                Provide in-person tutoring at the student&apos;s home in your neighborhood or city. Earn premium local rates.
              </p>
              <div style={{ fontSize: "0.78rem", color: "#d97706", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <ShieldCheck size={14} /> Mandatory Approved Police Clearance Certificate
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section style={{ padding: "4rem 1.5rem", background: "#f8faff", textAlign: "center", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 650, margin: "0 auto" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#021550", marginBottom: "1rem" }}>
            Ready to Start Receiving Student Requests?
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "2rem" }}>
            Apply to become a verified educator and browse live student demand today.
          </p>
          <Link
            href="/register?role=tutor"
            style={{
              background: "#0329b2",
              color: "white",
              padding: "0.95rem 2.25rem",
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
            <span>Create Tutor Profile Now</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
