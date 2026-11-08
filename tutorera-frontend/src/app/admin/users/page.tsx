"use client";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { useEffect, useState } from "react";
import { ShieldAlert, Search } from "lucide-react";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";

const C = UI_COLORS;

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  countryCode?: string;
  isActive: boolean;
  moderationStatus?: "active" | "suspended" | "banned" | "deleted";
  isVerified: boolean;
  createdAt: string;
}

const roleColors: Record<string, { bg: string; color: string }> = {
  student: { bg: STATUS_COLORS.info.bg, color: STATUS_COLORS.info.color },
  tutor:   { bg: STATUS_COLORS.success.bg, color: STATUS_COLORS.success.color },
  admin:   { bg: STATUS_COLORS.purple.bg, color: STATUS_COLORS.purple.color },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [enforcementAction, setEnforcementAction] = useState<"suspend" | "ban" | "reinstate">("suspend");
  const [enforcementReason, setEnforcementReason] = useState("");
  const [loadError, setLoadError] = useState("");

  const fetchUsers = (page: number = 1, searchTerm: string = search, role: string = roleFilter) => {
    setLoading(true);
    setLoadError("");
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (role !== "all") params.set("role", role);
    api.get(`/admin/users?${params.toString()}`)
      .then(res => {
        setUsers(res.data.users || []);
        setPagination({ page: res.data.page || 1, pages: res.data.pages || 1, total: res.data.total || 0 });
      })
      .catch((err) => {
        console.error("Failed to load users:", err);
        setLoadError(err?.response?.data?.message || err?.message || "Failed to load users. Please check administrative permissions.");
        setUsers([]);
      })
      .finally(() => setLoading(false));
  };

  // Debounced search & role change
  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(1, search, roleFilter), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  const handleToggleStatus = async (user: User) => {
    setSelectedUser(user);
    setEnforcementAction(user.moderationStatus === "suspended" ? "reinstate" : "suspend");
    setEnforcementReason("");
  };
  const submitEnforcement = async () => {
    if (!selectedUser || !enforcementReason.trim()) return;
    const action = enforcementAction;
    const reason = enforcementReason.trim();
    setActionLoading(selectedUser._id);
    try {
      const result = await api.post(`/admin/users/${selectedUser._id}/enforcement`, {
        action,
        reason,
        ...(selectedUser.countryCode ? { countryCode: selectedUser.countryCode } : {}),
      });
      const updated = result.data.user;
      setUsers(prev => prev.map(u => u._id === updated._id ? { ...u, isActive: updated.isActive, moderationStatus: updated.moderationStatus } : u));
      showSuccess(`Account ${action === "reinstate" ? "reinstated" : "suspended"}.`);
      setSelectedUser(null);
    } catch (err) {
      showError(err, "Failed to update user status");
    } finally {
      setActionLoading(null);
    }
  };

  // const filtered = users.filter(u => {
  //   const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
  //     u.email.toLowerCase().includes(search.toLowerCase());
  //   const matchRole = roleFilter === "all" || u.role === roleFilter;
  //   return matchSearch && matchRole;
  // });

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Users</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>Manage registered users and account access.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} color={C.gray500} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input aria-label="Search users by name or email" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.25rem', border: `1px solid ${C.border}`, borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', backgroundColor: C.surface }}
            onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
            onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {["all", "student", "tutor", "parent", "admin"].map(role => (
            <button key={role} onClick={() => setRoleFilter(role)}
              style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: roleFilter === role ? 'none' : `1px solid ${C.border}`, backgroundColor: roleFilter === role ? C.primary : C.surface, color: roleFilter === role ? C.surface : C.gray500, fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize' }}>
              {role}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '0.75rem', backgroundColor: STATUS_COLORS.danger.bg, border: `1px solid ${STATUS_COLORS.danger.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: STATUS_COLORS.danger.color, fontWeight: '600' }}>
            ⚠️ {loadError}
          </p>
          <button
            onClick={() => fetchUsers(1, search, roleFilter)}
            style={{ padding: '0.4rem 0.85rem', borderRadius: '0.375rem', backgroundColor: STATUS_COLORS.danger.color, color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      <div style={{ backgroundColor: C.surface, borderRadius: '0.875rem', border: `1px solid ${C.border}`, overflow: 'visible' }}>

        <table style={{ width: '100%', borderCollapse: 'collapse' }} className="admin-desktop-table">
          <caption style={{ display: 'none' }}>User accounts</caption>
          <thead style={{ backgroundColor: C.gray50, borderBottom: `1px solid ${C.border}` }} className="admin-table-header">
            <tr>
              {["Name", "Email", "Role", "City", "Status", "Actions"].map(h => (
                <th key={h} scope="col" style={{ fontSize: '0.75rem', fontWeight: '700', color: TEXT_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.75rem 1rem', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
        {loading ? (
          <tr><td colSpan={6}>
          <div role="status" aria-label="Loading users" style={{ padding: '3rem', textAlign: 'center' }}>
            <div aria-hidden="true" style={{ width: '32px', height: '32px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
          </td></tr>
        ) : users.length === 0 ? (
          <tr><td colSpan={6}>
          <div style={{ padding: '3rem', textAlign: 'center', color: C.gray500 }}>
            <p style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>👥</p>
            <p style={{ margin: 0, fontWeight: '600', color: C.primary }}>No users found</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
              {roleFilter !== "all" || search
                ? `No accounts match the current filter (${roleFilter !== "all" ? `role: ${roleFilter}` : ""}${search ? ` search: "${search}"` : ""}).`
                : "No registered accounts exist yet."}
            </p>
          </div>
          </td></tr>
        ) : (
          users.map((user, idx) => (
            <tr key={user._id} style={{ borderBottom: idx < users.length - 1 ? `1px solid ${C.border}` : 'none' }} className="admin-table-row">

              {/* Name */}
              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div aria-hidden="true" style={{ width: '32px', height: '32px', backgroundColor: C.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.surface, fontSize: '0.8rem', fontWeight: '700', flexShrink: 0 }}>
                    {user.name.charAt(0)}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary }}>{user.name}</span>
                </div>
              </td>

              {/* Email */}
              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                <span style={{ fontSize: '0.8rem', color: C.gray500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '200px' }}>{user.email}</span>
              </td>

              {/* Role */}
              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: roleColors[user.role]?.bg, color: roleColors[user.role]?.color, textTransform: 'capitalize', display: 'inline-block' }}>
                  {user.role}
                </span>
              </td>

              {/* City */}
              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                <span style={{ fontSize: '0.8rem', color: C.gray500 }}>{user.city || "—"}</span>
              </td>

              {/* Status */}
              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: (user.moderationStatus || (user.isActive ? "active" : "suspended")) === "active" ? C.success : STATUS_COLORS.danger.color }}>
                  {user.moderationStatus || (user.isActive ? "active" : "suspended")}
                </span>
              </td>

              {/* Actions */}
              <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                <button onClick={() => handleToggleStatus(user)} disabled={actionLoading === user._id || user.moderationStatus === "banned" || user.moderationStatus === "deleted"}
                  aria-label={`${user.moderationStatus === "suspended" ? "Reinstate" : "Suspend"} ${user.name}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', backgroundColor: STATUS_COLORS.warning.bg, color: STATUS_COLORS.warning.color, width: 'fit-content' }}>
                  <ShieldAlert size={13} aria-hidden="true" /> {user.moderationStatus === "suspended" ? "Reinstate" : "Suspend"}
                </button>
              </td>
            </tr>

          ))
        )}
        </tbody>
        </table>

        {/* Mobile cards (shown below 768px via CSS) */}
        <div className="admin-mobile-cards">
        {!loading && users.map(user => (
          <div key={`mob-${user._id}`} style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${C.border}` }} className="admin-mobile-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div aria-hidden="true" style={{ width: '38px', height: '38px', backgroundColor: C.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.surface, fontSize: '1rem', fontWeight: '700', flexShrink: 0 }}>
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: '700', color: C.primary, fontSize: '0.9rem', margin: 0 }}>{user.name}</p>
                  <p style={{ color: C.gray500, fontSize: '0.75rem', margin: 0 }}>{user.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '0.2rem 0.5rem', borderRadius: '999px', backgroundColor: roleColors[user.role]?.bg, color: roleColors[user.role]?.color, textTransform: 'capitalize' }}>
                  {user.role}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: C.gray500 }}>{user.city || "No city"}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: (user.moderationStatus || (user.isActive ? "active" : "suspended")) === "active" ? C.success : STATUS_COLORS.danger.color }}>
                  • {user.moderationStatus || (user.isActive ? "active" : "suspended")}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleToggleStatus(user)} disabled={actionLoading === user._id || user.moderationStatus === "banned" || user.moderationStatus === "deleted"}
                  aria-label={`${user.moderationStatus === "suspended" ? "Reinstate" : "Suspend"} ${user.name}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', backgroundColor: STATUS_COLORS.warning.bg, color: STATUS_COLORS.warning.color }}>
                  {user.moderationStatus === "suspended" ? "Reinstate" : "Suspend"}
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {!loading && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button onClick={() => fetchUsers(pagination.page - 1, search, roleFilter)} disabled={pagination.page <= 1}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: `1px solid ${C.border}`, backgroundColor: C.surface, color: pagination.page <= 1 ? C.border : C.primary, fontWeight: '600', fontSize: '0.85rem', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}>
            ← Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.85rem', color: C.gray500, fontWeight: '600' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button onClick={() => fetchUsers(pagination.page + 1, search, roleFilter)} disabled={pagination.page >= pagination.pages}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: `1px solid ${C.border}`, backgroundColor: C.surface, color: pagination.page >= pagination.pages ? C.border : C.primary, fontWeight: '600', fontSize: '0.85rem', cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer' }}>
            Next →
          </button>
        </div>
      )}
      {selectedUser && (
        <div role="dialog" aria-modal="true" aria-labelledby="account-enforcement-title" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(2,21,80,.58)", display: "grid", placeItems: "center", padding: 16 }}>
          <form onSubmit={(event) => { event.preventDefault(); submitEnforcement(); }} style={{ width: "min(100%, 480px)", background: C.surface, borderRadius: 12, padding: 24, boxShadow: "0 20px 48px rgba(2,21,80,.28)" }}>
            <h2 id="account-enforcement-title" style={{ color: C.primary, marginTop: 0 }}>Account enforcement</h2>
            <p style={{ color: C.gray500 }}>Record a reason for action on {selectedUser.name}. Bans require a linked safety case in the API.</p>
            <label style={{ display: "block", fontWeight: 700, color: C.primary }}>Action
              <select value={enforcementAction} onChange={(event) => setEnforcementAction(event.target.value as typeof enforcementAction)} style={{ display: "block", width: "100%", marginTop: 6, padding: 10, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                <option value="suspend">Suspend access</option>{selectedUser.moderationStatus === "suspended" && <option value="reinstate">Reinstate account</option>}
              </select>
            </label>
            <label style={{ display: "block", fontWeight: 700, color: C.primary, marginTop: 14 }}>Reason
              <textarea autoFocus required maxLength={1000} value={enforcementReason} onChange={(event) => setEnforcementReason(event.target.value)} style={{ display: "block", width: "100%", minHeight: 100, boxSizing: "border-box", marginTop: 6, padding: 10, border: `1px solid ${C.border}`, borderRadius: 6 }} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => setSelectedUser(null)} style={{ padding: "0.5rem 1.25rem", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.primary, fontWeight: 700, cursor: "pointer", minHeight: 44 }}>Cancel</button>
              <button type="submit" disabled={!enforcementReason.trim() || actionLoading === selectedUser._id} style={{ padding: "0.5rem 1.25rem", borderRadius: 6, border: "none", background: C.accent, color: "white", fontWeight: 700, cursor: "pointer", minHeight: 44 }}>{actionLoading === selectedUser._id ? "Saving…" : "Confirm"}</button>
            </div>
          </form>
        </div>
      )}
      <style>{`
        @media (min-width: 769px) { .admin-mobile-cards { display: none !important; } }
        @media (max-width: 768px) {
          .admin-desktop-table { display: none !important; }
          .admin-mobile-cards { display: block !important; }
          .admin-mobile-card { display: block !important; }
        }
      `}</style>
    </div>
  );
}
