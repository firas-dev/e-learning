import express from "express";
import {
  createRoom,
  getTeacherRooms,
  getStudentRooms,
  getRoom,
  inviteStudents,
  getStudentInvitations,
  respondToInvitation,
  removeMember,
  deleteRoom,
  getPendingInvitationCount,
} from "../controllers/privateRoomController";
import { protect } from "../middleware/auth";

const router = express.Router();

// Teacher routes
router.post("/", protect, createRoom);
router.get("/teacher", protect, getTeacherRooms);
router.post("/:roomId/invite", protect, inviteStudents);
router.delete("/:roomId/members/:memberId", protect, removeMember);
router.delete("/:roomId", protect, deleteRoom);

// Student routes
router.get("/student", protect, getStudentRooms);
router.get("/invitations", protect, getStudentInvitations);
router.get("/invitations/count", protect, getPendingInvitationCount);
router.patch("/:roomId/respond", protect, respondToInvitation);

// Shared
router.get("/:roomId", protect, getRoom);

export default router;