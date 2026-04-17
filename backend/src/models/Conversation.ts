import mongoose, { Schema } from "mongoose";

export interface IConversation {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  studentUnread: number;
  teacherUnread: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    studentUnread: { type: Number, default: 0 },
    teacherUnread: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One conversation per student-teacher pair (optionally per course)
conversationSchema.index({ studentId: 1, teacherId: 1 }, { unique: true });

export default mongoose.model<IConversation>("Conversation", conversationSchema);