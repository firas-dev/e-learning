import { Request, Response } from "express";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";
import Enrollment from "../models/Enrollment";
import Course from "../models/Course";

// GET /api/messages/conversations  — list all conversations for the current user
export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    const filter = role === "student" ? { studentId: userId } : { teacherId: userId };

    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .populate("studentId", "fullName email")
      .populate("teacherId", "fullName email")
      .populate("courseId", "title");

    const enriched = conversations.map((c) => {
      const partner = role === "student" ? c.teacherId : c.studentId;
      const unread = role === "student" ? c.studentUnread : c.teacherUnread;
      return {
        _id: c._id,
        partner,
        course: c.courseId,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unread,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/messages/conversations  — start or get a conversation
export const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    const { partnerId, courseId } = req.body;

    let studentId: string, teacherId: string;

    if (role === "student") {
      studentId = userId;
      teacherId = partnerId;
    } else {
      teacherId = userId;
      studentId = partnerId;
    }

    // Validate partner exists
    const partner = await User.findById(partnerId).select("fullName role");
    if (!partner) return res.status(404).json({ message: "User not found." });

    // Students can only message teachers of enrolled courses
    if (role === "student") {
      const courses = await Course.find({ teacherId });
      const courseIds = courses.map((c) => String(c._id));
      const enrolled = await Enrollment.findOne({
        studentId,
        courseId: { $in: courseIds },
      });
      if (!enrolled) {
        return res.status(403).json({ message: "You can only message teachers of your enrolled courses." });
      }
    }

    let conversation = await Conversation.findOne({ studentId, teacherId });

    if (!conversation) {
      conversation = await Conversation.create({
        studentId,
        teacherId,
        courseId: courseId || undefined,
        studentUnread: 0,
        teacherUnread: 0,
      });
    }

    const populated = await Conversation.findById(conversation._id)
      .populate("studentId", "fullName email")
      .populate("teacherId", "fullName email")
      .populate("courseId", "title");

    res.json(populated);
  } catch (err: any) {
    console.error(err);
    if (err.code === 11000) {
      // duplicate key — conversation already exists, just fetch it
      const { partnerId } = req.body;
      const userId = (req as any).user.id;
      const role = (req as any).user.role;
      const studentId = role === "student" ? userId : partnerId;
      const teacherId = role === "teacher" ? userId : partnerId;
      const conv = await Conversation.findOne({ studentId, teacherId })
        .populate("studentId", "fullName email")
        .populate("teacherId", "fullName email")
        .populate("courseId", "title");
      return res.json(conv);
    }
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/conversations/:conversationId  — get messages in a conversation
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found." });

    // Check access
    if (
      String(conversation.studentId) !== userId &&
      String(conversation.teacherId) !== userId
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { conversationId, senderId: { $ne: userId }, read: false },
      { read: true }
    );

    // Reset unread count
    if (role === "student") {
      await Conversation.findByIdAndUpdate(conversationId, { studentUnread: 0 });
    } else {
      await Conversation.findByIdAndUpdate(conversationId, { teacherUnread: 0 });
    }

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/messages/conversations/:conversationId  — send a message
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) return res.status(400).json({ message: "Message text is required." });

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found." });

    if (
      String(conversation.studentId) !== userId &&
      String(conversation.teacherId) !== userId
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const message = await Message.create({
      conversationId,
      senderId: userId,
      text: text.trim(),
    });

    // Update conversation metadata + unread count for the OTHER party
    const updateData: any = {
      lastMessage: text.trim().slice(0, 100),
      lastMessageAt: new Date(),
    };

    if (role === "student") {
      updateData.$inc = { teacherUnread: 1 };
    } else {
      updateData.$inc = { studentUnread: 1 };
    }

    await Conversation.findByIdAndUpdate(conversationId, updateData);

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/unread-count  — total unread for badge
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    const field = role === "student" ? "studentUnread" : "teacherUnread";
    const filter = role === "student" ? { studentId: userId } : { teacherId: userId };

    const conversations = await Conversation.find(filter).select(field);
    const total = conversations.reduce((sum: number, c: any) => sum + (c[field] || 0), 0);

    res.json({ count: total });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/teachers  — list teachers the student can message
export const getMessageableTeachers = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;

    const enrollments = await Enrollment.find({ studentId }).populate({
      path: "courseId",
      populate: { path: "teacherId", select: "fullName email" },
    });

    const teacherMap = new Map<string, any>();
    for (const e of enrollments) {
      const course = e.courseId as any;
      if (!course || !course.teacherId) continue;
      const teacher = course.teacherId;
      if (!teacherMap.has(String(teacher._id))) {
        teacherMap.set(String(teacher._id), {
          _id: teacher._id,
          fullName: teacher.fullName,
          email: teacher.email,
          courseTitle: course.title,
        });
      }
    }

    res.json(Array.from(teacherMap.values()));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/students  — list students the teacher can message
export const getMessageableStudents = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;

    const courses = await Course.find({ teacherId }).select("_id title");
    const courseIds = courses.map((c) => c._id);

    const enrollments = await Enrollment.find({ courseId: { $in: courseIds } })
      .populate("studentId", "fullName email")
      .populate("courseId", "title");

    const studentMap = new Map<string, any>();
    for (const e of enrollments) {
      const student = e.studentId as any;
      const course = e.courseId as any;
      if (!student || !course) continue;
      if (!studentMap.has(String(student._id))) {
        studentMap.set(String(student._id), {
          _id: student._id,
          fullName: student.fullName,
          email: student.email,
          courseTitle: course.title,
        });
      }
    }

    res.json(Array.from(studentMap.values()));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};