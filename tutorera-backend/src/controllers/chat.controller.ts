import { Response } from "express";
import { AuthRequest } from "../types";
import Conversation from "../models/Conversation.model";
import Message from "../models/Message.model";
import Booking from "../models/Booking.model";
import { filterContactInfo } from "../utils/contentFilter";
import { sendNotification } from "../utils/socket";
import { isConversationStudentEligible } from "../services/chatAccess.service";
import { Types } from "mongoose";

// @desc    Get or create conversation for offer stage
// @route   POST /api/chat/offer-conversation
// @access  Private
export const getOrCreateOfferConversation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { offerId, requestId } = req.body;
  const userId = req.user?._id;

  if (!offerId) {
    res.status(400).json({ success: false, message: "offerId is required" });
    return;
  }

  let conversation = await Conversation.findOne({ offer: offerId })
    .populate("student", "name avatar")
    .populate("tutor", "name avatar");

  if (!conversation) {
    try {
      const Offer = require("../models/Offer.model").default;
      const offer = await Offer.findById(offerId);
      if (!offer) {
        res.status(404).json({ success: false, message: "Offer not found" });
        return;
      }

      const isStudent = offer.student.toString() === userId?.toString();
      const isTutor = offer.tutor.toString() === userId?.toString();

      if (!isStudent && !isTutor) {
        res.status(403).json({ success: false, message: "Not authorized" });
        return;
      }

      conversation = await Conversation.create({
        student: offer.student,
        tutor: offer.tutor,
        request: requestId || offer.request,
        offer: offerId,
        stage: 'offer',
      });
      await conversation.populate("student", "name avatar");
      await conversation.populate("tutor", "name avatar");
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
        conversation = await Conversation.findOne({ offer: offerId })
          .populate("student", "name avatar")
          .populate("tutor", "name avatar");
        if (!conversation) throw err;
      } else {
        throw err;
      }
    }
  }

  const isStudent = conversation.student._id.toString() === userId?.toString();
  if (isStudent) {
    await Conversation.findByIdAndUpdate(conversation._id, { studentUnread: 0 });
  } else {
    await Conversation.findByIdAndUpdate(conversation._id, { tutorUnread: 0 });
  }

  res.status(200).json({ success: true, conversation });
};

// @desc    Get or create conversation
// @route   POST /api/chat/conversation
// @access  Private
export const getOrCreateConversation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { bookingId } = req.body;
  const userId = req.user?._id;

  // Verify booking exists and user is part of it
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404).json({ success: false, message: "Booking not found" });
    return;
  }

  const isStudent = booking.student.toString() === userId?.toString();
  const isTutor = booking.tutor.toString() === userId?.toString();

  if (!isStudent && !isTutor) {
    res.status(403).json({ success: false, message: "Not authorized" });
    return;
  }

  if (!(await isConversationStudentEligible(booking.student))) {
    res.status(403).json({ success: false, code: "STUDENT_CHAT_UNAVAILABLE" });
    return;
  }

  // Find existing conversation
  let conversation = await Conversation.findOne({ bookings: bookingId })
    .populate("student", "name avatar")
    .populate("tutor", "name avatar");

  // Create if not exists
  if (!conversation) {
    // Unique booking index makes concurrent opens safe once initialized.
    try {
      conversation = await Conversation.create({
        student: booking.student, tutor: booking.tutor, bookings: [bookingId], stage: 'booking'
      });
      await conversation.populate("student", "name avatar");
      await conversation.populate("tutor", "name avatar");
    } catch (err: unknown) {
      if (!(typeof err === "object" && err !== null && "code" in err && err.code === 11000)) throw err;
      conversation = await Conversation.findOne({ bookings: bookingId })
        .populate("student", "name avatar").populate("tutor", "name avatar");
      if (!conversation) throw err;
    }
  }

  // Reset unread count for current user
  if (isStudent) {
    await Conversation.findByIdAndUpdate(conversation._id, { studentUnread: 0 });
  } else {
    await Conversation.findByIdAndUpdate(conversation._id, { tutorUnread: 0 });
  }

  res.status(200).json({ success: true, conversation });
};

