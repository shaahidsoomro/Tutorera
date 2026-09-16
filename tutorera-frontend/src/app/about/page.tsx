import { UI_COLORS } from "@/lib/brand";
import { BUSINESS_ADDRESS,LEGAL_OPERATOR,SUPPORT_EMAIL,SUPPORT_PHONE } from "@/lib/site";
import { BookOpen,Globe2,Shield,Target,Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About TUTORERA® | Global Student-Led Tutoring Marketplace",
  description: "TUTORERA® is a global student-led demand tutoring marketplace connecting learners and verified educators worldwide and locally, operated by MENTISERA (SMC-Private) Limited.",
  alternates: { canonical: "/about" },
};

const C = UI_COLORS;

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: 'white' }}>

      {/* Hero */}
      <section style={{ backgroundColor: C.primary, padding: '5rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <BookOpen size={36} color="#60a5fa" />
            <span style={{ fontSize: '2rem', fontWeight: '800', color: 'white' }}>TUTORERA<span style={{ color: '#C81B7F' }}>®</span></span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', color: 'white', marginBottom: '1.25rem', lineHeight: '1.2' }}>
            A Global Student-Led Tutoring Marketplace
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '1.1rem', lineHeight: '1.75', maxWidth: '650px', margin: '0 auto' }}>
            TUTORERA® brings transparency, safety, and student empowerment to tutoring worldwide and locally — connecting learners with verified tutors through competitive custom offers, platform checkout, and server-side payment verification.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: C.gray50 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: C.primary, marginBottom: '1rem' }}>Our Mission</h2>
          <p style={{ color: C.gray500, fontSize: '1.05rem', lineHeight: '1.8', maxWidth: '750px', margin: '0 auto 3rem' }}>
            To replace fragmented, unverified, and opaque tutoring arrangements with a student-led, transparent demand marketplace — empowering learners and verified educators across international curricula and national education systems.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: <Target size={28} color={C.accent} />, title: "Student-Led", desc: "Post your subject, curriculum, budget, and mode (online or in-person) — let verified tutors submit offers to you." },
              { icon: <Shield size={28} color={C.accent} />, title: "Verified & Safe", desc: "Tutors undergo strict identity, degree, and mandatory background verification for home tuition." },
              { icon: <Globe2 size={28} color={C.accent} />, title: "Global & Multi-Currency", desc: "Learn worldwide or locally with transparent pricing in your local currency and secure platform protection." },
            ].map(item => (
              <div key={item.title} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>{item.icon}</div>
                <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: C.gray500, fontSize: '0.875rem', lineHeight: '1.6' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '2rem' }}>
            <Link href="/team" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent, color: 'white', padding: '0.85rem 1.5rem', borderRadius: '0.5rem', fontWeight: '700', textDecoration: 'none' }}>
              Meet the Team
            </Link>
          </div>
        </div>
      </section>

      {/* Marketplace model */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', color: C.primary, marginBottom: '0.75rem' }}>Our Student-Led Marketplace Model</h2>
            <p style={{ color: C.gray500, fontSize: '1rem', lineHeight: 1.75, maxWidth: 760, margin: '0 auto' }}>
              TUTORERA by MENTISERA is a student-led tutoring marketplace. Students or parents post a requirement with their preferred budget in their local currency, receive tutor offers, compare profiles and counter-offers, and choose the tutor who best fits their learning goals.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[
              "Student posts requirement with preferred budget",
              "Verified tutors submit tailored offers",
              "Student compares profile credentials & price",
              "Final rate agreed with secure platform booking",
              "Booking is confirmed with structured schedule",
              "Payment is processed through authorized platform checkout",
              "Tutor delivers high-quality session",
              "Student reviews tutor & confirms session delivery",
            ].map((step, index) => (
              <div key={step} style={{ backgroundColor: C.gray50, border: '1px solid #e5e7eb', borderRadius: '0.875rem', padding: '1.25rem' }}>
                <p style={{ color: C.accent, fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.35rem' }}>STEP {String(index + 1).padStart(2, "0")}</p>
                <p style={{ color: C.primary, fontWeight: 750, lineHeight: 1.5 }}>{step}</p>
              </div>
            ))}
          </div>
          <p style={{ color: C.gray500, fontSize: '0.95rem', lineHeight: 1.75, marginTop: '1.5rem', textAlign: 'center' }}>
            TUTORERA provides student-led marketplace technology, student requirement matching, tutor offer comparison, rate negotiation, booking management, international timezone scheduling, communication, payment facilitation through authorized checkout, transparent currency display, payment-status verification, tutor reviews, customer support, dispute administration, and platform governance. Tutors provide tutoring services as independent verified educators.
          </p>
          <p style={{ color: C.gray500, fontSize: '0.95rem', lineHeight: 1.75, marginTop: '0.5rem', textAlign: 'center' }}>
            TUTORERA is not affiliated with, endorsed by, or certified by any ride-hailing or third-party marketplace brand. The model similarity is limited to the general demand-marketplace model where students post demand and verified providers respond with offers.
          </p>
        </div>
      </section>

      {/* Story */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: C.gray50 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: C.primary, marginBottom: '1.5rem', textAlign: 'center' }}>Our Story</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: C.gray500, fontSize: '1rem', lineHeight: '1.8' }}>
            <p>For decades, finding a tutor meant relying on unverified word-of-mouth, unmoderated social media groups, or commission-heavy agencies — with no structured credentials verification, transparent pricing, or safety guarantees.</p>
            <p>TUTORERA® was built to solve this globally and locally. We created a structured student-led marketplace where students specify their subject, curriculum, preferred budget, and mode (online worldwide or home tuition locally) — while every tutor on the platform undergoes manual credential review and verification.</p>
            <p>We are operated by <strong style={{ color: C.primary }}>{LEGAL_OPERATOR}</strong>, an education technology company committed to building transparent, high-integrity learning platforms connecting students and educators across borders.</p>
            <p><strong style={{ color: C.primary }}>Corporate address:</strong> {BUSINESS_ADDRESS}</p>
            <p><strong style={{ color: C.primary }}>Official email:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · <strong style={{ color: C.primary }}>Support hotline:</strong> {SUPPORT_PHONE}</p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: C.primary, marginBottom: '0.5rem' }}>Behind TUTORERA®</h2>
          <p style={{ color: C.gray500, marginBottom: '3rem' }}>Built by a passionate team of educators, software architects, and marketplace specialists.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {[
              { name: "MENTISERA Team", role: "Product & Engineering" },
              { name: "Academic Advisors", role: "Curriculum & Verification" },
              { name: "Success Team", role: "Student & Tutor Support" },
            ].map(member => (
              <div key={member.name} style={{ backgroundColor: C.gray50, borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb' }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: C.accentLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Users size={24} color={C.accent} />
                </div>
                <p style={{ fontWeight: '700', color: C.primary, marginBottom: '0.3rem' }}>{member.name}</p>
                <p style={{ color: C.gray500, fontSize: '0.875rem' }}>{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: C.primary, textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'white', marginBottom: '1rem' }}>Join TUTORERA® Today</h2>
        <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>Whether you're a student, parent, or educator — discover transparent, verified learning.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/tutors" style={{ backgroundColor: C.accent, color: 'white', padding: '0.875rem 2rem', borderRadius: '0.5rem', fontWeight: '700', textDecoration: 'none' }}>Find a Tutor</Link>
          <Link href="/become-a-tutor" style={{ border: `1.5px solid white`, color: 'white', padding: '0.875rem 2rem', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none' }}>Become a Tutor</Link>
        </div>
      </section>
    </div>
  );
}
