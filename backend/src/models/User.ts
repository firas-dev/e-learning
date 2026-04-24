import mongoose, { Schema } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  fullName?: string;
  role: "student" | "teacher" | "admin";
  isBanned?: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    isBanned: { type: Boolean, default: false },
    resetPasswordToken: { type: String, default: undefined },
    resetPasswordExpires: { type: Date, default: undefined },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;