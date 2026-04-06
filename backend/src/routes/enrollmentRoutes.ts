import express from "express";
import {
  getPublishedCourses,
  enrollCourse,
  unenrollCourse,
  getMyEnrollments,
} from "../controllers/enrollmentController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/catalog", protect, getPublishedCourses);
router.get("/my", protect, getMyEnrollments);
router.post("/:courseId/enroll", protect, enrollCourse);
router.delete("/:courseId/unenroll", protect, unenrollCourse);

export default router;