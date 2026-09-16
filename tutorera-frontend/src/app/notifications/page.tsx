"use client";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useSocket } from "@/context/SocketContext";
import { useAppGuard } from "@/hooks/useAppGuard";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { showError } from "@/lib/toast";
import { Bell } from "lucide-react";
import { useEffect,useState } from "react";

const C = UI_COLORS;

export default function NotificationsPage() {
  const guardStatus = useAppGuard();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    pushNotifications: true,
    bookingUpdates: true,
    bidNotifications: true,
    chatMessages: true,
    paymentUpdates: true,
    securityAlerts: true,
    platformUpdates: false,
  });

  useEffect(() => {
    let cancelled = false;
    api.get("/notifications/preferences")
      .then(res => {
        if (!cancelled && res.data?.preferences) {
          setPrefs(res.data.preferences);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ← ADD: block pending/rejected tutors + show spinner while checking
  if (guardStatus !== "ok") return null;

  const togglePref = async (key: keyof typeof prefs) => {
    const previous = { ...prefs };
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await api.patch("/notifications/preferences", { preferences: updated });
    } catch (err) {
      setPrefs(previous);
      showError(err, "Failed to save preference. Please try again.");
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: C.primary, marginBottom: '0.25rem' }}>Notifications</h1>
            <p style={{ color: C.gray500, fontSize: '0.875rem' }}>
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead}
              style={{ padding: '0.6rem 1.25rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', color: C.primary }}>
              Mark all as read
            </button>
          )}
        </div>

        {/* Delivery Preferences */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: C.primary, marginBottom: '1.25rem' }}>Delivery Preferences</h2>

          {/* Enable Push */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: C.gray50, borderRadius: '0.625rem', marginBottom: '1rem', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Bell size={18} color={C.accent} />
              <div>
                <p style={{ fontWeight: '600', color: C.primary, fontSize: '0.875rem' }}>Enable push notifications</p>
                <p style={{ color: C.gray500, fontSize: '0.75rem' }}>Get notified instantly about bookings, tutor offers, and messages.</p>
              </div>
            </div>
            <button onClick={() => {
              if ("Notification" in window) Notification.requestPermission();
            }}
              style={{ padding: '0.5rem 1rem', backgroundColor: C.accent, color: 'white', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>
              Enable
            </button>
          </div>

          {/* Toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {[
              { key: 'emailNotifications', label: 'Email notifications' },
              { key: 'pushNotifications', label: 'Push notifications' },
              { key: 'bookingUpdates', label: 'Booking updates' },
              { key: 'bidNotifications', label: 'Tutor offer notifications' },
              { key: 'chatMessages', label: 'Chat messages' },
              { key: 'paymentUpdates', label: 'Payment updates' },
              { key: 'securityAlerts', label: 'Security and system alerts' },
              { key: 'platformUpdates', label: 'Platform updates' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: 'white' }}>
                <span style={{ fontSize: '0.875rem', color: C.primary }}>{item.label}</span>
                <button
                  title="Toggle preference"
                  onClick={() => togglePref(item.key as keyof typeof prefs)}
                  style={{ width: '44px', height: '24px', borderRadius: '999px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: prefs[item.key as keyof typeof prefs] ? C.accent : '#d1d5db', transition: 'background 0.2s' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: prefs[item.key as keyof typeof prefs] ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: C.primary }}>Recent Activity</h2>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Bell size={36} color="#d1d5db" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ color: C.gray500, fontWeight: '600' }}>No notifications yet</p>
              <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Your activity notifications will appear here.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div key={notif._id}
                onClick={() => markAsRead(notif._id)}
                style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #F5F7FF', cursor: 'pointer', backgroundColor: notif.isRead ? 'white' : '#f0f7ff', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F7FF')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = notif.isRead ? 'white' : '#f0f7ff')}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: notif.type === 'verification' ? '#f0fdf4' : notif.type === 'bid' ? '#EEF5FF' : notif.type === 'booking' ? '#fdf4ff' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>
                  {notif.type === 'verification' ? '🛡️' : notif.type === 'bid' ? '📬' : notif.type === 'booking' ? '📅' : notif.type === 'payment' ? '💰' : '🔔'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: notif.isRead ? '500' : '700', color: C.primary, fontSize: '0.875rem', marginBottom: '0.2rem' }}>{notif.title}</p>
                  <p style={{ color: C.gray500, fontSize: '0.8rem', lineHeight: '1.5' }}>{notif.message}</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.72rem', marginTop: '0.3rem' }}>{new Date(notif.createdAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                {!notif.isRead && <div style={{ width: '8px', height: '8px', backgroundColor: C.accent, borderRadius: '50%', flexShrink: 0, marginTop: '4px' }} />}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
