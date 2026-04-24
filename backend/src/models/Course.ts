import mongoose, { Schema } from "mongoose";

export interface ICourse {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: "live" | "recorded";
  duration: number;
  teacherId: mongoose.Types.ObjectId; 
  scheduledAt?: Date;
  createdAt?: Date;
  is_published: boolean;
}

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ["live", "recorded"], required: true },
    duration: { type: Number, required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scheduledAt: { type: Date },
    is_published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>("Course", courseSchema);