import { Request, Response } from "express";
import PrivateRoom from "../models/PrivateRoom";
import Notification from "../models/Notification";
import User from "../models/User";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import RoomStudent from "../models/RoomStudent";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── POST /api/rooms — Teacher creates a room ──────────────────────────────
export const createRoom = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Room name is required." });
    }

    const room = await PrivateRoom.create({
      name: name.trim(),
      description: description?.trim(),
      teacherId,
      members: [],
      invitedEmails: [],
    });

    res.status(201).json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/rooms — Teacher gets their rooms ─────────────────────────────
export const getTeacherRooms = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;
    const rooms = await PrivateRoom.find({ teacherId, isActive: true })
      .populate("members", "fullName email")
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/rooms/student — Student gets rooms they joined ───────────────
export const getStudentRooms = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const rooms = await PrivateRoom.find({
      members: studentId,
      isActive: true,
    })
      .populate("teacherId", "fullName email")
      .populate("members", "fullName email")
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/rooms/:roomId — Get a single room ────────────────────────────
export const getRoom = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const role = (req as any).user.role;
    const { roomId } = req.params;

    const room = await PrivateRoom.findById(roomId)
      .populate("teacherId", "fullName email")
      .populate("members", "fullName email");

    if (!room) return res.status(404).json({ message: "Room not found." });

    const isTeacher = String((room.teacherId as any)._id) === userId || role === "admin";
    const isMember = room.members.some((m: any) => String(m._id) === userId);

    if (!isTeacher && !isMember) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ── POST /api/rooms/:roomId/invite — Teacher invites students by email ────
