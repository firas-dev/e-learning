// ─── emotionRoutes.ts ─────────────────────────────────────────────────────────
// Mount in your main app.ts:
//   import emotionRoutes from './routes/emotionRoutes';
//   app.use('/api', emotionRoutes);

import express from "express";
import { protect } from "../middleware/auth";
import {
  logEmotions,
  getEmotionSummary,
  getLessonHeatmap,
} from "../controllers/emotionController";

const router = express.Router();

// ── Student ───────────────────────────────────────────────────────────────────
// Flush emotion log from frontend (called by useEmotionDetection every 30s)
router.post(
  "/student/courses/:courseId/emotion-log",
  protect,
  logEmotions
);

// Personal emotion journal data (StudentProfile page)
router.get(
  "/student/courses/:courseId/emotion-summary",
  protect,
  getEmotionSummary
);

// ── Teacher ───────────────────────────────────────────────────────────────────
// Lesson heatmap (aggregated across all enrolled students)
router.get(
  "/teacher/courses/:courseId/lessons/:lessonId/heatmap",
  protect,
  getLessonHeatmap
);

export default router;