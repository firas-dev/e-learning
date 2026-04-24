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
// All routes under /api/rooms/:roomId/* are handled by challengeRoutes
// e.g. GET /api/rooms/:roomId/challenges
//      POST /api/rooms/:roomId/challenges/:challengeId/submit
//      GET  /api/rooms/:roomId/leaderboard
router.use("/:roomId", challengeRoutes);

export default router;