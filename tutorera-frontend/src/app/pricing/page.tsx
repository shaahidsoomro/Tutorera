import { UI_COLORS } from "@/lib/brand";
import { GST_EFFECTIVE_PERCENT,GST_ON_PLATFORM_FEE_PERCENT,PLATFORM_FEE_PERCENT,SUPPORT_EMAIL,TOTAL_FEE_PERCENT } from "@/lib/site";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

const C = UI_COLORS;

export default function PricingPage() {
  return (
    <div style={{ backgroundColor: 'white' }}>

      {/* Hero */}
      <section style={{ backgroundColor: C.primary, padding: '5rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', color: 'white', marginBottom: '1rem' }}>
          Simple, Transparent Pricing
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto' }}>
          No hidden fees. No surprises. Just clear pricing for everyone.
        </p>
      </section>

      {/* Pricing Cards */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: C.gray50 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>

            {/* Free for Students */}
            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2.5rem', border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontWeight: '800', color: C.primary, fontSize: '1.2rem', marginBottom: '0.5rem' }}>For Students</h3>
              <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.5rem' }}>Sign up and start finding tutors</p>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '3rem', fontWeight: '800', color: C.primary }}>Free</span>
                <p style={{ color: C.gray500, fontSize: '0.8rem', marginTop: '0.25rem' }}>to join and browse</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {[
                  "Browse all verified tutors",
                  "Post unlimited tuition requests",
                  "Receive and compare tutor offers",
                  "Real-time chat with tutors",
                  "No student marketplace fee currently",
                ].map((item, i) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: C.gray500 }}>
                    <CheckCircle size={16} color={i < 4 ? "#16a34a" : "#d97706"} style={{ flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register" style={{ display: 'block', textAlign: 'center', backgroundColor: C.accent, color: 'white', padding: '0.875rem', borderRadius: '0.5rem', fontWeight: '700', textDecoration: 'none' }}>
                Sign Up Free
              </Link>
            </div>

            {/* For Tutors */}
            <div style={{ backgroundColor: C.primary, borderRadius: '1rem', padding: '2.5rem', border: '2px solid #0329B2' }}>
              <h3 style={{ fontWeight: '800', color: 'white', fontSize: '1.2rem', marginBottom: '0.5rem' }}>For Tutors</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Join and start earning</p>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '3rem', fontWeight: '800', color: 'white' }}>Free</span>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.25rem' }}>to join and create profile</p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {[
                  "Create verified tutor profile",
                  "Browse student requests",
                  "Accept budgets or send offers",
                  "Real-time chat with students",
                  `Pay only when you earn: ${PLATFORM_FEE_PERCENT}% fee plus applicable tax`,
                ].map((item, i) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                    <CheckCircle size={16} color={i < 4 ? "#86efac" : "#fde68a"} style={{ flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/become-a-tutor" style={{ display: 'block', textAlign: 'center', backgroundColor: '#0329B2', color: 'white', padding: '0.875rem', borderRadius: '0.5rem', fontWeight: '700', textDecoration: 'none' }}>
                Become a Tutor
              </Link>
            </div>

            {/* Fee Breakdown */}
            <div style={{ backgroundColor: '#fffbeb', borderRadius: '1rem', padding: '2.5rem', border: '1px solid #fde68a' }}>
              <h3 style={{ fontWeight: '800', color: C.primary, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Fee Breakdown</h3>
              <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.5rem' }}>How the {TOTAL_FEE_PERCENT}% total fee is calculated</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: "Platform Fee", value: `${PLATFORM_FEE_PERCENT}%`, color: '#d97706' },
                  { label: `GST (${GST_ON_PLATFORM_FEE_PERCENT}% of ${PLATFORM_FEE_PERCENT}%)`, value: `${GST_EFFECTIVE_PERCENT}%`, color: '#d97706' },
                  { label: "Total", value: `${TOTAL_FEE_PERCENT}%`, color: '#92400e', bold: true },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: item.bold ? 'none' : '1px solid #fde68a' }}>
                    <span style={{ fontSize: '0.875rem', color: item.bold ? '#92400e' : '#a16207', fontWeight: item.bold ? '700' : '400' }}>{item.label}</span>
                    <span style={{ fontWeight: '800', color: item.color, fontSize: item.bold ? '1.1rem' : '0.875rem' }}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #fde68a' }}>
                <p style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '600', marginBottom: '0.3rem' }}>Example</p>
                <p style={{ fontSize: '0.8rem', color: '#a16207', lineHeight: '1.6' }}>
                  Agreed rate: PKR 2,000/hour<br />
                  Student pays: PKR 2,000<br />
                  Tutor platform fee: PKR 400<br />
                  Tax on fee: PKR 60<br />
                  Estimated tutor earnings: PKR 1,540
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Method */}
      <section style={{ padding: '4rem 1.5rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: C.primary, marginBottom: '1rem' }}>Payment Method</h2>
          <p style={{ color: C.gray500, marginBottom: '2rem' }}>Prices, offers, and bookings use the selected market currency. Pakistan checkout is live; UAE and UK are currently discovery beta.</p>
          <div style={{ backgroundColor: C.gray50, borderRadius: '1rem', padding: '2rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>
            <p style={{ fontWeight: '700', color: C.primary, marginBottom: '1rem' }}>🏦 How Payments Work</p>
            <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                "Student accepts a tutor offer and agreed rate",
                "Student reviews the final payable amount in the booking currency",
                "In a live payment market, the student clicks Pay Securely and proceeds through the configured authorized provider",
                "TUTORERA verifies payment server-side before marking the booking as paid",
                "Booking is activated and sessions begin",
                "After session completion, tutor's share is transferred",
              ].map((step, i) => (
                <li key={i} style={{ color: C.gray500, fontSize: '0.9rem', lineHeight: '1.6' }}>{step}</li>
              ))}
            </ol>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '1.25rem' }}>
              Payment availability depends on the selected market. Discovery-beta markets support profiles, requests, offers, and negotiation only. For payment support, contact {SUPPORT_EMAIL}.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
