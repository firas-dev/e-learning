import { useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";
const FLUSH_INTERVAL_MS = 60_000; // sync to DB every 60 seconds

/**
 * useLearningTimer
 *
 * Tracks the time a student actively spends on the lesson window.
 * - Timer starts when the hook mounts (lesson window opened).
 * - Timer pauses when the tab is hidden or the window loses focus.
 * - Timer resumes when the tab becomes visible / window regains focus.
 * - Every FLUSH_INTERVAL_MS the accumulated minutes are sent to the server.
 * - On unmount, any remaining time is flushed via sendBeacon (fires even on close).
 */
export function useLearningTimer(courseId: string | undefined) {
  // Tracks when the current active segment started (null = paused)
  const segmentStart = useRef<number | null>(null);
  // Accumulated milliseconds NOT yet sent to server this session
  const pendingMs = useRef<number>(0);
  // Guard: only send if we have a valid courseId
  const courseIdRef = useRef(courseId);
  courseIdRef.current = courseId;

  // ── Flush accumulated time to server ──────────────────────────────────────
  const flush = useCallback(async (force = false) => {
    if (segmentStart.current !== null) {
      pendingMs.current += Date.now() - segmentStart.current;
      segmentStart.current = Date.now(); // restart segment after recording delta
    }

    const deltaMinutes = Math.floor(pendingMs.current / 60_000);
    if (deltaMinutes < 1 && !force) return; // nothing worth sending yet

    const minutesToSend = deltaMinutes;
    pendingMs.current -= minutesToSend * 60_000; // keep remainder

    if (!courseIdRef.current || minutesToSend < 1) return;

    try {
      await axios.patch(
        `${API}/student/courses/${courseIdRef.current}/learning-time`,
        { deltaMinutes: minutesToSend }
      );
    } catch (err) {
      // Non-critical — silently fail, time will be re-counted next flush
      console.warn("[LearningTimer] flush failed:", err);
      // Put the time back so it's not lost
      pendingMs.current += minutesToSend * 60_000;
    }
  }, []);

  // ── Pause / Resume helpers ─────────────────────────────────────────────────
  const pause = useCallback(() => {
    if (segmentStart.current === null) return; // already paused
    pendingMs.current += Date.now() - segmentStart.current;
    segmentStart.current = null;
  }, []);

  const resume = useCallback(() => {
    if (segmentStart.current !== null) return; // already running
    segmentStart.current = Date.now();
  }, []);

  // ── Mount / Unmount lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    if (!courseId) return;

    // Start timer when lesson opens
    segmentStart.current = Date.now();
    pendingMs.current = 0;

    // ── Visibility API (tab switching) ────────────────────────────────────
    const onVisibilityChange = () => {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    };

    // ── Window blur/focus (alt-tab, minimise) ─────────────────────────────
    const onBlur = () => pause();
    const onFocus = () => resume();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    // ── Periodic flush ────────────────────────────────────────────────────
    const flushInterval = setInterval(() => flush(), FLUSH_INTERVAL_MS);

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      clearInterval(flushInterval);

      // Capture final segment
      if (segmentStart.current !== null) {
        pendingMs.current += Date.now() - segmentStart.current;
        segmentStart.current = null;
      }

      const deltaMinutes = Math.floor(pendingMs.current / 60_000);
      if (deltaMinutes >= 1 && courseIdRef.current) {
        // sendBeacon fires even when the tab is being closed
        navigator.sendBeacon(
          `${API}/student/courses/${courseIdRef.current}/learning-time`,
          JSON.stringify({ deltaMinutes })
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return { pause, resume, flush };
}
