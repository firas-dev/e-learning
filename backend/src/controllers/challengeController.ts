import { Request, Response } from "express";
import mongoose from "mongoose";
import Challenge from "../models/Challenge";
import Submission from "../models/Submission";
import RoomStudent from "../models/RoomStudent";
import ChallengeTimerStart from "../models/ChallengeTimerStart";
import { ChallengeThread, RoomAnnouncement } from "../models/ChallengeThread";
import PrivateRoom from "../models/PrivateRoom";
import Enrollment from "../models/Enrollment";          // ← NEW: for emotion log
import type { RawEmotion } from "../models/Enrollment"; // ← NEW: emotion types
import {
  calculateLevel,
  calculateBonusPoints,
  calculateStreakMultiplier,
  calculateEmotionXpMultiplier, // ← NEW
  getNewBadges,
  updateStreak,
  BADGE_DEFINITIONS,
} from "../utils/gamificationEngine";

// ── Emotion signal mapping (mirrors frontend emotionMapping.ts) ───────────────
// Kept inline here so the backend doesn't depend on a frontend file.
type LearningSignal = "positive" | "neutral" | "struggling" | "disengaged";

const emotionToSignal: Record<RawEmotion, LearningSignal> = {
  happy:   "positive",
  neutral: "neutral",
  sad:     "struggling",
  fear:    "struggling",
  angry:   "disengaged",
  disgust: "disengaged",
};

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

// ── NEW: Build emotion stats from a student's emotionLog for a time window ────
// Called just before awardPointsAndBadges to derive badge conditions and XP multiplier.
async function buildEmotionStats(
  studentId: string,
  sinceTimestamp: number // challenge.startsAt.getTime()
): Promise<{
  happyRatio: number;
  recoveredFromNegative: boolean;
  completedWhileFearful: boolean;
  angryToHappyRecoveries: number;
  isStruggling: boolean; // used for free hints
}> {
  try {
    // Fetch all enrollments for this student and collect emotion entries since challenge start
    const enrollments = await Enrollment.find(
      { studentId, "emotionLog.0": { $exists: true } },
      { emotionLog: 1 }
    );

    const sessionEntries: RawEmotion[] = [];
    for (const enrollment of enrollments) {
      for (const entry of enrollment.emotionLog) {
        if (entry.timestamp_ms >= sinceTimestamp) {
          sessionEntries.push(entry.emotion);
        }
      }
    }

    if (sessionEntries.length === 0) {
      return {
        happyRatio: 0,
        recoveredFromNegative: false,
        completedWhileFearful: false,
        angryToHappyRecoveries: 0,
        isStruggling: false,
      };
    }

    // ── happy ratio ─────────────────────────────────────────────────────────
    const happyCount = sessionEntries.filter((e) => e === "happy").length;
    const happyRatio = happyCount / sessionEntries.length;

    // ── fear detected at any point ───────────────────────────────────────────
    const completedWhileFearful = sessionEntries.includes("fear");

    // ── struggling signal detected at any point ──────────────────────────────
    const isStruggling = sessionEntries.some(
      (e) => emotionToSignal[e] === "struggling" || emotionToSignal[e] === "disengaged"
    );

    // ── recovery: negative → positive transitions ────────────────────────────
    // Walk the log looking for: any negative signal followed by positive signal
    let recoveredFromNegative = false;
    let angryToHappyRecoveries = 0;
    let wasNegative = false;
    let wasDisengaged = false;

    for (const emotion of sessionEntries) {
      const signal = emotionToSignal[emotion];
      if (signal === "struggling" || signal === "disengaged") {
        wasNegative = true;
        if (signal === "disengaged") wasDisengaged = true;
      } else if (signal === "positive" && wasNegative) {
        recoveredFromNegative = true;
        if (wasDisengaged) {
          angryToHappyRecoveries += 1;
          wasDisengaged = false;
        }
        wasNegative = false;
      }
    }

    return {
      happyRatio,
      recoveredFromNegative,
      completedWhileFearful,
      angryToHappyRecoveries,
      isStruggling,
    };
  } catch {
    // Non-blocking — emotion stats are a bonus, not critical to submission flow
    return {
      happyRatio: 0,
      recoveredFromNegative: false,
      completedWhileFearful: false,
      angryToHappyRecoveries: 0,
      isStruggling: false,
    };
  }
}

