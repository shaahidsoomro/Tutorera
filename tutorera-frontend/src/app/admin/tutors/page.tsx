"use client";

import PayoutReportDownload from "@/components/Finance/PayoutReportDownload";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { ArrowLeft,RefreshCw,Search,X } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

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
  totalEarnings: number;
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

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users?role=tutor&limit=100");
      setTutors(res.data.users || []);
    } catch (err) {
      console.error("Failed to load tutors:", err);
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
            <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#16a34a" }}>Tutors</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            Tutors Directory & Quality Operations
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
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
            border: "1px solid #cbd5e1",
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
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "0.85rem 1rem", border: "1px solid #e2e8f0", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Search size={16} style={{ color: "#94a3b8" }} />
        <input
          type="text"
          placeholder="Search tutor by name, email, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", fontSize: "0.85rem" }}
        />
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading Tutors…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>No tutors found matching query.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: "0.85rem 1.25rem", fontWeight: 800 }}>Tutor</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Location</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Verification</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Registered</th>
                <th style={{ padding: "0.85rem 1.25rem", fontWeight: 800 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.95rem 1.25rem" }}>
                    <strong style={{ display: "block", color: "#0f172a", fontSize: "0.9rem" }}>{t.name}</strong>
                    <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{t.email}</span>
                  </td>
                  <td style={{ padding: "0.95rem 1rem", color: "#475569" }}>
                    <div>{t.city || "Pakistan"}</div>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{t.phone || "No phone"}</span>
                  </td>
                  <td style={{ padding: "0.95rem 1rem" }}>
                    <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, backgroundColor: t.isVerified ? "#ecfdf5" : "#fffbeb", color: t.isVerified ? "#059669" : "#d97706" }}>
                      {t.isVerified ? "✓ Verified" : "Pending Review"}
                    </span>
                  </td>
                  <td style={{ padding: "0.95rem 1rem", color: "#64748b" }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "0.95rem 1.25rem" }}>
                    <button
                      onClick={() => openTutor360(t._id)}
                      style={{
                        padding: "0.35rem 0.75rem",
                        backgroundColor: "#16a34a",
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
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "100%", maxWidth: "620px", backgroundColor: "white", height: "100%", overflowY: "auto", padding: "2rem", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0, color: "#0f172a" }}>
                Tutor 360° Profile
              </h2>
              <button
                onClick={() => setSelectedTutorId(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            {loading360 || !tutor360 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading 360° Profile…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Profile Card */}
                <div style={{ padding: "1.2rem", backgroundColor: "#f8fafc", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
                  <h3 style={{ margin: "0 0 0.3rem", fontSize: "1.1rem", fontWeight: 800 }}>
                    {tutor360.user?.name || tutor360.fullName}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                    {tutor360.user?.email} · {tutor360.city} · Rate: {tutor360.currency} {tutor360.hourlyRate}/hr
                  </p>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                    Teaching Mode: <strong>{tutor360.teachingMode}</strong>
                  </p>

                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.72rem", background: tutor360.isVerified ? "#ecfdf5" : "#fffbeb", color: tutor360.isVerified ? "#059669" : "#b45309", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                      {tutor360.isVerified ? "✓ Identity Verified" : "Identity Unverified"}
                    </span>
                    <span style={{ fontSize: "0.72rem", background: tutor360.policeVerificationStatus === "approved" ? "#ecfdf5" : "#fee2e2", color: tutor360.policeVerificationStatus === "approved" ? "#059669" : "#b91c1c", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 700 }}>
                      {tutor360.policeVerificationStatus === "approved" ? "✓ Police Cleared (Home Eligible)" : "⚠️ No Police Clearance"}
                    </span>
                   </div>

                   {canReadPayouts && (
                     <PayoutReportDownload endpoint={`/admin/tutors/${tutor360._id}/payout-report/pdf`} label="Download payout PDF" compact />
                   )}

                   <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginTop: "1rem" }}>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Offers Sent</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: "#0f172a" }}>{tutor360.offersSubmittedCount}</strong>
                    </div>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Win Rate</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: "#059669" }}>{tutor360.winRate}%</strong>
                    </div>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Rating</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: "#d97706" }}>★ {tutor360.averageRating?.toFixed(1) || "5.0"}</strong>
                    </div>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Earnings</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: "#16a34a" }}>PKR {tutor360.totalEarnings.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* Subjects & Curricula */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Subjects & Domains</h4>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    {(tutor360.subjects || []).map((s) => (
                      <span key={s} style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "0.2rem 0.55rem", borderRadius: "4px", fontWeight: 600 }}>
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
                      <div key={b._id} style={{ padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>{b.request?.subject || "Subject"}</strong>
                          <span style={{ fontWeight: 700, color: b.status === "accepted" ? "#059669" : "#64748b" }}>{b.status}</span>
                        </div>
                        <span style={{ color: "#64748b" }}>Offered: PKR {b.amount} · Date: {new Date(b.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
