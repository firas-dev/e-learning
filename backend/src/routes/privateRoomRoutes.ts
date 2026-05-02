import express from "express";
import {
  createRoom,
  getTeacherRooms,
  getStudentRooms,
  getRoom,
  inviteStudents,
  getStudentInvitations,
  respondToInvitationPatched,
  removeMember,
  deleteRoom,
  getPendingInvitationCount,
} from "../controllers/privateRoomController";
import { protect } from "../middleware/auth";
import challengeRoutes from "./challengeRoutes";

const router = express.Router();

// ── Teacher routes ────────────────────────────────────────────────────────────
router.post("/",                                  protect, createRoom);
router.get("/teacher",                            protect, getTeacherRooms);
router.post("/:roomId/invite",                    protect, inviteStudents);
router.delete("/:roomId/members/:memberId",       protect, removeMember);
router.delete("/:roomId",                         protect, deleteRoom);

// ── Student routes ────────────────────────────────────────────────────────────
router.get("/student",                            protect, getStudentRooms);
router.get("/invitations",                        protect, getStudentInvitations);
router.get("/invitations/count",                  protect, getPendingInvitationCount);
router.patch("/:roomId/respond",                  protect, respondToInvitationPatched);

// ── Shared ────────────────────────────────────────────────────────────────────
router.get("/:roomId",                            protect, getRoom);

// ── Competition features nested inside each room ──────────────────────────────
// CRITICAL FIX: Mount under /:roomId/r instead of /:roomId
// In Express 5, router.use("/:roomId", ...) intercepts ALL requests matching
// that prefix (including PATCH /:roomId/respond) regardless of method-specific
// routes defined before it. Using /:roomId/r avoids this conflict entirely.
// challengeRoutes uses mergeParams:true so :roomId is still accessible.
router.use("/:roomId/r", challengeRoutes);

export default router;