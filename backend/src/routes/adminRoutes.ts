import express from "express";
import {
  getAdminStats,
  getUsers,
  getUserById,
  updateUser,
  toggleBanUser,
  deleteUser,
  getAllCourses,
  adminTogglePublishCourse,
  adminDeleteCourse,
  sendAnnouncement,
} from "../controllers/adminController";
import { protect } from "../middleware/auth";

const router = express.Router();

// Guard: only admins
const adminOnly = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
};

// Analytics
router.get("/stats", protect, adminOnly, getAdminStats);

// User management
router.get("/users", protect, adminOnly, getUsers);
router.get("/users/:userId", protect, adminOnly, getUserById);
router.patch("/users/:userId", protect, adminOnly, updateUser);
router.patch("/users/:userId/ban", protect, adminOnly, toggleBanUser);
router.delete("/users/:userId", protect, adminOnly, deleteUser);

// Course management
router.get("/courses", protect, adminOnly, getAllCourses);
router.patch("/courses/:courseId/publish", protect, adminOnly, adminTogglePublishCourse);
router.delete("/courses/:courseId", protect, adminOnly, adminDeleteCourse);

// Announcements
router.post("/announce", protect, adminOnly, sendAnnouncement);

export default router;