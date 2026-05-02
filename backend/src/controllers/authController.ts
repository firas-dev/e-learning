import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import crypto from "crypto";
import nodemailer from "nodemailer";


const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// REGISTER
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, role } = req.body;

    // check if user exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const newUser = await User.create({
      email,
      password: hashedPassword,
      fullName,
      role,
    });

    // generate token
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token, user: { email, fullName, role, _id: newUser._id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
 
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
 
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
 
    // ── Auto-unban if ban period expired ────────────────────────────────
    if ((user as any).isBanned && (user as any).banExpiresAt) {
      if (new Date() > (user as any).banExpiresAt) {
        await User.findByIdAndUpdate(user._id, {
          isBanned: false,
          banExpiresAt: undefined,
        });
        (user as any).isBanned = false;
        (user as any).banExpiresAt = undefined;
      }
    }
 
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });
 
    // Return ban info so frontend can show the BannedScreen
    res.json({
      token,
      user: {
        email:        user.email,
        fullName:     user.fullName,
        role:         user.role,
        _id:          user._id,
        isBanned:     (user as any).isBanned     ?? false,
        banExpiresAt: (user as any).banExpiresAt ?? null,
        warningCount: (user as any).warningCount ?? 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};




// FORGOT PASSWORD 
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "We couldn't find an account with that email. Please check the email address and try again." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"EduVerse AI" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below (valid for 1 hour):</p>
        <a href="${resetURL}">Click here to Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successful. You can now sign in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};