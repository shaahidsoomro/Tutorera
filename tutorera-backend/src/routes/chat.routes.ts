import { Router } from "express";
import {
  getOrCreateConversation,
  getOrCreateOfferConversation,
  getMyConversations,
  getMessages,
  sendMessage,
} from "../controllers/chat.controller";
import { protect, authorize } from "../middlewares/auth.middleware";
import { validate, sendMessageSchema, getOrCreateConversationSchema, getOrCreateOfferConversationSchema } from "../validators/chat.validator";

const router = Router();

router.post("/conversation", protect, authorize("student", "tutor"), validate(getOrCreateConversationSchema), getOrCreateConversation);
router.post("/offer-conversation", protect, authorize("student", "tutor"), validate(getOrCreateOfferConversationSchema), getOrCreateOfferConversation);
router.get("/conversations", protect, authorize("student", "tutor"), getMyConversations);
router.get("/:conversationId/messages", protect, authorize("student", "tutor"), getMessages);
router.post("/:conversationId/messages", protect, authorize("student", "tutor"), validate(sendMessageSchema), sendMessage);

export default router;