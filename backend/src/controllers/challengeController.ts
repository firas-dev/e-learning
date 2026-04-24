import { Request, Response } from "express";
import mongoose from "mongoose";
import Challenge from "../models/Challenge";
import Submission from "../models/Submission";
import RoomStudent from "../models/RoomStudent";
import ChallengeTimerStart from "../models/ChallengeTimerStart";
import { ChallengeThread, RoomAnnouncement } from "../models/ChallengeThread";
import PrivateRoom from "../models/PrivateRoom";
import {
  calculateLevel,
  calculateBonusPoints,
  calculateStreakMultiplier,
  getNewBadges,
  updateStreak,
  BADGE_DEFINITIONS,
} from "../utils/gamificationEngine";

// ─── helpers ─────────────────────────────────────────────────────────────────

function requireTeacher(req: Request, res: Response): boolean {
  if ((req as any).user.role !== "teacher") {
    res.status(403).json({ message: "Teacher access required." });
    return false;
  }
  return true;
}

async function ensureRoomMembership(req: Request, res: Response): Promise<boolean> {
  const { roomId } = req.params;
  const userId = (req as any).user.id;
  const role   = (req as any).user.role;

  const room = await PrivateRoom.findById(roomId);
  if (!room || !room.isActive) {
    res.status(404).json({ message: "Room not found." });
    return false;
  }

  const isTeacher = String(room.teacherId) === userId;
  const isMember  = room.members.some((m) => String(m) === userId);

  if (!isTeacher && !isMember && role !== "admin") {
    res.status(403).json({ message: "You are not a member of this room." });
    return false;
  }
  return true;
}

async function awardPointsAndBadges(
  studentId: string,
  roomId: string,
  pointsToAdd: number,
  challengeId: string,
  opts: {
    hasPerfectScore?: boolean;
    isFirstBlood?: boolean;
    isTop3?: boolean;
    isSpeedRunner?: boolean;
  } = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ newBadges: any[]; newLevel: number; newPoints: number }> {
  let rs = await RoomStudent.findOne({ studentId, roomId });
  if (!rs) {
    rs = await RoomStudent.create({ studentId, roomId });
  }

  const streakResult = updateStreak(rs.streak.lastActiveDate);
  let newStreakCurrent = rs.streak.current;
  let newStreakLongest  = rs.streak.longest;

  if (streakResult.action === "extended") {
    newStreakCurrent += 1;
    newStreakLongest = Math.max(newStreakLongest, newStreakCurrent);
  } else if (streakResult.action === "reset") {
    newStreakCurrent = 1;
  }

  const streakMultiplier = calculateStreakMultiplier(newStreakCurrent);
  const finalPoints = Math.round(pointsToAdd * (1 + streakMultiplier));
  const newPoints = rs.totalPoints + finalPoints;
  const newLevel  = calculateLevel(newPoints);

  // Check for new badges
  const badgeStats = {
    challengesCompleted: rs.challengesCompleted + 1,
    streak:              newStreakCurrent,
    hasPerfectScore:     opts.hasPerfectScore ?? false,
    isFirstBlood:        opts.isFirstBlood ?? false,
    isTop3:              opts.isTop3 ?? false,
    isSpeedRunner:       opts.isSpeedRunner ?? false,
    helpfulPosts:        rs.helpfulPosts,
    level:               newLevel,
    challengesAttempted: rs.challengesAttempted,
  };

  const currentBadgeIds = rs.badges.map((b) => b.id);
  const newBadgeDefs    = getNewBadges(currentBadgeIds, badgeStats);
  const newBadgeObjects = newBadgeDefs.map((b) => ({ ...b, earnedAt: new Date() }));

  await RoomStudent.findOneAndUpdate(
    { studentId, roomId },
    {
      totalPoints:         newPoints,
      level:               newLevel,
      challengesCompleted: rs.challengesCompleted + 1,
      challengesAttempted: rs.challengesAttempted + 1,
      "streak.current":   newStreakCurrent,
      "streak.longest":   newStreakLongest,
      "streak.lastActiveDate": new Date(),
      lastActiveAt:        new Date(),
      $push: newBadgeObjects.length ? { badges: { $each: newBadgeObjects } } : undefined,
    }
  );

  return { newBadges: newBadgeObjects, newLevel, newPoints };
}

// ─── CHALLENGES CRUD ─────────────────────────────────────────────────────────

