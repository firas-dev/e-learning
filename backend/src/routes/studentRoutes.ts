import express from "express";
import { getStudentDashboard, updateProgress } from "../controllers/studentController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/dashboard", protect, getStudentDashboard);
router.patch("/courses/:courseId/progress", protect, updateProgress); // ✅ new

export default router;