import mongoose, { Schema } from "mongoose";

export interface IComment {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  text: string;
  createdAt?: Date;
}

const commentSchema = new Schema<IComment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    // lessonId is optional — if absent, this is a course-level comment
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", default: undefined },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// Index for fast lookups by course (and optionally lesson)
commentSchema.index({ courseId: 1, lessonId: 1, createdAt: -1 });

export default mongoose.model<IComment>("Comment", commentSchema);