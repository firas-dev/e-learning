import { useState, useEffect } from "react";
import axios from "axios";
import type { RawEmotion, LearningSignal } from "../utils/emotionMapping";

const API = "http://localhost:5000/api";

export interface EmotionDistEntry {
  emotion: RawEmotion;
  signal: LearningSignal;
  label: string;
  count: number;
  pct: number;
}

export interface ProblematicLesson {
  lessonId: string;
  lessonTitle: string;
  courseId: string | null;
  courseTitle: string;
  courseType: "live" | "recorded";
  totalDetections: number;
  frustrationPct: number;
  difficultyPct: number;
  strugglingPct: number;
  positivePct: number;
  dominantIssue: "frustration" | "difficulty";
  severityScore: number;
}

export interface Recommendation {
  id: string;
  severity: "high" | "medium" | "low";
  category: "lesson" | "engagement" | "positive";
  title: string;
  message: string;
  lessonId?: string;
  courseId?: string | null;
  courseTitle?: string;
  courseType?: "live" | "recorded";
}

export interface TeacherEmotionAnalytics {
  hasData: boolean;
  overview: {
    totalDetections: number;
    sessionsAnalyzed: number;
    studentsTracked: number;
    engagementScore: number;
    signalCounts: Record<LearningSignal, number>;
    distribution: EmotionDistEntry[];
  };
  problematicLessons: ProblematicLesson[];
  recommendations: Recommendation[];
  activeAlerts: number;
}

export function useTeacherEmotionAnalytics() {
  const [data, setData] = useState<TeacherEmotionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get<TeacherEmotionAnalytics>(`${API}/teacher/emotion-analytics`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.message || "Failed to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}