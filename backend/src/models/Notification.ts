import mongoose, { Schema } from "mongoose";

export interface INotification {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;  // ← NEW: for navigating to specific lesson
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: "User",   required: true },
    title:    { type: String, required: true },
    message:  { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" }, // ← NEW
    read:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>("Notification", notificationSchema);