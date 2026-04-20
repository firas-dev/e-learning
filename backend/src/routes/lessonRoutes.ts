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
router.get("/:courseId/teacher", protect, async (req, res) => {
   try {
     const { courseId } = req.params;
     const Course = require("../models/Course").default;
     const User = require("../models/User").default;
     const course = await Course.findById(courseId).select("teacherId");
     if (!course) return res.status(404).json({ message: "Course not found." });
     const teacher = await User.findById(course.teacherId).select("fullName email");
     if (!teacher) return res.status(404).json({ message: "Teacher not found." });
     res.json({ _id: teacher._id, fullName: teacher.fullName, email: teacher.email });
   } catch (err) {
     res.status(500).json({ message: "Server error" });
   }
 });
  

export default router;