import { Request, Response } from "express";
import Course from "../models/Course";
import Enrollment from "../models/Enrollment";
import Lesson from "../models/Lesson";
import cloudinary from "../config/cloudinary";

export const getTeacherDashboard = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;
    const {
      search = "",
      type = "all",
      page = "1",
      limit = "5",
      sortBy = "newest",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const query: any = { teacherId };
    if (type !== "all") query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // ✅ Step 1 — fetch all matching courses
    const allMatchingCourses = await Course.find(query);

    // ✅ Step 2 — add enrollment count to each
    const coursesWithCount = await Promise.all(
      allMatchingCourses.map(async (course) => {
        const enrollmentCount = await Enrollment.countDocuments({
          courseId: course._id,
        });
        return { ...course.toObject(), enrollmentCount };
      })
    );

    // ✅ Step 3 — sort in memory (enrollment count not in DB)
    const sorted = coursesWithCount.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.createdAt as Date).getTime() -
            new Date(b.createdAt as Date).getTime()
          );
        case "most_enrolled":
          return b.enrollmentCount - a.enrollmentCount;
        case "least_enrolled":
          return a.enrollmentCount - b.enrollmentCount;
        case "newest":
        default:
          return (
            new Date(b.createdAt as Date).getTime() -
            new Date(a.createdAt as Date).getTime()
          );
      }
    });

    // ✅ Step 4 — paginate after sorting
    const paginated = sorted.slice(skip, skip + limitNum);
    const totalCourses = sorted.length;

    // ✅ Step 5 — stats based on ALL teacher courses
    const allCourseIds = (await Course.find({ teacherId }).select("_id")).map(
      (c) => c._id
    );

    const totalStudents = await Enrollment.countDocuments({
      courseId: { $in: allCourseIds },
    });

    const enrollments = await Enrollment.find({
      courseId: { $in: allCourseIds },
    });

    const averageEngagement =
      enrollments.length > 0
        ? enrollments.reduce((acc, e) => acc + e.progress, 0) /
          enrollments.length /
          100
        : 0;

    res.json({
      courses: paginated,
      total: totalCourses,
      page: pageNum,
      totalPages: Math.ceil(totalCourses / limitNum),
      totalStudents,
      averageEngagement,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;
    const { title, description, course_type, duration_hours, scheduledAt } = req.body;

    if (!title || !course_type || !duration_hours) {
      return res
        .status(400)
        .json({ message: "Title, type, and duration are required." });
    }

    const course = await Course.create({
      title,
      description,
      type: course_type,
      duration: 0,
      teacherId,
      scheduledAt: course_type === "live" ? scheduledAt : undefined,
      is_published: false,
    });

    res.status(201).json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;
    const { courseId } = req.params;

    const course = await Course.findOne({ _id: courseId, teacherId });
    if (!course) {
      return res
        .status(403)
        .json({ message: "Course not found or unauthorized." });
    }

    const lessons = await Lesson.find({ courseId });
    await Promise.all(
      lessons.flatMap((lesson) =>
        lesson.files.map((f) => {
          const resourceType =
            f.mimetype === "application/pdf" ? "raw" : "video";
          return cloudinary.uploader.destroy(f.publicId, {
            resource_type: resourceType,
          });
        })
      )
    );

    await Lesson.deleteMany({ courseId });
    await Enrollment.deleteMany({ courseId });
    await Course.findByIdAndDelete(courseId);

    res.json({ message: "Course deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const togglePublishCourse = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;
    const { courseId } = req.params;

    const course = await Course.findOne({ _id: courseId, teacherId });
    if (!course) {
      return res
        .status(403)
        .json({ message: "Course not found or unauthorized." });
    }

    course.is_published = !course.is_published;
    await course.save();

    res.json({ is_published: course.is_published });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};