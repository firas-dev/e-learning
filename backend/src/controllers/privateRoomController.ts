import { Request, Response } from "express";
import PrivateRoom from "../models/PrivateRoom";
import Notification from "../models/Notification";
import User from "../models/User";
import mongoose from "mongoose";

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

    // Access check: teacher owner or accepted member
    const isTeacher = String(room.teacherId._id) === userId || role === "admin";
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

    const results: { email: string; status: string }[] = [];

    for (const rawEmail of emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) continue;

      // Skip if already invited (pending or accepted)
      const existing = room.invitedEmails.find((i) => i.email === email);
      if (existing && existing.status !== "declined") {
        results.push({ email, status: "already_invited" });
        continue;
      }

      // Check if user exists
      const user = await User.findOne({ email, role: "student" });

      if (existing && existing.status === "declined") {
        // Re-invite declined user
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

      // Send in-app notification if user exists
      if (user) {
        const teacher = await User.findById(teacherId).select("fullName");
        await Notification.create({
          userId: user._id,
          title: "🔐 Private Room Invitation",
          message: `${teacher?.fullName || "A teacher"} invited you to join the private room "${room.name}". Check your invitations to accept or decline.`,
          courseId: room._id as any, // reusing courseId field for roomId
        });
      }

      results.push({ email, status: user ? "invited_with_notification" : "invited_no_account" });
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

    // Find by email match (works even before they had an account)
    const rooms = await PrivateRoom.find({
      "invitedEmails.email": email,
      "invitedEmails.status": "pending",
      isActive: true,
    }).populate("teacherId", "fullName email");

    // Only return the specific invitation entry for this user
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
export const respondToInvitation = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { roomId } = req.params;
    const { action } = req.body; // "accept" | "decline"

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ message: "Invalid action." });
    }

    const room = await PrivateRoom.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found." });

    const invite = room.invitedEmails.find(
      (i) => i.email === user.email && i.status === "pending"
    );
    if (!invite) {
      return res.status(404).json({ message: "Invitation not found or already responded." });
    }

    invite.status = action === "accept" ? "accepted" : "declined";
    invite.respondedAt = new Date();
    invite.studentId = new mongoose.Types.ObjectId(user.id);

    if (action === "accept") {
      // Add to members if not already there
      const alreadyMember = room.members.some(
        (m) => String(m) === String(user.id)
      );
      if (!alreadyMember) {
        room.members.push(new mongoose.Types.ObjectId(user.id));
      }

      // Notify teacher
      const teacher = await User.findById(room.teacherId).select("_id");
      if (teacher) {
        await Notification.create({
          userId: teacher._id,
          title: "✅ Invitation Accepted",
          message: `${user.fullName || user.email} joined your private room "${room.name}".`,
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

    // Also mark their invite as declined so they can be re-invited later
    const memberUser = await User.findById(memberId).select("email");
    if (memberUser) {
      const invite = room.invitedEmails.find((i) => i.email === memberUser.email);
      if (invite) invite.status = "declined";
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