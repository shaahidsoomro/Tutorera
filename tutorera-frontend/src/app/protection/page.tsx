"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useAppGuard } from "@/hooks/useAppGuard";
import api from "@/lib/axios";
import { ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Booking = {
  _id: string;
  status: string;
  paymentStatus?: string;
  amount?: number;
  studentTotal?: number;
  currency?: string;
  createdAt: string;
  isFirstSession?: boolean;
  request?: { subject?: string };
  tutor?: { name?: string };
};

type CaseRecord = {
  _id: string;
  booking?: { _id?: string; amount?: number; studentTotal?: number; currency?: string };
  tutor?: { name?: string };
  reason?: string;
  status: string;
  createdAt: string;
};

const cardStyle = { background: "white", border: "1px solid #dce5f4", borderRadius: 16, padding: "1.25rem" };
const buttonStyle = { border: 0, borderRadius: 8, padding: "0.65rem 0.9rem", fontWeight: 700, cursor: "pointer", minHeight: 44 };

export default function ProtectionPage() {
  useAppGuard();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refunds, setRefunds] = useState<CaseRecord[]>([]);
  const [claims, setClaims] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<{ type: "refund" | "dispute" | "guarantee"; bookingId: string; reason: string; details: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [bookingRes, refundRes, claimRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/bookings/refund-requests"),
        api.get("/guarantee/my"),
      ]);
      setBookings(bookingRes.data.bookings ?? []);
      setRefunds(refundRes.data.refundRequests ?? []);
      setClaims(claimRes.data.claims ?? []);
    } catch {
      setMessage("Some protection records could not be loaded. Please refresh and try again.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitCase = async () => {
    if (!form || !form.reason.trim()) return;
    setBusy(form.bookingId);
    try {
      if (form.type === "refund") {
        await api.post(`/bookings/${form.bookingId}/refund-request`, { reason: form.reason, details: form.details });
      } else if (form.type === "dispute") {
        await api.post(`/bookings/${form.bookingId}/dispute`, { reason: form.reason, details: form.details });
      } else {
        await api.post("/guarantee/claim", { bookingId: form.bookingId, reason: form.reason, details: form.details });
      }
      setMessage("Your case has been submitted. We will email you when there is an update.");
      setForm(null);
      await load();
    } catch (error) {
      const responseMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setMessage(responseMessage || "Could not submit this case. Please check the booking eligibility and try again.");
    } finally { setBusy(null); }
  };

  const eligibleBookings = bookings.filter((booking) => booking.status !== "cancelled");

  return (
    <DashboardLayout>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem 5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ margin: 0, color: "#0329b2", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Student protection</p>
            <h1 style={{ margin: "0.35rem 0", color: "#021550", fontSize: "1.8rem", fontWeight: 850 }}>Protection Center</h1>
            <p style={{ margin: 0, color: "#64748b", maxWidth: 650, lineHeight: 1.6 }}>
              Manage refund requests, booking disputes, and first-session guarantee claims in one place. Keep your communication and payment records on TUTORERA.
            </p>
          </div>
          <button type="button" onClick={load} style={{ ...buttonStyle, background: "#eff6ff", color: "#0329b2" }}><RefreshCw size={15} style={{ verticalAlign: "middle", marginRight: 5 }} />Refresh</button>
        </div>

        {message && <div role="status" style={{ ...cardStyle, marginBottom: 16, background: "#eff6ff", color: "#1e3a8a", borderColor: "#bfdbfe" }}>{message}</div>}

        <section style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><ShieldCheck size={21} color="#0329b2" /><h2 style={{ margin: 0, color: "#021550", fontSize: 18 }}>How protection works</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
            <p><strong style={{ color: "#334155" }}>Refund request:</strong> Use for payment or service-delivery issues. Eligible requests are reviewed before settlement.</p>
            <p><strong style={{ color: "#334155" }}>Booking dispute:</strong> Use for safety, conduct, or a serious booking issue requiring Trust &amp; Safety review.</p>
            <p><strong style={{ color: "#334155" }}>First-session guarantee:</strong> Available for eligible completed first sessions under the published guarantee policy.</p>
          </div>
        </section>

        <section style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 12px", color: "#021550", fontSize: 18 }}>Start a protection case</h2>
          {loading ? <p style={{ color: "#64748b" }}>Loading eligible bookings…</p> : eligibleBookings.length === 0 ? <p style={{ color: "#64748b" }}>You have no eligible bookings yet.</p> : (
            <div style={{ display: "grid", gap: 10 }}>
              {eligibleBookings.map((booking) => (
                <div key={booking._id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "0.85rem", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  <div><strong style={{ color: "#334155" }}>{booking.request?.subject || "Tutoring booking"}</strong><p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 12 }}>Tutor: {booking.tutor?.name || "Tutor"} · {booking.status} · {booking.currency || "USD"} {(booking.studentTotal || booking.amount || 0).toLocaleString()}</p></div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setForm({ type: "refund", bookingId: booking._id, reason: "quality_issue", details: "" })} style={{ ...buttonStyle, background: "#fff7ed", color: "#9a3412" }}>Request refund</button>
                    <button type="button" onClick={() => setForm({ type: "dispute", bookingId: booking._id, reason: "", details: "" })} style={{ ...buttonStyle, background: "#fef2f2", color: "#b91c1c" }}>Raise dispute</button>
                    {booking.status === "completed" && booking.isFirstSession && <button type="button" onClick={() => setForm({ type: "guarantee", bookingId: booking._id, reason: "", details: "" })} style={{ ...buttonStyle, background: "#eff6ff", color: "#0329b2" }}>First-session guarantee</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {form && <section style={{ ...cardStyle, marginBottom: 16, borderColor: "#93c5fd" }}>
          <h2 style={{ margin: "0 0 10px", color: "#021550", fontSize: 18 }}>{form.type === "refund" ? "Request a refund" : form.type === "dispute" ? "Raise a booking dispute" : "Submit a first-session guarantee claim"}</h2>
          <label style={{ display: "block", color: "#334155", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Reason</label>
          <input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Briefly describe the issue" style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #cbd5e1", borderRadius: 8, marginBottom: 10 }} />
          <label style={{ display: "block", color: "#334155", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Details (optional)</label>
          <textarea value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} rows={4} placeholder="Include relevant dates, session details, or evidence context." style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #cbd5e1", borderRadius: 8, resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button type="button" onClick={submitCase} disabled={!form.reason.trim() || Boolean(busy)} style={{ ...buttonStyle, background: "#0329b2", color: "white", opacity: busy ? 0.7 : 1 }}>{busy ? "Submitting…" : "Submit case"}</button><button type="button" onClick={() => setForm(null)} style={{ ...buttonStyle, background: "#f8fafc", color: "#475569" }}>Cancel</button></div>
        </section>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {[{ title: "Refund requests", icon: <RefreshCw size={19} />, items: refunds }, { title: "Guarantee claims", icon: <ShieldCheck size={19} />, items: claims }].map((group) => (
            <section key={group.title} style={cardStyle}><h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", color: "#021550", fontSize: 17 }}>{group.icon}{group.title}</h2>{group.items.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13 }}>No cases submitted.</p> : group.items.map((item) => <div key={item._id} style={{ padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: "#334155", fontSize: 13 }}>{item.reason || "Case submitted"}</strong><span style={{ color: "#0329b2", fontSize: 12, fontWeight: 700 }}>{item.status.replace(/_/g, " ")}</span></div><p style={{ margin: "3px 0 0", color: "#94a3b8", fontSize: 11 }}>{new Date(item.createdAt).toLocaleString()}</p></div>)}</section>
          ))}
        </div>

        <p style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "#64748b", fontSize: 12, lineHeight: 1.5, marginTop: 18 }}><AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />For immediate danger, contact local emergency services first. For policy details, see the <Link href="/safety" style={{ color: "#0329b2", fontWeight: 700 }}>Trust &amp; Safety Center</Link>.</p>
      </main>
    </DashboardLayout>
  );
}
