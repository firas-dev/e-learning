import { Request, Response } from "express";
import User from "../models/User";
import Course from "../models/Course";
import Enrollment from "../models/Enrollment";
import Lesson from "../models/Lesson";
import Rating from "../models/Rating";
import Comment from "../models/Comment";
import bcrypt from "bcryptjs";

// ─── GET /api/profile/teacher/:userId ────────────────────────────────────────
export const getTeacherProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const teacher = await User.findById(userId).select("-password -resetPasswordToken -resetPasswordExpires");
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ message: "Teacher not found." });
    }

    const courses = await Course.find({ teacherId: userId }).sort({ createdAt: -1 });

    const enrichedCourses = await Promise.all(
      courses.map(async (course) => {
        const [enrollmentCount, lessonCount, ratings] = await Promise.all([
          Enrollment.countDocuments({ courseId: course._id }),
          Lesson.countDocuments({ courseId: course._id }),
          Rating.find({ courseId: course._id }),
        ]);
        const avgRating =
          ratings.length > 0
            ? Math.round((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) * 10) / 10
            : 0;
        return {
          ...course.toObject(),
          enrollmentCount,
          lessonCount,
          avgRating,
          ratingCount: ratings.length,
        };
      })
    );

    const allCourseIds = courses.map((c) => c._id);
    const totalStudents = await Enrollment.countDocuments({ courseId: { $in: allCourseIds } });
    const allEnrollments = await Enrollment.find({ courseId: { $in: allCourseIds } });
    const avgCompletion =
      allEnrollments.length > 0
        ? Math.round(allEnrollments.reduce((s, e) => s + e.progress, 0) / allEnrollments.length)
        : 0;

    const totalLessons = await Lesson.countDocuments({ courseId: { $in: allCourseIds } });
    const totalLearningHours = courses.reduce((s, c) => s + c.duration, 0);

    const allRatings = await Rating.find({ courseId: { $in: allCourseIds } });
    const overallRating =
      allRatings.length > 0
        ? Math.round((allRatings.reduce((s, r) => s + r.stars, 0) / allRatings.length) * 10) / 10
        : 0;

    const recentComments = await Comment.find({ courseId: { $in: allCourseIds } })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      teacher: {
        _id: teacher._id,
        fullName: teacher.fullName,
        email: teacher.email,
        role: teacher.role,
        createdAt: teacher.createdAt,
      },
      courses: enrichedCourses,
      stats: {
        totalCourses: courses.length,
        publishedCourses: courses.filter((c) => c.is_published).length,
        totalStudents,
        avgCompletion,
        totalLessons,
        totalLearningHours,
        overallRating,
        totalRatings: allRatings.length,
      },
      recentComments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/profile/student/:userId ────────────────────────────────────────
export const getStudentProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requesterId = (req as any).user.id;

    if (requesterId !== userId) {
      const requester = await User.findById(requesterId).select("role");
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Access denied." });
      }
    }

    const student = await User.findById(userId).select("-password -resetPasswordToken -resetPasswordExpires");
    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student not found." });
    }

    const enrollments = await Enrollment.find({ studentId: userId })
      .populate("courseId")
      .sort({ lastAccessed: -1 });

    const enrichedEnrollments = enrollments
      .filter((e) => e.courseId != null)
      .map((e) => {
        const course = e.courseId as any;
        return {
          id: e._id,
          progress: e.progress,
          completedLessons: e.completedLessons,
          learningTime: e.learningTime,
          lastAccessed: e.lastAccessed,
          course: course
            ? {
                _id: course._id,
                title: course.title,
                description: course.description,
                type: course.type,
                duration: course.duration,
                scheduledAt: course.scheduledAt,
                is_published: course.is_published,
                createdAt: course.createdAt,
              }
            : null,
        };
      });

    const totalLearningTime = enrollments.reduce((s, e) => s + e.learningTime, 0);
    const completed = enrollments.filter((e) => e.progress === 100).length;
    const inProgress = enrollments.filter((e) => e.progress > 0 && e.progress < 100).length;
    const avgProgress =
      enrollments.length > 0
        ? Math.round(enrollments.reduce((s, e) => s + e.progress, 0) / enrollments.length)
        : 0;

    const submittedRatings = await Rating.find({ studentId: userId });
    const recentComments = await Comment.find({ studentId: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      student: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        role: student.role,
        createdAt: student.createdAt,
      },
      enrollments: enrichedEnrollments,
      stats: {
        totalEnrolled: enrollments.length,
        completed,
        inProgress,
        notStarted: enrollments.filter((e) => e.progress === 0).length,
        avgProgress,
        totalLearningTime: Math.round(totalLearningTime / 60),
        totalRatingsGiven: submittedRatings.length,
        totalCommentsPosted: recentComments.length,
      },
      recentComments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/profile/me ─────────────────────────────────────────────────────
export const getMyProfile = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const role = (req as any).user.role;

  (req as any).params = { userId };

  if (role === "teacher") {
    return getTeacherProfile(req, res);
  } else if (role === "student") {
    return getStudentProfile(req, res);
  } else {
    const user = await User.findById(userId).select("-password");
    return res.json({ user });
  }
};

// ─── PATCH /api/profile/me ────────────────────────────────────────────────────
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { fullName, email, currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // ── Validate & update fullName ──
    if (fullName !== undefined) {
      const trimmed = fullName.trim();
      if (!trimmed) return res.status(400).json({ message: "Full name cannot be empty." });
      user.fullName = trimmed;
    }

    // ── Validate & update email ──
    if (email !== undefined) {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return res.status(400).json({ message: "Invalid email address." });
      }
      const existing = await User.findOne({ email: trimmed, _id: { $ne: userId } });
      if (existing) return res.status(400).json({ message: "Email already in use." });
      user.email = trimmed;
    }

    // ── Validate & update password ──
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password." });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: "Current password is incorrect." });
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters." });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};