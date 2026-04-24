import mongoose, { Schema } from "mongoose";

export type SubmissionStatus = "pending" | "graded" | "auto_graded" | "rejected";

export interface IAnswerEntry {
  questionId?: mongoose.Types.ObjectId;
  answer: string;
  isCorrect?: boolean;
  earnedPoints?: number;
}

export interface ISubmission {
  _id: mongoose.Types.ObjectId;
  challengeId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  answers: IAnswerEntry[];
  attachments: { originalName: string; url: string; mimetype: string }[];
  score: number;
  bonusScore: number;
  totalScore: number;
  feedback?: string;
  status: SubmissionStatus;
  submittedAt: Date;
  gradedAt?: Date;
  gradedBy?: mongoose.Types.ObjectId;
  attemptNumber: number;
  timeTakenSeconds?: number;
  hintsUsedIndices: number[];
  isFlagged: boolean;
  createdAt?: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    challengeId:       { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    roomId:            { type: Schema.Types.ObjectId, ref: "PrivateRoom", required: true },
    studentId:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    answers: [{
      questionId:   { type: Schema.Types.ObjectId },
      answer:       String,
      isCorrect:    Boolean,
      earnedPoints: Number,
    }],
    attachments: [{ originalName: String, url: String, mimetype: String }],
    score:             { type: Number, default: 0 },
    bonusScore:        { type: Number, default: 0 },
    totalScore:        { type: Number, default: 0 },
    feedback:          String,
    status:            { type: String, enum: ["pending","graded","auto_graded","rejected"], default: "pending" },
    submittedAt:       { type: Date, default: Date.now },
    gradedAt:          Date,
    gradedBy:          { type: Schema.Types.ObjectId, ref: "User" },
    attemptNumber:     { type: Number, default: 1 },
    timeTakenSeconds:  Number,
    hintsUsedIndices:  { type: [Number], default: [] },
    isFlagged:         { type: Boolean, default: false },
  },
  { timestamps: true }
);

submissionSchema.index({ challengeId: 1, studentId: 1 });
submissionSchema.index({ roomId: 1, studentId: 1 });

export default mongoose.model<ISubmission>("Submission", submissionSchema);