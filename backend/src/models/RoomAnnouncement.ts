import mongoose, { Schema } from "mongoose";

const announcementSchema = new Schema({
  roomId:    { type: Schema.Types.ObjectId, ref: "PrivateRoom", required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title:     { type: String, required: true },
  body:      { type: String, required: true },
  pinned:    { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("RoomAnnouncement", announcementSchema);