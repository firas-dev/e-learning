import { useEffect, useRef } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export function useProgress(courseId: string, totalLessons: number) {
  const visitedLessons = useRef<Set<string>>(new Set());
  const startTime = useRef<number>(Date.now());

  const markLessonVisited = async (lessonId: string) => {
    visitedLessons.current.add(lessonId);

    const progress =
      totalLessons > 0
        ? Math.round((visitedLessons.current.size / totalLessons) * 100)
        : 0;

    const learningTimeMinutes = Math.round(
      (Date.now() - startTime.current) / 1000 / 60
    );

    try {
      await axios.patch(`${API}/student/courses/${courseId}/progress`, {
        progress,
        learningTime: learningTimeMinutes,
      });
    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  };

  // Save progress when user leaves the page
  useEffect(() => {
    return () => {
      if (visitedLessons.current.size > 0) {
        const progress =
          totalLessons > 0
            ? Math.round((visitedLessons.current.size / totalLessons) * 100)
            : 0;
        const learningTimeMinutes = Math.round(
          (Date.now() - startTime.current) / 1000 / 60
        );
        navigator.sendBeacon(
          `${API}/student/courses/${courseId}/progress`,
          JSON.stringify({ progress, learningTime: learningTimeMinutes })
        );
      }
    };
  }, [courseId, totalLessons]);

  return { markLessonVisited };
}