import mongoose, { Schema } from "mongoose";

export interface IEnrollment {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  completedLessons: string[]; // lessonId strings of fully completed lessons
  progress: number;           // cached percentage (0–100), recalculated server-side
  learningTime: number;       // cumulative watch time in minutes (additive)
  lastAccessed: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    completedLessons: { type: [String], default: [] },
    progress: { type: Number, default: 0 },
    learningTime: { type: Number, default: 0 },
    lastAccessed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IEnrollment>("Enrollment", enrollmentSchema);