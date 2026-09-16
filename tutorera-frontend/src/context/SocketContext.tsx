"use client";
import { createContext,ReactNode,useContext,useEffect,useState } from "react";
import { io } from "socket.io-client";
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
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch existing notifications
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Fetch notifications from API
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(console.error);

    // Connect socket
    const token2 = localStorage.getItem("token");

    // Derive the Socket.io server URL from the API URL by stripping the
    // /api/... suffix entirely (not just "/api"), so this keeps working
    // whether NEXT_PUBLIC_API_URL is ".../api" or the versioned ".../api/v1".
    const socketBaseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api(\/.*)?$/, "") || "https://tutorera-backend.onrender.com";

    const newSocket = io(socketBaseUrl, {
      auth: { token: token2 },
      transports: ["websocket"],
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
    const token = localStorage.getItem("token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem("token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
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