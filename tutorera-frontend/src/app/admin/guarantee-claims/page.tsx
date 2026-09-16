"use client";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { showError } from "@/lib/toast";
import { CheckCircle,Shield,XCircle } from "lucide-react";
import { useEffect,useState } from "react";

const C = UI_COLORS;

interface Claim {
  _id: string;
  student: { name: string; email: string; phone?: string };
  tutor: { name: string; email: string };
  booking: { amount: number; schedule: string; teachingMode: string; createdAt: string };
  reason: string;
  details: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string;
  createdAt: string;
}

export default function GuaranteeClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get("/admin/guarantee-claims")
      .then(res => setClaims(res.data.claims))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = claims.filter(c => filter === "all" || c.status === filter);
  const pendingCount = claims.filter(c => c.status === "pending").length;

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(id);
    try {
      const res = await api.patch(`/admin/guarantee-claims/${id}`, {
        status,
        adminNote: adminNotes[id] || "",
      });
      setClaims(prev => prev.map(c => c._id === id ? { ...c, ...res.data.claim } : c));
      setExpanded(null);
    } catch {
      showError("Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>First Session Guarantee Claims</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>Review and action student satisfaction claims.</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: "all", label: "All", count: claims.length },
          { key: "pending", label: "⏳ Pending", count: pendingCount },
          { key: "approved", label: "✅ Approved", count: claims.filter(c => c.status === "approved").length },
          { key: "rejected", label: "❌ Rejected", count: claims.filter(c => c.status === "rejected").length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key as typeof filter)}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '999px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', border: filter === tab.key ? 'none' : '1px solid #e5e7eb', backgroundColor: filter === tab.key ? C.primary : 'white', color: filter === tab.key ? 'white' : C.gray500 }}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <Shield size={40} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: C.gray500 }}>No claims in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(claim => (
            <div key={claim._id} style={{ backgroundColor: 'white', borderRadius: '0.875rem', border: `1px solid ${claim.status === "pending" ? '#fde68a' : '#e5e7eb'}`, overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === claim._id ? null : claim._id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 40, height: 40, backgroundColor: '#fff1f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Shield size={18} color="#C81B7F" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: C.primary, fontSize: '0.95rem' }}>{claim.student.name}</p>
                    <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{claim.student.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: claim.status === "pending" ? '#fffbeb' : claim.status === "approved" ? '#f0fdf4' : '#fef2f2', color: claim.status === "pending" ? '#d97706' : claim.status === "approved" ? '#16a34a' : '#ef4444', textTransform: 'capitalize' }}>
                    {claim.status}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 600, color: C.primary, fontSize: '0.875rem', margin: '0 0 2px' }}>{claim.reason}</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>{new Date(claim.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Expanded */}
              {expanded === claim._id && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '1.5rem', backgroundColor: C.gray50 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Student</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: C.primary }}>{claim.student.name}</p>
                      <p style={{ fontSize: '0.8rem', color: C.gray500 }}>{claim.student.email}</p>
                      {claim.student.phone && <p style={{ fontSize: '0.8rem', color: C.gray500 }}>{claim.student.phone}</p>}
                    </div>
                    <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Tutor</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: C.primary }}>{claim.tutor.name}</p>
                      <p style={{ fontSize: '0.8rem', color: C.gray500 }}>{claim.tutor.email}</p>
                    </div>
                    <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Session</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: C.accent }}>Rs. {claim.booking?.amount?.toLocaleString()}</p>
                      <p style={{ fontSize: '0.8rem', color: C.gray500 }}>{claim.booking?.schedule}</p>
                      <p style={{ fontSize: '0.8rem', color: C.gray500, textTransform: 'capitalize' }}>{claim.booking?.teachingMode}</p>
                    </div>
                  </div>

                  {/* Claim details */}
                  <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e5e7eb', marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Claim Reason</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: C.primary, marginBottom: claim.details ? '0.5rem' : 0 }}>{claim.reason}</p>
                    {claim.details && <p style={{ fontSize: '0.875rem', color: C.gray500, lineHeight: 1.6 }}>{claim.details}</p>}
                  </div>

                  {/* Admin actions — only for pending */}
                  {claim.status === "pending" && (
                    <div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.primary, marginBottom: '0.3rem' }}>
                          Note to student (optional)
                        </label>
                        <input
                          value={adminNotes[claim._id] || ""}
                          onChange={e => setAdminNotes(prev => ({ ...prev, [claim._id]: e.target.value }))}
                          placeholder="e.g. Refund will be processed within 3-5 business days"
                          style={{ width: '100%', padding: '0.6rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => handleAction(claim._id, "approved")}
                          disabled={actionLoading === claim._id}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.6rem 1.25rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                          <CheckCircle size={14} /> Approve & Notify Student
                        </button>
                        <button onClick={() => handleAction(claim._id, "rejected")}
                          disabled={actionLoading === claim._id}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.6rem 1.25rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Already actioned */}
                  {claim.status !== "pending" && claim.adminNote && (
                    <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Admin Note</p>
                      <p style={{ fontSize: '0.875rem', color: C.primary }}>{claim.adminNote}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}