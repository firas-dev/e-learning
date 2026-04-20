import mongoose, { Schema } from "mongoose";

export interface IPrivateRoom {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  teacherId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[]; // accepted student IDs
  invitedEmails: {
    email: string;
    status: "pending" | "accepted" | "declined";
    invitedAt: Date;
    respondedAt?: Date;
    studentId?: mongoose.Types.ObjectId;
  }[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const privateRoomSchema = new Schema<IPrivateRoom>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    invitedEmails: [
      {
        email: { type: String, required: true, lowercase: true, trim: true },
        status: {
          type: String,
          enum: ["pending", "accepted", "declined"],
          default: "pending",
        },
        invitedAt: { type: Date, default: Date.now },
        respondedAt: { type: Date },
        studentId: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPrivateRoom>("PrivateRoom", privateRoomSchema);