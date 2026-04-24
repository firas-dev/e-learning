import mongoose, { Schema } from "mongoose";

export interface IChallengeTimerStart {
  _id: mongoose.Types.ObjectId;
  challengeId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  startedAt: Date;
  expiresAt: Date;
}

const schema = new Schema<IChallengeTimerStart>({
  challengeId: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
  studentId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  startedAt:   { type: Date, default: Date.now },
  expiresAt:   { type: Date, required: true },
});

schema.index({ challengeId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IChallengeTimerStart>("ChallengeTimerStart", schema);