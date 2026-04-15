import express from "express";
import { getTeacherProfile, getStudentProfile, getMyProfile } from "../controllers/profileController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/me", protect, getMyProfile);
router.get("/teacher/:userId", protect, getTeacherProfile);
router.get("/student/:userId", protect, getStudentProfile);

export default router;