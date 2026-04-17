import express from "express";
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
  getMessageableTeachers,
  getMessageableStudents,
} from "../controllers/messageController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/unread-count", protect, getUnreadCount);
router.get("/conversations", protect, getConversations);
router.post("/conversations", protect, getOrCreateConversation);
router.get("/conversations/:conversationId", protect, getMessages);
router.post("/conversations/:conversationId", protect, sendMessage);
router.get("/teachers", protect, getMessageableTeachers);
router.get("/students", protect, getMessageableStudents);

export default router;