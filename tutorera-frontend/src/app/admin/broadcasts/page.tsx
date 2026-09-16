"use client";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { useEffect,useState } from "react";

const C = UI_COLORS;

interface Broadcast {
  _id: string;
  title: string;
  message: string;
  audience: string;
  sentCount: number;
  sentByName?: string;
  createdAt: string;
}

type Audience = "all" | "students" | "tutors";

const AUDIENCE_OPTIONS: { value: Audience; label: string; desc: string; color: string; bg: string }[] = [
  { value: "all",      label: "All Users",      desc: "Students + Tutors",    color: '#0329B2', bg: '#EEF5FF' },
  { value: "students", label: "Students Only",  desc: "All active students",  color: '#7c3aed', bg: '#f5f3ff' },
  { value: "tutors",   label: "Tutors Only",    desc: "All active tutors",    color: '#16a34a', bg: '#f0fdf4' },
];

function audienceMeta(audience: string) {
  return AUDIENCE_OPTIONS.find(o => o.value === audience) ?? AUDIENCE_OPTIONS[0];
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts]     = useState<Broadcast[]>([]);
  const [loadingList, setLoadingList]   = useState(true);
  const [sending, setSending]           = useState(false);
  const [successMsg, setSuccessMsg]     = useState("");
  const [errorMsg, setErrorMsg]         = useState("");

  // Form state
  const [title, setTitle]       = useState("");
  const [message, setMessage]   = useState("");
  const [audience, setAudience] = useState<Audience>("all");

  const fetchBroadcasts = async () => {
    try {
      const res = await api.get("/admin/broadcasts");
      setBroadcasts(res.data.broadcasts);
    } catch {
      console.error("Failed to load broadcasts");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchBroadcasts(); }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setErrorMsg("Please fill in both title and message.");
      return;
    }
    if (title.trim().length > 100) {
      setErrorMsg("Title must be under 100 characters.");
      return;
    }

    setSending(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await api.post("/admin/broadcasts", { title: title.trim(), message: message.trim(), audience });
      setSuccessMsg(res.data.message);
      setTitle("");
      setMessage("");
      setAudience("all");
      // Prepend new broadcast to list
      setBroadcasts(prev => [res.data.broadcast, ...prev]);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setErrorMsg(e.response?.data?.message || "Failed to send broadcast. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const totalSent = broadcasts.reduce((sum, b) => sum + b.sentCount, 0);

  return (
    <div style={{ padding: '2rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Broadcasts</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>
          Send in-app announcements to students, tutors, or all users at once.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: "Total Broadcasts", value: broadcasts.length, icon: "📢", color: C.accent },
          { label: "Total Delivered",  value: totalSent,          icon: "✅", color: '#16a34a' },
          { label: "Last Sent",        value: broadcasts[0] ? timeAgo(broadcasts[0].createdAt) : "Never", icon: "🕐", color: '#d97706' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.1rem 1.25rem', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 36, height: 36, backgroundColor: C.gray50, borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', color: C.gray500, marginBottom: '0.2rem' }}>{s.label}</p>
              <p style={{ fontSize: '1.1rem', fontWeight: '800', color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }} className="broadcasts-grid">

        {/* Compose Form */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.75rem', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontWeight: '700', color: C.primary, fontSize: '1rem', marginBottom: '0.25rem' }}>
            📢 Compose Broadcast
          </h2>
          <p style={{ color: C.gray500, fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            Message will be delivered as an in-app notification to all selected users.
          </p>

          {/* Success / Error messages */}
          {successMsg && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#16a34a', fontWeight: '600', fontSize: '0.875rem' }}>
              ✅ {successMsg}
            </div>
          )}
          {errorMsg && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#ef4444', fontWeight: '600', fontSize: '0.875rem' }}>
              ⚠ {errorMsg}
            </div>
          )}

          {/* Audience Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: C.primary, display: 'block', marginBottom: '0.6rem' }}>
              Audience
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {AUDIENCE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setAudience(opt.value)}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: '0.625rem', cursor: 'pointer',
                    border: audience === opt.value ? `2px solid ${opt.color}` : '2px solid #e5e7eb',
                    backgroundColor: audience === opt.value ? opt.bg : 'white',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: audience === opt.value ? opt.color : C.primary, margin: 0 }}>
                    {opt.label}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: C.gray500, margin: '0.15rem 0 0' }}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: C.primary, display: 'block', marginBottom: '0.4rem' }}>
              Title <span style={{ color: C.gray500, fontWeight: '400' }}>({title.length}/100)</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              placeholder="e.g. Platform Maintenance Notice"
              style={{ width: '100%', padding: '0.7rem 0.875rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
              onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: C.primary, display: 'block', marginBottom: '0.4rem' }}>
              Message <span style={{ color: C.gray500, fontWeight: '400' }}>({message.length}/500)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Write your announcement here..."
              style={{ width: '100%', padding: '0.7rem 0.875rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', color: C.primary, lineHeight: 1.6 }}
              onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />
          </div>

          {/* Preview */}
          {(title || message) && (
            <div style={{ backgroundColor: C.gray50, borderRadius: '0.625rem', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: '700', color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Preview</p>
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '0.875rem', border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: '700', color: C.primary, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  {title || "Title..."}
                </p>
                <p style={{ color: C.gray500, fontSize: '0.8rem', lineHeight: 1.6 }}>
                  {message || "Message will appear here..."}
                </p>
              </div>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            style={{
              width: '100%', padding: '0.875rem',
              backgroundColor: sending || !title.trim() || !message.trim() ? '#e5e7eb' : C.accent,
              color: sending || !title.trim() || !message.trim() ? C.gray500 : 'white',
              border: 'none', borderRadius: '0.625rem',
              fontWeight: '700', fontSize: '0.9rem',
              cursor: sending || !title.trim() || !message.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}>
            {sending ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Sending...
              </>
            ) : (
              `📢 Send to ${AUDIENCE_OPTIONS.find(o => o.value === audience)?.label}`
            )}
          </button>
        </div>

        {/* Broadcast History */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontWeight: '700', color: C.primary, fontSize: '1rem', margin: 0 }}>Past Broadcasts</h2>
            <p style={{ color: C.gray500, fontSize: '0.78rem', marginTop: '0.2rem' }}>Last 50 broadcasts sent</p>
          </div>

          {loadingList ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            </div>
          ) : broadcasts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: C.gray500 }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
              <p style={{ fontWeight: '600', color: C.primary, fontSize: '0.875rem' }}>No broadcasts yet</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Your sent announcements will appear here.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {broadcasts.map((b, idx) => {
                const meta = audienceMeta(b.audience);
                return (
                  <div key={b._id} style={{ padding: '1.1rem 1.5rem', borderBottom: idx < broadcasts.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <p style={{ fontWeight: '700', color: C.primary, fontSize: '0.875rem', margin: 0, flex: 1 }}>
                        {b.title}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: C.gray500, flexShrink: 0 }}>
                        {timeAgo(b.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: C.gray500, lineHeight: 1.5, marginBottom: '0.6rem' }}>
                      {b.message.length > 100 ? b.message.slice(0, 100) + "..." : b.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '999px', backgroundColor: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: C.gray500 }}>
                        → {b.sentCount} user{b.sentCount !== 1 ? "s" : ""}
                      </span>
                      {b.sentByName && (
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                          by {b.sentByName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .broadcasts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
