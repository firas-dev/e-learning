import express from "express";
import {
  getStudentDashboard,
  updateProgress,
  getCourseProgress,
  completeLesson,
  addLearningTime,
} from "../controllers/studentController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/dashboard", protect, getStudentDashboard);
router.get("/courses/:courseId/progress", protect, getCourseProgress);          // hydrate on mount
router.patch("/courses/:courseId/lessons/:lessonId/complete", protect, completeLesson); // complete a lesson
router.patch("/courses/:courseId/learning-time", protect, addLearningTime);     // timer flush
router.patch("/courses/:courseId/progress", protect, updateProgress);           // deprecated

export default router;