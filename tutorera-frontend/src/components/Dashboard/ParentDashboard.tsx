"use client";
import ConsentLinkChildModal from "@/components/Parent/ConsentLinkChildModal";
import GuardianConsentInbox from "@/components/Parent/GuardianConsentInbox";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { formatPKR } from "@/lib/site";
import { showError,showSuccess } from "@/lib/toast";
import { BookOpen,Clock,Plus,Trash2,Users } from "lucide-react";
import { useEffect,useState } from "react";

const C = UI_COLORS;

interface ChildProfile {
  _id: string;
  studentUser: string;
  name: string;
  level: string;
  subjects: string[];
  relationship: string;
  studentProfile?: {
    fullName: string;
    city?: string;
    institution?: string;
    currentLevel?: string;
  } | null;
}

interface RecentBooking {
  _id: string;
  studentName: string;
  tutorName: string;
  subject: string;
  amount: number;
  status: string;
  teachingMode: string;
  createdAt: string;
}

interface ParentProfileData {
  profile: {
    _id: string;
    children: ChildProfile[];
    approvalRequiredForBookings: boolean;
    spendingLimitMonthly?: number;
    spendingLimitCurrency?: string;
    currency?: string;
    notificationsEnabled: boolean;
  };
  recentBookings: RecentBooking[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    completed: { label: "Completed", color: "#059669", bg: "#ecfdf5" },
    upcoming: { label: "Upcoming", color: "#7c3aed", bg: "#f5f3ff" },
    ongoing: { label: "Ongoing", color: "#d97706", bg: "#fffbeb" },
    cancelled: { label: "Cancelled", color: "#dc2626", bg: "#fef2f2" },
    open: { label: "Open", color: "#2563eb", bg: "#eff6ff" },
  };
  const b = map[status] ?? { label: status, color: "#6b7280", bg: "#f9fafb" };
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: b.color, backgroundColor: b.bg, padding: "0.2rem 0.6rem", borderRadius: "999px" }}>
      {b.label}
    </span>
  );
}

function TeachingModeBadge({ mode }: { mode: string }) {
  const label = mode === "online" ? "Online" : mode === "home" ? "Home" : "Hybrid";
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: C.accent, backgroundColor: "#EEF5FF", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>
      {label}
    </span>
  );
}

