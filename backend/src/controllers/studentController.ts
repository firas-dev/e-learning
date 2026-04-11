import { Request, Response } from "express";
import Enrollment from "../models/Enrollment";
import Course from "../models/Course";
import Lesson from "../models/Lesson";

// ─── GET /dashboard ───────────────────────────────────────────────────────────
export const getStudentDashboard = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;

    const enrollments = await Enrollment.find({ studentId })
      .populate("courseId")
      .sort({ lastAccessed: -1 });

    // Add enrollment count for each course
    const enrollmentsWithCount = await Promise.all(
      enrollments.map(async (e) => {
        const course = e.courseId as any;
        const enrollmentCount = course
          ? await Enrollment.countDocuments({ courseId: course._id })
          : 0;
        return { enrollment: e, enrollmentCount };
      })
    );

    const totalLearningTime = enrollments.reduce(
      (acc, e) => acc + e.learningTime,
      0
    );
    const avgProgress =
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce((acc, e) => acc + e.progress, 0) /
              enrollments.length
          )
        : 0;

    const enrolledCourseIds = enrollments.map((e) => e.courseId);

    // Fetch ALL live courses the student is enrolled in (upcoming + recent)
    const sevenDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const liveSessions = await Course.find({
      _id: { $in: enrolledCourseIds },
      type: "live",
      scheduledAt: { $gt: sevenDaysAgo },
    }).sort({ scheduledAt: 1 });

    res.json({
      enrollments: enrollmentsWithCount
        .filter(({ enrollment: e }) => e.courseId != null)  // skip deleted courses
        .map(({ enrollment: e, enrollmentCount }) => {
          const course = e.courseId as any;
          return {
            id: e._id,
            progress: e.progress,
            lastAccessed: e.lastAccessed,
            learningTime: e.learningTime,
            completedLessons: e.completedLessons,
            course: course
              ? { ...course.toObject(), enrollmentCount }
              : course,
          };
        }
      ),
      stats: {
        totalCourses: enrollments.length,
        avgProgress,
        totalLearningTime: Math.round(totalLearningTime / 60),
      },
      upcomingSessions: liveSessions.map((s) => ({
        id: s._id,
        title: s.title,
        scheduledAt: s.scheduledAt,
        courseId: s._id,
        duration: s.duration,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /courses/:courseId/progress ─────────────────────────────────────────
// Hydrates frontend state on mount for cross-session sync
export const getCourseProgress = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found." });
    }

    res.json({
      completedLessons: enrollment.completedLessons,
      progress: enrollment.progress,
      learningTime: enrollment.learningTime,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PATCH /courses/:courseId/lessons/:lessonId/complete ──────────────────────
// Marks a specific lesson as completed. Idempotent via $addToSet.
// Recalculates progress from live lesson count (handles new lessons added by teacher).
// Increments learningTime additively with deltaMinutes from this session.
export const completeLesson = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const { courseId, lessonId } = req.params;
    const { deltaMinutes = 0 } = req.body; // time watched this session (in minutes)

    // Count total lessons for this course — live source of truth
    const totalLessons = await Lesson.countDocuments({ courseId });
    if (totalLessons === 0) {
      return res.status(400).json({ message: "Course has no lessons." });
    }

    // Mark lesson complete (idempotent) + add time additively
    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId, courseId },
      {
        $addToSet: { completedLessons: lessonId },
        $inc: { learningTime: deltaMinutes },
        $set: { lastAccessed: new Date() },
      },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found." });
    }

    // Recalculate progress from source of truth
    const newProgress = Math.round(
      (enrollment.completedLessons.length / totalLessons) * 100
    );

    await Enrollment.updateOne(
      { studentId, courseId },
      { $set: { progress: newProgress } }
    );

    res.json({
      completedLessons: enrollment.completedLessons,
      progress: newProgress,
      learningTime: enrollment.learningTime + deltaMinutes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PATCH /courses/:courseId/learning-time ─────────────────────────────────
// Lightweight endpoint: only increments learningTime. No lesson-completion logic.
// Called every minute by useLearningTimer (and via sendBeacon on page close).
export const addLearningTime = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const { courseId } = req.params;
    const { deltaMinutes = 0 } = req.body;

    const minutes = Math.max(0, Math.min(Number(deltaMinutes), 120)); // cap at 2h per flush
    if (minutes === 0) return res.status(200).json({ ok: true });

    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId, courseId },
      {
        $inc: { learningTime: minutes },
        $set: { lastAccessed: new Date() },
      },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found." });
    }

    res.json({ learningTime: enrollment.learningTime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PATCH /courses/:courseId/progress ── DEPRECATED (kept for compatibility) ─
export const updateProgress = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const { courseId } = req.params;
    const { progress, learningTime } = req.body;

    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId, courseId },
      {
        $max: { progress: Math.min(100, Math.max(0, progress)) },
        $set: { learningTime, lastAccessed: new Date() },
      },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found." });
    }

    res.json(enrollment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};