import { UI_COLORS } from "@/lib/brand";
import { BookOpen,MessageSquare,Shield,Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Help Center", description: "Answers about finding tutors, tutor verification, bookings, payments, safety, cancellations, and support on TUTORERA.", alternates: { canonical: "/help" } };

const C = UI_COLORS;

const faqs = [
  { q: "How do I find a tutor?", a: "Go to 'Find a Tutor', use filters to search by subject, level, city, and budget, then view tutor profiles and post a request." },
  { q: "How do I become a tutor?", a: "Click 'Become a Tutor', create an account, complete the 5-step onboarding, and submit your documents for verification." },
  { q: "How long does tutor verification take?", a: "Our team reviews applications within 24-48 hours. You'll receive an email notification once approved." },
  { q: "How do payments work?", a: "After accepting a tutor offer and agreed rate, review the booking summary and complete payment through the authorized platform checkout when available. TUTORERA verifies payment server-side before marking a booking paid; no payment is collected just to post a request." },
  { q: "What is the platform fee?", a: "Students currently pay no marketplace fee. Tutors pay a 20% platform fee only when they earn, plus 15% tax on that fee (a 23% effective deduction from tutor earnings)." },
  { q: "Can I contact a tutor directly?", a: "All communication happens through TUTORERA® chat to ensure safety and quality. Contact details are kept private." },
  { q: "How do I cancel a booking?", a: "Go to your dashboard, find the booking, and click Cancel. Please review our Cancellation Policy for refund details." },
  { q: "What if I'm not satisfied with a tutor?", a: "You can leave a review after the session and contact our support team. We take all complaints seriously." },
];

export default function HelpPage() {
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) };
  return (
    <div style={{ backgroundColor: 'white' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section style={{ backgroundColor: C.primary, padding: '5rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', color: 'white', marginBottom: '1rem' }}>Help Center</h1>
        <p style={{ color: '#9ca3af', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto' }}>
          Find answers to common questions or reach out to our support team.
        </p>
      </section>

      {/* Quick Links */}
      <section style={{ padding: '3rem 1.5rem', backgroundColor: C.gray50 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { icon: <BookOpen size={22} color={C.accent} />, title: "For Students", href: "/help/for-parents", desc: "How to find and book tutors" },
            { icon: <Users size={22} color="#16a34a" />, title: "For Tutors", href: "/help/for-tutors", desc: "How to register and get students" },
            { icon: <Shield size={22} color="#d97706" />, title: "Safety & Trust", href: "/safety-policy", desc: "How we keep the platform safe" },
            { icon: <MessageSquare size={22} color="#7c3aed" />, title: "Contact Support", href: "/contact", desc: "Get in touch with our team" },
          ].map(item => (
            <Link key={item.title} href={item.href} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {item.icon}
              <p style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem' }}>{item.title}</p>
              <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: C.primary, marginBottom: '2.5rem', textAlign: 'center' }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqs.map(faq => (
              <div key={faq.q} style={{ backgroundColor: C.gray50, borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{faq.q}</h3>
                <p style={{ color: C.gray500, fontSize: '0.875rem', lineHeight: '1.65' }}>{faq.a}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <p style={{ color: C.gray500, marginBottom: '1rem' }}>Still need help?</p>
            <Link href="/contact" style={{ backgroundColor: C.accent, color: 'white', padding: '0.875rem 2rem', borderRadius: '0.5rem', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }}>
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
