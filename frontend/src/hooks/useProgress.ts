import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";
const COMPLETION_THRESHOLD = 0.9; // 90% of unique seconds must be watched

/**
 * useProgress — robust lesson/video progress tracking hook
 *
 * Features:
 * - Cross-session sync: fetches completed lessons from DB on mount
 * - Anti-skip video tracking: uses a Set of unique seconds (not currentTime)
 *   so scrubbing forward does NOT count as watched
 * - 90% watch threshold required for video lessons to auto-complete
 * - Manual "Mark as complete" available for all lessons
 * - Additive learningTime: tracks delta per session and increments server total
 * - Idempotent: replaying a completed lesson has no side effects
 */
export function useProgress(courseId: string, totalLessons: number) {
  // Set of lessonId strings that are fully completed (persisted in DB)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Per-video tracking: unique integer seconds seen while NOT seeking
  // Stored as a ref (not state) to avoid re-renders on every timeupdate
  const watchedBuckets = useRef<Map<string, Set<number>>>(new Map());

  // Session start time for additive learningTime delta calculation
  const sessionStart = useRef<number>(Date.now());

  // ── Cross-session hydration ──────────────────────────────────────────────
  useEffect(() => {
    if (!courseId) return;

    const fetchProgress = async () => {
      try {
        const res = await axios.get(`${API}/student/courses/${courseId}/progress`);
        const ids: string[] = res.data.completedLessons || [];
        setCompletedIds(new Set(ids));
        setProgress(res.data.progress || 0);
      } catch (err) {
        // Silently fail — user may not yet be enrolled (catalog view)
        console.warn("Could not fetch course progress:", err);
      } finally {
        setHydrated(true);
      }
    };

    fetchProgress();
    sessionStart.current = Date.now();
  }, [courseId]);

  // ── Server call to mark a lesson complete ───────────────────────────────
  const completeLesson = useCallback(
    async (lessonId: string) => {
      // Already completed — no-op (idempotent guard on frontend too)
      if (completedIds.has(lessonId)) return;

      const deltaMinutes = Math.round(
        (Date.now() - sessionStart.current) / 1000 / 60
      );
      // Reset session timer after each lesson completion
      sessionStart.current = Date.now();

      try {
        const res = await axios.patch(
          `${API}/student/courses/${courseId}/lessons/${lessonId}/complete`,
          { deltaMinutes }
        );
        const ids: string[] = res.data.completedLessons || [];
        setCompletedIds(new Set(ids));
        setProgress(res.data.progress || 0);
      } catch (err) {
        console.error("Failed to mark lesson complete:", err);
      }
    },
    [courseId, completedIds]
  );

  // ── Manual override (all lessons) ───────────────────────────────────────
  const forceCompleteLesson = useCallback(
    (lessonId: string) => {
      completeLesson(lessonId);
    },
    [completeLesson]
  );

  // ── Video timeupdate handler ─────────────────────────────────────────────
  // Returns an event handler to attach to <video onTimeUpdate={...}>
  // Anti-skip: only adds to the Set when video.seeking === false,
  // so fast-forwarding through unseen portions does not count.
  const getVideoTimeUpdateHandler = useCallback(
    (lessonId: string) =>
      (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;

        // Skip if already completed — nothing more to do
        if (completedIds.has(lessonId)) return;

        // Initialize bucket set for this lesson
        if (!watchedBuckets.current.has(lessonId)) {
          watchedBuckets.current.set(lessonId, new Set<number>());
        }
        const buckets = watchedBuckets.current.get(lessonId)!;

        // Only record seconds that are genuinely played (not scrubbed)
        if (!video.seeking && video.currentTime > 0) {
          buckets.add(Math.floor(video.currentTime));
        }

        // Check if threshold is met
        if (video.duration > 0) {
          const ratio = buckets.size / video.duration;
          if (ratio >= COMPLETION_THRESHOLD) {
            completeLesson(lessonId);
          }
        }
      },
    [completedIds, completeLesson]
  );

  // ── Cleanup: send remaining time on unmount ──────────────────────────────
  // Uses sendBeacon so it fires even if the tab is closed
  useEffect(() => {
    return () => {
      const deltaMinutes = Math.round(
        (Date.now() - sessionStart.current) / 1000 / 60
      );
      if (deltaMinutes > 0 && completedIds.size > 0) {
        // We can't call completeLesson here (async in cleanup), so we
        // just send a learningTime update via the deprecated progress endpoint
        navigator.sendBeacon(
          `${API}/student/courses/${courseId}/progress`,
          JSON.stringify({ progress, learningTime: deltaMinutes })
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, progress]);

  // ── Derived state ────────────────────────────────────────────────────────
  const progressPercent =
    totalLessons > 0
      ? Math.round((completedIds.size / totalLessons) * 100)
      : 0;

  return {
    /** Set of lessonId strings that are fully completed */
    completedIds,
    /** Progress percentage derived from local state (0–100) */
    progressPercent,
    /** Server-confirmed progress (matches DB) */
    serverProgress: progress,
    /** True once DB hydration has finished */
    hydrated,
    /** Returns an onTimeUpdate handler wired to anti-skip video tracking */
    getVideoTimeUpdateHandler,
    /** Manually mark any lesson complete (for PDF/link-only lessons) */
    forceCompleteLesson,
  };
}