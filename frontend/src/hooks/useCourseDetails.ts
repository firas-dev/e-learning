import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export interface CourseDetails {
  _id: string;
  title: string;
  description: string;
  type: "live" | "recorded";
  duration: number;            // hours (float)
  scheduledAt?: string;
  teacherId: { _id: string; fullName: string; email?: string };
  lessons: { _id: string; title: string }[];
  lessonCount: number;
  enrollmentCount: number;
  averageRating: number;
}

// Fetches details for a single course. Pass null to clear/skip.
export function useCourseDetails(courseId: string | null) {
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!courseId) {
      setCourse(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    axios
      .get(`${API}/enrollments/${courseId}/details`)
      .then((res) => {
        if (!cancelled) setCourse(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return { course, loading };
}