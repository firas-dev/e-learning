// ─── Enrollment.ts ───────────────────────────────────────────────────────────
// Enrollment model extended with emotionLog for session emotion snapshots.

import mongoose, { Schema } from "mongoose";

export type RawEmotion = 'happy' | 'sad' | 'disgust' | 'fear' | 'angry' | 'neutral';
export type LearningSignal = 'positive' | 'neutral' | 'struggling' | 'disengaged';

export interface IEmotionEntry {
  lessonId: mongoose.Types.ObjectId;
  timestamp_ms: number;
  emotion: RawEmotion;
  signal: LearningSignal;
}

export interface IEnrollment {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  completedLessons: string[];
  progress: number;
  learningTime: number;
  lastAccessed: Date;
  // ── Emotion tracking ──────────────────────────────────────────────────────
  emotionLog: IEmotionEntry[];
}

const emotionEntrySchema = new Schema<IEmotionEntry>(
  {
    lessonId:     { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    timestamp_ms: { type: Number, required: true },
    emotion:      { type: String, enum: ['happy','sad','disgust','fear','angry','neutral'], required: true },
    signal:       { type: String, enum: ['positive','neutral','struggling','disengaged'], required: true },
  },
  { _id: false } // no separate _id per entry — keeps the array lean
);

const enrollmentSchema = new Schema<IEnrollment>(
  {
    studentId:        { type: Schema.Types.ObjectId, ref: "User",   required: true },
    courseId:         { type: Schema.Types.ObjectId, ref: "Course", required: true },
    completedLessons: { type: [String], default: [] },
    progress:         { type: Number,  default: 0 },
    learningTime:     { type: Number,  default: 0 },
    lastAccessed:     { type: Date,    default: Date.now },
    emotionLog:       { type: [emotionEntrySchema], default: [] },
  },
  { timestamps: true }
);

// Index for fast teacher heatmap queries (by courseId + lessonId)
enrollmentSchema.index({ courseId: 1, "emotionLog.lessonId": 1 });

export default mongoose.model<IEnrollment>("Enrollment", enrollmentSchema);