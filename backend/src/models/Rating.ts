import mongoose, { Schema } from "mongoose";

export interface IRating {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  stars: number; // 1-5
  createdAt?: Date;
}

const ratingSchema = new Schema<IRating>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String, required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

// One rating per student per lesson
ratingSchema.index({ courseId: 1, lessonId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IRating>("Rating", ratingSchema); 