// @desc    Get my conversations
// @route   GET /api/chat/conversations
// @access  Private
export const getMyConversations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user?._id;
  const role = req.user?.role;
  const { page = "1", limit = "20" } = req.query;

  if (role !== "student" && role !== "tutor") {
    res.status(403).json({ success: false, code: "CHAT_ROLE_NOT_ALLOWED" });
    return;
  }
  const filter = role === "student"
    ? { student: userId }
    : { tutor: userId };

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
  const skip = (pageNum - 1) * limitNum;

  const total = await Conversation.countDocuments(filter);

  const conversations = await Conversation.find(filter)
    .populate("student", "name avatar")
    .populate("tutor", "name avatar")
    .populate("booking", "amount status schedule")
    .sort("-lastMessageAt")
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({
    success: true,
    conversations,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/:conversationId/messages
// @access  Private
export const getMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { conversationId } = req.params;
  const userId = req.user?._id;
  const { page = "1", limit = "50" } = req.query;

  // Verify user is part of conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    res.status(404).json({ success: false, message: "Conversation not found" });
    return;
  }

  const isParticipant =
    conversation.student.toString() === userId?.toString() ||
    conversation.tutor.toString() === userId?.toString();

  if (!isParticipant) {
    res.status(403).json({ success: false, message: "Not authorized" });
    return;
  }

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
  const skip = (pageNum - 1) * limitNum;

  if (!(await isConversationStudentEligible(conversation.student))) {
    res.status(403).json({ success: false, code: "STUDENT_CHAT_UNAVAILABLE" });
    return;
  }

  const total = await Message.countDocuments({ conversation: conversationId });

  // Fetch newest messages first for pagination, then reverse so the client
  // still renders oldest-to-newest within the page (natural chat reading order).
  const messages = await Message.find({ conversation: conversationId })
    .populate("sender", "name avatar")
    .sort("-createdAt")
    .skip(skip)
    .limit(limitNum);

  messages.reverse();

  // Mark messages as read
  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: userId }, isRead: false },
    { isRead: true }
  );

  await Conversation.findByIdAndUpdate(conversationId,
    { $set: { [conversation.student.toString() === userId?.toString() ? "studentUnread" : "tutorUnread"]: 0 } });

  res.status(200).json({
    success: true,
    messages,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
};

// @desc    Send a message
// @route   POST /api/chat/:conversationId/messages
// @access  Private
export const sendMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const conversationId = req.params.conversationId as string;
  const { content } = req.body;
  const userId = req.user?._id;

  if (!content?.trim()) {
    res.status(400).json({ success: false, message: "Message cannot be empty" });
    return;
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    res.status(404).json({ success: false, message: "Conversation not found" });
    return;
  }

  const isStudent = conversation.student.toString() === userId?.toString();
  const isTutor = conversation.tutor.toString() === userId?.toString();

  if (!isStudent && !isTutor) {
    res.status(403).json({ success: false, message: "Not authorized" });
    return;
  }

  // A tutor may still have an active chat after the parent revokes a minor's
  // consent. Do not store, broadcast, or notify a suspended/unapproved learner.
  // Checking only req.user would miss this because the sender is the tutor.
  if (!(await isConversationStudentEligible(conversation.student))) {
    res.status(403).json({ success: false, code: "STUDENT_CHAT_UNAVAILABLE",
      message: "The student account is not authorized to receive tutoring messages." });
    return;
  }

  const filteredContent = filterContactInfo(content);
  const wasFiltered = filteredContent !== content;

  // Fix 1 — cast conversationId to Types.ObjectId
  const message = await Message.create({
    conversation: new Types.ObjectId(conversationId),
    sender: new Types.ObjectId(userId?.toString()),
    content: filteredContent,
  }) as InstanceType<typeof Message>;

  // Fix 2 — cast message type so populate and _id work
  const populatedMessage = await Message.findById(message._id)
    .populate("sender", "name avatar") as InstanceType<typeof Message>;

  // Atomic increment avoids losing unread messages when multiple sends race.
  // Use a server-generated message timestamp for the conversation preview.
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      lastMessage: filteredContent.substring(0, 100),
      lastMessageAt: message.createdAt,
    },
    $inc: isStudent ? { tutorUnread: 1 } : { studentUnread: 1 },
  });

  const io = req.app.get("io");
  // The HTTP API is also used by Supertest without a Socket.IO server.
  // A missing realtime transport must not turn a saved message into HTTP 500.
  if (io) io.to(conversationId).emit("new_message", {
    _id: populatedMessage._id,
    conversation: conversationId,
    sender: { _id: userId, name: req.user?.name, avatar: req.user?.avatar },
    content: filteredContent,
    isRead: false,
    createdAt: populatedMessage.createdAt,
    wasFiltered,
  });

  const recipientId = isStudent
    ? conversation.tutor.toString()
    : conversation.student.toString();

  await sendNotification(io, recipientId, {
    title: `💬 New Message from ${req.user?.name}`,
    message: filteredContent.substring(0, 60) + (filteredContent.length > 60 ? "..." : ""),
    type: "general",
    link: `/chat/${conversationId}`,
  });

  res.status(201).json({
    success: true,
    message: populatedMessage,
    wasFiltered,
  });
};