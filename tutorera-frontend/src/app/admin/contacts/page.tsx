"use client";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { showError,showSuccess } from "@/lib/toast";
import { AlertTriangle,CheckCircle,MessageSquare } from "lucide-react";
import { useCallback,useEffect,useState } from "react";

const C = UI_COLORS;

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  isRead: boolean;
  type: "general" | "support";
  bookingId?: string;
  userRole?: "student" | "tutor";
  priority?: "low" | "normal" | "urgent";
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "support" | "general">("all");
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [counts, setCounts] = useState({ all: 0, support: 0, general: 0 });

  const fetchContacts = useCallback((page: number = 1, type: string = filter) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (type !== "all") params.set("type", type);
    api.get(`/admin/contacts?${params.toString()}`)
      .then(res => {
        setContacts(res.data.contacts);
        setPagination(res.data.pagination);
        setCounts(res.data.counts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchContacts(1, filter); }, [fetchContacts, filter]);

  const handleStatusChange = async (id: string, newStatus: Contact["status"]) => {
    setStatusLoading(id);
    try {
      await api.patch(`/admin/contacts/${id}`, { status: newStatus });
      setContacts(prev =>
        prev.map(c => c._id === id ? { ...c, status: newStatus } : c)
      );
      showSuccess("Status updated.");
    } catch {
      showError("Failed to update status.");
    } finally {
      setStatusLoading(null);
    }
  };

  // const filtered = contacts.filter(c => {
  //   if (filter === "all") return true;
  //   return c.type === filter;
  // });

  // // Counts for tab badges
  // const supportCount = contacts.filter(c => c.type === "support" && c.status === "open").length;
  // const generalCount = contacts.filter(c => c.type !== "support").length;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Contact Messages</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>All messages and in-session support requests.</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: "all", label: "All", count: counts.all },
          { key: "support", label: "🆘 Support Requests", count: counts.support },
          { key: "general", label: "General Contact", count: counts.general },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key as typeof filter)}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '999px', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: '600',
              border: filter === tab.key ? 'none' : '1px solid #e5e7eb',
              backgroundColor: filter === tab.key ? C.primary : 'white',
              color: filter === tab.key ? 'white' : C.gray500,
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                backgroundColor: filter === tab.key
                  ? 'rgba(255,255,255,0.25)'
                  : tab.key === "support" ? '#fef2f2' : '#f3f4f6',
                color: filter === tab.key
                  ? 'white'
                  : tab.key === "support" ? '#ef4444' : C.gray500,
                fontSize: '0.7rem', fontWeight: 700,
                padding: '0.1rem 0.5rem', borderRadius: '999px',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : contacts.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <MessageSquare size={40} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: C.gray500 }}>No messages in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {contacts.map(contact => {
            const isSupport = contact.type === "support";
            const isUrgent = contact.priority === "urgent";
            const isResolved = contact.status === "resolved";

            return (
              <div key={contact._id} style={{
                backgroundColor: 'white',
                borderRadius: '0.875rem',
                border: `1px solid ${isUrgent && !isResolved ? '#fca5a5' : '#e5e7eb'}`,
                overflow: 'hidden',
                opacity: isResolved ? 0.75 : 1,
              }}>

                {/* Urgent banner */}
                {isUrgent && !isResolved && (
                  <div style={{ backgroundColor: '#fef2f2', padding: '0.4rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={13} color="#ef4444" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>URGENT — Needs immediate attention</span>
                  </div>
                )}

                {/* Header row */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === contact._id ? null : contact._id)}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      backgroundColor: isSupport ? '#fff7ed' : '#EEF5FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {isSupport
                        ? <AlertTriangle size={18} color="#d97706" />
                        : <MessageSquare size={18} color={C.accent} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px' }}>
                        <p style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem', margin: 0 }}>{contact.name}</p>
                        {/* Type badge */}
                        {isSupport && (
                          <span style={{ backgroundColor: '#fff7ed', color: '#d97706', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '999px', border: '1px solid #fed7aa' }}>
                            SUPPORT
                          </span>
                        )}
                        {/* Role badge */}
                        {contact.userRole && (
                          <span style={{ backgroundColor: '#f3f4f6', color: C.gray500, fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
                            {contact.userRole}
                          </span>
                        )}
                      </div>
                      <p style={{ color: C.gray500, fontSize: '0.8rem', margin: 0 }}>
                        {contact.email}
                        {contact.phone ? ` · ${contact.phone}` : ""}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Status badge */}
                    <span style={{
                      padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                      backgroundColor: contact.status === "resolved" ? '#f0fdf4' : contact.status === "in_progress" ? '#EEF5FF' : '#fffbeb',
                      color: contact.status === "resolved" ? '#16a34a' : contact.status === "in_progress" ? C.accent : '#d97706',
                      textTransform: 'capitalize',
                    }}>
                      {contact.status.replace("_", " ")}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: '600', color: C.primary, fontSize: '0.875rem', margin: '0 0 2px' }}>{contact.subject}</p>
                      <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>{new Date(contact.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === contact._id && (
                  <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #f3f4f6', backgroundColor: C.gray50 }}>

                    {/* Booking ID reference for support requests */}
                    {isSupport && contact.bookingId && (
                      <div style={{ backgroundColor: '#EEF5FF', border: '1px solid #bfdbfe', borderRadius: '0.4rem', padding: '0.5rem 0.875rem', marginBottom: '1rem', fontSize: '0.8rem', color: C.accent, fontWeight: 600 }}>
                        📎 Booking ID: {contact.bookingId}
                      </div>
                    )}

                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Message</p>
                    <p style={{ color: C.primary, fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '1.25rem' }}>{contact.message}</p>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <a href={`mailto:${contact.email}`}
                        style={{ padding: '0.5rem 1rem', backgroundColor: C.accent, color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600' }}>
                        Reply via Email
                      </a>
                      {contact.phone && (
                        <a href={`https://wa.me/92${contact.phone.replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer"
                          style={{ padding: '0.5rem 1rem', backgroundColor: '#16a34a', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600' }}>
                          WhatsApp
                        </a>
                      )}

                      {/* Status controls — support requests only */}
                      {isSupport && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                          {contact.status !== "in_progress" && contact.status !== "resolved" && (
                            <button
                              disabled={statusLoading === contact._id}
                              onClick={() => handleStatusChange(contact._id, "in_progress")}
                              style={{ padding: '0.5rem 0.875rem', backgroundColor: '#EEF5FF', color: C.accent, border: '1px solid #bfdbfe', borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                              Mark In Progress
                            </button>
                          )}
                          {contact.status !== "resolved" && (
                            <button
                              disabled={statusLoading === contact._id}
                              onClick={() => handleStatusChange(contact._id, "resolved")}
                              style={{ padding: '0.5rem 0.875rem', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle size={13} /> Mark Resolved
                            </button>
                          )}
                          {contact.status === "resolved" && (
                            <button
                              disabled={statusLoading === contact._id}
                              onClick={() => handleStatusChange(contact._id, "open")}
                              style={{ padding: '0.5rem 0.875rem', backgroundColor: '#F5F7FF', color: C.gray500, border: '1px solid #e5e7eb', borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                              Reopen
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        {!loading && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button onClick={() => fetchContacts(pagination.page - 1, filter)} disabled={pagination.page <= 1}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: 'white', color: pagination.page <= 1 ? '#d1d5db' : C.primary, fontWeight: '600', fontSize: '0.85rem', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}>
            ← Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.85rem', color: C.gray500, fontWeight: '600' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button onClick={() => fetchContacts(pagination.page + 1, filter)} disabled={pagination.page >= pagination.pages}
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