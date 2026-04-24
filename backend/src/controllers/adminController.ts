import { Request, Response } from "express";
import User from "../models/User";
import Course from "../models/Course";
import Enrollment from "../models/Enrollment";
import Lesson from "../models/Lesson";
import Rating from "../models/Rating";
import Comment from "../models/Comment";
import Notification from "../models/Notification";
import cloudinary from "../config/cloudinary";
import bcrypt from "bcryptjs";

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      totalLessons,
      totalRatings,
      totalComments,
      bannedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ role: "admin" }),
      Course.countDocuments(),
      Course.countDocuments({ is_published: true }),
      Enrollment.countDocuments(),
      Lesson.countDocuments(),
      Rating.countDocuments(),
      Comment.countDocuments(),
      User.countDocuments({ isBanned: true }),
    ]);

    // New users in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // New enrollments in the last 30 days
    const newEnrollmentsLast30Days = await Enrollment.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Average progress across all enrollments
    const enrollments = await Enrollment.find().select("progress learningTime");
    const avgProgress =
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce((s, e) => s + e.progress, 0) / enrollments.length
          )
        : 0;

    const totalLearningHours = Math.round(
      enrollments.reduce((s, e) => s + e.learningTime, 0) / 60
    );

    // User growth over last 7 months
    const userGrowth = await getUserGrowth();
    const enrollmentGrowth = await getEnrollmentGrowth();

    res.json({
      users: {
        total: totalUsers,
        students: totalStudents,
        teachers: totalTeachers,
        admins: totalAdmins,
        banned: bannedUsers,
        newLast30Days: newUsersLast30Days,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        draft: totalCourses - publishedCourses,
      },
      enrollments: {
        total: totalEnrollments,
        newLast30Days: newEnrollmentsLast30Days,
        avgProgress,
        totalLearningHours,
      },
      content: {
        lessons: totalLessons,
        ratings: totalRatings,
        comments: totalComments,
      },
      charts: {
        userGrowth,
        enrollmentGrowth,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

async function getUserGrowth() {
  const months = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    const count = await User.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });
    months.push({
      month: start.toLocaleString("default", { month: "short" }),
      count,
    });
  }
  return months;
}

async function getEnrollmentGrowth() {
  const months = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    const count = await Enrollment.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });
    months.push({
      month: start.toLocaleString("default", { month: "short" }),
      count,
    });
  }
  return months;
}

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────

