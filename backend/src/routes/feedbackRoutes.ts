import express from "express";
import Comment from "../models/Comment";
import Rating from "../models/Rating";
import Course from "../models/Course";
import Lesson from "../models/Lesson";
import Notification from "../models/Notification";
import User from "../models/User";
import { protect } from "../middleware/auth";

const router = express.Router();

// Helper: get student full name
const getFullName = async (userId: string): Promise<string> => {
  const user = await User.findById(userId).select("fullName");
  return user?.fullName || "A student";
};

// ── COMMENTS ──────────────────────────────────────────────────────────────────

// GET /api/courses/:courseId/comments
router.get("/:courseId/comments", protect, async (req, res) => {
  try {
    const comments = await Comment.find({ courseId: req.params.courseId }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/courses/:courseId/comments
router.post("/:courseId/comments", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    const { text, lessonId, parentId } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Text is required" });

    const comment = await Comment.create({
      courseId:    req.params.courseId,
      lessonId:    lessonId || null,
      parentId:    parentId || null,
      studentId:   user.id,
      studentName: user.fullName || "Student",
      role:        user.role || "student",   // ← ADD THIS LINE
      text:        text.trim(),
    });

    res.status(201).json(comment);
  } catch (err: any) {
    console.error("Error creating comment:", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/courses/:courseId/comments/:commentId
router.delete("/:courseId/comments/:commentId", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
 
    // Allow: the original author OR a teacher OR an admin
    const isOwner = comment.studentId.toString() === user.id;
    const isTeacherOrAdmin = user.role === "teacher" || user.role === "admin";
 
    if (!isOwner && !isTeacherOrAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }
 
    await comment.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


// ── RATINGS ───────────────────────────────────────────────────────────────────

// GET /api/courses/:courseId/ratings/course
router.get("/:courseId/ratings/course", protect, async (req, res) => {
  try {
    const ratings = await Rating.find({ courseId: req.params.courseId });
    const avg =
      ratings.length === 0
        ? 0
        : ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
    res.json({
      average: Math.round(avg * 10) / 10,
      count: ratings.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/courses/:courseId/ratings/lesson/:lessonId
router.get("/:courseId/ratings/lesson/:lessonId", protect, async (req, res) => {
  try {
    const ratings = await Rating.find({
      courseId: req.params.courseId,
      lessonId: req.params.lessonId,
    });
    const avg =
      ratings.length === 0
        ? 0
        : ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
    const user = (req as any).user;
    const mine = ratings.find((r) => r.studentId.toString() === user.id);
    res.json({
      average: Math.round(avg * 10) / 10,
      count: ratings.length,
      myStars: mine?.stars ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/courses/:courseId/ratings/lesson/:lessonId  (upsert or delete if same stars)
router.post("/:courseId/ratings/lesson/:lessonId", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    const { stars } = req.body;
    if (!stars || stars < 1 || stars > 5)
      return res.status(400).json({ message: "Stars must be 1-5" });

    const existing = await Rating.findOne({
      courseId: req.params.courseId,
      lessonId: req.params.lessonId,
      studentId: user.id,
    });

    let myStars: number | null = null;
    const isNewRating = !existing;

    if (existing && existing.stars === stars) {
      // Same rating clicked again → toggle off (delete)
      await existing.deleteOne();
    } else {
      const studentName = await getFullName(user.id);
      await Rating.findOneAndUpdate(
        { courseId: req.params.courseId, lessonId: req.params.lessonId, studentId: user.id },
        { courseId: req.params.courseId, lessonId: req.params.lessonId, studentId: user.id, studentName, stars },
        { new: true, upsert: true }
      );
      myStars = stars;

      // ── Notify the course publisher (teacher) ─────────────────────────
      try {
        const course = await Course.findById(req.params.courseId).select("teacherId title");
        const lesson = await Lesson.findById(req.params.lessonId).select("title");
        if (course?.teacherId) {
          const studentName = await getFullName(user.id);
          const starLabel = "⭐".repeat(stars);
          const lessonTitle = lesson?.title || "a lesson";
          const action = isNewRating ? "rated" : "updated their rating for";
          await Notification.create({
            userId:   course.teacherId,
            title:    "⭐ Lesson Rated",
            message:  `${studentName} ${action} "${lessonTitle}" in "${course.title}" — ${starLabel} (${stars}/5).`,
            courseId: course._id,
          });
        }
      } catch (_) {
        // Non-blocking
      }
    }

    const lessonRatings = await Rating.find({ courseId: req.params.courseId, lessonId: req.params.lessonId });
    const lessonAvg = lessonRatings.length === 0 ? 0 : lessonRatings.reduce((s, r) => s + r.stars, 0) / lessonRatings.length;

    const allRatings = await Rating.find({ courseId: req.params.courseId });
    const courseAvg = allRatings.length === 0 ? 0 : allRatings.reduce((s, r) => s + r.stars, 0) / allRatings.length;

    res.json({
      lessonAverage: Math.round(lessonAvg * 10) / 10,
      lessonCount: lessonRatings.length,
      myStars,
      courseAverage: Math.round(courseAvg * 10) / 10,
      courseCount: allRatings.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;