// GET /api/rooms/:roomId/challenges
export const getChallenges = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { roomId } = req.params;
    const { status } = req.query;

    const filter: Record<string, unknown> = { roomId };
    if (status) filter.status = status;

    // Students cannot see drafts
    if ((req as any).user.role === "student") {
      filter.status = filter.status
        ? { $in: ["upcoming","active","completed"] }
        : { $in: ["upcoming","active","completed"] };
    }

    const challenges = await Challenge.find(filter).sort({ startsAt: 1 });
    res.json(challenges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/rooms/:roomId/challenges/:challengeId
export const getChallenge = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { challengeId, roomId } = req.params;

    const challenge = await Challenge.findOne({ _id: challengeId, roomId });
    if (!challenge) return res.status(404).json({ message: "Challenge not found." });

    // Strip correct answers from quiz for students
    if ((req as any).user.role === "student" && challenge.status === "active") {
      const safe = challenge.toObject();
      safe.questions = safe.questions?.map((q) => ({
        ...q,
        correctAnswer: undefined,
        options: q.options?.map((o) => ({ label: o.label })),
      })) as typeof safe.questions;
      return res.json(safe);
    }

    res.json(challenge);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/rooms/:roomId/challenges
export const createChallenge = async (req: Request, res: Response) => {
  try {
    if (!requireTeacher(req, res)) return;
    if (!(await ensureRoomMembership(req, res))) return;

    const teacherId = (req as any).user.id;
    const { roomId } = req.params;
    const {
      title, description, type, difficulty, totalPoints, bonusPoints,
      startsAt, endsAt, timeLimitMinutes, hideLeaderboard, allowResubmission,
      hints, questions, status,
    } = req.body;

    if (!title || !description || !type || !totalPoints || !startsAt || !endsAt) {
      return res.status(400).json({ message: "Missing required fields." });
    }
    if (new Date(startsAt) >= new Date(endsAt)) {
      return res.status(400).json({ message: "startsAt must be before endsAt." });
    }

    const challenge = await Challenge.create({
      roomId, teacherId, title, description, type,
      difficulty:        difficulty ?? "medium",
      totalPoints,
      bonusPoints:       bonusPoints ?? 0,
      startsAt:          new Date(startsAt),
      endsAt:            new Date(endsAt),
      timeLimitMinutes,
      status:            status ?? "draft",
      hideLeaderboard:   hideLeaderboard ?? false,
      allowResubmission: allowResubmission ?? true,
      hints:             hints ?? [],
      questions:         questions ?? [],
    });

    res.status(201).json(challenge);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/rooms/:roomId/challenges/:challengeId
export const updateChallenge = async (req: Request, res: Response) => {
  try {
    if (!requireTeacher(req, res)) return;
    const { challengeId, roomId } = req.params;
    const teacherId = (req as any).user.id;

    const challenge = await Challenge.findOneAndUpdate(
      { _id: challengeId, roomId, teacherId },
      { ...req.body },
      { new: true }
    );
    if (!challenge) return res.status(403).json({ message: "Not found or unauthorized." });

    res.json(challenge);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/rooms/:roomId/challenges/:challengeId
export const deleteChallenge = async (req: Request, res: Response) => {
  try {
    if (!requireTeacher(req, res)) return;
    const { challengeId, roomId } = req.params;
    const teacherId = (req as any).user.id;

    const challenge = await Challenge.findOneAndDelete({ _id: challengeId, roomId, teacherId });
    if (!challenge) return res.status(403).json({ message: "Not found or unauthorized." });

    await Submission.deleteMany({ challengeId });
    await ChallengeThread.deleteMany({ challengeId });

    res.json({ message: "Challenge deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── TIMER ───────────────────────────────────────────────────────────────────

// POST /api/rooms/:roomId/challenges/:challengeId/timer/start
export const startChallengeTimer = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { challengeId } = req.params;
    const studentId = (req as any).user.id;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge || challenge.status !== "active") {
      return res.status(400).json({ message: "Challenge is not active." });
    }
    if (!challenge.timeLimitMinutes) {
      return res.status(400).json({ message: "This challenge has no per-user time limit." });
    }

    const existing = await ChallengeTimerStart.findOne({ challengeId, studentId });
    if (existing) return res.json({ expiresAt: existing.expiresAt, alreadyStarted: true });

    const expiresAt = new Date(
      Math.min(
        Date.now() + challenge.timeLimitMinutes * 60_000,
        challenge.endsAt.getTime()
      )
    );

    const timer = await ChallengeTimerStart.create({ challengeId, studentId, expiresAt });
    res.status(201).json({ expiresAt: timer.expiresAt });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── SUBMISSIONS ─────────────────────────────────────────────────────────────

// POST /api/rooms/:roomId/challenges/:challengeId/submit
export const submitChallenge = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { challengeId, roomId } = req.params;
    const studentId = (req as any).user.id;

    const challenge = await Challenge.findOne({ _id: challengeId, roomId });
    if (!challenge || challenge.status !== "active") {
      return res.status(400).json({ message: "Challenge is not active." });
    }
    if (new Date() > challenge.endsAt) {
      return res.status(400).json({ message: "Submission deadline has passed." });
    }

    // Per-user timer check
    if (challenge.timeLimitMinutes) {
      const timer = await ChallengeTimerStart.findOne({ challengeId, studentId });
      if (timer && new Date() > timer.expiresAt) {
        return res.status(400).json({ message: "Your time limit has expired." });
      }
    }

    // Resubmission logic
    const lastSub = await Submission.findOne({ challengeId, studentId }).sort({ attemptNumber: -1 });
    if (lastSub && !challenge.allowResubmission) {
      return res.status(400).json({ message: "Resubmission not allowed." });
    }
    const attemptNumber = lastSub ? lastSub.attemptNumber + 1 : 1;

    const { answers, timeTakenSeconds } = req.body;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    // ── Auto-grade quizzes ────────────────────────────────────────
    let score = 0;
    let gradedAnswers = answers ? (typeof answers === "string" ? JSON.parse(answers) : answers) : [];
    let submissionStatus: "pending" | "auto_graded" = "pending";

    if (challenge.type === "quiz" && challenge.questions?.length) {
      gradedAnswers = gradedAnswers.map((a: { questionId: string; answer: string }) => {
        const q = challenge.questions!.find((q) => String(q._id) === String(a.questionId));
        if (!q) return a;

        let isCorrect = false;
        if (q.type === "mcq") {
          const correct = q.options?.find((o) => o.isCorrect)?.label;
          isCorrect = a.answer === correct;
        } else {
          isCorrect = a.answer?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();
        }
        const earnedPoints = isCorrect ? q.points : 0;
        score += earnedPoints;
        return { ...a, isCorrect, earnedPoints };
      });
      submissionStatus = "auto_graded";
    }

    // ── Bonus points ──────────────────────────────────────────────
    const bonusScore = calculateBonusPoints(
      challenge.bonusPoints,
      challenge.startsAt,
      challenge.endsAt,
      new Date()
    );

    // ── Is first blood? ───────────────────────────────────────────
    const existingCount = await Submission.countDocuments({ challengeId, roomId });
    const isFirstBlood = existingCount === 0;

    // ── Speed runner? (top 10% time) ──────────────────────────────
    const totalWindow = challenge.endsAt.getTime() - challenge.startsAt.getTime();
    const elapsed     = Date.now() - challenge.startsAt.getTime();
    const isSpeedRunner = elapsed / totalWindow < 0.1;

    // ── Perfect score? ────────────────────────────────────────────
    const hasPerfectScore =
      challenge.type === "quiz" &&
      challenge.totalPoints > 0 &&
      score >= challenge.totalPoints;

    const totalScore = score + bonusScore;

    const submission = await Submission.create({
      challengeId, roomId, studentId,
      answers: gradedAnswers,
      attachments: files.map((f) => ({
        originalName: f.originalname, url: (f as any).path, mimetype: f.mimetype,
      })),
      score,
      bonusScore,
      totalScore,
      status: submissionStatus,
      submittedAt: new Date(),
      attemptNumber,
      timeTakenSeconds: timeTakenSeconds ? Number(timeTakenSeconds) : undefined,
      gradedAt: submissionStatus === "auto_graded" ? new Date() : undefined,
    });

    // Update participant count (only on first attempt)
    if (attemptNumber === 1) {
      await Challenge.findByIdAndUpdate(challengeId, { $inc: { participantCount: 1 } });
    }

    // ── Award gamification ────────────────────────────────────────
    const { newBadges, newLevel, newPoints } = await awardPointsAndBadges(
      studentId, roomId, totalScore, challengeId,
      { hasPerfectScore, isFirstBlood, isSpeedRunner, isTop3: false }
    );

    // ── Ensure RoomStudent exists (upsert for safety) ─────────────
    await RoomStudent.updateOne(
      { studentId, roomId },
      { $setOnInsert: { challengesAttempted: 0, joinedAt: new Date() } },
      { upsert: true }
    );

    res.status(201).json({
      submission,
      gamification: { newBadges, newLevel, newPoints },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/rooms/:roomId/challenges/:challengeId/my-submission
export const getMySubmission = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { challengeId } = req.params;
    const studentId = (req as any).user.id;

    const submission = await Submission.findOne({ challengeId, studentId }).sort({ attemptNumber: -1 });
    if (!submission) return res.status(404).json({ message: "No submission found." });

    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/rooms/:roomId/challenges/:challengeId/submissions  (teacher only)
export const getChallengeSubmissions = async (req: Request, res: Response) => {
  try {
    if (!requireTeacher(req, res)) return;
    const { challengeId, roomId } = req.params;

    const submissions = await Submission.find({ challengeId, roomId })
      .populate("studentId", "fullName email")
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/rooms/:roomId/challenges/:challengeId/submissions/:submissionId/grade
export const gradeSubmission = async (req: Request, res: Response) => {
  try {
    if (!requireTeacher(req, res)) return;
    const { submissionId } = req.params;
    const gradedBy = (req as any).user.id;
    const { score, feedback } = req.body;

    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json({ message: "Submission not found." });

    const challenge = await Challenge.findById(submission.challengeId);
    const bonusScore = submission.bonusScore;
    const totalScore = (score ?? 0) + bonusScore;

    submission.score     = score ?? 0;
    submission.totalScore = totalScore;
    submission.feedback  = feedback;
    submission.status    = "graded";
    submission.gradedAt  = new Date();
    submission.gradedBy  = new mongoose.Types.ObjectId(gradedBy);
    await submission.save();

    // Award points for newly graded submission
    await awardPointsAndBadges(
      String(submission.studentId),
      String(submission.roomId),
      totalScore,
      String(submission.challengeId),
      {
        hasPerfectScore: challenge ? totalScore >= challenge.totalPoints : false,
      }
    );

    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── LEADERBOARDS ─────────────────────────────────────────────────────────────

// GET /api/rooms/:roomId/leaderboard
export const getRoomLeaderboard = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { roomId } = req.params;

    const entries = await RoomStudent.find({ roomId })
      .populate("studentId", "fullName email")
      .sort({ totalPoints: -1, challengesCompleted: -1 })
      .limit(100);

    const leaderboard = entries.map((e, i) => ({
      rank:                i + 1,
      student:             e.studentId,
      totalPoints:         e.totalPoints,
      level:               e.level,
      badges:              e.badges,
      streak:              e.streak.current,
      challengesCompleted: e.challengesCompleted,
    }));

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/rooms/:roomId/challenges/:challengeId/leaderboard
export const getChallengeLeaderboard = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { challengeId, roomId } = req.params;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ message: "Challenge not found." });

    const isTeacher = (req as any).user.role === "teacher";

    // Hide until ended if configured
    if (challenge.hideLeaderboard && new Date() < challenge.endsAt && !isTeacher) {
      return res.json({ hidden: true, message: "Leaderboard will be revealed after the challenge ends." });
    }

    // Best submission per student
    const raw = await Submission.aggregate([
      {
        $match: {
          challengeId: new mongoose.Types.ObjectId(challengeId),
          status: { $in: ["graded","auto_graded"] },
        },
      },
      { $sort: { totalScore: -1, submittedAt: 1 } },
      {
        $group: {
          _id:  "$studentId",
          best: { $first: "$$ROOT" },
        },
      },
      { $sort: { "best.totalScore": -1, "best.submittedAt": 1 } },
    ]);

    await Submission.populate(raw, { path: "best.studentId", select: "fullName" });

    const leaderboard = raw.map((s, i) => ({
      rank:             i + 1,
      student:          s.best.studentId,
      totalScore:       s.best.totalScore,
      score:            s.best.score,
      bonusScore:       s.best.bonusScore,
      submittedAt:      s.best.submittedAt,
      timeTakenSeconds: s.best.timeTakenSeconds,
    }));

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── MY STATS ─────────────────────────────────────────────────────────────────

// GET /api/rooms/:roomId/my-stats
export const getMyRoomStats = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { roomId } = req.params;
    const studentId = (req as any).user.id;

    let rs = await RoomStudent.findOne({ studentId, roomId });
    if (!rs) {
      rs = await RoomStudent.create({ studentId, roomId });
    }

    // Compute rank
    const rank = (await RoomStudent.countDocuments({
      roomId,
      totalPoints: { $gt: rs.totalPoints },
    })) + 1;

    res.json({ ...rs.toObject(), rank });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── HINTS ────────────────────────────────────────────────────────────────────

// GET /api/rooms/:roomId/challenges/:challengeId/hints
export const getHints = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { challengeId, roomId } = req.params;
    const studentId = (req as any).user.id;

    const challenge = await Challenge.findOne({ _id: challengeId, roomId });
    if (!challenge) return res.status(404).json({ message: "Challenge not found." });

    // Return hints with "revealed" flag based on student's used hints
    const submission = await Submission.findOne({ challengeId, studentId }).sort({ attemptNumber: -1 });
    const usedIndices = submission?.hintsUsedIndices ?? [];

    const hints = challenge.hints.map((h, i) => ({
      index:       i,
      pointsCost:  h.pointsCost,
      revealed:    usedIndices.includes(i),
      text:        usedIndices.includes(i) ? h.text : undefined,
    }));

    res.json(hints);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/rooms/:roomId/challenges/:challengeId/hints/:hintIndex/use
export const useHint = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { challengeId, roomId, hintIndex } = req.params;
    const studentId = (req as any).user.id;

    const challenge = await Challenge.findOne({ _id: challengeId, roomId });
    if (!challenge) return res.status(404).json({ message: "Challenge not found." });

    const idx  = parseInt(hintIndex, 10);
    const hint = challenge.hints[idx];
    if (!hint) return res.status(404).json({ message: "Hint not found." });

    // Check if already used
    const existingSub = await Submission.findOne({ challengeId, studentId }).sort({ attemptNumber: -1 });
    const usedIndices = existingSub?.hintsUsedIndices ?? [];
    if (usedIndices.includes(idx)) {
      return res.json({ hint: hint.text, pointsDeducted: 0, alreadyUsed: true });
    }

    // Deduct points
    if (hint.pointsCost > 0) {
      await RoomStudent.findOneAndUpdate(
        { studentId, roomId },
        { $inc: { totalPoints: -hint.pointsCost, hintsRequested: 1 } }
      );
    }

    // Mark hint as used on latest submission (or create a placeholder)
    if (existingSub) {
      await Submission.findByIdAndUpdate(existingSub._id, {
        $addToSet: { hintsUsedIndices: idx },
      });
    }

    res.json({ hint: hint.text, pointsDeducted: hint.pointsCost, alreadyUsed: false });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DISCUSSION THREADS ───────────────────────────────────────────────────────

// GET /api/rooms/:roomId/challenges/:challengeId/threads
export const getThreads = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { challengeId } = req.params;

    const threads = await ChallengeThread.find({ challengeId })
      .sort({ createdAt: 1 })
      .limit(200);

    res.json(threads);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/rooms/:roomId/challenges/:challengeId/threads
export const postThread = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { challengeId, roomId } = req.params;
    const user = (req as any).user;
    const { text, parentId } = req.body;

    if (!text?.trim()) return res.status(400).json({ message: "Text is required." });

    const thread = await ChallengeThread.create({
      challengeId,
      roomId,
      authorId:   user.id,
      authorName: user.fullName || "User",
      authorRole: user.role,
      text:       text.trim(),
      parentId:   parentId && mongoose.Types.ObjectId.isValid(parentId) ? parentId : undefined,
      isHint:     user.role === "teacher" && req.body.isHint === true,
    });

    // Award helpful-post tracking for teachers marking a reply as helpful (future extension)
    res.status(201).json(thread);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/rooms/:roomId/challenges/:challengeId/threads/:threadId/react
export const reactToThread = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { threadId } = req.params;
    const userId = (req as any).user.id;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ message: "Emoji is required." });

    const thread = await ChallengeThread.findById(threadId);
    if (!thread) return res.status(404).json({ message: "Thread not found." });

    // Toggle reaction
    const existing = thread.reactions.findIndex(
      (r) => r.userId === userId && r.emoji === emoji
    );
    if (existing >= 0) {
      thread.reactions.splice(existing, 1);
    } else {
      thread.reactions.push({ emoji, userId });
    }
    await thread.save();

    res.json(thread);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/rooms/:roomId/challenges/:challengeId/threads/:threadId
export const deleteThread = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { threadId } = req.params;
    const user = (req as any).user;

    const thread = await ChallengeThread.findById(threadId);
    if (!thread) return res.status(404).json({ message: "Thread not found." });

    const isAuthor  = String(thread.authorId) === user.id;
    const isTeacher = user.role === "teacher";
    if (!isAuthor && !isTeacher) return res.status(403).json({ message: "Not allowed." });

    await thread.deleteOne();
    res.json({ message: "Deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

// GET /api/rooms/:roomId/announcements
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    if (!(await ensureRoomMembership(req, res))) return;
    const { roomId } = req.params;

    const announcements = await RoomAnnouncement.find({ roomId })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(20);

    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/rooms/:roomId/announcements
export const postAnnouncement = async (req: Request, res: Response) => {
  try {
    if (!requireTeacher(req, res)) return;
    if (!(await ensureRoomMembership(req, res))) return;

    const teacherId = (req as any).user.id;
    const { roomId } = req.params;
    const { title, body, pinned } = req.body;

    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ message: "Title and body are required." });
    }

    const ann = await RoomAnnouncement.create({
      roomId, teacherId,
      title: title.trim(),
      body:  body.trim(),
      pinned: pinned ?? false,
    });

    res.status(201).json(ann);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/rooms/:roomId/announcements/:announcementId
export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    if (!requireTeacher(req, res)) return;
    const { announcementId, roomId } = req.params;
    const teacherId = (req as any).user.id;

    const ann = await RoomAnnouncement.findOneAndDelete({ _id: announcementId, roomId, teacherId });
    if (!ann) return res.status(403).json({ message: "Not found or unauthorized." });

    res.json({ message: "Deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

// GET /api/rooms/:roomId/analytics
export const getRoomAnalytics = async (req: Request, res: Response) => {
  try {
    if (!requireTeacher(req, res)) return;
    if (!(await ensureRoomMembership(req, res))) return;

    const { roomId } = req.params;

    const [totalStudents, challenges] = await Promise.all([
      RoomStudent.countDocuments({ roomId }),
      Challenge.find({ roomId, status: { $in: ["active","completed"] } }),
    ]);

    const challengeAnalytics = await Promise.all(
      challenges.map(async (c) => {
        const submissions = await Submission.find({ challengeId: c._id });
        const uniqueStudents = new Set(submissions.map((s) => String(s.studentId))).size;
        const avgScore = submissions.length
          ? Math.round(submissions.reduce((s, sub) => s + sub.totalScore, 0) / submissions.length)
          : 0;
        return {
          _id:              c._id,
          title:            c.title,
          difficulty:       c.difficulty,
          participationRate: totalStudents
            ? Math.round((uniqueStudents / totalStudents) * 100)
            : 0,
          avgScore,
          totalSubmissions: submissions.length,
        };
      })
    );

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const inactiveCount = await RoomStudent.countDocuments({
      roomId,
      lastActiveAt: { $lt: oneWeekAgo },
    });

    const topStudents = await RoomStudent.find({ roomId })
      .populate("studentId", "fullName")
      .sort({ totalPoints: -1 })
      .limit(5);

    res.json({
      totalStudents,
      totalChallenges:   challenges.length,
      inactiveStudents:  inactiveCount,
      challengeAnalytics,
      topStudents: topStudents.map((s) => ({
        student:     s.studentId,
        totalPoints: s.totalPoints,
        level:       s.level,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── TEACHER: AWARD BONUS POINTS ─────────────────────────────────────────────

// POST /api/rooms/:roomId/students/:studentId/award-points
export const awardManualPoints = async (req: Request, res: Response) => {
  try {
    if (!requireTeacher(req, res)) return;
    const { roomId, studentId } = req.params;
    const { points, reason } = req.body;

    if (!points || points <= 0) return res.status(400).json({ message: "Points must be positive." });

    const rs = await RoomStudent.findOneAndUpdate(
      { studentId, roomId },
      { $inc: { totalPoints: points } },
      { new: true, upsert: true }
    );

    // Re-calc level
    const newLevel = calculateLevel(rs.totalPoints);
    await RoomStudent.findOneAndUpdate({ studentId, roomId }, { level: newLevel });

    res.json({ message: `Awarded ${points} points.`, reason, newPoints: rs.totalPoints });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};