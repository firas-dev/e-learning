import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const user = await User.findById(decoded.id).select("isBanned banExpiresAt role");
    if (!user) return res.status(401).json({ message: "User not found." });

    // ── Auto-unban: if ban period has expired, lift it ────────────────────
    if (user.isBanned && user.banExpiresAt && new Date() > user.banExpiresAt) {
      await User.findByIdAndUpdate(decoded.id, {
        isBanned: false,
        banExpiresAt: undefined,
      });
      // Allow the request through
    } else if (user.isBanned) {
      return res.status(403).json({
        message: "Your account has been suspended.",
        isBanned: true,
        banExpiresAt: user.banExpiresAt,
      });
    }

    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};