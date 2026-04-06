import mongoose, { Schema } from "mongoose";

export interface IAttachment {
  originalName: string;
  publicId: string;
  url: string;
  mimetype: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ILiveSession {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  title: string;
  jitsiRoomId: string;
  isActive: boolean;
  attachments: IAttachment[];
  startedAt: Date;
  endedAt?: Date;
}

const liveSessionSchema = new Schema<ILiveSession>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    jitsiRoomId: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    attachments: [
      {
        originalName: String,
        publicId: String,
        url: String,
        mimetype: String,
        size: Number,
        uploadedBy: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ILiveSession>("LiveSession", liveSessionSchema);