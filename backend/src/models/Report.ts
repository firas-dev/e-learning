import mongoose, { Schema } from "mongoose";

export interface IReport {
  _id: mongoose.Types.ObjectId;
  commentId: mongoose.Types.ObjectId;
  commentText: string;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  teacherId: mongoose.Types.ObjectId;
  teacherName: string;
  courseId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  reason: string;
  status: "pending" | "resolved_ban" | "resolved_alert" | "dismissed";
  createdAt?: Date;
  resolvedAt?: Date;
}

const reportSchema = new Schema<IReport>(
  {
    commentId:   { type: Schema.Types.ObjectId, ref: "Comment", required: true },
    commentText: { type: String, required: true },
    studentId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String, required: true },
    teacherId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    teacherName: { type: String, required: true },
    courseId:    { type: Schema.Types.ObjectId, ref: "Course", required: true },
    lessonId:    { type: Schema.Types.ObjectId, ref: "Lesson" },
    reason:      { type: String, required: true, maxlength: 500 },
    status:      {
      type: String,
      enum: ["pending", "resolved_ban", "resolved_alert", "dismissed"],
      default: "pending",
    },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ commentId: 1 }, { unique: true }); // one report per comment

export default mongoose.model<IReport>("Report", reportSchema);