function EmptyState({ onLink }: { onLink: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem", backgroundColor: "white", borderRadius: "1rem", border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👨‍👩‍👧‍👦</div>
      <h3 style={{ fontWeight: 700, color: C.primary, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
        No children linked yet
      </h3>
      <p style={{ color: C.gray500, fontSize: "0.875rem", maxWidth: "360px", margin: "0 auto 1.5rem" }}>
        Link a student account to manage bookings, track progress, and approve sessions for your children.
      </p>
      <button onClick={onLink} style={{ backgroundColor: C.accent, color: "white", padding: "0.75rem 1.5rem", borderRadius: "0.5rem", border: "none", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          <Plus size={16} /> Link Child Account
        </span>
      </button>
    </div>
  );
}

interface PendingBookingApproval {
  _id: string;
  studentId: string;
  bidId: string;
  tutorId: string;
  tutorName: string;
  subject: string;
  schedule?: string;
  teachingMode?: string;
  amount: number;
  currency: string;
  expiresAt: string;
  status: "pending";
}

interface ParentDashboardProps {
  userId: string;
  userName: string;
  userAvatar?: string;
}

export default function ParentDashboard({ userId }: ParentDashboardProps) {
  const [data, setData] = useState<ParentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [approvals, setApprovals] = useState<PendingBookingApproval[]>([]);
  const [actingOnApproval, setActingOnApproval] = useState<string | null>(null);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState("0");
  const [limitCurrency, setLimitCurrency] = useState("PKR");

  const fetchApprovals = async () => {
    try {
      const response = await api.get("/parent/booking-approvals");
      setApprovals(response.data.approvals || []);
    } catch {
      showError("Unable to load booking approval requests.");
    }
  };

  const decideApproval = async (id: string, decision: "approved" | "rejected") => {
    setActingOnApproval(id);
    try {
      await api.post(`/parent/booking-approvals/${id}/decision`, { decision });
      showSuccess(decision === "approved" ? "Offer approved for your child." : "Offer declined.");
      await fetchApprovals();
    } catch (error) {
      showError(error, "Could not process this approval. Refresh and try again.");
    } finally { setActingOnApproval(null); }
  };

  const saveControls = async () => {
    const limit = Number(monthlyLimit);
    if (limitEnabled && (!Number.isFinite(limit) || limit < 0 || limit > 1e9)) {
      showError("Provide a valid monthly spending limit.");
      return;
    }
    setSavingSettings(true);
    try {
      await api.patch("/parent/settings", {
        approvalRequiredForBookings: approvalRequired,
        spendingLimitMonthly: limitEnabled ? limit : null,
        spendingLimitCurrency: limitCurrency,
      });
      showSuccess("Parent booking controls updated.");
      fetchProfile();
    } catch (error) { showError(error, "Could not save guardian settings."); }
    finally { setSavingSettings(false); }
  };


  const fetchProfile = () => {
    api.get("/parent/profile")
.then(res => {
        setData(res.data);
        setApprovalRequired(res.data.profile.approvalRequiredForBookings ?? true);
        setLimitEnabled(res.data.profile.spendingLimitMonthly != null);
        setMonthlyLimit(String(res.data.profile.spendingLimitMonthly ?? "0"));
        setLimitCurrency(res.data.profile.spendingLimitCurrency || res.data.profile.currency || "PKR");
      })
      .catch(() => showError("Failed to load parent profile."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); void fetchApprovals(); }, []);

  const handleUnlink = async (childId: string) => {
    try {
      await api.delete(`/parent/children/${childId}`);
      showSuccess("Child account unlinked.");
      fetchProfile();
    } catch {
      showError("Failed to unlink child account.");
    }
  };

  const children = data?.profile?.children ?? [];
  const recentBookings = data?.recentBookings ?? [];

  const parentUserIdDisplay = userId;

  return (
    <div style={{ maxWidth: "960px" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: C.primary, marginBottom: "0.4rem" }}>
          Parent Dashboard
        </h1>
        <p style={{ color: C.gray500, fontSize: "0.875rem" }}>
          Manage your children&apos;s tutoring accounts, track sessions, and oversee bookings.
        </p>
      </div>

      <GuardianConsentInbox onApproved={fetchProfile} />

      {/* Parent ID share card */}
      <div style={{ backgroundColor: "#EEF5FF", border: "1px solid #bfdbfe", borderRadius: "0.875rem", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: C.accent, fontSize: "0.85rem", marginBottom: "0.2rem" }}>Your Parent ID</p>
          <p style={{ fontSize: "0.78rem", color: C.gray500, marginBottom: "0.4rem" }}>Share this with your child so they can link you as guardian</p>
          <code style={{ backgroundColor: "white", padding: "0.4rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: 700, color: C.primary, letterSpacing: "0.05em", border: "1px solid #e5e7eb" }}>
            {parentUserIdDisplay}
          </code>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(parentUserIdDisplay); showSuccess("Parent ID copied!"); }}
          style={{ padding: "0.6rem 1rem", backgroundColor: C.accent, color: "white", border: "none", borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
        >
          Copy ID
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ backgroundColor: "white", borderRadius: "0.875rem", padding: "1.25rem", border: "1px solid #e5e7eb", borderTop: `3px solid ${C.accent}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
            <Users size={18} color={C.accent} />
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>Linked Children</p>
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, color: C.primary }}>{children.length}</p>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "0.875rem", padding: "1.25rem", border: "1px solid #e5e7eb", borderTop: "3px solid #16a34a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
            <BookOpen size={18} color="#16a34a" />
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Sessions</p>
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, color: C.primary }}>{recentBookings.filter(b => b.status === "completed").length}</p>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "0.875rem", padding: "1.25rem", border: "1px solid #e5e7eb", borderTop: "3px solid #7c3aed" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
            <Clock size={18} color="#7c3aed" />
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>Upcoming</p>
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, color: C.primary }}>{recentBookings.filter(b => b.status === "upcoming").length}</p>
        </div>
      </div>

      <section style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "0.875rem", padding: "1.2rem", marginBottom: "1.25rem" }} aria-label="Guardian booking controls">
        <h2 style={{ fontWeight: 700, color: C.primary, marginBottom: "0.75rem" }}>Booking approvals and spending controls</h2>
        <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.8rem" }}>
          <input type="checkbox" checked={approvalRequired} onChange={event => setApprovalRequired(event.target.checked)} />
          Require my approval before a linked student's tutoring payment
        </label>
        <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.5rem" }}>
          <input type="checkbox" checked={limitEnabled} onChange={event => setLimitEnabled(event.target.checked)} />
          Apply a monthly spending cap across all linked students
        </label>
        {limitEnabled && <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.8rem" }}>
          <label>Monthly limit <input aria-label="Monthly spending limit" type="number" min="0" step="0.01" value={monthlyLimit} onChange={event => setMonthlyLimit(event.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem", maxWidth: "160px" }} /></label>
          <label>Currency <select aria-label="Spending limit currency" value={limitCurrency} onChange={event => setLimitCurrency(event.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: "0.375rem" }}>
            {["PKR", "AED", "GBP"].map(code => <option value={code} key={code}>{code}</option>)}
          </select></label>
        </div>}
        <p style={{ color: C.gray500, fontSize: "0.78rem", marginBottom: "0.7rem" }}>
          The limit includes paid lessons and outstanding checkout reservations. Payments in a different currency are blocked until you update the cap.
        </p>
        <button type="button" onClick={saveControls} disabled={savingSettings || loading}
          style={{ background: C.accent, color: "white", padding: "0.6rem 1rem", borderRadius: "0.5rem", border: "none", fontWeight: 700 }}>
          {savingSettings ? "Saving…" : "Save parent controls"}
        </button>
      </section>
      <section style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "0.875rem", marginBottom: "1.25rem", padding: "1.2rem" }} aria-label="Awaiting guardian approval">
        <h2 style={{ fontWeight: 700, color: C.primary, marginBottom: "0.75rem" }}>Offers awaiting your approval ({approvals.length})</h2>
        {approvals.length === 0 ? <p style={{ color: C.gray500, fontSize: "0.875rem" }}>No offers need your decision.</p> : approvals.map(approval => (
          <div key={approval._id} style={{ borderTop: "1px solid #e5e7eb", paddingTop: "0.8rem", marginTop: "0.8rem", display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
            <div>
              <strong>{approval.subject}</strong>
              <p style={{ fontSize: "0.8rem", color: C.gray500, marginTop: "0.25rem" }}>Tutor: {approval.tutorName} · {approval.teachingMode || "Tuition"} · {approval.schedule || "Schedule to be agreed"}</p>
              <p style={{ fontSize: "0.8rem", color: C.gray500, marginTop: "0.25rem" }}>
                Child: {children.find(child => child.studentUser === approval.studentId)?.name || "Linked student"} — {approval.currency} {approval.amount.toLocaleString()}
              </p>
              <p style={{ fontSize: "0.75rem", color: C.gray500 }}>Expires: {new Date(approval.expiresAt).toLocaleString()}</p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button type="button" disabled={actingOnApproval === approval._id} onClick={() => decideApproval(approval._id, "approved")}
                style={{ background: "#dcfce7", color: "#166534", padding: "0.5rem 0.75rem", border: "1px solid #86efac", borderRadius: "0.45rem" }}>Approve</button>
              <button type="button" disabled={actingOnApproval === approval._id} onClick={() => decideApproval(approval._id, "rejected")}
                style={{ background: "#fee2e2", color: "#991b1b", padding: "0.5rem 0.75rem", border: "1px solid #fecaca", borderRadius: "0.45rem" }}>Decline</button>
            </div>
          </div>
        ))}
      </section>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : children.length === 0 ? (
        <EmptyState onLink={() => setShowLinkModal(true)} />
      ) : (
        <>
          {/* Children list */}
          <div style={{ backgroundColor: "white", borderRadius: "0.875rem", border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 700, color: C.primary, fontSize: "0.95rem", margin: 0 }}>Your Children</h3>
              <button onClick={() => setShowLinkModal(true)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", backgroundColor: C.accent, color: "white", padding: "0.55rem 1rem", borderRadius: "0.5rem", border: "none", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
                <Plus size={14} /> Link Child
              </button>
            </div>
            {children.map(child => (
              <div key={child._id} style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f9fafb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: C.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "1rem", flexShrink: 0 }}>
                        {child.name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: C.primary, fontSize: "0.95rem", margin: 0 }}>{child.name}</p>
                        <p style={{ fontSize: "0.75rem", color: C.gray500, margin: 0 }}>
                          {child.studentProfile?.currentLevel || child.level || "Student"} •
                          {child.studentProfile?.city ? ` ${child.studentProfile.city}` : ""}
                        </p>
                      </div>
                    </div>
                    {child.subjects.length > 0 && (
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                        {child.subjects.map(s => (
                          <span key={s} style={{ fontSize: "0.72rem", fontWeight: 600, color: C.accent, backgroundColor: "#EEF5FF", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>{s}</span>
                        ))}
                      </div>
                    )}
                    <p style={{ fontSize: "0.72rem", color: C.gray500, marginTop: "0.4rem" }}>
                      Student ID: <code style={{ backgroundColor: "#f3f4f6", padding: "0.1rem 0.3rem", borderRadius: "0.25rem", fontSize: "0.7rem" }}>{child.studentUser}</code>
                    </p>
                  </div>
                  {confirmUnlinkId === child._id ? (
                    <div role="alert" style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#dc2626" }}>Unlink?</span>
                      <button onClick={() => { setConfirmUnlinkId(null); handleUnlink(child._id); }} style={{ padding: "0.25rem 0.6rem", background: "#dc2626", color: "white", border: "none", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", minHeight: 32 }}>Yes</button>
                      <button onClick={() => setConfirmUnlinkId(null)} style={{ padding: "0.25rem 0.6rem", background: "white", color: "#64748b", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", minHeight: 32 }}>No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmUnlinkId(child._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "0.4rem", borderRadius: "0.375rem" }} title="Unlink child" aria-label={`Unlink ${child.name}`}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Recent bookings */}
          {recentBookings.length > 0 && (
            <div style={{ backgroundColor: "white", borderRadius: "0.875rem", border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
                <h3 style={{ fontWeight: 700, color: C.primary, fontSize: "0.95rem", margin: 0 }}>Recent Sessions Across All Children</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr", padding: "0.6rem 1.5rem", backgroundColor: C.gray50, borderBottom: "1px solid #e5e7eb" }} className="parent-table-header">
                {["Child", "Tutor", "Subject", "Amount", "Status"].map(h => (
                  <p key={h} style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{h}</p>
                ))}
              </div>
              {recentBookings.map((b, idx) => (
                <div key={b._id}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr", padding: "0.875rem 1.5rem", alignItems: "center", borderBottom: idx < recentBookings.length - 1 ? "1px solid #f9fafb" : "none" }} className="parent-table-row">
                    <p style={{ fontWeight: 600, color: C.primary, fontSize: "0.875rem", margin: 0 }}>{b.studentName}</p>
                    <p style={{ fontSize: "0.875rem", color: C.gray500, margin: 0 }}>{b.tutorName}</p>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "999px", backgroundColor: "#EEF5FF", color: C.accent, width: "fit-content" }}>{b.subject}</span>
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: C.primary, margin: 0 }}>{formatPKR(b.amount)}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <StatusBadge status={b.status} />
                      <TeachingModeBadge mode={b.teachingMode} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Link modal */}
      {showLinkModal && <ConsentLinkChildModal onClose={() => setShowLinkModal(false)} onLinked={fetchProfile} />}

      <style>{`
        @media (max-width: 640px) {
          .parent-table-header { display: none !important; }
          .parent-table-row { display: none !important; }
        }
      `}</style>
    </div>
  );
}
