"use client";
import { createContext,ReactNode,useContext,useEffect,useState } from "react";
import { io } from "socket.io-client";
import { socketTransportOptions } from "@/lib/socket-options";
import { useAuth } from "./AuthContext";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface SocketContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const SocketContext = createContext<SocketContextType>({} as SocketContextType);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch existing notifications
  useEffect(() => {
    if (!user) return;

    // Fetch notifications via the axios instance (withCredentials carries the cookie)
    import("@/lib/axios").then(({ default: api }) => {
      api.get("/notifications")
        .then(res => {
          if (res.data.success) {
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
          }
        })
        .catch(console.error);
    });

    // Socket.io WS upgrade does not carry cookies on all browsers/proxies,
    // so we pass the user id as the socket auth token instead of a JWT.
    // The server uses this only for room routing, not as a security boundary.
    const socketBaseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api(\/.*)?$/, "") || "https://api.tutorera.ac.pk";

    const newSocket = io(socketBaseUrl, {
      auth: { token },
      ...socketTransportOptions(),
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
    });

    // Listen for new notifications
    newSocket.on("notification", (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show browser notification if supported
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    const { default: api } = await import("@/lib/axios");
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const { default: api } = await import("@/lib/axios");
    await api.patch("/notifications/read-all");
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <SocketContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