// ── Updated awardPointsAndBadges — now accepts emotion stats ─────────────────
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
    // ── NEW emotion fields ──────────────────────────────────────────────────
    happyRatio?: number;
    recoveredFromNegative?: boolean;
    completedWhileFearful?: boolean;
    angryToHappyRecoveries?: number;
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

  // ── XP calculation: streak multiplier + NEW emotion multiplier ───────────
  const streakMultiplier  = calculateStreakMultiplier(newStreakCurrent);
  const emotionMultiplier = calculateEmotionXpMultiplier(opts.happyRatio ?? 0); // ← NEW
  const finalPoints = Math.round(pointsToAdd * (1 + streakMultiplier + emotionMultiplier));

  const newPoints = rs.totalPoints + finalPoints;
  const newLevel  = calculateLevel(newPoints);

  // ── Badge checks — original + NEW emotion badges ─────────────────────────
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
    // ── NEW ─────────────────────────────────────────────────────────────────
    happyRatio:              opts.happyRatio ?? 0,
    recoveredFromNegative:   opts.recoveredFromNegative ?? false,
    completedWhileFearful:   opts.completedWhileFearful ?? false,
    angryToHappyRecoveries:  opts.angryToHappyRecoveries ?? 0,
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
      "streak.current":    newStreakCurrent,
      "streak.longest":    newStreakLongest,
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

    if ((req as any).user.role === "student") {
      filter.status = { $in: ["upcoming","active","completed"] };
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

    // ── Gamification flags ────────────────────────────────────────
    const existingCount  = await Submission.countDocuments({ challengeId, roomId });
    const isFirstBlood   = existingCount === 0;
    const totalWindow    = challenge.endsAt.getTime() - challenge.startsAt.getTime();
    const elapsed        = Date.now() - challenge.startsAt.getTime();
    const isSpeedRunner  = elapsed / totalWindow < 0.1;
    const hasPerfectScore =
      challenge.type === "quiz" &&
      challenge.totalPoints > 0 &&
      score >= challenge.totalPoints;

    const totalScore = score + bonusScore;

    // ── NEW: build emotion stats for this challenge session ───────
    const emotionStats = await buildEmotionStats(studentId, challenge.startsAt.getTime());

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

    if (attemptNumber === 1) {
      await Challenge.findByIdAndUpdate(challengeId, { $inc: { participantCount: 1 } });
    }

    // ── Award gamification with emotion context ────────────────────
    const { newBadges, newLevel, newPoints } = await awardPointsAndBadges(
      studentId, roomId, totalScore, challengeId,
      {
        hasPerfectScore,
        isFirstBlood,
        isSpeedRunner,
        isTop3: false,
        // ── NEW emotion stats ──────────────────────────────────────
        happyRatio:             emotionStats.happyRatio,
        recoveredFromNegative:  emotionStats.recoveredFromNegative,
        completedWhileFearful:  emotionStats.completedWhileFearful,
        angryToHappyRecoveries: emotionStats.angryToHappyRecoveries,
      }
    );

    await RoomStudent.updateOne(
      { studentId, roomId },
      { $setOnInsert: { challengesAttempted: 0, joinedAt: new Date() } },
      { upsert: true }
    );

    res.status(201).json({
      submission,
      gamification: {
        newBadges,
        newLevel,
        newPoints,
        // ── NEW: tell the frontend whether XP was boosted by emotion ─
        emotionXpBoost: emotionStats.happyRatio >= 0.5,
      },
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

    const challenge   = await Challenge.findById(submission.challengeId);
    const bonusScore  = submission.bonusScore;
    const totalScore  = (score ?? 0) + bonusScore;

    submission.score      = score ?? 0;
    submission.totalScore = totalScore;
    submission.feedback   = feedback;
    submission.status     = "graded";
    submission.gradedAt   = new Date();
    submission.gradedBy   = new mongoose.Types.ObjectId(gradedBy);
    await submission.save();

    // ── NEW: pull emotion stats for the graded student too ─────────
    const emotionStats = challenge
      ? await buildEmotionStats(String(submission.studentId), challenge.startsAt.getTime())
      : { happyRatio: 0, recoveredFromNegative: false, completedWhileFearful: false, angryToHappyRecoveries: 0, isStruggling: false };

    await awardPointsAndBadges(
      String(submission.studentId),
      String(submission.roomId),
      totalScore,
      String(submission.challengeId),
      {
        hasPerfectScore:        challenge ? totalScore >= challenge.totalPoints : false,
        happyRatio:             emotionStats.happyRatio,
        recoveredFromNegative:  emotionStats.recoveredFromNegative,
        completedWhileFearful:  emotionStats.completedWhileFearful,
        angryToHappyRecoveries: emotionStats.angryToHappyRecoveries,
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

    if (challenge.hideLeaderboard && new Date() < challenge.endsAt && !isTeacher) {
      return res.json({ hidden: true, message: "Leaderboard will be revealed after the challenge ends." });
    }

    const raw = await Submission.aggregate([
      {
        $match: {
          challengeId: new mongoose.Types.ObjectId(challengeId),
          status: { $in: ["graded","auto_graded"] },
        },
      },
      { $sort: { totalScore: -1, submittedAt: 1 } },
      { $group: { _id: "$studentId", best: { $first: "$$ROOT" } } },
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
    if (!rs) rs = await RoomStudent.create({ studentId, roomId });

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

    const submission = await Submission.findOne({ challengeId, studentId }).sort({ attemptNumber: -1 });
    const usedIndices = submission?.hintsUsedIndices ?? [];

    // ── NEW: check if student is currently struggling → hints show as free ──
    const emotionStats = await buildEmotionStats(studentId, challenge.startsAt.getTime());

    const hints = challenge.hints.map((h, i) => ({
      index:      i,
      // Show 0 cost when student is struggling (override original cost in display only)
      pointsCost: emotionStats.isStruggling ? 0 : h.pointsCost,
      revealed:   usedIndices.includes(i),
      text:       usedIndices.includes(i) ? h.text : undefined,
      isFree:     emotionStats.isStruggling, // ← flag for the frontend to show "Free!" badge
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

    const existingSub   = await Submission.findOne({ challengeId, studentId }).sort({ attemptNumber: -1 });
    const usedIndices   = existingSub?.hintsUsedIndices ?? [];
    if (usedIndices.includes(idx)) {
      return res.json({ hint: hint.text, pointsDeducted: 0, alreadyUsed: true });
    }

    // ── NEW: no point deduction when student is struggling ────────
    const emotionStats  = await buildEmotionStats(studentId, challenge.startsAt.getTime());
    const effectiveCost = emotionStats.isStruggling ? 0 : hint.pointsCost;

    if (effectiveCost > 0) {
      await RoomStudent.findOneAndUpdate(
        { studentId, roomId },
        { $inc: { totalPoints: -effectiveCost, hintsRequested: 1 } }
      );
    } else {
      // Still track hints requested even when free
      await RoomStudent.findOneAndUpdate(
        { studentId, roomId },
        { $inc: { hintsRequested: 1 } }
      );
    }

    if (existingSub) {
      await Submission.findByIdAndUpdate(existingSub._id, {
        $addToSet: { hintsUsedIndices: idx },
      });
    }

    res.json({
      hint:           hint.text,
      pointsDeducted: effectiveCost,
      alreadyUsed:    false,
      wasFree:        emotionStats.isStruggling, // ← frontend can show "Hint was free 💙"
    });
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
      challengeId, roomId,
      authorId:   user.id,
      authorName: user.fullName || "User",
      authorRole: user.role,
      text:       text.trim(),
      parentId:   parentId && mongoose.Types.ObjectId.isValid(parentId) ? parentId : undefined,
      isHint:     user.role === "teacher" && req.body.isHint === true,
    });

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
        const submissions   = await Submission.find({ challengeId: c._id });
        const uniqueStudents = new Set(submissions.map((s) => String(s.studentId))).size;
        const avgScore = submissions.length
          ? Math.round(submissions.reduce((s, sub) => s + sub.totalScore, 0) / submissions.length)
          : 0;
        return {
          _id:               c._id,
          title:             c.title,
          difficulty:        c.difficulty,
          participationRate: totalStudents
            ? Math.round((uniqueStudents / totalStudents) * 100)
            : 0,
          avgScore,
          totalSubmissions: submissions.length,
        };
      })
    );

    const oneWeekAgo    = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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
      totalChallenges:  challenges.length,
      inactiveStudents: inactiveCount,
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

    const newLevel = calculateLevel(rs.totalPoints);
    await RoomStudent.findOneAndUpdate({ studentId, roomId }, { level: newLevel });

    res.json({ message: `Awarded ${points} points.`, reason, newPoints: rs.totalPoints });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};