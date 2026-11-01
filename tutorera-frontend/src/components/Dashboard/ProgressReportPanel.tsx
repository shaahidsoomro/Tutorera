"use client";
import { showError, showSuccess } from "@/lib/toast";
import axiosInstance from "@/lib/axios";
import { useState, useEffect, useCallback } from "react";

interface ProgressReport {
  _id: string;
  sessionDate: string;
  sessionNumber?: number;
  topicsCovered: string[];
  homework?: string;
  attendanceStatus: "present" | "absent" | "late" | "rescheduled";
  tutorNotes?: string;
  studentMood?: "great" | "good" | "okay" | "struggling";
  nextSessionGoals?: string;
  tutor?: { name: string; avatar?: string };
  createdAt: string;
}

interface Summary {
  totalSessions: number;
  attended: number;
  absent: number;
  allTopics: string[];
}

const ATTENDANCE_COLOR: Record<string, string> = {
  present: "#16a34a",
  absent: "#dc2626",
  late: "#d97706",
  rescheduled: "#6b7280",
};

const MOOD_EMOJI: Record<string, string> = {
  great: "😄",
  good: "🙂",
  okay: "😐",
  struggling: "😟",
};

export default function ProgressReportPanel({
  bookingId,
  role,
}: {
  bookingId: string;
  role: "student" | "tutor" | "parent";
}) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [topicsInput, setTopicsInput] = useState("");
  const [homework, setHomework] = useState("");
  const [attendance, setAttendance] = useState<"present" | "absent" | "late" | "rescheduled">("present");
  const [tutorNotes, setTutorNotes] = useState("");
  const [nextGoals, setNextGoals] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/bookings/${bookingId}/progress-reports`);
      setReports(res.data.reports ?? []);
      setSummary(res.data.summary ?? null);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleSubmit = async () => {
    const topics = topicsInput.split(",").map(t => t.trim()).filter(Boolean);
    if (topics.length === 0) {
      showError("Enter at least one topic covered.");
      return;
    }
    setSubmitting(true);
    try {
      await axiosInstance.post(`/bookings/${bookingId}/progress-reports`, {
        topicsCovered: topics,
        homework: homework || undefined,
        attendanceStatus: attendance,
        tutorNotes: tutorNotes || undefined,
        nextSessionGoals: nextGoals || undefined,
        sessionDate,
      });
      showSuccess("Progress report submitted.");
      setShowForm(false);
      setTopicsInput(""); setHomework(""); setTutorNotes(""); setNextGoals("");
      setAttendance("present");
      load();
    } catch (err) {
      showError(err, "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMood = async (reportId: string, mood: string) => {
    try {
      await axiosInstance.patch(`/bookings/${bookingId}/progress-reports/${reportId}/mood`, { mood });
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, studentMood: mood as any } : r));
    } catch (err) {
      showError(err, "Failed to save feedback.");
    }
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          padding: "0.45rem 0.9rem", background: open ? "#f1f5f9" : "white",
          color: "#475569", border: "1px solid #e2e8f0", borderRadius: "0.5rem",
          fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
        }}
      >
        📊 Learning Progress {summary ? `(${summary.totalSessions} sessions)` : ""}
        <span style={{ fontSize: "0.7rem", transform: open ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
      </button>

      {open && (
        <div style={{ marginTop: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", overflow: "hidden" }}>
          {/* Summary bar */}
          {summary && summary.totalSessions > 0 && (
            <div style={{ background: "#f8fafc", padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.8rem" }}>
              <span><strong style={{ color: "#021550" }}>{summary.totalSessions}</strong> <span style={{ color: "#6b7280" }}>sessions logged</span></span>
              <span><strong style={{ color: "#16a34a" }}>{summary.attended}</strong> <span style={{ color: "#6b7280" }}>attended</span></span>
              {summary.absent > 0 && <span><strong style={{ color: "#dc2626" }}>{summary.absent}</strong> <span style={{ color: "#6b7280" }}>absent</span></span>}
              {summary.allTopics.length > 0 && (
                <span style={{ color: "#6b7280" }}>Topics: <strong style={{ color: "#374151" }}>{summary.allTopics.slice(0, 5).join(", ")}{summary.allTopics.length > 5 ? ` +${summary.allTopics.length - 5} more` : ""}</strong></span>
              )}
            </div>
          )}

          {/* Tutor submit form */}
          {role === "tutor" && (
            <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #e2e8f0", background: "#fffbeb" }}>
              {!showForm ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  style={{ padding: "0.5rem 1rem", background: "#0329b2", color: "white", border: "none", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                >
                  + File Session Report
                </button>
              ) : (
                <div>
                  <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", fontWeight: 700, color: "#021550" }}>New Session Report</p>
                  <div style={{ display: "grid", gap: "0.6rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Session Date</label>
                      <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                        style={{ padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "0.4rem", fontSize: "0.82rem", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>
                        Topics Covered <span style={{ color: "#6b7280", fontWeight: 400 }}>(comma-separated)</span>
                      </label>
                      <input type="text" value={topicsInput} onChange={e => setTopicsInput(e.target.value)}
                        placeholder="e.g. Quadratic equations, Factoring, Word problems"
                        style={{ padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "0.4rem", fontSize: "0.82rem", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Attendance</label>
                      <select value={attendance} onChange={e => setAttendance(e.target.value as any)}
                        style={{ padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "0.4rem", fontSize: "0.82rem", width: "100%", boxSizing: "border-box" }}>
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="rescheduled">Rescheduled</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Homework Assigned <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></label>
                      <textarea value={homework} onChange={e => setHomework(e.target.value)} rows={2} maxLength={1000}
                        placeholder="Describe any homework or practice tasks assigned…"
                        style={{ padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "0.4rem", fontSize: "0.82rem", resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Next Session Goals <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></label>
                      <input type="text" value={nextGoals} onChange={e => setNextGoals(e.target.value)} maxLength={500}
                        placeholder="What will you cover next time?"
                        style={{ padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "0.4rem", fontSize: "0.82rem", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Internal Notes <span style={{ color: "#9ca3af", fontWeight: 400 }}>(not shown to student)</span></label>
                      <textarea value={tutorNotes} onChange={e => setTutorNotes(e.target.value)} rows={2} maxLength={2000}
                        placeholder="Notes for your own records…"
                        style={{ padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "0.4rem", fontSize: "0.82rem", resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="button" onClick={handleSubmit} disabled={submitting}
                        style={{ padding: "0.55rem 1.25rem", background: submitting ? "#93c5fd" : "#0329b2", color: "white", border: "none", borderRadius: "0.5rem", fontSize: "0.82rem", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}>
                        {submitting ? "Saving…" : "Submit Report"}
                      </button>
                      <button type="button" onClick={() => setShowForm(false)}
                        style={{ padding: "0.55rem 1rem", background: "white", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div style={{ padding: "1rem" }}>
            {loading ? (
              <p style={{ fontSize: "0.82rem", color: "#9ca3af", textAlign: "center", margin: "1rem 0" }}>Loading…</p>
            ) : reports.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "#9ca3af", textAlign: "center", margin: "1rem 0" }}>
                {role === "tutor" ? "No reports filed yet. File one after each session." : "No session reports yet. Your tutor will file reports after each session."}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {[...reports].reverse().map((r) => (
                  <div key={r._id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.625rem", padding: "0.875rem 1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.6rem" }}>
                      <div>
                        {r.sessionNumber && (
                          <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#0329b2", background: "#EEF5FF", border: "1px solid #bfdbfe", borderRadius: "999px", padding: "1px 7px", marginRight: "0.5rem" }}>
                            Session #{r.sessionNumber}
                          </span>
                        )}
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ATTENDANCE_COLOR[r.attendanceStatus], background: `${ATTENDANCE_COLOR[r.attendanceStatus]}15`, border: `1px solid ${ATTENDANCE_COLOR[r.attendanceStatus]}40`, borderRadius: "999px", padding: "1px 7px" }}>
                          {r.attendanceStatus.charAt(0).toUpperCase() + r.attendanceStatus.slice(1)}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
                        {new Date(r.sessionDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    {r.topicsCovered.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
                        {r.topicsCovered.map((t, i) => (
                          <span key={i} style={{ fontSize: "0.72rem", padding: "2px 8px", background: "white", border: "1px solid #d1d5db", borderRadius: "999px", color: "#374151", fontWeight: 500 }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {r.homework && (
                      <p style={{ fontSize: "0.78rem", color: "#475569", margin: "0.35rem 0 0" }}>
                        <strong style={{ color: "#021550" }}>Homework:</strong> {r.homework}
                      </p>
                    )}

                    {r.nextSessionGoals && (
                      <p style={{ fontSize: "0.78rem", color: "#475569", margin: "0.35rem 0 0" }}>
                        <strong style={{ color: "#021550" }}>Next session:</strong> {r.nextSessionGoals}
                      </p>
                    )}

                    {/* Student mood feedback */}
                    {role === "student" && (
                      <div style={{ marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: "1px solid #e2e8f0" }}>
                        <p style={{ fontSize: "0.72rem", color: "#6b7280", margin: "0 0 0.4rem" }}>How did this session feel?</p>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          {(["great", "good", "okay", "struggling"] as const).map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleMood(r._id, m)}
                              title={m}
                              style={{
                                padding: "0.3rem 0.6rem",
                                border: `1.5px solid ${r.studentMood === m ? "#0329b2" : "#e2e8f0"}`,
                                borderRadius: "0.4rem",
                                background: r.studentMood === m ? "#EEF5FF" : "white",
                                cursor: "pointer",
                                fontSize: "1rem",
                                lineHeight: 1,
                              }}
                            >
                              {MOOD_EMOJI[m]}
                            </button>
                          ))}
                          {r.studentMood && (
                            <span style={{ fontSize: "0.75rem", color: "#6b7280", alignSelf: "center", marginLeft: "0.25rem" }}>
                              {r.studentMood}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {role !== "student" && r.studentMood && (
                      <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0.35rem 0 0" }}>
                        Student mood: {MOOD_EMOJI[r.studentMood]} {r.studentMood}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
