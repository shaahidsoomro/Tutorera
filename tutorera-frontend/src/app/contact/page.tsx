"use client";
import { UI_COLORS } from "@/lib/brand";

import api from "@/lib/axios";
import { BUSINESS_ADDRESS,LEGAL_OPERATOR,SUPPORT_EMAIL,SUPPORT_PHONE } from "@/lib/site";
import { CheckCircle,Mail,MapPin,Phone,Send } from "lucide-react";
import { useState } from "react";

const C = UI_COLORS;
const subjects = ["Student Support", "Tutor Support", "Booking Issue", "Payment Issue", "Refund Request", "Dispute", "Technical Support", "General Enquiry"];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", userType: "", subject: "", bookingReference: "", transactionReference: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/contact", form);
      setSuccess(true);
      setForm({ name: "", email: "", phone: "", userType: "", subject: "", bookingReference: "", transactionReference: "", message: "" });
    } catch {
      setError("Failed to send message. Please try again or email hello@mentisera.pk.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' };

  return (
    <div style={{ backgroundColor: C.gray50, minHeight: '100vh' }}>
      <div style={{ backgroundColor: C.primary, padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', marginBottom: '0.75rem' }}>Contact TUTORERA by MENTISERA</h1>
        <p style={{ color: '#9ca3af', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto' }}>Support for students, parents, tutors, bookings, payments, refunds, disputes, and general enquiries.</p>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '2.5rem' }} className="contact-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[
            { icon: <Mail size={22} color={C.accent} />, title: "Email", value: SUPPORT_EMAIL, sub: "Official customer support email" },
            { icon: <Phone size={22} color={C.accent} />, title: "Phone / WhatsApp", value: SUPPORT_PHONE, sub: "Mon-Sat, 9am-6pm PKT" },
            { icon: <MapPin size={22} color={C.accent} />, title: "Business Address", value: BUSINESS_ADDRESS, sub: `Operator: ${LEGAL_OPERATOR}` },
          ].map((item) => (
            <div key={item.title} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '44px', height: '44px', backgroundColor: C.accentLight, borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
              <div><p style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{item.title}</p><p style={{ color: C.accent, fontWeight: '600', fontSize: '0.9rem' }}>{item.value}</p><p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{item.sub}</p></div>
            </div>
          ))}
          <a href="https://wa.me/923348880859" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#16a34a', color: 'white', padding: '1rem', borderRadius: '0.875rem', textDecoration: 'none', fontWeight: '700', fontSize: '0.95rem' }}>Chat on WhatsApp</a>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: C.primary, marginBottom: '0.5rem' }}>Message Sent</h2>
              <p style={{ color: C.gray500, marginBottom: '1.5rem' }}>We&apos;ll get back to you as soon as possible.</p>
              <button onClick={() => setSuccess(false)} style={{ padding: '0.75rem 2rem', backgroundColor: C.accent, color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>Send Another Message</button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: C.primary, marginBottom: '1.5rem' }}>Send us a message</h2>
              {error && <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.875rem' }}>{error}</div>}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><label style={labelStyle}>Name *</label><input name="name" value={form.name} onChange={handleChange} required placeholder="Your full name" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Email *</label><input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@example.com" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><label style={labelStyle}>Phone</label><input name="phone" value={form.phone} onChange={handleChange} placeholder="+92..." style={inputStyle} /></div>
                  <div><label style={labelStyle}>User Type</label><select name="userType" value={form.userType} onChange={handleChange} style={{ ...inputStyle, color: form.userType ? C.primary : C.gray500, backgroundColor: 'white' }}><option value="">Select user type</option><option value="student">Student</option><option value="parent">Parent</option><option value="tutor">Tutor</option><option value="other">Other</option></select></div>
                </div>
                <div><label style={labelStyle}>Subject *</label><select name="subject" value={form.subject} onChange={handleChange} required style={{ ...inputStyle, color: form.subject ? C.primary : C.gray500, backgroundColor: 'white' }}><option value="">Select a subject</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><label style={labelStyle}>Booking Reference</label><input name="bookingReference" value={form.bookingReference} onChange={handleChange} placeholder="Optional" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Transaction Reference</label><input name="transactionReference" value={form.transactionReference} onChange={handleChange} placeholder="Optional" style={inputStyle} /></div>
                </div>
                <div><label style={labelStyle}>Message *</label><textarea name="message" value={form.message} onChange={handleChange} required rows={5} placeholder="Tell us how we can help..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} /></div>
                <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: loading ? '#93c5fd' : C.accent, color: 'white', padding: '0.9rem', borderRadius: '0.5rem', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}><Send size={18} />{loading ? "Sending..." : "Send Message"}</button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
