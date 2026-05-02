import mongoose, { Schema } from "mongoose";

export interface IComment {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  role: string; // 'student' | 'teacher' | 'admin'
  text: string;
  parentId?: mongoose.Types.ObjectId;
  createdAt?: Date;
}

const commentSchema = new Schema<IComment>(
  {
    courseId:    { type: Schema.Types.ObjectId, ref: "Course",  required: true },
    lessonId:    { type: Schema.Types.ObjectId, ref: "Lesson",  default: undefined },
    studentId:   { type: Schema.Types.ObjectId, ref: "User",    required: true },
    studentName: { type: String, required: true },
    role:        { type: String, default: "student" },   // ← new field
    text:        { type: String, required: true, maxlength: 1000 },
    parentId:    { type: Schema.Types.ObjectId, ref: "Comment", default: undefined },
  },
  { timestamps: true }
);

commentSchema.index({ courseId: 1, lessonId: 1, createdAt: -1 });

export default mongoose.model<IComment>("Comment", commentSchema);