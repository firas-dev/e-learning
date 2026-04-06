import express from "express";
import {
  startSession,
  getActiveSession,
  endSession,
  uploadAttachment,
  deleteAttachment,
} from "../controllers/liveSessionController";
import { protect } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = express.Router();

router.post("/start", protect, startSession);
router.get("/:courseId/active", protect, getActiveSession);
router.patch("/:sessionId/end", protect, endSession);
router.post("/:sessionId/attachments", protect, upload.array("files", 10), uploadAttachment);
router.delete("/:sessionId/attachments/:publicId", protect, deleteAttachment);

export default router;