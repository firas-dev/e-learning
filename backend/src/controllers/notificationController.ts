import { Request, Response } from "express";
import Notification from "../models/Notification";

// Get all notifications for current user
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Mark one as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true });
    res.json({ message: "Marked as read." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Mark all as read
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await Notification.updateMany({ userId, read: false }, { read: true });
    res.json({ message: "All marked as read." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Unread count
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const count = await Notification.countDocuments({ userId, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};