import express from "express";
import { protect } from "../middleware/auth";
import Comment from "../models/Comment";
import Rating from "../models/Rating";
import User from "../models/User";

const router = express.Router();

async function getFullName(userId: string): Promise<string> {
  const u = await User.findById(userId).select("fullName").lean();
  return (u as any)?.fullName || "Student";
}

// ── COMMENTS ──────────────────────────────────────────────────────────────

// GET /api/courses/:courseId/comments?lessonId=xxx
router.get("/:courseId/comments", protect, async (req, res) => {
  try {
    const filter: any = { courseId: req.params.courseId };
    if (req.query.lessonId) filter.lessonId = req.query.lessonId;
    const comments = await Comment.find(filter).sort({ createdAt: -1 });
    res.json(comments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/courses/:courseId/comments
router.post("/:courseId/comments", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    const { text, lessonId } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text is required" });
    const studentName = await getFullName(user.id);
    const comment = await Comment.create({
      courseId: req.params.courseId,
      lessonId: lessonId || undefined,
      studentId: user.id,
      studentName,
      text: text.trim(),
    });
    res.status(201).json(comment);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/courses/:courseId/comments/:commentId
router.delete("/:courseId/comments/:commentId", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.studentId.toString() !== user.id)
      return res.status(403).json({ message: "Not allowed" });
    await comment.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── RATINGS ───────────────────────────────────────────────────────────────

// GET /api/courses/:courseId/ratings/course
// Returns the course-level average (average of all lesson ratings in this course)
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
// Returns rating data for a specific lesson (including the current user's rating)
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

// POST /api/courses/:courseId/ratings/lesson/:lessonId  (upsert)
router.post("/:courseId/ratings/lesson/:lessonId", protect, async (req, res) => {
  try {
    const user = (req as any).user;
    const { stars } = req.body;
    if (!stars || stars < 1 || stars > 5)
      return res.status(400).json({ message: "Stars must be 1-5" });

    const studentName = await getFullName(user.id);

    await Rating.findOneAndUpdate(
      { courseId: req.params.courseId, lessonId: req.params.lessonId, studentId: user.id },
      {
        courseId: req.params.courseId,
        lessonId: req.params.lessonId,
        studentId: user.id,
        studentName,
        stars,
      },
      { new: true, upsert: true }
    );

    // Return updated lesson stats
    const lessonRatings = await Rating.find({
      courseId: req.params.courseId,
      lessonId: req.params.lessonId,
    });
    const lessonAvg = lessonRatings.reduce((s, r) => s + r.stars, 0) / lessonRatings.length;

    // Return updated course average too
    const allRatings = await Rating.find({ courseId: req.params.courseId });
    const courseAvg = allRatings.reduce((s, r) => s + r.stars, 0) / allRatings.length;

    res.json({
      lessonAverage: Math.round(lessonAvg * 10) / 10,
      lessonCount: lessonRatings.length,
      myStars: stars,
      courseAverage: Math.round(courseAvg * 10) / 10,
      courseCount: allRatings.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;