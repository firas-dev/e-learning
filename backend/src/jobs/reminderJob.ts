import cron from "node-cron";
import nodemailer from "nodemailer";
import Course from "../models/Course";
import Enrollment from "../models/Enrollment";
import Notification from "../models/Notification";
import User from "../models/User";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper — send reminder to all enrolled students of a course
const sendReminders = async (courseId: string, hoursLabel: string) => {
  const course = await Course.findById(courseId);
  if (!course) return;

  const enrollments = await Enrollment.find({ courseId }).populate("studentId");

  for (const enrollment of enrollments) {
    const student = await User.findById(enrollment.studentId);
    if (!student) continue;

    // ── In-app notification ──
    await Notification.create({
      userId: student._id,
      title: "📅 Live Session Reminder",
      message: `Your live course "${course.title}" starts ${hoursLabel}. Don't miss it!`,
      courseId: course._id,
    });

    // ── Email notification ──
    try {
      await transporter.sendMail({
        from: `"EduVerse AI" <${process.env.EMAIL_USER}>`,
        to: student.email,
        subject: `Reminder: "${course.title}" live session ${hoursLabel}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">📅 Live Session Reminder</h2>
            <p>Hi <strong>${student.fullName}</strong>,</p>
            <p>This is a reminder that your live course:</p>
            <h3 style="color: #1e40af;">${course.title}</h3>
            <p>starts <strong>${hoursLabel}</strong>.</p>
            ${course.scheduledAt
              ? `<p>📆 Scheduled: <strong>${new Date(course.scheduledAt).toLocaleString()}</strong></p>`
              : ''
            }
            <p>Log in to EduVerse AI to join the session.</p>
            <br/>
            <p style="color: #6b7280; font-size: 12px;">EduVerse AI — Your learning companion</p>
          </div>
        `,
      });
    } catch (err) {
      console.error(`❌ Failed to send email to ${student.email}:`, err);
    }
  }

  console.log(`✅ Reminders sent for course "${course.title}" (${hoursLabel})`);
};

export const startReminderJob = () => {
  // ── Runs every day at 8:00 AM ──
  // Finds all live courses scheduled for today and sends reminders
  cron.schedule("0 8 * * *", async () => {
    console.log("🔔 Running daily 8 AM reminder job...");
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayCourses = await Course.find({
        type: "live",
        is_published: true,
        scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      });

      for (const course of todayCourses) {
        await sendReminders(String(course._id), "today");
      }
    } catch (err) {
      console.error("❌ Reminder job error:", err);
    }
  });

  // ── Runs every hour — checks for courses starting in exactly 1 hour ──
  cron.schedule("0 * * * *", async () => {
    console.log("🔔 Running 1-hour-before reminder job...");
    try {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

      // Window: between 55 min and 65 min from now
      const windowStart = new Date(Date.now() + 55 * 60 * 1000);
      const windowEnd = new Date(Date.now() + 65 * 60 * 1000);

      const upcomingCourses = await Course.find({
        type: "live",
        is_published: true,
        scheduledAt: { $gte: windowStart, $lte: windowEnd },
      });

      for (const course of upcomingCourses) {
        await sendReminders(String(course._id), "in 1 hour");
      }
    } catch (err) {
      console.error("❌ 1-hour reminder job error:", err);
    }
  });

  console.log("🟢 Reminder jobs started");
};