// ─── emotionController.ts ─────────────────────────────────────────────────────
// Handles all emotion-related API endpoints:
//   POST /api/student/courses/:courseId/emotion-log     — flush from frontend hook
//   GET  /api/student/courses/:courseId/emotion-summary — personal journal data
//   GET  /api/teacher/courses/:courseId/heatmap         — lesson heatmap for teacher
//   GET  /api/teacher/courses/:courseId/live-snapshot   — live session alert data

import { Request, Response } from "express";
import Enrollment from "../models/Enrollment";
import type { RawEmotion, LearningSignal } from "../models/Enrollment";
import Course from "../models/Course";
import Lesson from "../models/Lesson";

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
// ── GET /api/teacher/emotion-analytics ────────────────────────────────────────
// Aggregates emotion data across ALL of a teacher's courses to power the
// dashboard's Emotional Analytics, Problematic Lessons, and AI Recommendations.
export const getTeacherEmotionAnalytics = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;

    // 1. Courses owned by this teacher (+ title/type for display & navigation)
    const courses = await Course.find({ teacherId }).select("_id title type");
    if (courses.length === 0) return res.json(emptyTeacherAnalytics());

    const courseIds = courses.map((c) => c._id);
    const courseMeta: Record<string, { title: string; type: "live" | "recorded" }> = {};
    courses.forEach((c) => {
      courseMeta[String(c._id)] = { title: c.title, type: c.type };
    });

    // 2. Lessons for those courses (titles + which course they belong to)
    const lessons = await Lesson.find({ courseId: { $in: courseIds } }).select("_id title courseId");
    const lessonMeta: Record<string, { title: string; courseId: string }> = {};
    lessons.forEach((l) => {
      lessonMeta[String(l._id)] = { title: l.title, courseId: String(l.courseId) };
    });

    // 3. Enrollments that actually have emotion data
    const enrollments = await Enrollment.find(
      { courseId: { $in: courseIds }, "emotionLog.0": { $exists: true } },
      { emotionLog: 1, studentId: 1 }
    );

    const emptyCounts = (): Record<RawEmotion, number> => ({
      happy: 0, sad: 0, disgust: 0, fear: 0, angry: 0, neutral: 0,
    });

    const globalCounts = emptyCounts();
    const perLesson: Record<string, Record<RawEmotion, number>> = {};
    const studentsTracked = new Set<string>();
    let totalDetections = 0;

    for (const e of enrollments) {
      studentsTracked.add(String(e.studentId));
      for (const entry of e.emotionLog) {
        globalCounts[entry.emotion]++;
        totalDetections++;
        const lid = String(entry.lessonId);
        if (!perLesson[lid]) perLesson[lid] = emptyCounts();
        perLesson[lid][entry.emotion]++;
      }
    }

    if (totalDetections === 0) return res.json(emptyTeacherAnalytics());

    // ── Signal distribution ───────────────────────────────────────────────────
    const signalCounts: Record<LearningSignal, number> = {
      positive: 0, neutral: 0, struggling: 0, disengaged: 0,
    };
    (Object.entries(globalCounts) as [RawEmotion, number][]).forEach(([emotion, count]) => {
      signalCounts[emotionToSignal[emotion]] += count;
    });

    const distribution = (Object.entries(globalCounts) as [RawEmotion, number][])
      .map(([emotion, count]) => ({
        emotion,
        signal: emotionToSignal[emotion],
        label: signalDisplayLabel[emotionToSignal[emotion]],
        count,
        pct: Math.round((count / totalDetections) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const engagementScore = Math.round(
      ((signalCounts.positive + signalCounts.neutral) / totalDetections) * 100
    );

    // ── Problematic lessons ────────────────────────────────────────────────────
    const FRUSTRATION_THRESHOLD = 35; // (angry + disgust) %  — matches heatmap alert
    const DIFFICULTY_THRESHOLD = 30;  // fear %                — matches heatmap alert
    const MIN_DETECTIONS = 5;         // ignore lessons with too little data

    const problematicLessons = Object.entries(perLesson)
      .map(([lessonId, counts]) => {
        const total = Object.values(counts).reduce((s, v) => s + v, 0);
        const frustrationPct = Math.round(((counts.angry + counts.disgust) / total) * 100);
        const difficultyPct = Math.round((counts.fear / total) * 100);
        const strugglingPct = Math.round(((counts.sad + counts.fear) / total) * 100);
        const positivePct = Math.round((counts.happy / total) * 100);
        const meta = lessonMeta[lessonId];
        const course = meta ? courseMeta[meta.courseId] : undefined;
        const dominantIssue: "frustration" | "difficulty" =
          frustrationPct >= difficultyPct ? "frustration" : "difficulty";
        const severityScore = Math.max(
          frustrationPct - FRUSTRATION_THRESHOLD,
          difficultyPct - DIFFICULTY_THRESHOLD
        );
        return {
          lessonId,
          lessonTitle: meta?.title ?? "Untitled lesson",
          courseId: meta?.courseId ?? null,
          courseTitle: course?.title ?? "Unknown course",
          courseType: course?.type ?? "recorded",
          totalDetections: total,
          frustrationPct,
          difficultyPct,
          strugglingPct,
          positivePct,
          dominantIssue,
          severityScore,
          isProblematic:
            total >= MIN_DETECTIONS &&
            (frustrationPct >= FRUSTRATION_THRESHOLD || difficultyPct >= DIFFICULTY_THRESHOLD),
        };
      })
      .filter((l) => l.isProblematic)
      .sort((a, b) => b.severityScore - a.severityScore)
      .slice(0, 5);

    // ── AI recommendations (derived from the same emotion data) ─────────────────
    const recommendations = buildTeacherRecommendations({
      problematicLessons,
      signalCounts,
      totalDetections,
      engagementScore,
    });

    res.json({
      hasData: true,
      overview: {
        totalDetections,
        sessionsAnalyzed: enrollments.length,
        studentsTracked: studentsTracked.size,
        engagementScore,
        signalCounts,
        distribution,
      },
      problematicLessons,
      recommendations,
      activeAlerts: problematicLessons.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Helpers for getTeacherEmotionAnalytics ────────────────────────────────────
function emptyTeacherAnalytics() {
  return {
    hasData: false,
    overview: {
      totalDetections: 0,
      sessionsAnalyzed: 0,
      studentsTracked: 0,
      engagementScore: 0,
      signalCounts: { positive: 0, neutral: 0, struggling: 0, disengaged: 0 },
      distribution: [],
    },
    problematicLessons: [],
    recommendations: [],
    activeAlerts: 0,
  };
}

interface TeacherRecoInput {
  problematicLessons: {
    lessonId: string;
    lessonTitle: string;
    courseId: string | null;
    courseTitle: string;
    courseType: "live" | "recorded";
    frustrationPct: number;
    difficultyPct: number;
    dominantIssue: "frustration" | "difficulty";
  }[];
  signalCounts: Record<LearningSignal, number>;
  totalDetections: number;
  engagementScore: number;
}

function buildTeacherRecommendations(input: TeacherRecoInput) {
  const recs: {
    id: string;
    severity: "high" | "medium" | "low";
    category: "lesson" | "engagement" | "positive";
    title: string;
    message: string;
    lessonId?: string;
    courseId?: string | null;
    courseTitle?: string;
    courseType?: "live" | "recorded";
  }[] = [];

  // Targeted, per-lesson advice for the 3 worst lessons
  for (const lesson of input.problematicLessons.slice(0, 3)) {
    if (lesson.dominantIssue === "frustration") {
      recs.push({
        id: `lesson-frustration-${lesson.lessonId}`,
        severity: lesson.frustrationPct >= 50 ? "high" : "medium",
        category: "lesson",
        title: `High frustration in “${lesson.lessonTitle}”`,
        message:
          `${lesson.frustrationPct}% of detections in this lesson signal frustration. ` +
          `Try splitting it into shorter segments, easing the pacing, or adding a worked ` +
          `example through the hardest part.`,
        lessonId: lesson.lessonId,
        courseId: lesson.courseId,
        courseTitle: lesson.courseTitle,
        courseType: lesson.courseType,
      });
    } else {
      recs.push({
        id: `lesson-difficulty-${lesson.lessonId}`,
        severity: lesson.difficultyPct >= 45 ? "high" : "medium",
        category: "lesson",
        title: `Students find “${lesson.lessonTitle}” intimidating`,
        message:
          `${lesson.difficultyPct}% of detections show signs of difficulty. ` +
          `Add a short prerequisites recap, a gentle warm-up example, or an inline hint so ` +
          `learners feel supported before the challenging material.`,
        lessonId: lesson.lessonId,
        courseId: lesson.courseId,
        courseTitle: lesson.courseTitle,
        courseType: lesson.courseType,
      });
    }
  }

  // Course-wide engagement signal
  const disengagedPct = Math.round((input.signalCounts.disengaged / input.totalDetections) * 100);
  if (disengagedPct >= 25) {
    recs.push({
      id: "global-disengagement",
      severity: disengagedPct >= 40 ? "high" : "medium",
      category: "engagement",
      title: "Engagement is dipping across your courses",
      message:
        `${disengagedPct}% of all detections signal low engagement. Consider adding ` +
        `interactive checkpoints, short quizzes, or a Private Room challenge to re-capture attention.`,
    });
  }

  // Positive reinforcement when things look healthy
  if (input.engagementScore >= 70 && recs.length === 0) {
    recs.push({
      id: "positive-engagement",
      severity: "low",
      category: "positive",
      title: "Your students are engaged 🎉",
      message:
        `Engagement is healthy at ${input.engagementScore}%. Your current pacing and format ` +
        `are working well — keep it up.`,
    });
  }

  return recs;
}