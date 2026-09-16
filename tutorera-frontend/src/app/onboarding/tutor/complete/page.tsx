import { UI_COLORS } from "@/lib/brand";
import { CheckCircle,Clock } from "lucide-react";
import Link from "next/link";

const C = UI_COLORS;

export default function OnboardingCompletePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '3rem 2rem', maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>

        <div style={{ width: '72px', height: '72px', backgroundColor: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <CheckCircle size={36} color="#16a34a" />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary, marginBottom: '0.75rem' }}>
          Application Submitted! 🎉
        </h1>

        <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '2rem' }}>
          Thank you for completing your tutor registration. Our team will review your documents and get back to you within <strong>24-48 hours</strong>.
        </p>

        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
          <Clock size={20} color="#d97706" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: '700', color: '#92400e', fontSize: '0.875rem' }}>Verification Pending</p>
            <p style={{ color: '#a16207', fontSize: '0.8rem' }}>You'll receive an email once your profile is approved.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/dashboard"
            style={{ display: 'block', backgroundColor: C.accent, color: 'white', padding: '0.875rem', borderRadius: '0.5rem', fontWeight: '700', textDecoration: 'none', fontSize: '0.95rem' }}>
            Go to Dashboard
          </Link>
          <Link href="/"
            style={{ display: 'block', border: '1.5px solid #e5e7eb', color: '#6b7280', padding: '0.875rem', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none', fontSize: '0.875rem' }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}