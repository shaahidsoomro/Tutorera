import { UI_COLORS } from "@/lib/brand";
// app/first-session-guarantee/page.tsx
import { CheckCircle,Clock,RefreshCw,Shield } from "lucide-react";
import Link from "next/link";

const C = UI_COLORS;

export default function FirstSessionGuaranteePage() {
  return (
    <div style={{ backgroundColor: '#F5F7FF', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ backgroundColor: C.primary, padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ width: 64, height: 64, backgroundColor: 'rgba(37,99,235,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Shield size={32} color="#60a5fa" />
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'white', marginBottom: '1rem', lineHeight: 1.2 }}>
            First Session Guarantee
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '1.1rem', lineHeight: 1.7 }}>
            We want you to find the right tutor. If the first session materially fails to meet the published protection rules, we review the case for a replacement, credit, or refund where eligible.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Promise cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
          {[
            { icon: <RefreshCw size={24} color={C.accent} />, bg: '#EEF5FF', title: "Try Another Tutor", desc: "Eligible cases may receive a session credit so you can book a different tutor." },
            { icon: <Shield size={24} color="#16a34a" />, bg: '#f0fdf4', title: "Refund Review", desc: "If a refund is appropriate under the published rules, our team reviews the claim and records the decision." },
            { icon: <Clock size={24} color="#d97706" />, bg: '#fffbeb', title: "Quick Resolution", desc: "We review all claims within 24–48 hours and keep you updated every step of the way." },
          ].map(card => (
            <div key={card.title} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
              <div style={{ width: 44, height: 44, backgroundColor: card.bg, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                {card.icon}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: C.primary, marginBottom: '0.5rem' }}>{card.title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>{card.desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.primary, marginBottom: '1.5rem' }}>How It Works</h2>
          {[
            { step: "01", title: "Complete your first session", desc: "Book and complete your first session with a tutor on TUTORERA®." },
            { step: "02", title: "Not satisfied? Let us know", desc: "In your dashboard, click \"Not Satisfied?\" on your completed first session booking and tell us what went wrong." },
            { step: "03", title: "We review your claim", desc: "Our team reviews your claim within 24–48 hours and contacts you via email." },
            { step: "04", title: "Resolution is recorded", desc: "Eligible outcomes may include a tutor replacement, session credit, or refund through a supported documented method." },
          ].map((item, i) => (
            <div key={item.step} style={{ display: 'flex', gap: '1.25rem', paddingBottom: i < 3 ? '1.5rem' : 0, marginBottom: i < 3 ? '1.5rem' : 0, borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ width: 40, height: 40, backgroundColor: '#EEF5FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: C.accent, flexShrink: 0 }}>
                {item.step}
              </div>
              <div>
                <p style={{ fontWeight: 700, color: C.primary, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{item.title}</p>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Eligibility */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.primary, marginBottom: '1.25rem' }}>Eligibility</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              "Applies to your first session with any tutor on TUTORERA®",
              "Session must be marked as completed",
              "Claim must be submitted within 7 days of the session",
              "One guarantee claim per student–tutor pair",
              "Does not apply to sessions cancelled by the student",
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ backgroundColor: C.primary, borderRadius: '0.875rem', padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>
            Ready to find the right tutor?
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Post your requirement or browse verified tutors — eligible first sessions are protected under the published rules.
          </p>
          <Link href="/tutors"
            style={{ display: 'inline-block', backgroundColor: C.accent, color: 'white', padding: '0.875rem 2rem', borderRadius: '0.5rem', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>
            Browse Tutors
          </Link>
        </div>
      </div>
    </div>
  );
}
