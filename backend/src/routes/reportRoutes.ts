import express from "express";
import Report from "../models/Report";
import Comment from "../models/Comment";
import User from "../models/User";
import Notification from "../models/Notification";
import { protect } from "../middleware/auth";
import { sendWarningEmail, sendBanEmail } from "../utils/emailNotifications";

const router = express.Router();

const teacherOnly = (req: any, res: any, next: any) => {
  if (req.user?.role !== "teacher")
    return res.status(403).json({ message: "Teacher access required." });
  next();
};
const adminOnly = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin")
    return res.status(403).json({ message: "Admin access required." });
  next();
};

// ── POST /api/reports  (teacher submits) ─────────────────────────────────────
router.post("/", protect, teacherOnly, async (req: any, res) => {
  try {
    const { commentId, reason } = req.body;
    if (!commentId || !reason?.trim())
      return res.status(400).json({ message: "commentId and reason are required." });

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const existing = await Report.findOne({ commentId });
    if (existing)
      return res.status(409).json({ message: "This comment has already been reported." });

    const teacher = await User.findById(req.user.id).select("fullName");

    const report = await Report.create({
      commentId,
      commentText: comment.text,
      studentId:   comment.studentId,
      studentName: comment.studentName,
      teacherId:   req.user.id,
      teacherName: teacher?.fullName || "Teacher",
      courseId:    comment.courseId,
      lessonId:    comment.lessonId,
      reason:      reason.trim(),
    });

    // Notify all admins
    const admins = await User.find({ role: "admin" }).select("_id");
    await Promise.all(
      admins.map((admin) =>
        Notification.create({
          userId:  admin._id,
          title:   "🚨 New Comment Report",
          message: `${teacher?.fullName || "A teacher"} reported a student comment as inappropriate. Review it in the Reports tab.`,
          courseId: comment.courseId,
        })
      )
    );

    res.status(201).json(report);
  } catch (err: any) {
    console.error("Error creating report:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/reports  (admin) ────────────────────────────────────────────────
router.get("/", protect, adminOnly, async (_req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/reports/pending-count  (admin) ──────────────────────────────────
router.get("/pending-count", protect, adminOnly, async (_req, res) => {
  try {
    const count = await Report.countDocuments({ status: "pending" });
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/reports/:reportId/resolve  (admin) ────────────────────────────
router.patch("/:reportId/resolve", protect, adminOnly, async (req: any, res) => {
  try {
    const { action } = req.body; // "ban" | "alert" | "dismiss"
    if (!["ban", "alert", "dismiss"].includes(action))
      return res.status(400).json({ message: "action must be ban, alert, or dismiss." });

    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ message: "Report not found." });
    if (report.status !== "pending")
      return res.status(400).json({ message: "Report already resolved." });

    const student = await User.findById(report.studentId).select(
      "fullName email isBanned warningCount banExpiresAt"
    );
    if (!student) return res.status(404).json({ message: "Student not found." });

    // ── BAN ───────────────────────────────────────────────────────────────
    if (action === "ban") {
      const banExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days

      await User.findByIdAndUpdate(report.studentId, {
        isBanned:     true,
        banExpiresAt,
        warningCount: 0, // reset warnings after a direct ban
      });

      report.status = "resolved_ban";

      await Notification.create({
        userId:  report.studentId,
        title:   "🚫 Account Suspended",
        message: `Your account has been suspended for 7 days due to a community guidelines violation. Access will be automatically restored on ${banExpiresAt.toLocaleDateString()}.`,
        courseId: report.courseId,
      });

      try {
        await sendBanEmail(student.email, student.fullName || "Student", report.reason, banExpiresAt);
      } catch (e) { console.error("Ban email failed:", e); }

    // ── ALERT (warning) ───────────────────────────────────────────────────
    } else if (action === "alert") {
      const currentWarnings = ((student as any).warningCount ?? 0) + 1;

      if (currentWarnings >= 3) {
        // 3rd warning → automatic 7-day ban
        const banExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await User.findByIdAndUpdate(report.studentId, {
          isBanned:     true,
          banExpiresAt,
          warningCount: 0,
        });

        report.status = "resolved_ban"; // escalated

        await Notification.create({
          userId:  report.studentId,
          title:   "🚫 Account Suspended — 3 Warnings Reached",
          message: `You have accumulated 3 warnings. Your account has been automatically suspended for 7 days. Access will be restored on ${banExpiresAt.toLocaleDateString()}.`,
          courseId: report.courseId,
        });

        try {
          await sendBanEmail(
            student.email,
            student.fullName || "Student",
            "You have received 3 community guideline warnings — automatic 7-day suspension applied.",
            banExpiresAt
          );
        } catch (e) { console.error("Auto-ban email failed:", e); }

      } else {
        // Regular warning
        await User.findByIdAndUpdate(report.studentId, { warningCount: currentWarnings });

        report.status = "resolved_alert";

        await Notification.create({
          userId:  report.studentId,
          title:   `⚠️ Warning ${currentWarnings}/3`,
          message: `Your comment was flagged. This is warning ${currentWarnings} of 3. Reaching 3 warnings results in a 7-day account suspension.`,
          courseId: report.courseId,
        });

        try {
          await sendWarningEmail(
            student.email,
            student.fullName || "Student",
            currentWarnings,
            report.reason
          );
        } catch (e) { console.error("Warning email failed:", e); }
      }

    // ── DISMISS ───────────────────────────────────────────────────────────
    } else {
      report.status = "dismissed";
    }

    report.resolvedAt = new Date();
    await report.save();

    res.json(report);
  } catch (err: any) {
    console.error("Error resolving report:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;