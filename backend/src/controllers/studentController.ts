import { Request, Response } from "express";
import Enrollment from "../models/Enrollment";
import Course from "../models/Course";

export const getStudentDashboard = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;

    const enrollments = await Enrollment.find({ studentId })
      .populate("courseId")
      .sort({ lastAccessed: -1 });

    const totalLearningTime = enrollments.reduce(
      (acc, e) => acc + e.learningTime, 0
    );
    const avgProgress =
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce((acc, e) => acc + e.progress, 0) /
              enrollments.length
          )
        : 0;

    const enrolledCourseIds = enrollments.map((e) => e.courseId);

    // ✅ Fetch ALL live courses the student is enrolled in
    // (upcoming + live now + recently ended)
    // We show the last 7 days of ended sessions too
    const sevenDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const liveSessions = await Course.find({
      _id: { $in: enrolledCourseIds },
      type: "live",
      scheduledAt: { $gt: sevenDaysAgo }, // includes recent + upcoming
    }).sort({ scheduledAt: 1 });

    res.json({
      enrollments: enrollments.map((e) => ({
        id: e._id,
        progress: e.progress,
        lastAccessed: e.lastAccessed,
        learningTime: e.learningTime,
        course: e.courseId,
      })),
      stats: {
        totalCourses: enrollments.length,
        avgProgress,
        totalLearningTime: Math.round(totalLearningTime / 60),
      },
      // ✅ Renamed from upcomingSessions — now includes all statuses
      upcomingSessions: liveSessions.map((s) => ({
        id: s._id,
        title: s.title,
        scheduledAt: s.scheduledAt,
        courseId: s._id,
        duration: s.duration, // ✅ frontend uses this to calculate end time
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProgress = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const { courseId } = req.params;
    const { progress, learningTime } = req.body;

    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId, courseId },
      {
        progress: Math.min(100, Math.max(0, progress)),
        learningTime,
        lastAccessed: new Date(),
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