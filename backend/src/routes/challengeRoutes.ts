import express from "express";
import { protect } from "../middleware/auth";
import { upload } from "../middleware/upload";
import {
  // Challenges CRUD
  getChallenges,
  getChallenge,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  // Timer
  startChallengeTimer,
  // Submissions
  submitChallenge,
  getMySubmission,
  getChallengeSubmissions,
  gradeSubmission,
  // Leaderboards
  getRoomLeaderboard,
  getChallengeLeaderboard,
  // My stats
  getMyRoomStats,
  // Hints
  getHints,
  useHint,
  // Discussion
  getThreads,
  postThread,
  reactToThread,
  deleteThread,
  // Announcements
  getAnnouncements,
  postAnnouncement,
  deleteAnnouncement,
  // Analytics
  getRoomAnalytics,
  // Manual points
  awardManualPoints,
} from "../controllers/challengeController";

// mergeParams: true so :roomId from the parent router is accessible
const router = express.Router({ mergeParams: true });

// ── Challenges ────────────────────────────────────────────────────────────────
router.get("/challenges",                                    protect, getChallenges);
router.post("/challenges",                                   protect, createChallenge);
router.get("/challenges/:challengeId",                       protect, getChallenge);
router.patch("/challenges/:challengeId",                     protect, updateChallenge);
router.delete("/challenges/:challengeId",                    protect, deleteChallenge);

// ── Per-user timer ────────────────────────────────────────────────────────────
router.post("/challenges/:challengeId/timer/start",          protect, startChallengeTimer);

// ── Submissions ───────────────────────────────────────────────────────────────
router.post(
  "/challenges/:challengeId/submit",
  protect,
  upload.array("files", 5),
  submitChallenge
);
router.get("/challenges/:challengeId/my-submission",         protect, getMySubmission);
router.get("/challenges/:challengeId/submissions",           protect, getChallengeSubmissions);
router.patch(
  "/challenges/:challengeId/submissions/:submissionId/grade",
  protect,
  gradeSubmission
);

// ── Leaderboards ──────────────────────────────────────────────────────────────
router.get("/leaderboard",                                   protect, getRoomLeaderboard);
router.get("/challenges/:challengeId/leaderboard",           protect, getChallengeLeaderboard);

// ── My stats ──────────────────────────────────────────────────────────────────
router.get("/my-stats",                                      protect, getMyRoomStats);

// ── Hints ─────────────────────────────────────────────────────────────────────
router.get("/challenges/:challengeId/hints",                 protect, getHints);
router.post("/challenges/:challengeId/hints/:hintIndex/use", protect, useHint);

// ── Discussion threads ────────────────────────────────────────────────────────
router.get("/challenges/:challengeId/threads",               protect, getThreads);
router.post("/challenges/:challengeId/threads",              protect, postThread);
router.post(
  "/challenges/:challengeId/threads/:threadId/react",
  protect,
  reactToThread
);
router.delete(
  "/challenges/:challengeId/threads/:threadId",
  protect,
  deleteThread
);

// ── Announcements ─────────────────────────────────────────────────────────────
router.get("/announcements",                                 protect, getAnnouncements);
router.post("/announcements",                                protect, postAnnouncement);
router.delete("/announcements/:announcementId",              protect, deleteAnnouncement);

// ── Analytics (teacher) ───────────────────────────────────────────────────────
router.get("/analytics",                                     protect, getRoomAnalytics);

// ── Manual point award (teacher) ──────────────────────────────────────────────
router.post("/students/:studentId/award-points",             protect, awardManualPoints);

export default router;