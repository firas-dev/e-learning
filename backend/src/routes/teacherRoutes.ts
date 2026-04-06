import express from "express";
import { getTeacherDashboard, createCourse, deleteCourse, togglePublishCourse } from "../controllers/teacherController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/dashboard", protect, getTeacherDashboard);
router.post("/courses", protect, createCourse);
router.delete("/courses/:courseId", protect, deleteCourse);
router.patch("/courses/:courseId/publish", protect, togglePublishCourse); 

export default router;