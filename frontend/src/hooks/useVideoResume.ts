import { useRef, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'vpos_'; // video position
const SAVE_THROTTLE_MS = 5_000;     // write to localStorage at most every 5s

/**
 * useVideoResume
 *
 * Saves and restores a video's currentTime per lesson in localStorage.
 * - Call `savePosition(lessonId, time)` on every timeupdate (throttled internally).
 * - Call `restorePosition(lessonId, videoEl)` once metadata is loaded.
 * - Call `clearPosition(lessonId)` when a lesson is marked as completed.
 */
export function useVideoResume() {
  const lastSave = useRef<Record<string, number>>({});

  /** Persist currentTime for a lesson (throttled to avoid excessive writes) */
  const savePosition = useCallback((lessonId: string, time: number) => {
    const now = Date.now();
    if ((now - (lastSave.current[lessonId] ?? 0)) < SAVE_THROTTLE_MS) return;
    lastSave.current[lessonId] = now;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${lessonId}`, String(time));
  }, []);

  /** Seek the video to the saved position (called once after metadata loads) */
  const restorePosition = useCallback(
    (lessonId: string, videoEl: HTMLVideoElement | null) => {
      if (!videoEl) return;
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${lessonId}`);
      if (!saved) return;
      const seconds = parseFloat(saved);
      // Don't restore if nearly at the end (< 5s remaining) — let it replay
      if (!isNaN(seconds) && seconds > 1 && seconds < videoEl.duration - 5) {
        videoEl.currentTime = seconds;
      }
    },
    []
  );

  /** Remove saved position (call when lesson is completed) */
  const clearPosition = useCallback((lessonId: string) => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${lessonId}`);
  }, []);

  return { savePosition, restorePosition, clearPosition };
}
