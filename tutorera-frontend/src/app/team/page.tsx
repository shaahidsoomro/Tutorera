import { UI_COLORS } from "@/lib/brand";
import { BRAND_NAME,LEGAL_OPERATOR,SUPPORT_EMAIL } from "@/lib/site";
import { BookOpen,GraduationCap,Mail,ShieldCheck,Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Team | TUTORERA by MENTISERA",
  description: "Meet the TUTORERA by MENTISERA leadership and engineering team behind the global student-led tutoring marketplace.",
  alternates: { canonical: "/team" },
};

const C = UI_COLORS;

const productHighlights = [
  "Student-led request and tutor-offer marketplace",
  "Tutor discovery, comparison, booking, and messaging flows",
  "Payment-readiness, audit trails, and operational dashboards",
  "Accessibility-minded frontend and structured marketplace UX",
];

export default function TeamPage() {
  return (
    <main style={{ backgroundColor: "white", minHeight: "100vh" }}>
      <section style={{ background: "radial-gradient(circle at top right, rgba(37,99,235,0.22), transparent 28rem), #111827", padding: "5rem 1.5rem", textAlign: "center" }}>
        <div style={{ maxWidth: 840, margin: "0 auto" }}>
          <p style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#93c5fd", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.82rem", marginBottom: "1rem" }}>
            <ShieldCheck size={18} aria-hidden="true" /> Operated by {LEGAL_OPERATOR}
          </p>
          <h1 style={{ color: "white", fontSize: "clamp(2.25rem, 5vw, 4rem)", lineHeight: 1, letterSpacing: "-0.05em", fontWeight: 900, margin: 0 }}>
            Meet the team behind TUTORERA
          </h1>
          <p style={{ color: "#cbd5e1", fontSize: "1.05rem", lineHeight: 1.8, maxWidth: 720, margin: "1.25rem auto 0" }}>
            {BRAND_NAME} is built by an education-focused team combining classroom insight, marketplace operations, and full-stack product engineering.
          </p>
        </div>
      </section>

      <section style={{ padding: "5rem 1.5rem", backgroundColor: C.gray50 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", alignItems: "stretch" }}>
          <article style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "1.25rem", padding: "2rem", boxShadow: "0 14px 38px rgba(17,24,39,0.06)" }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg, #0329B2, #7c3aed)", display: "grid", placeItems: "center", color: "white", fontSize: "1.5rem", fontWeight: 900, marginBottom: "1.25rem" }} aria-hidden="true">
              SN
            </div>
            <p style={{ color: C.accent, fontSize: "0.78rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.45rem" }}>Chief Executive Officer</p>
            <h2 style={{ color: C.primary, fontSize: "1.55rem", fontWeight: 850, marginBottom: "0.75rem" }}>Miss Saba Noor</h2>
            <p style={{ color: C.gray500, lineHeight: 1.75 }}>
              Saba Noor leads TUTORERA&apos;s education vision and marketplace direction. She is an educator and EdTech leader focused on making tutoring transparent, structured, and accessible for students and parents worldwide and locally.
            </p>
            <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
              {["Education strategy", "Tutor quality", "Student success", "EdTech leadership"].map((item) => (
                <span key={item} style={{ backgroundColor: C.accentLight, color: C.accent, borderRadius: 999, padding: "0.45rem 0.7rem", fontSize: "0.78rem", fontWeight: 750 }}>{item}</span>
              ))}
            </div>
          </article>

          <article style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "1.25rem", padding: "2rem", boxShadow: "0 14px 38px rgba(17,24,39,0.06)" }}>
            <Image src="https://res.cloudinary.com/dtoy2m9rj/image/upload/v1788291272/tutorera/avatars/zjvbipsvq8uvqappbkaz.jpg" alt="Haroon Arshad" width={88} height={88} unoptimized style={{ borderRadius: "50%", objectFit: "cover", marginBottom: "1.25rem" }} />
            <p style={{ color: C.accent, fontSize: "0.78rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.45rem" }}>Full-Stack Developer</p>
            <h2 style={{ color: C.primary, fontSize: "1.55rem", fontWeight: 850, marginBottom: "0.75rem" }}>Haroon Arshad</h2>
            <p style={{ color: C.gray500, lineHeight: 1.75 }}>
              Haroon Arshad works on the TUTORERA product platform, including the marketplace frontend, backend APIs, booking and offer flows, dashboards, real-time features, and deployment infrastructure.
            </p>
            <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
              <a href="https://github.com/haroonarsh" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontWeight: 750, textDecoration: "none" }}>GitHub</a>
              <a href="https://www.linkedin.com/in/haroon-arshad-web-developer" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontWeight: 750, textDecoration: "none" }}>LinkedIn</a>
            </div>
          </article>
        </div>
      </section>

      <section style={{ padding: "5rem 1.5rem", backgroundColor: "white" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <p style={{ color: C.accent, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.8rem" }}>What the team is building</p>
            <h2 style={{ color: C.primary, fontSize: "clamp(1.8rem, 4vw, 2.7rem)", fontWeight: 900, letterSpacing: "-0.04em", margin: "0.5rem 0" }}>
              A clearer tutoring marketplace for families and tutors
            </h2>
            <p style={{ color: C.gray500, lineHeight: 1.75, maxWidth: 720, margin: "0 auto" }}>
              The team combines education operations, product design, engineering, and support so students can post requirements, tutors can respond with offers, and bookings remain documented from price agreement through delivery.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            {productHighlights.map((item, index) => (
              <article key={item} style={{ border: "1px solid #e5e7eb", borderRadius: "1rem", padding: "1.25rem", backgroundColor: C.gray50 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", backgroundColor: C.accentLight, color: C.accent, marginBottom: "0.85rem" }}>
                  {index === 0 ? <GraduationCap size={21} /> : index === 1 ? <BookOpen size={21} /> : index === 2 ? <ShieldCheck size={21} /> : <Sparkles size={21} />}
                </div>
                <p style={{ color: C.primary, fontWeight: 750, lineHeight: 1.55 }}>{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "4rem 1.5rem", backgroundColor: C.primary, textAlign: "center" }}>
        <h2 style={{ color: "white", fontSize: "2rem", fontWeight: 850, marginBottom: "0.75rem" }}>Want to contact the team?</h2>
        <p style={{ color: "#cbd5e1", marginBottom: "1.5rem" }}>For student, tutor, partnership, support, or product queries, use the official TUTORERA support channel.</p>
        <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: C.accent, color: "white", borderRadius: 999, padding: "0.9rem 1.35rem", fontWeight: 800, textDecoration: "none" }}>
          <Mail size={18} /> Contact {SUPPORT_EMAIL}
        </Link>
      </section>
    </main>
  );
}
