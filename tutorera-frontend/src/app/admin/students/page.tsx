"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ArrowLeft, RefreshCw, Search, BookOpen, CheckCircle, CreditCard, X } from "lucide-react";
import api from "@/lib/axios";
import { showError } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

interface StudentItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  countryName?: string;
  createdAt: string;
  isActive: boolean;
}

interface Student360Data {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  countryName?: string;
  lifetimeSpendByCurrency: { currency: string; amount: number }[];
  totalRequestsCount: number;
  completedBookingsCount: number;
  requests: any[];
  bookings: any[];
}

export default function StudentsDirectoryPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [student360, setStudent360] = useState<Student360Data | null>(null);
  const [loading360, setLoading360] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users?role=student&limit=100");
      setStudents(res.data.users || []);
    } catch (err) {
      console.error("Failed to load students:", err);
      showError("Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openStudent360 = async (id: string) => {
    setSelectedStudentId(id);
    setLoading360(true);
    try {
      const res = await api.get(`/admin/customers/students/${id}/360`);
      setStudent360(res.data.student);
    } catch (err) {
      console.error("Failed to load Student 360:", err);
    } finally {
      setLoading360(false);
    }
  };

  const filtered = students.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term) || s.city?.toLowerCase().includes(term);
  });

  return (
    <div style={{ padding: "1.75rem 2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Link href="/admin" style={{ color: TEXT_COLORS.muted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: UI_COLORS.border }}>/</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: UI_COLORS.accent }}>Students</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: TEXT_COLORS.body, margin: 0 }}>
            Students Directory & Lifecycle Intelligence
          </h1>
          <p style={{ color: TEXT_COLORS.muted, fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
            Monitor student customer accounts, request activity, conversion, and repeat booking loyalty.
          </p>
        </div>

        <button
          onClick={fetchStudents}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 0.9rem",
            backgroundColor: UI_COLORS.surface,
            border: `1px solid ${UI_COLORS.border}`,
            borderRadius: "0.4rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Students
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", padding: "0.85rem 1rem", border: `1px solid ${UI_COLORS.border}`, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Search size={16} style={{ color: TEXT_COLORS.muted }} />
        <input
          type="text"
          aria-label="Search students by name, email, or city"
          placeholder="Search student by name, email, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", fontSize: "0.85rem" }}
        />
      </div>

      {/* Table */}
      <div style={{ backgroundColor: UI_COLORS.surface, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: TEXT_COLORS.muted }}>Loading Students…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: TEXT_COLORS.muted }}>No students found matching query.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ backgroundColor: STATUS_COLORS.neutral.bg, borderBottom: `1px solid ${UI_COLORS.border}`, textAlign: "left", color: TEXT_COLORS.muted }}>
                <th style={{ padding: "0.85rem 1.25rem", fontWeight: 800 }}>Student</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Contact & Location</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Registered</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Status</th>
                <th style={{ padding: "0.85rem 1.25rem", fontWeight: 800 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id} style={{ borderBottom: `1px solid ${STATUS_COLORS.neutral.bg}` }}>
                  <td style={{ padding: "0.95rem 1.25rem" }}>
                    <strong style={{ display: "block", color: TEXT_COLORS.body, fontSize: "0.9rem" }}>{s.name}</strong>
                    <span style={{ color: TEXT_COLORS.muted, fontSize: "0.78rem" }}>{s.email}</span>
                  </td>
                  <td style={{ padding: "0.95rem 1rem", color: TEXT_COLORS.secondary }}>
                    <div>{s.city || "Unknown City"}, {s.countryName || "PK"}</div>
                    <span style={{ fontSize: "0.72rem", color: TEXT_COLORS.muted }}>{s.phone || "No phone"}</span>
                  </td>
                  <td style={{ padding: "0.95rem 1rem", color: TEXT_COLORS.muted }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "0.95rem 1rem" }}>
                    <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, backgroundColor: s.isActive ? STATUS_COLORS.success.bg : STATUS_COLORS.danger.bg, color: s.isActive ? STATUS_COLORS.success.color : STATUS_COLORS.danger.color }}>
                      {s.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ padding: "0.95rem 1.25rem" }}>
                    <button
                      onClick={() => openStudent360(s._id)}
                      style={{
                        padding: "0.35rem 0.75rem",
                        backgroundColor: UI_COLORS.accent,
                        color: UI_COLORS.surface,
                        border: "none",
                        borderRadius: "0.4rem",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Student 360°
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Student 360° Drawer Modal */}
      {selectedStudentId && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "100%", maxWidth: "600px", backgroundColor: UI_COLORS.surface, height: "100%", overflowY: "auto", padding: "2rem", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0, color: TEXT_COLORS.body }}>
                Student 360° Profile
              </h2>
              <button
                onClick={() => setSelectedStudentId(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: TEXT_COLORS.muted }}
              >
                <X size={20} />
              </button>
            </div>

            {loading360 || !student360 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: TEXT_COLORS.muted }}>Loading 360° Profile…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Basic Card */}
                <div style={{ padding: "1.2rem", backgroundColor: STATUS_COLORS.neutral.bg, borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}` }}>
                  <h3 style={{ margin: "0 0 0.3rem", fontSize: "1.1rem", fontWeight: 800 }}>{student360.name}</h3>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: TEXT_COLORS.muted }}>{student360.email} · {student360.phone || "No phone"}</p>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: TEXT_COLORS.muted }}>{student360.city}, {student360.countryName}</p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: "1rem" }}>
                    <div style={{ backgroundColor: UI_COLORS.surface, padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: TEXT_COLORS.muted, fontWeight: 700 }}>Total Requests</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: TEXT_COLORS.body }}>{student360.totalRequestsCount}</strong>
                    </div>
                    <div style={{ backgroundColor: UI_COLORS.surface, padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: TEXT_COLORS.muted, fontWeight: 700 }}>Bookings</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: STATUS_COLORS.success.color }}>{student360.completedBookingsCount}</strong>
                    </div>
                    <div style={{ backgroundColor: UI_COLORS.surface, padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: TEXT_COLORS.muted, fontWeight: 700 }}>Lifetime Spend</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: UI_COLORS.accent }}>
                        {student360.lifetimeSpendByCurrency.length === 0
                          ? "—"
                          : student360.lifetimeSpendByCurrency.map((s) => `${s.currency} ${s.amount.toLocaleString()}`).join(" · ")}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Tuition Requests History */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.6rem" }}>
                    Tuition Requests ({student360.requests.length})
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {student360.requests.map((r) => (
                      <div key={r._id} style={{ padding: "0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.5rem", fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>{r.subject} ({r.level})</strong>
                          <span style={{ fontWeight: 700, color: r.status === "expired" ? STATUS_COLORS.danger.color : STATUS_COLORS.success.color }}>{r.status}</span>
                        </div>
                        <span style={{ color: TEXT_COLORS.muted }}>Budget: {r.currency || "USD"} {r.budget} · Mode: {r.teachingMode}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bookings History */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.6rem" }}>
                    Bookings & Sessions ({student360.bookings.length})
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {student360.bookings.map((b) => (
                      <div key={b._id} style={{ padding: "0.75rem", border: `1px solid ${UI_COLORS.border}`, borderRadius: "0.5rem", fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>Tutor: {b.tutor?.name || "Tutor"}</strong>
                          <span style={{ fontWeight: 700, color: UI_COLORS.accent }}>{b.currency || "USD"} {b.studentTotal || b.amount}</span>
                        </div>
                        <span style={{ color: TEXT_COLORS.muted }}>Status: {b.status} · Payment: {b.paymentStatus}</span>
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
