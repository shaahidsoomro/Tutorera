import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Notification from "../models/Notification.model";
import Conversation from "../models/Conversation.model";
import { isConversationStudentEligible, isRealtimeStudentAllowed } from "../services/chatAccess.service";
import User from "../models/User.model";

interface ConnectedUsers {
  [userId: string]: string; // userId -> socketId
}

const connectedUsers: ConnectedUsers = {};

let _ioInstance: Server | undefined;
export { _ioInstance as ioInstance };

export const initSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Auth middleware — verify token AND confirm the user still exists and is active
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

      const user = await User.findById(decoded.id).select("isActive role isMinor parentConsentVerified dateOfBirth");
      if (!user) return next(new Error("User no longer exists"));
      if (!user.isActive) return next(new Error("Account is deactivated"));
      if (user.role === "pending") return next(new Error("Account role selection is required"));
      if (!isRealtimeStudentAllowed(user)) {
        return next(new Error("Guardian approval is required before realtime tutoring is available"));
      }

      socket.data.userId = decoded.id;
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;
    connectedUsers[userId] = socket.id;
    console.log(`✅ User connected: ${userId}`);

    // Join personal room for notifications
    socket.join(userId);

    // Join a chat conversation room — only if the user is a real participant
    socket.on("join_conversation", async (conversationId: string, callback?: (res: { ok: boolean; error?: string }) => void) => {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        if (callback) callback({ ok: false, error: "Invalid conversation ID" });
        return;
      }

      try {
        const current = await User.findById(userId).select("isActive role isMinor parentConsentVerified dateOfBirth");
        if (!isRealtimeStudentAllowed(current)) {
          if (callback) callback({ ok: false, error: "Guardian approval required or session deactivated" });
          socket.disconnect(true);
          return;
        }
        const conversation = await Conversation.findById(conversationId).select("student tutor");
        if (!conversation) {
          if (callback) callback({ ok: false, error: "Conversation not found" });
          return;
        }

        const isParticipant =
          conversation.student.toString() === userId ||
          conversation.tutor.toString() === userId;

        if (!isParticipant) {
          if (callback) callback({ ok: false, error: "Not authorized to join this conversation" });
          return;
        }

        // The tutor may still be approved after the student's guardian has
        // revoked consent. Never add a socket to an unavailable child room.
        if (!(await isConversationStudentEligible(conversation.student))) {
          if (callback) callback({ ok: false, error: "Student is unavailable for supervised chat" });
          return;
        }

        socket.join(conversationId);
        console.log(`User ${userId} joined conversation ${conversationId}`);
        if (callback) callback({ ok: true });
      } catch (err) {
        console.error("Error joining conversation:", err);
        if (callback) callback({ ok: false, error: "Failed to join conversation" });
      }
    });

    // Leave conversation room
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(conversationId);
    });

    // Typing indicator
    socket.on("typing", async (data: { conversationId: string; isTyping: boolean }) => {
      // Room membership reflects a PREVIOUS authorization check. A guardian
      // can revoke consent while an existing socket stays connected (notably
      // across replicas without a shared Socket.IO adapter). Recheck the
      // account state before emitting each realtime user action.
      if (!data || typeof data.conversationId !== "string" ||
          !mongoose.Types.ObjectId.isValid(data.conversationId) ||
          typeof data.isTyping !== "boolean" ||
          !socket.rooms.has(data.conversationId)) return;
      try {
        const current = await User.findById(userId).select("isActive role isMinor parentConsentVerified dateOfBirth");
        if (!isRealtimeStudentAllowed(current)) {
          socket.disconnect(true);
          return;
        }
        // Guard BOTH participants: checking only the sender misses a tutor
        // emitting typing events into a stale socket owned by a revoked minor.
        const conversation = await Conversation.findById(data.conversationId).select("student").lean();
        if (!conversation || !(await isConversationStudentEligible(conversation.student))) {
          socket.leave(data.conversationId);
          return;
        }
        if (!socket.connected || !socket.rooms.has(data.conversationId)) return;
        socket.to(data.conversationId).emit("user_typing", { userId, isTyping: data.isTyping });
      } catch (error) {
        // Fail closed on database outages; a stale socket is never entitled
        // to publish events when authorization cannot be determined.
        console.error("[Safeguarding] Could not verify realtime user status:", error);
        socket.disconnect(true);
      }
    });

    socket.on("disconnect", () => {
      delete connectedUsers[userId];
      console.log(`❌ User disconnected: ${userId}`);
    });
  });

  _ioInstance = io;
  return io;
};

// Send notification to specific user
export const sendNotification = async (
  io: Server | undefined,
  userId: string,
  notification: {
    title: string;
    message: string;
    type: "verification" | "bid" | "booking" | "payment" | "general" | "broadcast";
    link?: string;
  }
) => {
  if (!io) return;

  try {
    // Notification delivery is a secondary side effect. A temporary database
    // or socket failure must never roll back an already-completed booking,
    // payment, verification, or other administrative action.
    const saved = await Notification.create({
      user: userId,
      ...notification,
    });

    io.to(userId).emit("notification", {
      _id: saved._id,
      title: saved.title,
      message: saved.message,
      type: saved.type,
      link: saved.link,
      isRead: false,
      createdAt: saved.createdAt,
    });
  } catch (error) {
    console.error("[Notification] Failed to persist or emit notification:", {
      userId,
      type: notification.type,
      error,
    });
  }
};
