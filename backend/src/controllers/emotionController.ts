// ─── emotionController.ts ─────────────────────────────────────────────────────
// Handles all emotion-related API endpoints:
//   POST /api/student/courses/:courseId/emotion-log     — flush from frontend hook
//   GET  /api/student/courses/:courseId/emotion-summary — personal journal data
//   GET  /api/teacher/courses/:courseId/heatmap         — lesson heatmap for teacher
//   GET  /api/teacher/courses/:courseId/live-snapshot   — live session alert data

import { Request, Response } from "express";
import Enrollment from "../models/Enrollment";
import type { RawEmotion, LearningSignal } from "../models/Enrollment";

// ── Mapping (mirrors frontend emotionMapping.ts) ──────────────────────────────
const emotionToSignal: Record<RawEmotion, LearningSignal> = {
  happy:   "positive",
  neutral: "neutral",
  sad:     "struggling",
  fear:    "struggling",
  angry:   "disengaged",
  disgust: "disengaged",
};

// ── POST /api/student/courses/:courseId/emotion-log ───────────────────────────
// Called by useEmotionDetection hook every 30s (FLUSH_INTERVAL_MS)
export const logEmotions = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const { courseId } = req.params;
    const { lessonId, entries } = req.body as {
      lessonId: string;
      entries: { timestamp_ms: number; emotion: RawEmotion }[];
    };

    if (!lessonId || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: "lessonId and entries are required." });
    }

    // Validate & enrich with signal
    const enriched = entries
      .filter((e) => ['happy','sad','disgust','fear','angry','neutral'].includes(e.emotion))
      .map((e) => ({
        lessonId,
        timestamp_ms: e.timestamp_ms,
        emotion: e.emotion,
        signal: emotionToSignal[e.emotion],
      }));

    if (enriched.length === 0) {
      return res.status(400).json({ message: "No valid emotion entries." });
    }

    await Enrollment.updateOne(
      { studentId, courseId },
      { $push: { emotionLog: { $each: enriched } } }
    );

    res.json({ logged: enriched.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/student/courses/:courseId/emotion-summary ────────────────────────
// Returns personal emotion journal data — uses student-safe signal labels
export const getEmotionSummary = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found." });
    }

    const log = enrollment.emotionLog;
    if (log.length === 0) {
      return res.json({ hasData: false });
    }

    // ── Overall emotion distribution ─────────────────────────────────────────
    const emotionCounts: Record<RawEmotion, number> = {
      happy: 0, sad: 0, disgust: 0, fear: 0, angry: 0, neutral: 0,
    };
    log.forEach((e) => { emotionCounts[e.emotion]++; });
    const total = log.length;
    const distribution = (Object.entries(emotionCounts) as [RawEmotion, number][]).map(
      ([emotion, count]) => ({
        emotion,
        // Return student-safe signal label, not raw emotion name
        displayLabel: signalDisplayLabel[emotionToSignal[emotion]],
        count,
        pct: Math.round((count / total) * 100),
      })
    ).sort((a, b) => b.count - a.count);

    // ── Per-lesson breakdown ──────────────────────────────────────────────────
    const byLesson: Record<string, Record<RawEmotion, number>> = {};
    log.forEach((e) => {
      const lid = String(e.lessonId);
      if (!byLesson[lid]) {
        byLesson[lid] = { happy: 0, sad: 0, disgust: 0, fear: 0, angry: 0, neutral: 0 };
      }
      byLesson[lid][e.emotion]++;
    });

    // ── Best learning time (by hour of day) ──────────────────────────────────
    const hourCounts: Record<number, { happy: number; total: number }> = {};
    log.forEach((e) => {
      const hour = new Date(e.timestamp_ms).getHours();
      if (!hourCounts[hour]) hourCounts[hour] = { happy: 0, total: 0 };
      hourCounts[hour].total++;
      if (e.emotion === 'happy') hourCounts[hour].happy++;
    });
    const bestHour = Object.entries(hourCounts)
      .map(([h, c]) => ({ hour: Number(h), ratio: c.happy / c.total }))
      .sort((a, b) => b.ratio - a.ratio)[0];

    // ── Weekly signal totals ──────────────────────────────────────────────────
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekLog = log.filter((e) => e.timestamp_ms >= oneWeekAgo);
    const weekSignals = { positive: 0, neutral: 0, struggling: 0, disengaged: 0 };
    weekLog.forEach((e) => { weekSignals[e.signal]++; });

    res.json({
      hasData: true,
      distribution,
      byLesson,
      bestHour: bestHour ? bestHour.hour : null,
      weekSignals,
      totalDetections: total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/teacher/courses/:courseId/lessons/:lessonId/heatmap ──────────────
// Aggregates all students' emotion logs for one lesson — used for teacher heatmap
export const getLessonHeatmap = async (req: Request, res: Response) => {
  try {
    const { courseId, lessonId } = req.params;

    // Find all enrollments for this course that have emotion data for this lesson
    const enrollments = await Enrollment.find(
      { courseId, "emotionLog.lessonId": lessonId },
      { emotionLog: 1 }
    );

    // Filter to this lesson and bucket into 10-second windows
    const windows: Record<number, Record<RawEmotion, number>> = {};

    for (const enrollment of enrollments) {
      const lessonEntries = enrollment.emotionLog.filter(
        (e) => String(e.lessonId) === lessonId
      );
      for (const entry of lessonEntries) {
        const bucket = Math.floor(entry.timestamp_ms / 10_000) * 10_000;
        if (!windows[bucket]) {
          windows[bucket] = { happy: 0, sad: 0, disgust: 0, fear: 0, angry: 0, neutral: 0 };
        }
        windows[bucket][entry.emotion]++;
      }
    }

    // Compute dominant emotion per window + alert flags
    const heatmap = Object.entries(windows)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([ts, counts]) => {
        const total = Object.values(counts).reduce((s, v) => s + v, 0);
        const dominant = (Object.entries(counts) as [RawEmotion, number][])
          .sort((a, b) => b[1] - a[1])[0][0];
        const disengagedPct = Math.round(
          ((counts.angry + counts.disgust) / total) * 100
        );
        const fearPct = Math.round((counts.fear / total) * 100);

        return {
          timestamp_ms: Number(ts),
          counts,
          total,
          dominant,
          disengagedPct,
          fearPct,
          // Alert flags for teacher
          alertFrustration: disengagedPct >= 35,
          alertDifficulty:  fearPct >= 30,
        };
      });

    res.json({ lessonId, heatmap, studentCount: enrollments.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper used by getEmotionSummary
const signalDisplayLabel: Record<LearningSignal, string> = {
  positive:   "Going well",
  neutral:    "Following along",
  struggling: "Challenging session",
  disengaged: "Low engagement",
};