export const getUsers = async (req: Request, res: Response) => {
  try {
    const {
      search = "",
      role = "all",
      status = "all",
      page = "1",
      limit = "10",
      sortBy = "newest",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (role !== "all") query.role = role;
    if (status === "banned") query.isBanned = true;
    if (status === "active") query.isBanned = { $ne: true };
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const sortMap: any = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name_asc: { fullName: 1 },
      name_desc: { fullName: -1 },
    };

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -resetPasswordToken -resetPasswordExpires")
        .sort(sortMap[sortBy as string] || { createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query),
    ]);

    // Enrich with stats
    const enriched = await Promise.all(
      users.map(async (u) => {
        let stats: any = {};
        if (u.role === "student") {
          const enrollments = await Enrollment.countDocuments({ studentId: u._id });
          const completed = await Enrollment.countDocuments({
            studentId: u._id,
            progress: 100,
          });
          stats = { enrollments, completed };
        } else if (u.role === "teacher") {
          const courses = await Course.countDocuments({ teacherId: u._id });
          const students = await Enrollment.countDocuments({
            courseId: {
              $in: (await Course.find({ teacherId: u._id }).select("_id")).map(
                (c) => c._id
              ),
            },
          });
          stats = { courses, students };
        }
        return { ...u.toObject(), stats };
      })
    );

    res.json({
      users: enriched,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "-password -resetPasswordToken -resetPasswordExpires"
    );
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const { userId } = req.params;
    const { fullName, email, role, password } = req.body;

    // Prevent self-demotion
    if (userId === adminId && role && role !== "admin") {
      return res
        .status(400)
        .json({ message: "You cannot change your own role." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (email !== undefined) {
      const existing = await User.findOne({
        email: email.trim(),
        _id: { $ne: userId },
      });
      if (existing)
        return res.status(400).json({ message: "Email already in use." });
      user.email = email.trim();
    }
    if (role !== undefined) user.role = role;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();

    const { password: _, ...safeUser } = user.toObject() as any;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleBanUser = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const { userId } = req.params;

    if (userId === adminId) {
      return res.status(400).json({ message: "You cannot ban yourself." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    (user as any).isBanned = !(user as any).isBanned;
    await user.save();

    res.json({ isBanned: (user as any).isBanned, userId });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const { userId } = req.params;

    if (userId === adminId) {
      return res.status(400).json({ message: "You cannot delete yourself." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Clean up related data
    if (user.role === "student") {
      await Enrollment.deleteMany({ studentId: userId });
      await Comment.deleteMany({ studentId: userId });
      await Rating.deleteMany({ studentId: userId });
    } else if (user.role === "teacher") {
      const courses = await Course.find({ teacherId: userId });
      for (const course of courses) {
        await Enrollment.deleteMany({ courseId: course._id });
        const lessons = await Lesson.find({ courseId: course._id });
        for (const lesson of lessons) {
          await Promise.all(
            lesson.files.map((f) => {
              const rt = f.mimetype === "application/pdf" ? "raw" : "video";
              return cloudinary.uploader.destroy(f.publicId, {
                resource_type: rt,
              });
            })
          );
          await lesson.deleteOne();
        }
        await course.deleteOne();
      }
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: "User deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── COURSE MANAGEMENT ────────────────────────────────────────────────────────

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const {
      search = "",
      type = "all",
      status = "all",
      page = "1",
      limit = "10",
      sortBy = "newest",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (type !== "all") query.type = type;
    if (status === "published") query.is_published = true;
    if (status === "draft") query.is_published = false;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sortMap: any = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      title_asc: { title: 1 },
      title_desc: { title: -1 },
    };

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate("teacherId", "fullName email")
        .sort(sortMap[sortBy as string] || { createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Course.countDocuments(query),
    ]);

    const enriched = await Promise.all(
      courses.map(async (c) => {
        const [enrollmentCount, lessonCount, ratings] = await Promise.all([
          Enrollment.countDocuments({ courseId: c._id }),
          Lesson.countDocuments({ courseId: c._id }),
          Rating.find({ courseId: c._id }),
        ]);
        const avgRating =
          ratings.length > 0
            ? Math.round(
                (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) *
                  10
              ) / 10
            : 0;
        return { ...c.toObject(), enrollmentCount, lessonCount, avgRating };
      })
    );

    res.json({
      courses: enriched,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const adminTogglePublishCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    course.is_published = !course.is_published;
    await course.save();

    res.json({ is_published: course.is_published });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const adminDeleteCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    const lessons = await Lesson.find({ courseId });
    await Promise.all(
      lessons.flatMap((lesson) =>
        lesson.files.map((f) => {
          const rt = f.mimetype === "application/pdf" ? "raw" : "video";
          return cloudinary.uploader.destroy(f.publicId, {
            resource_type: rt,
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

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

export const sendAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, message, targetRole } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res
        .status(400)
        .json({ message: "Title and message are required." });
    }

    const query: any = {};
    if (targetRole && targetRole !== "all") query.role = targetRole;

    const users = await User.find(query).select("_id");

    const notifications = users.map((u) => ({
      userId: u._id,
      title: `📢 ${title.trim()}`,
      message: message.trim(),
      courseId: undefined,
      read: false,
    }));

    await Notification.insertMany(notifications);

    res.json({
      message: `Announcement sent to ${users.length} user${users.length !== 1 ? "s" : ""}.`,
      count: users.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};