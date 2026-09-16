"use client";
import { UI_COLORS } from "@/lib/brand";
// app/support/page.tsx
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { AlertTriangle,CheckCircle,MessageCircle } from "lucide-react";
import { useRouter,useSearchParams } from "next/navigation";
import { Suspense,useEffect,useState } from "react";

const C = UI_COLORS;

const SUBJECTS = [
  "Session not starting / technical issue",
  "Tutor / Student didn't show up",
  "Payment issue",
  "Inappropriate behavior",
  "Booking dispute",
  "Other",
];

function SupportForm() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "";

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const handleSubmit = async () => {
    if (!subject || !message.trim()) {
      setError("Please select a subject and describe your issue.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Please provide a bit more detail (at least 10 characters).");
      return;
    }

    setSaving(true); setError("");
    try {
      await api.post("/contact/support", { subject, message, bookingId, priority });
      setSubmitted(true);
    } catch {
      setError("Failed to submit. Please try again or use WhatsApp below.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  if (submitted) {
    return (
      <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ width: 72, height: 72, backgroundColor: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <CheckCircle size={36} color="#16a34a" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: C.primary, marginBottom: '0.75rem' }}>
          Request Submitted
        </h2>
        <p style={{ color: C.gray500, fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          Our support team has received your request and will get back to you shortly via email{priority === "urgent" ? " — since you marked this urgent, we'll prioritize it" : ""}.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ padding: '0.75rem 1.75rem', backgroundColor: C.primary, color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.primary, marginBottom: '0.4rem' }}>
        Contact Support
      </h1>
      <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.75rem' }}>
        {bookingId
          ? "Tell us what's wrong with this session and we'll look into it."
          : "Describe your issue and our team will get back to you."}
      </p>

      {/* Booking reference badge */}
      {bookingId && (
        <div style={{ backgroundColor: '#EEF5FF', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '0.6rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#0329B2', fontWeight: 600 }}>
          📎 Linked to booking: {bookingId.slice(-8).toUpperCase()}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.primary, marginBottom: '0.4rem' }}>
              What's the issue? *
            </label>
            <select title="type issue" value={subject} onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', color: C.primary, backgroundColor: 'white' }}
              onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
              <option value="">Select an issue type</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Message */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.primary, marginBottom: '0.4rem' }}>
              Describe what happened *
            </label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
              placeholder="Please provide as much detail as possible..."
              style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: C.primary, boxSizing: 'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
          </div>

          {/* Priority */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.primary, marginBottom: '0.5rem' }}>
              Priority
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setPriority("normal")}
                style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: `1.5px solid ${priority === "normal" ? C.accent : '#e5e7eb'}`, backgroundColor: priority === "normal" ? '#EEF5FF' : 'white', color: priority === "normal" ? C.accent : C.gray500, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                Normal
              </button>
              <button type="button" onClick={() => setPriority("urgent")}
                style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: `1.5px solid ${priority === "urgent" ? '#ef4444' : '#e5e7eb'}`, backgroundColor: priority === "urgent" ? '#fef2f2' : 'white', color: priority === "urgent" ? '#ef4444' : C.gray500, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                <AlertTriangle size={13} /> Urgent — session right now
              </button>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: saving ? '#93c5fd' : C.accent, color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>

      {/* WhatsApp fallback — important for "right now" issues */}
      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.875rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ width: 40, height: 40, backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MessageCircle size={20} color="#16a34a" />
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#166534', margin: '0 0 2px' }}>Need help right now?</p>
          <p style={{ fontSize: '0.8rem', color: '#15803d', margin: 0 }}>For urgent in-session issues, message us directly on WhatsApp.</p>
        </div>
        <a href={`https://wa.me/923348880859?text=${encodeURIComponent(`Hi TUTORERA Support, I need help with my session.${bookingId ? ` Booking ID: ${bookingId}` : ""}`)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ padding: '0.6rem 1.25rem', backgroundColor: '#16a34a', color: 'white', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Open WhatsApp
        </a>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={null}>
        <SupportForm />
      </Suspense>
    </DashboardLayout>
  );
}