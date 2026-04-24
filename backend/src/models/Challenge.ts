import mongoose, { Schema } from "mongoose";

export type ChallengeType = "quiz" | "coding" | "assignment" | "mini_project" | "timed";
export type Difficulty = "easy" | "medium" | "hard";
export type ChallengeStatus = "draft" | "upcoming" | "active" | "completed" | "cancelled";

export interface IHint {
  text: string;
  pointsCost: number;
}

export interface IQuizOption {
  label: string;
  isCorrect: boolean;
}

export interface IQuizQuestion {
  _id: mongoose.Types.ObjectId;
  text: string;
  type: "mcq" | "short_answer";
  options?: IQuizOption[];
  correctAnswer?: string;
  points: number;
}

export interface IChallenge {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: ChallengeType;
  difficulty: Difficulty;
  totalPoints: number;
  bonusPoints: number;
  startsAt: Date;
  endsAt: Date;
  timeLimitMinutes?: number;
  status: ChallengeStatus;
  hideLeaderboard: boolean;
  allowResubmission: boolean;
  hints: IHint[];
  questions?: IQuizQuestion[];
  attachments: { originalName: string; url: string; mimetype: string }[];
  participantCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const challengeSchema = new Schema<IChallenge>(
  {
    roomId:           { type: Schema.Types.ObjectId, ref: "PrivateRoom", required: true },
    teacherId:        { type: Schema.Types.ObjectId, ref: "User", required: true },
    title:            { type: String, required: true, trim: true },
    description:      { type: String, required: true },
    type:             { type: String, enum: ["quiz","coding","assignment","mini_project","timed"], required: true },
    difficulty:       { type: String, enum: ["easy","medium","hard"], default: "medium" },
    totalPoints:      { type: Number, required: true, min: 1 },
    bonusPoints:      { type: Number, default: 0 },
    startsAt:         { type: Date, required: true },
    endsAt:           { type: Date, required: true },
    timeLimitMinutes: { type: Number },
    status:           { type: String, enum: ["draft","upcoming","active","completed","cancelled"], default: "draft" },
    hideLeaderboard:  { type: Boolean, default: false },
    allowResubmission:{ type: Boolean, default: true },
    hints: [{ text: String, pointsCost: { type: Number, default: 0 } }],
    questions: [{
      text:          String,
      type:          { type: String, enum: ["mcq","short_answer"] },
      options:       [{ label: String, isCorrect: Boolean }],
      correctAnswer: String,
      points:        { type: Number, default: 10 },
    }],
    attachments: [{ originalName: String, url: String, mimetype: String }],
    participantCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

challengeSchema.index({ roomId: 1, startsAt: 1 });
challengeSchema.index({ roomId: 1, status: 1 });

export default mongoose.model<IChallenge>("Challenge", challengeSchema);