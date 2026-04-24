import mongoose, { Schema } from "mongoose";

// ── Challenge Discussion Thread ───────────────────────────────────────────────
export interface IChallengeThread {
  _id: mongoose.Types.ObjectId;
  challengeId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorRole: "student" | "teacher";
  text: string;
  parentId?: mongoose.Types.ObjectId;
  reactions: { emoji: string; userId: string }[];
  isHint: boolean;
  createdAt?: Date;
}

const threadSchema = new Schema<IChallengeThread>(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    roomId:      { type: Schema.Types.ObjectId, ref: "PrivateRoom", required: true },
    authorId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName:  { type: String, required: true },
    authorRole:  { type: String, enum: ["student","teacher"], default: "student" },
    text:        { type: String, required: true, maxlength: 2000 },
    parentId:    { type: Schema.Types.ObjectId, ref: "ChallengeThread" },
    reactions:   [{ emoji: String, userId: String }],
    isHint:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

threadSchema.index({ challengeId: 1, createdAt: -1 });

export const ChallengeThread = mongoose.model<IChallengeThread>("ChallengeThread", threadSchema);

// ── Room Announcement ─────────────────────────────────────────────────────────
export interface IRoomAnnouncement {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  pinned: boolean;
  createdAt?: Date;
}

const announcementSchema = new Schema<IRoomAnnouncement>(
  {
    roomId:    { type: Schema.Types.ObjectId, ref: "PrivateRoom", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title:     { type: String, required: true },
    body:      { type: String, required: true },
    pinned:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

announcementSchema.index({ roomId: 1, createdAt: -1 });

export const RoomAnnouncement = mongoose.model<IRoomAnnouncement>("RoomAnnouncement", announcementSchema);