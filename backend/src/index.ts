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



connectDB();
startReminderJob();
const app = express();
const PORT = process.env.PORT || 5000 ;

  const httpServer = createServer(app);


const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

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


// Test route
app.get("/", (req: Request, res: Response) => {
  res.send("API is running...");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});