"use client";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { showError,showSuccess } from "@/lib/toast";
import { CheckCircle,Clock,Download,ExternalLink,Eye,EyeOff,XCircle } from "lucide-react";
import { useCallback,useEffect,useState } from "react";

const C = UI_COLORS;

interface TutorProfile {
  _id: string;
  user: { _id: string; name: string; email: string; phone: string; city: string; createdAt: string; };
  fullName: string;
  phone: string;
  city: string;
  gender: string;
  dateOfBirth: string;
  bio: string;
  subjects: string[];
  levels: string[];
  hourlyRate: number;
  experience: number;
  education: { degree: string; institution: string; year: number; degreeDoc: string; }[];
  previousInstitutions: string[];
  teachingMode: string;
  cnicFront: string;
  cnicBack: string;
  videoIntro: string;
  policeCertificate: string;
  verificationStatus: string;
  rejectionReason: string;
  onboardingComplete: boolean;
  createdAt: string;
}

export default function VerificationsPage() {
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("pending");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchTutors = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/verifications?status=${filter}&page=${page}&limit=20`);
      setTutors(res.data.tutors);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchTutors(1); }, [fetchTutors]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/admin/verify/${id}`, { status: "approved" });
      setTutors(prev => prev.filter(t => t._id !== id));
      setExpanded(null);
      showSuccess("Tutor approved successfully");
    } catch (err) {
      showError(err, "Failed to approve tutor");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { showError("Please provide a rejection reason."); return; }
    setActionLoading(id);
    try {
      await api.patch(`/admin/verify/${id}`, { status: "rejected", reason: rejectReason });
      setTutors(prev => prev.filter(t => t._id !== id));
      setRejectingId(null);
      setRejectReason("");
      setExpanded(null);
      showSuccess("Tutor rejected");
    } catch (err) {
      showError(err, "Failed to reject tutor");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDocument = async (tutorId: string, field: string) => {
    try {
      const res = await api.get(`/admin/tutors/${tutorId}/document/${field}`);
      window.open(res.data.url, "_blank");
    } catch {
      showError("Failed to load document. It may not exist.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (status: "approved" | "rejected") => {
    if (selectedIds.size === 0) return;
    if (status === "rejected" && !rejectReason.trim()) {
      showError("Please provide a rejection reason for bulk rejection.");
      return;
    }
    setBulkLoading(true);
    try {
      await api.patch("/admin/verify/bulk", { tutorIds: Array.from(selectedIds), status, reason: rejectReason || undefined });
      showSuccess(`Bulk ${status}: ${selectedIds.size} tutors updated`);
      setSelectedIds(new Set());
      setRejectReason("");
      setRejectingId(null);
      fetchTutors(pagination.page);
    } catch (err) {
      showError(err, `Failed to bulk ${status}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      pending: { bg: '#fffbeb', color: '#d97706' },
      approved: { bg: '#f0fdf4', color: '#16a34a' },
      rejected: { bg: '#fef2f2', color: '#ef4444' },
    };
    return (
      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: colors[status]?.bg, color: colors[status]?.color, textTransform: 'capitalize' }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '100%', overflowX: 'hidden' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Tutor Verifications</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>Review full tutor applications and manage verification.</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {["pending", "approved", "rejected"].map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '999px', border: filter === tab ? 'none' : '1px solid #e5e7eb', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', textTransform: 'capitalize', backgroundColor: filter === tab ? C.primary : 'white', color: filter === tab ? 'white' : C.gray500 }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: '#EEF5FF', border: '1px solid #bfdbfe', borderRadius: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '700', color: C.primary }}>
            {selectedIds.size} selected
          </span>
          <button type="button" onClick={() => handleBulkAction("approved")} disabled={bulkLoading}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#16a34a', color: 'white', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
            Approve Selected
          </button>
          <button type="button" onClick={() => handleBulkAction("rejected")} disabled={bulkLoading}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#ef4444', color: 'white', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
            Reject Selected
          </button>
          <button type="button" onClick={() => setSelectedIds(new Set())}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: 'white', color: '#475569', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : tutors.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <Clock size={40} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: C.gray500, fontWeight: '600' }}>No {filter} verifications</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tutors.map(tutor => (
            <div key={tutor._id} style={{ backgroundColor: 'white', borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>

              {/* Header Row */}
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tutor._id)}
                    onChange={() => toggleSelect(tutor._id)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.primary }}
                  />
                  <div style={{ width: '44px', height: '44px', backgroundColor: C.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1.1rem', flexShrink: 0 }}>
                    {(tutor.fullName || tutor.user?.name || "T").charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontWeight: '700', color: C.primary, fontSize: '1rem' }}>{tutor.fullName || tutor.user?.name}</p>
                    <p style={{ color: C.gray500, fontSize: '0.8rem' }}>{tutor.user?.email}</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Applied: {new Date(tutor.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {statusBadge(tutor.verificationStatus)}
                  <button onClick={() => setExpanded(expanded === tutor._id ? null : tutor._id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', color: C.primary }}>
                    {expanded === tutor._id ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> View Full Data</>}
                  </button>
                  {tutor.verificationStatus === "pending" && (
                    <>
                      <button onClick={() => handleApprove(tutor._id)} disabled={actionLoading === tutor._id}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#16a34a', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => setRejectingId(rejectingId === tutor._id ? null : tutor._id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Reject Reason Input */}
              {rejectingId === tutor._id && (
                <div style={{ padding: '1rem 1.5rem', backgroundColor: '#fef2f2', borderTop: '1px solid #fecaca' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ef4444', marginBottom: '0.5rem' }}>Rejection Reason</p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Tell the tutor why they were rejected..."
                      style={{ flex: 1, padding: '0.6rem 1rem', border: '1px solid #fecaca', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                    <button onClick={() => handleReject(tutor._id)} disabled={actionLoading === tutor._id}
                      style={{ padding: '0.6rem 1.25rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
                      Confirm Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded Full Data */}
              {expanded === tutor._id && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                    {/* Personal Info */}
                    <div style={{ backgroundColor: C.gray50, borderRadius: '0.75rem', padding: '1.25rem' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: C.primary, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📋 Personal Info</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {[
                          { label: "Full Name", value: tutor.fullName || tutor.user?.name },
                          { label: "Email", value: tutor.user?.email },
                          { label: "Phone", value: tutor.phone || tutor.user?.phone },
                          { label: "City", value: tutor.city || tutor.user?.city },
                          { label: "Gender", value: tutor.gender },
                          { label: "Date of Birth", value: tutor.dateOfBirth },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{item.label}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: C.primary }}>{item.value || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Education */}
                    <div style={{ backgroundColor: C.gray50, borderRadius: '0.75rem', padding: '1.25rem' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: C.primary, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎓 Education</h3>
                      {tutor.education?.length > 0 ? tutor.education.map((edu, i) => (
                        <div key={i} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: i < tutor.education.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: '700', color: C.primary }}>{edu.degree}</p>
                          <p style={{ fontSize: '0.8rem', color: C.gray500 }}>{edu.institution} — {edu.year}</p>
                          {edu.degreeDoc && (
                            <button onClick={() => handleViewDocument(tutor._id, "degreeDoc")}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: C.accent, fontSize: '0.75rem', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '0.3rem' }}>
                              <Download size={12} /> View Degree Certificate
                            </button>
                          )}
                        </div>
                      )) : <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No education data</p>}
                    </div>

                    {/* Teaching Info */}
                    <div style={{ backgroundColor: C.gray50, borderRadius: '0.75rem', padding: '1.25rem' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: C.primary, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📚 Teaching Info</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Experience</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: C.primary }}>{tutor.experience} years</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Hourly Rate</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: C.primary }}>Rs. {tutor.hourlyRate?.toLocaleString()}/hr</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Mode</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: C.primary, textTransform: 'capitalize' }}>{tutor.teachingMode}</span>
                        </div>
                      </div>
                      <div style={{ marginTop: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.3rem' }}>Subjects</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {tutor.subjects?.map(s => <span key={s} style={{ backgroundColor: '#EEF5FF', color: C.accent, fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>{s}</span>)}
                        </div>
                      </div>
                      <div style={{ marginTop: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.3rem' }}>Levels</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {tutor.levels?.map(l => <span key={l} style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>{l}</span>)}
                        </div>
                      </div>
                    </div>

                    {/* Verification Documents */}
                    <div style={{ backgroundColor: C.gray50, borderRadius: '0.75rem', padding: '1.25rem' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: C.primary, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔐 Verification Docs</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {[
                          { label: "CNIC Front", url: tutor.cnicFront, field: "cnicFront" },
                          { label: "CNIC Back", url: tutor.cnicBack, field: "cnicBack" },
                          { label: "Demo Video URL", url: tutor.videoIntro, field: "videoIntro" },
                          {
                            label: "Police Certificate",
                            url: tutor.policeCertificate,
                            field: "policeCertificate",
                            required: tutor.teachingMode === "in-person" || tutor.teachingMode === "both",
                          },
                        ].map(doc => (
                          <div key={doc.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                              {doc.label}
                              {"required" in doc && doc.required && (
                                <span style={{ color: '#ef4444', marginLeft: '3px', fontSize: '0.7rem' }}>*</span>
                              )}
                              </span>
                            {doc.url ? (
                              doc.field === "videoIntro" ? (
                                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: C.accent, fontSize: '0.75rem', fontWeight: '600', textDecoration: 'none' }}>
                                  <ExternalLink size={12} /> Open
                                </a>
                              ) : (
                                <button onClick={() => handleViewDocument(tutor._id, doc.field)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: C.accent, fontSize: '0.75rem', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                  <Download size={12} /> View
                                </button>
                              )
                            ) : (
                              <span style={{
                                fontSize: '0.75rem',
                                color: "required" in doc && doc.required ? '#ef4444' : '#9ca3af',
                                fontWeight: "required" in doc && doc.required ? '600' : '400',
                              }}>
                                {"required" in doc && doc.required ? "⚠ Missing" : "Not uploaded"}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Bio */}
                      {tutor.bio && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.3rem' }}>Bio</p>
                          <p style={{ fontSize: '0.8rem', color: C.primary, lineHeight: '1.6' }}>{tutor.bio}</p>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {tutor.rejectionReason && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#ef4444', marginBottom: '0.2rem' }}>Rejection Reason:</p>
                          <p style={{ fontSize: '0.8rem', color: '#b91c1c' }}>{tutor.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        {!loading && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button onClick={() => fetchTutors(pagination.page - 1)} disabled={pagination.page <= 1}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: 'white', color: pagination.page <= 1 ? '#d1d5db' : C.primary, fontWeight: '600', fontSize: '0.85rem', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}>
            ← Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.85rem', color: C.gray500, fontWeight: '600' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button onClick={() => fetchTutors(pagination.page + 1)} disabled={pagination.page >= pagination.pages}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: 'white', color: pagination.page >= pagination.pages ? '#d1d5db' : C.primary, fontWeight: '600', fontSize: '0.85rem', cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer' }}>
            Next →
          </button>
          </div>
        )}
        </div>
      )}
    </div>
  );
}