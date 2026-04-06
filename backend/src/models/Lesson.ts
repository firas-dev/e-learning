import mongoose, { Schema } from "mongoose";

export interface ILesson {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  files: {
    originalName: string;
    publicId: string;   // Cloudinary public_id (used to delete)
    url: string;        // Cloudinary secure_url
    mimetype: string;
    size: number;
  }[];
  createdAt?: Date;
}

const lessonSchema = new Schema<ILesson>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, default: 0 },
    files: [
      {
        originalName: String,
        publicId: String,
        url: String,
        mimetype: String,
        size: Number,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<ILesson>("Lesson", lessonSchema);