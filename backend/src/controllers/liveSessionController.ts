import { Request, Response } from "express";
import LiveSession from "../models/LiveSession";
import cloudinary from "../config/cloudinary";
import crypto from "crypto";

// Start a live session
export const startSession = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;
    const { courseId, title } = req.body;

    // Generate unique Jitsi room ID
    const jitsiRoomId = `eduverse-${courseId}-${crypto.randomBytes(6).toString("hex")}`;

    const session = await LiveSession.create({
      courseId,
      teacherId,
      title,
      jitsiRoomId,
      isActive: true,
    });

    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get active session for a course
export const getActiveSession = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const session = await LiveSession.findOne({ courseId, isActive: true });
    if (!session) return res.status(404).json({ message: "No active session." });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// End a session
export const endSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const teacherId = (req as any).user.id;

    const session = await LiveSession.findOneAndUpdate(
      { _id: sessionId, teacherId },
      { isActive: false, endedAt: new Date() },
      { new: true }
    );

    if (!session) return res.status(403).json({ message: "Unauthorized or not found." });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Upload attachment to session
export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const user = (req as any).user;
    const files = req.files as any[];
    const { links } = req.body; // JSON string of link URLs

    const session = await LiveSession.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ message: "Session not found or ended." });
    }

    const newAttachments: any[] = [];

    // Handle file uploads
    if (files && files.length > 0) {
      files.forEach((f) => {
        newAttachments.push({
          originalName: f.originalname,
          publicId: f.filename,
          url: f.path,
          mimetype: f.mimetype,
          size: f.size,
          uploadedBy: user.id,
          uploadedAt: new Date(),
        });
      });
    }

    // Handle links
    if (links) {
      const parsedLinks = JSON.parse(links);
      parsedLinks.forEach((link: string) => {
        newAttachments.push({
          originalName: link,
          publicId: `link-${Date.now()}`,
          url: link,
          mimetype: "text/uri-list",
          size: 0,
          uploadedBy: user.id,
          uploadedAt: new Date(),
        });
      });
    }

    session.attachments.push(...newAttachments);
    await session.save();

    res.json({ attachments: session.attachments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete attachment
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { sessionId, publicId } = req.params;

    const session = await LiveSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found." });

    const attachment = session.attachments.find((a) => a.publicId === publicId);
    if (attachment && attachment.mimetype !== "text/uri-list") {
      const resourceType = attachment.mimetype === "application/pdf" ? "raw" : "image";
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    }

    await LiveSession.findByIdAndUpdate(sessionId, {
      $pull: { attachments: { publicId } },
    });

    res.json({ message: "Attachment removed." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};