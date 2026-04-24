import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";



export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if user is banned
    const user = await User.findById(decoded.id).select("isBanned role");
    if (!user) return res.status(401).json({ message: "User not found." });
    if (user.isBanned) return res.status(403).json({ message: "Your account has been suspended." });

    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};