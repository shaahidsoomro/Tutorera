import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { Bell, X } from "lucide-react";

const C = UI_COLORS;

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "general" | "offer" | "booking" | "message" | "alert";
  link?: string;
  createdAt: string;
  isRead: boolean;
}

interface PushNotificationManagerProps {
  maxNotifications?: number;
}

export function PushNotificationManager({ maxNotifications = 3 }: PushNotificationManagerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notifications", { params: { limit: 20, unreadOnly: true } })
      .then((res) => {
        setNotifications(res.data?.notifications || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setVisibleNotifications(notifications.slice(0, maxNotifications));
  }, [notifications, maxNotifications]);

  const handleDismiss = (id: string) => {
    setVisibleNotifications((prev) => prev.filter((n) => n.id !== id));
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    api.post(`/notifications/${id}/read`).catch(console.error);
  };

  const getNotificationStyles = (type: string) => {
    const styles: Record<string, { bg: string; border: string; icon: string }> = {
      offer: { bg: "#f0fdf4", border: "#86efac", icon: "🎯" },
      booking: { bg: "#fef3c7", border: "#fcd34d", icon: "📅" },
      message: { bg: "#eff6ff", border: "#93c5fd", icon: "💬" },
      alert: { bg: "#fef2f2", border: "#fecaca", icon: "⚠️" },
      general: { bg: "#f5f3ff", border: "#e9d5ff", icon: "ℹ️" },
    };
    return styles[type] || styles.general;
  };

  if (loading || visibleNotifications.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        zIndex: 40,
        maxWidth: "400px",
        pointerEvents: "none",
      }}
    >
      {visibleNotifications.map((notif) => {
        const styles = getNotificationStyles(notif.type);
        return (
          <div
            key={notif.id}
            onClick={() => {
              if (notif.link) window.location.href = notif.link;
            }}
            style={{
              backgroundColor: styles.bg,
              border: `1px solid ${styles.border}`,
              borderRadius: "0.75rem",
              padding: "1rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              animation: "slideIn 0.3s ease-out",
              pointerEvents: "auto",
              cursor: notif.link ? "pointer" : "default",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.25rem" }}>{styles.icon}</span>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: C.primary,
                    margin: "0 0 0.25rem",
                  }}
                >
                  {notif.title}
                </p>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: C.gray600,
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {notif.message}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss(notif.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.gray500,
                  padding: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
