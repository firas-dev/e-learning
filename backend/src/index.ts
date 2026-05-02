import dotenv from "dotenv";
dotenv.config();
import { startReminderJob } from "./jobs/reminderJob";
import notificationRoutes from "./routes/notificationRoutes";
import express, { Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/db";
import authRoutes from "./routes/authRoutes";
import studentRoutes from "./routes/studentRoutes";
import teacherRoutes from "./routes/teacherRoutes";
import lessonRoutes from "./routes/lessonRoutes";
import liveSessionRoutes from "./routes/liveSessionRoutes";
import { Server } from "socket.io";
import { createServer } from "http";
import enrollmentRoutes from "./routes/enrollmentRoutes";
import feedbackRoutes from "./routes/feedbackRoutes";
import profileRoutes from "./routes/profileRoutes";
import messageRoutes from "./routes/messageRoutes";
import preferencesRoutes from "./routes/preferences";
import privateRoomRoutes from "./routes/privateRoomRoutes";
import challengeRoutes from "./routes/challengeRoutes";
import adminRoutes from "./routes/adminRoutes";
import { setIo, startChallengeStatusJob } from "./jobs/challengeStatusJob";
import reportRoutes from "./routes/reportRoutes";


connectDB();
startReminderJob();
startChallengeStatusJob();

const app = express();
const PORT = process.env.PORT || 5000 ;

  const httpServer = createServer(app);


export const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

setIo(io);

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // Join a session room
  socket.on("join-session", ({ sessionId, userName }) => {
    socket.join(sessionId);
    socket.to(sessionId).emit("user-joined", { userName });
    console.log(`${userName} joined session ${sessionId}`);
  });

  // Chat message
  socket.on("send-message", ({ sessionId, message }) => {
    io.to(sessionId).emit("receive-message", message);
  });

  // Attachment added
  socket.on("attachment-added", ({ sessionId, attachments }) => {
    io.to(sessionId).emit("attachments-updated", attachments);
  });

  // Hand raised
  socket.on("raise-hand", ({ sessionId, userName }) => {
    io.to(sessionId).emit("hand-raised", { userName });
  });


  socket.on("join-room-competition", ({ roomId, userId }: { roomId: string; userId: string }) => {
    socket.join(`room:${roomId}`);
    console.log(`[Socket] User ${userId} joined competition room ${roomId}`);
  });

  // Teacher broadcasts challenge going live
  socket.on("challenge-activate", ({ roomId, challengeId }: { roomId: string; challengeId: string }) => {
    io.to(`room:${roomId}`).emit("challenge-live", { challengeId });
  });

  // Teacher ends challenge
  socket.on("challenge-ended", ({ roomId, challengeId }) => {
    io.to(`room:${roomId}`).emit("challenge-over", { challengeId });
  });

  // Announcement
  socket.on("room-announcement", ({ roomId, announcement }) => {
    io.to(`room:${roomId}`).emit("new-announcement", { announcement });
  });

  // Countdown sync — teacher sends challenge timer state
  socket.on("sync-timer", ({ roomId, challengeId, endsAt }: any) => {
    io.to(`room:${roomId}`).emit("timer-sync", { challengeId, endsAt });
  });



  // New badge earned
  // emitted internally from awardPoints helper:
  // io.to(`room:${roomId}`).emit("badge-earned", { userId, badge });

  // New thread posted
  socket.on("thread-posted", ({ roomId, challengeId, thread }: any) => {
    socket.to(`room:${roomId}`).emit("new-thread", { challengeId, thread });
  });
 
  // New announcement
  socket.on("post-announcement", ({ roomId, announcement }: any) => {
    socket.to(`room:${roomId}`).emit("new-announcement", { announcement });
  });


  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});



// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/courses", lessonRoutes);
app.use("/api/live", liveSessionRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/courses", feedbackRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/rooms", privateRoomRoutes);
app.use("/api/rooms/:roomId", challengeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports",  reportRoutes);
// Test route
app.get("/", (req: Request, res: Response) => {
  res.send("API is running...");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});