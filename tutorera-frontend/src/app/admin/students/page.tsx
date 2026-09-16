"use client";

import api from "@/lib/axios";
import { ArrowLeft,RefreshCw,Search,X } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

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
  lifetimeSpend: number;
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
            <Link href="/admin" style={{ color: "#64748b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: 700 }}>
              <ArrowLeft size={14} /> Control Tower
            </Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0329b2" }}>Students</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", margin: 0 }}>
            Students Directory & Lifecycle Intelligence
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
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
            backgroundColor: "white",
            border: "1px solid #cbd5e1",
            borderRadius: "0.4rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Students
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "0.85rem 1rem", border: "1px solid #e2e8f0", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Search size={16} style={{ color: "#94a3b8" }} />
        <input
          type="text"
          placeholder="Search student by name, email, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", fontSize: "0.85rem" }}
        />
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading Students…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>No students found matching query.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: "0.85rem 1.25rem", fontWeight: 800 }}>Student</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Contact & Location</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Registered</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: 800 }}>Status</th>
                <th style={{ padding: "0.85rem 1.25rem", fontWeight: 800 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.95rem 1.25rem" }}>
                    <strong style={{ display: "block", color: "#0f172a", fontSize: "0.9rem" }}>{s.name}</strong>
                    <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{s.email}</span>
                  </td>
                  <td style={{ padding: "0.95rem 1rem", color: "#475569" }}>
                    <div>{s.city || "Unknown City"}, {s.countryName || "PK"}</div>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{s.phone || "No phone"}</span>
                  </td>
                  <td style={{ padding: "0.95rem 1rem", color: "#64748b" }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "0.95rem 1rem" }}>
                    <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, backgroundColor: s.isActive ? "#ecfdf5" : "#fee2e2", color: s.isActive ? "#059669" : "#dc2626" }}>
                      {s.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ padding: "0.95rem 1.25rem" }}>
                    <button
                      onClick={() => openStudent360(s._id)}
                      style={{
                        padding: "0.35rem 0.75rem",
                        backgroundColor: "#0329b2",
                        color: "white",
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
          <div style={{ width: "100%", maxWidth: "600px", backgroundColor: "white", height: "100%", overflowY: "auto", padding: "2rem", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0, color: "#0f172a" }}>
                Student 360° Profile
              </h2>
              <button
                onClick={() => setSelectedStudentId(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            {loading360 || !student360 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading 360° Profile…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Basic Card */}
                <div style={{ padding: "1.2rem", backgroundColor: "#f8fafc", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
                  <h3 style={{ margin: "0 0 0.3rem", fontSize: "1.1rem", fontWeight: 800 }}>{student360.name}</h3>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>{student360.email} · {student360.phone || "No phone"}</p>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>{student360.city}, {student360.countryName}</p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: "1rem" }}>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Total Requests</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: "#0f172a" }}>{student360.totalRequestsCount}</strong>
                    </div>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Bookings</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: "#059669" }}>{student360.completedBookingsCount}</strong>
                    </div>
                    <div style={{ backgroundColor: "white", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Lifetime Spend</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: "#0329b2" }}>PKR {student360.lifetimeSpend.toLocaleString()}</strong>
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
                      <div key={r._id} style={{ padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>{r.subject} ({r.level})</strong>
                          <span style={{ fontWeight: 700, color: r.status === "expired" ? "#dc2626" : "#059669" }}>{r.status}</span>
                        </div>
                        <span style={{ color: "#64748b" }}>Budget: {r.currency || "PKR"} {r.budget} · Mode: {r.teachingMode}</span>
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
                      <div key={b._id} style={{ padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>Tutor: {b.tutor?.name || "Tutor"}</strong>
                          <span style={{ fontWeight: 700, color: "#0329b2" }}>PKR {b.studentTotal || b.amount}</span>
                        </div>
                        <span style={{ color: "#64748b" }}>Status: {b.status} · Payment: {b.paymentStatus}</span>
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
