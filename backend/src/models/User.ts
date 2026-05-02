import mongoose, { Schema } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  fullName?: string;
  role: "student" | "teacher" | "admin";
  isBanned?: boolean;
  banExpiresAt?: Date;          // auto-unban date (1 week from ban)
  warningCount?: number;        // 0-2 warnings; 3rd = auto-ban
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    isBanned:     { type: Boolean, default: false },
    banExpiresAt: { type: Date, default: undefined },
    warningCount: { type: Number, default: 0 },
    resetPasswordToken:    { type: String, default: undefined },
    resetPasswordExpires:  { type: Date,   default: undefined },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;