export const inviteStudents = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;
    const { roomId } = req.params;
    const { emails } = req.body; // string[]

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: "At least one email is required." });
    }

    const room = await PrivateRoom.findOne({ _id: roomId, teacherId });
    if (!room) {
      return res.status(403).json({ message: "Room not found or unauthorized." });
    }

    const teacher = await User.findById(teacherId).select("fullName email");
    const results: { email: string; status: string }[] = [];

    for (const rawEmail of emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) continue;

      const existing = room.invitedEmails.find((i) => i.email === email);
      if (existing && existing.status !== "declined") {
        results.push({ email, status: "already_invited" });
        continue;
      }

      const user = await User.findOne({ email, role: "student" });

      if (existing && existing.status === "declined") {
        existing.status = "pending";
        existing.invitedAt = new Date();
        existing.respondedAt = undefined;
        existing.studentId = user?._id;
      } else {
        room.invitedEmails.push({
          email,
          status: "pending",
          invitedAt: new Date(),
          studentId: user?._id,
        });
      }

      // ── In-app notification (if user exists) ──────────────────────────
      if (user) {
        await Notification.create({
          userId: user._id,
          title: "🔐 Private Room Invitation",
          message: `${teacher?.fullName || "A teacher"} invited you to join the private room "${room.name}". Check your invitations to accept or decline.`,
          courseId: room._id as any,
        });
      }

      // ── Email notification ─────────────────────────────────────────────
      const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const privateRoomsUrl = `${clientUrl}/`;

      try {
        await transporter.sendMail({
          from: `"EduVerse AI" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `You've been invited to join "${room.name}" on EduVerse AI`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 12px;">
              <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
                <div style="font-size: 40px; margin-bottom: 12px;">🔐</div>
                <h1 style="color: white; margin: 0; font-size: 24px;">Private Room Invitation</h1>
              </div>

              <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
                <p style="color: #374151; font-size: 16px; margin-bottom: 8px;">
                  Hi${user ? ` <strong>${user.fullName}</strong>` : ""},
                </p>
                <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                  <strong>${teacher?.fullName || "An instructor"}</strong> has invited you to join the exclusive private learning room:
                </p>

                <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px 20px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0; font-size: 20px; font-weight: bold; color: #6d28d9;">${room.name}</p>
                  ${room.description ? `<p style="margin: 8px 0 0; color: #6b7280; font-size: 13px;">${room.description}</p>` : ""}
                </div>

                ${user
                  ? `
                <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">
                  Log in to EduVerse AI and go to <strong>Private Rooms</strong> to accept or decline this invitation.
                </p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${privateRoomsUrl}"
                     style="background: #7c3aed; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
                    View Invitation
                  </a>
                </div>
                  `
                  : `
                <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">
                  You don't have an EduVerse AI account yet. Sign up with this email address and the invitation will be waiting for you.
                </p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${clientUrl}"
                     style="background: #7c3aed; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
                    Create Account
                  </a>
                </div>
                  `
                }

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                  EduVerse AI — Your AI-Powered Learning Platform
                </p>
              </div>
            </div>
          `,
        });

        results.push({ email, status: user ? "invited_with_notification" : "invited_no_account" });
      } catch (emailErr) {
        console.error(`❌ Failed to send invitation email to ${email}:`, emailErr);
        // Still mark as invited even if email fails
        results.push({ email, status: user ? "invited_with_notification" : "invited_no_account" });
      }
    }

    await room.save();
    res.json({ results, room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/rooms/invitations — Student gets pending invitations ──────────
export const getStudentInvitations = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const email = user.email;

    const rooms = await PrivateRoom.find({
      "invitedEmails.email": email,
      "invitedEmails.status": "pending",
      isActive: true,
    }).populate("teacherId", "fullName email");

    const invitations = rooms.map((room) => {
      const invite = room.invitedEmails.find(
        (i) => i.email === email && i.status === "pending"
      );
      return {
        roomId: room._id,
        roomName: room.name,
        roomDescription: room.description,
        teacher: room.teacherId,
        invitedAt: invite?.invitedAt,
      };
    });

    res.json(invitations);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ── PATCH /api/rooms/:roomId/respond — Student accepts or declines ────────
export const respondToInvitationPatched = async (req: Request, res: Response) => {
  try {
    const tokenUser = (req as any).user;          // only has: id, role
    const { roomId } = req.params;
    const { action } = req.body;
 
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ message: "Invalid action." });
    }
 
    // Fetch the full user to get their email (JWT payload only contains id + role)
    const fullUser = await User.findById(tokenUser.id).select("email fullName");
    if (!fullUser) return res.status(404).json({ message: "User not found." });
 
    const room = await PrivateRoom.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found." });
 
    const invite = room.invitedEmails.find(
      (i) => i.email === fullUser.email && i.status === "pending"
    );
    if (!invite) {
      return res.status(404).json({ message: "Invitation not found or already responded." });
    }
 
    invite.status      = action === "accept" ? "accepted" : "declined";
    invite.respondedAt = new Date();
    invite.studentId   = new mongoose.Types.ObjectId(tokenUser.id);
 
    if (action === "accept") {
      const alreadyMember = room.members.some((m) => String(m) === String(tokenUser.id));
      if (!alreadyMember) {
        room.members.push(new mongoose.Types.ObjectId(tokenUser.id));
      }
 
      await RoomStudent.updateOne(
        { studentId: tokenUser.id, roomId },
        {
          $setOnInsert: {
            totalPoints:         0,
            level:               1,
            badges:              [],
            streak:              { current: 0, longest: 0 },
            challengesCompleted: 0,
            challengesAttempted: 0,
            hintsRequested:      0,
            helpfulPosts:        0,
            joinedAt:            new Date(),
            lastActiveAt:        new Date(),
          },
        },
        { upsert: true }
      );
 
      // Notify teacher
      const teacher = await User.findById(room.teacherId).select("_id");
      if (teacher) {
        await Notification.create({
          userId:   teacher._id,
          title:    "✅ Invitation Accepted",
          message:  `${fullUser.fullName || fullUser.email} joined your private room "${room.name}".`,
          courseId: room._id as any,
        });
      }
    }
 
    await room.save();
    res.json({ message: `Invitation ${action}ed.`, room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// ── DELETE /api/rooms/:roomId/members/:memberId — Teacher removes a member
export const removeMember = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;
    const { roomId, memberId } = req.params;

    const room = await PrivateRoom.findOne({ _id: roomId, teacherId });
    if (!room) return res.status(403).json({ message: "Room not found or unauthorized." });

    room.members = room.members.filter((m) => String(m) !== memberId) as any;

    const memberUser = await User.findById(memberId).select("email");
    if (memberUser) {
      const inv = room.invitedEmails.find((i) => i.email === memberUser.email);
      if (inv) inv.status = "declined";
    }

    await room.save();
    res.json({ message: "Member removed." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ── DELETE /api/rooms/:roomId — Teacher deletes a room ───────────────────
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;
    const { roomId } = req.params;

    const room = await PrivateRoom.findOne({ _id: roomId, teacherId });
    if (!room) return res.status(403).json({ message: "Room not found or unauthorized." });

    room.isActive = false;
    await room.save();

    res.json({ message: "Room deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/rooms/invitations/count — pending invitation count ───────────
export const getPendingInvitationCount = async (req: Request, res: Response) => {
  try {
    const email = (req as any).user.email;

    const count = await PrivateRoom.countDocuments({
      "invitedEmails.email": email,
      "invitedEmails.status": "pending",
      isActive: true,
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};