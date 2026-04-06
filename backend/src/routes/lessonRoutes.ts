import express from "express";
import {
  getLessons,
  createLesson,
  deleteLesson,
  addFilesToLesson,
  deleteFileFromLesson,
} from "../controllers/lessonController";
import { protect } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = express.Router();

router.get("/:courseId/lessons", protect, getLessons);
router.post("/:courseId/lessons", protect, upload.array("files", 10), createLesson);
router.delete("/lessons/:lessonId", protect, deleteLesson);
router.post("/lessons/:lessonId/files", protect, upload.array("files", 10), addFilesToLesson);
router.delete("/lessons/:lessonId/files", protect, deleteFileFromLesson);

export default router;