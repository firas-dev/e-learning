import mongoose, { Schema } from "mongoose";

export interface IBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

export interface IStreak {
  current: number;
  longest: number;
  lastActiveDate?: Date;
}

export interface IRoomStudent {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  totalPoints: number;
  level: number;
  badges: IBadge[];
  streak: IStreak;
  challengesCompleted: number;
  challengesAttempted: number;
  rank?: number;
  hintsRequested: number;
  helpfulPosts: number;
  joinedAt: Date;
  lastActiveAt: Date;
}

const roomStudentSchema = new Schema<IRoomStudent>(
  {
    roomId:               { type: Schema.Types.ObjectId, ref: "PrivateRoom", required: true },
    studentId:            { type: Schema.Types.ObjectId, ref: "User", required: true },
    totalPoints:          { type: Number, default: 0 },
    level:                { type: Number, default: 1 },
    badges: [{
      id: String, name: String, description: String,
      icon: String, earnedAt: { type: Date, default: Date.now },
    }],
    streak: {
      current:        { type: Number, default: 0 },
      longest:        { type: Number, default: 0 },
      lastActiveDate: Date,
    },
    challengesCompleted: { type: Number, default: 0 },
    challengesAttempted: { type: Number, default: 0 },
    rank:                Number,
    hintsRequested:      { type: Number, default: 0 },
    helpfulPosts:        { type: Number, default: 0 },
    joinedAt:            { type: Date, default: Date.now },
    lastActiveAt:        { type: Date, default: Date.now },
  },
  { timestamps: true }
);

roomStudentSchema.index({ roomId: 1, totalPoints: -1 });
roomStudentSchema.index({ roomId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IRoomStudent>("RoomStudent", roomStudentSchema);