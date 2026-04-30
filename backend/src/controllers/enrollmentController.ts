import { Request, Response } from "express";
import Enrollment from "../models/Enrollment";
import Course from "../models/Course";
import Rating from "../models/Rating";
import Notification from "../models/Notification";
import User from "../models/User";

// helper: compute average rating for a course from all lesson ratings
async function getCourseAverageRating(courseId: string): Promise<number> {
  const ratings = await Rating.find({ courseId });
  if (ratings.length === 0) return 0;
  const avg = ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
  return Math.round(avg * 10) / 10;
}

// Get all published courses (catalog)
export const getPublishedCourses = async (req: Request, res: Response) => {
  try {
    const {
      search = "",
      type = "all",
      page = "1",
      limit = "6",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { is_published: true };

    if (type !== "all") query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate("teacherId", "fullName")
        .skip(skip)
        .limit(limitNum),
      Course.countDocuments(query),
    ]);

    const coursesWithMeta = await Promise.all(
      courses.map(async (course) => {
        const [enrollmentCount, averageRating] = await Promise.all([
          Enrollment.countDocuments({ courseId: course._id }),
          getCourseAverageRating(String(course._id)),
        ]);
        return { ...course.toObject(), enrollmentCount, averageRating };
      })
    );

    res.json({
      courses: coursesWithMeta,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Enroll student in a course
export const enrollCourse = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course || !course.is_published) {
      return res.status(404).json({ message: "Course not found or not available." });
    }

    const existing = await Enrollment.findOne({ studentId, courseId });
    if (existing) {
      return res.status(400).json({ message: "Already enrolled in this course." });
    }

    const enrollment = await Enrollment.create({
      studentId,
      courseId,
      progress: 0,
      learningTime: 0,
      lastAccessed: new Date(),
    });

    // ── Notify the course publisher (teacher) ────────────────────────────
    try {
      const student = await User.findById(studentId).select("fullName");
      if (course.teacherId) {
        await Notification.create({
          userId:   course.teacherId,
          title:    "🎓 New Enrollment",
          message:  `${student?.fullName || "A student"} just enrolled in your course "${course.title}".`,
          courseId: course._id,
        });
      }
    } catch (_) {
      // Non-blocking — enrollment already succeeded
    }

    res.status(201).json(enrollment);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Unenroll student from a course
export const unenrollCourse = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const { courseId } = req.params;

    await Enrollment.findOneAndDelete({ studentId, courseId });
    res.json({ message: "Unenrolled successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get enrolled course IDs for current student
export const getMyEnrollments = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const enrollments = await Enrollment.find({ studentId }).select("courseId");
    res.json(enrollments.map((e) => String(e.courseId)));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};