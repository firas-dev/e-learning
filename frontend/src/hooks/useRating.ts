import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

// ── Per-lesson rating hook ────────────────────────────────────────────────
export function useLessonRating(courseId: string, lessonId: string) {
    const [average, setAverage] = useState(0);
    const [count, setCount] = useState(0);
    const [myStars, setMyStars] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      if (!lessonId || !courseId) return;
      
      // Reset state when lesson changes
      setAverage(0);
      setCount(0);
      setMyStars(null);
      setLoading(true);
  
      axios
        .get(`${API}/courses/${courseId}/ratings/lesson/${lessonId}`)
        .then((res) => {
          setAverage(res.data.average);
          setCount(res.data.count);
          setMyStars(res.data.myStars);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [courseId, lessonId]);  // lessonId in deps ensures refetch on lesson change
  
    const submitRating = async (stars: number) => {
        const res = await axios.post(
          `${API}/courses/${courseId}/ratings/lesson/${lessonId}`,
          { stars }
        );
        setAverage(res.data.lessonAverage);
        setCount(res.data.lessonCount);
        setMyStars(res.data.myStars);   // null if toggled off
        return { courseAverage: res.data.courseAverage, courseCount: res.data.courseCount };
      };
  
    return { average, count, myStars, loading, submitRating };
}
// ── Course-wide average rating hook ──────────────────────────────────────
export function useCourseRating(courseId: string) {
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    axios
      .get(`${API}/courses/${courseId}/ratings/course`)
      .then((res) => {
        setAverage(res.data.average);
        setCount(res.data.count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => { refresh(); }, [refresh]);

  const update = (avg: number, cnt: number) => {
    setAverage(avg);
    setCount(cnt);
  };

  return { average, count, loading, refresh, update };
}