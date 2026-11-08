"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Search, X } from "lucide-react";
import api from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";
import PayoutReportDownload from "@/components/Finance/PayoutReportDownload";
import { useAuth } from "@/context/AuthContext";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

interface TutorItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  countryName?: string;
  createdAt: string;
  isActive: boolean;
  isVerified: boolean;
}

interface Tutor360Data {
  _id: string;
  fullName: string;
  hourlyRate: number;
  currency: string;
  city: string;
  teachingMode: string;
  subjects: string[];
  levels: string[];
  policeVerificationStatus: string;
  isVerified: boolean;
  averageRating: number;
  totalReviews: number;
  winRate: number;
  totalEarningsByCurrency: { currency: string; amount: number }[];
  offersSubmittedCount: number;
  completedBookingsCount: number;
  user: { name: string; email: string; phone?: string; avatar?: string };
  bids: any[];
  bookings: any[];
}

export default function TutorsDirectoryPage() {
  const { user } = useAuth();
  const canReadPayouts = user?.adminRole === "super_admin"
    || user?.adminRole === "finance"
    || user?.adminPermissions?.includes("*")
    || user?.adminPermissions?.includes("payout.read");
  const [tutors, setTutors] = useState<TutorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  const [tutor360, setTutor360] = useState<Tutor360Data | null>(null);
  const [loading360, setLoading360] = useState(false);
  
  // Document Upload Override State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<string>("cnicFront");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVideoUrl, setUploadVideoUrl] = useState<string>("");
  const [uploadSubmitting, setUploadSubmitting] = useState<boolean>(false);


  const fetchTutors = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users?role=tutor&limit=100");
      setTutors(res.data.users || []);
    } catch (err) {
      console.error("Failed to load tutors:", err);
      showError("Failed to load tutors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  const openTutor360 = async (id: string) => {
    setSelectedTutorId(id);
    setLoading360(true);
    try {
      const res = await api.get(`/admin/customers/tutors/${id}/360`);
      setTutor360(res.data.tutor);
    } catch (err) {
      console.error("Failed to load Tutor 360:", err);
    } finally {
      setLoading360(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && uploadDocType !== "videoIntro") {
      showError("Please select a file to upload.");
      return;
    }
    if (!uploadFile && uploadDocType === "videoIntro" && !uploadVideoUrl.trim()) {
      showError("Please select a video file or provide a video URL.");
      return;
    }

    setUploadSubmitting(true);
    try {
      const formData = new FormData();
      if (uploadFile) {
        formData.append(uploadDocType, uploadFile);
      }
      if (uploadDocType === "videoIntro" && uploadVideoUrl.trim()) {
        formData.append("videoUrl", uploadVideoUrl.trim());
      }

      await api.post(`/admin/tutors/${selectedTutorId}/upload-docs`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showSuccess("Document uploaded and approved successfully");
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadVideoUrl("");
      if (selectedTutorId) await openTutor360(selectedTutorId);
    } catch (err: any) {
      showError(err, "Failed to upload document");
    } finally {
      setUploadSubmitting(false);
    }
  };


  const filtered = tutors.filter((t) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return t.name.toLowerCase().includes(term) || t.email.toLowerCase().includes(term) || t.city?.toLowerCase().includes(term);
  });

  return (
    <div style={{ padding: "1.75rem 2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Link href="/admin" style={{ color: UI_COLORS.gray500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: UI_COLORS.border }}>/</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: STATUS_COLORS.success.color }}>Tutors</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: TEXT_COLORS.body, margin: 0 }}>
            Tutors Directory & Quality Operations
          </h1>
          <p style={{ color: UI_COLORS.gray500, fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
            Review tutor verification credentials, police clearance for home tuition, and performance statistics.
          </p>
        </div>

        <button
          onClick={fetchTutors}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 0.9rem",
            backgroundColor: "white",
            border: `1px solid ${UI_COLORS.border}`,
            borderRadius: "0.4rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Tutors
        </button>
      </div>

      {/* Search */}
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "0.85rem 1rem", border: `1px solid ${UI_COLORS.border}`, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Search size={16} style={{ color: TEXT_COLORS.muted }} />
        <input
          type="text"
          aria-label="Search tutors by name, email, or city"
          placeholder="Search tutor by name, email, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", fontSize: "0.85rem" }}
        />
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: UI_COLORS.gray500 }}>Loading Tutors…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: UI_COLORS.gray500 }}>No tutors found matching query.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ backgroundColor: UI_COLORS.card, borderBottom: `1px solid ${UI_COLORS.border}`, textAlign: "left", color: UI_COLORS.gray500 }}>
                <th style={{ padding: "0.85rem 1.25rem", fontWeight: 800 }}>Tutor</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Location</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Verification</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Registered</th>
                <th style={{ padding: "0.85rem 1.25rem", fontWeight: 800 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t._id} style={{ borderBottom: `1px solid ${UI_COLORS.card}` }}>
                  <td style={{ padding: "0.95rem 1.25rem" }}>
                    <strong style={{ display: "block", color: TEXT_COLORS.body, fontSize: "0.9rem" }}>{t.name}</strong>
                    <span style={{ color: UI_COLORS.gray500, fontSize: "0.78rem" }}>{t.email}</span>
                  </td>
                  <td style={{ padding: "0.95rem 1rem", color: TEXT_COLORS.muted }}>
                    <div>{t.city || "Pakistan"}</div>
                    <span style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted }}>{t.phone || "No phone"}</span>
                  </td>
                  <td style={{ padding: "0.95rem 1rem" }}>
                    <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, backgroundColor: t.isVerified ? STATUS_COLORS.success.bg : STATUS_COLORS.warning.bg, color: t.isVerified ? STATUS_COLORS.success.color : STATUS_COLORS.warning.color }}>
                      {t.isVerified ? "✓ Verified" : "Pending Review"}
                    </span>
                  </td>
                  <td style={{ padding: "0.95rem 1rem", color: UI_COLORS.gray500 }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "0.95rem 1.25rem" }}>
                    <button
                      onClick={() => openTutor360(t._id)}
                      style={{
                        padding: "0.35rem 0.75rem",
                        backgroundColor: STATUS_COLORS.success.color,
                        color: "white",
                        border: "none",
                        borderRadius: "0.4rem",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Tutor 360°
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tutor 360° Drawer Modal */}
      {selectedTutorId && (
        <div role="dialog" aria-modal="true" aria-labelledby="tutor360-title" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "100%", maxWidth: "620px", backgroundColor: "white", height: "100%", overflowY: "auto", padding: "2rem", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 id="tutor360-title" style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0, color: TEXT_COLORS.body }}>
                Tutor 360° Profile
              </h2>
              <button
                onClick={() => setSelectedTutorId(null)}
                aria-label="Close tutor profile"
                style={{ border: "none", background: "none", cursor: "pointer", color: UI_COLORS.gray500, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {loading360 || !tutor360 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: UI_COLORS.gray500 }}>Loading 360° Profile…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Profile Card */}
                <div style={{ padding: "1.2rem", backgroundColor: UI_COLORS.card, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}` }}>
                  <h3 style={{ margin: "0 0 0.3rem", fontSize: "1.1rem", fontWeight: 800 }}>
                    {tutor360.user?.name || tutor360.fullName}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: UI_COLORS.gray500 }}>
                    {tutor360.user?.email} · {tutor360.city} · Rate: {tutor360.currency} {tutor360.hourlyRate}/hr
                  </p>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: UI_COLORS.gray500 }}>
                    Teaching Mode: <strong>{tutor360.teachingMode}</strong>
                  </p>

                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.72rem", background: tutor360.isVerified ? STATUS_COLORS.success.bg : STATUS_COLORS.warning.bg, color: tutor360.isVerified ? STATUS_COLORS.success.color : STATUS_COLORS.warning.color, padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                      {tutor360.isVerified ? "✓ Identity Verified" : "Identity Unverified"}
                    </span>
                    <span style={{ fontSize: "0.72rem", background: tutor360.policeVerificationStatus === "approved" ? STATUS_COLORS.success.bg : STATUS_COLORS.danger.bg, color: tutor360.policeVerificationStatus === "approved" ? STATUS_COLORS.success.color : STATUS_COLORS.danger.color, padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                      {tutor360.policeVerificationStatus === "approved" ? "✓ Police Cleared (Home Eligible)" : "⚠️ No Police Clearance"}
                    </span>
                   </div>

                   <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "white", border: `1px dashed ${UI_COLORS.border}`, borderRadius: "0.5rem" }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                       <div>
                         <h4 style={{ margin: "0 0 0.2rem", fontSize: "0.95rem", fontWeight: 800 }}>Admin Document Override</h4>
                         <p style={{ margin: 0, fontSize: "0.78rem", color: UI_COLORS.gray500 }}>Force upload a missing or rejected document for this tutor.</p>
                       </div>
                       <button
                         onClick={() => setUploadModalOpen(true)}
                         style={{ padding: "0.4rem 0.8rem", backgroundColor: UI_COLORS.accent, color: "white", border: "none", borderRadius: "0.4rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                       >
                         Override Document
                       </button>
                     </div>
                   </div>

                   {canReadPayouts && (
                     <PayoutReportDownload endpoint={`/admin/tutors/${tutor360._id}/payout-report/pdf`} label="Download payout PDF" compact />
                   )}

                   <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginTop: "1rem" }}>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: UI_COLORS.gray500, fontWeight: 700 }}>Offers Sent</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: TEXT_COLORS.body }}>{tutor360.offersSubmittedCount}</strong>
                    </div>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: UI_COLORS.gray500, fontWeight: 700 }}>Win Rate</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: STATUS_COLORS.success.color }}>{tutor360.winRate}%</strong>
                    </div>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: UI_COLORS.gray500, fontWeight: 700 }}>Rating</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: STATUS_COLORS.warning.color }}>★ {tutor360.averageRating?.toFixed(1) || "5.0"}</strong>
                    </div>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: UI_COLORS.gray500, fontWeight: 700 }}>Earnings</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: STATUS_COLORS.success.color }}>
                        {tutor360.totalEarningsByCurrency.length === 0
                          ? "—"
                          : tutor360.totalEarningsByCurrency.map((s) => `${s.currency} ${s.amount.toLocaleString()}`).join(" · ")}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Subjects & Curricula */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Subjects & Domains</h4>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    {(tutor360.subjects || []).map((s) => (
                      <span key={s} style={{ fontSize: "0.75rem", background: UI_COLORS.card, padding: "0.2rem 0.55rem", borderRadius: "4px", fontWeight: 600 }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recent Offers */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
                    Recent Proposals ({tutor360.bids.length})
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {tutor360.bids.slice(0, 5).map((b) => (
                      <div key={b._id} style={{ padding: "0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.5rem", fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>{b.request?.subject || "Subject"}</strong>
                          <span style={{ fontWeight: 700, color: b.status === "accepted" ? STATUS_COLORS.success.color : UI_COLORS.gray500 }}>{b.status}</span>
                        </div>
                        <span style={{ color: UI_COLORS.gray500 }}>Offered: {b.currency || "USD"} {b.amount} · Date: {new Date(b.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Override Upload Modal */}
      {uploadModalOpen && tutor360 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !uploadSubmitting && setUploadModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: UI_COLORS.surface,
              borderRadius: 12,
              maxWidth: 480,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 id="upload-modal-title" style={{ fontSize: "1.1rem", fontWeight: 800, color: TEXT_COLORS.body, margin: 0 }}>
                Upload on Behalf of {tutor360.user?.name || tutor360.fullName}
              </h2>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploadSubmitting}
                aria-label="Close upload modal"
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: UI_COLORS.gray500, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: 6 }}>
                  Document Type
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => {
                    setUploadDocType(e.target.value);
                    setUploadFile(null);
                    setUploadVideoUrl("");
                  }}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${UI_COLORS.border}`, borderRadius: 8, fontSize: 13 }}
                >
                  <option value="cnicFront">CNIC (Front) — JPG, PNG, WEBP, PDF</option>
                  <option value="cnicBack">CNIC (Back) — JPG, PNG, WEBP, PDF</option>
                  <option value="degree">Educational Degree / Transcript — JPG, PNG, PDF</option>
                  <option value="videoIntro">Demo Video — MP4 or URL</option>
                  <option value="policeCertificate">Police Verification Certificate — JPG, PNG, PDF</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: 6 }}>
                  Select File {uploadDocType === "videoIntro" ? "(MP4 format, max 50MB)" : "(PDF, JPG, PNG, WEBP, max 10MB)"}
                </label>
                <input
                  type="file"
                  accept={uploadDocType === "videoIntro" ? "video/mp4" : "application/pdf,image/jpeg,image/png,image/webp"}
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  style={{ width: "100%", fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploadSubmitting}
                  style={{ padding: "0.5rem 1rem", backgroundColor: UI_COLORS.card, color: TEXT_COLORS.muted, border: "none", borderRadius: "0.4rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadSubmitting}
                  style={{ padding: "0.5rem 1rem", backgroundColor: STATUS_COLORS.success.color, color: "white", border: "none", borderRadius: "0.4rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: uploadSubmitting ? 0.7 : 1 }}
                >
                  {uploadSubmitting ? "Uploading..." : "Upload & Approve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
