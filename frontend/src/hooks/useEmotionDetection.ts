// ─── useEmotionDetection.ts ───────────────────────────────────────────────────
// Central React hook for emotion detection.
// Calls your AI model, applies the mapping layer, and drives:
//   • adaptive content banners
//   • smart break suggestions
//   • XP multiplier flag
//   • emotion log (flushed to backend every 30s)
//
// Usage in RecordedCourse.tsx:
//   const { currentEmotion, signal, adaptiveMessage, breakMessage, xpMultiplierActive }
//     = useEmotionDetection({ courseId, lessonId, cameraEnabled, videoRef });

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  type RawEmotion,
  type LearningSignal,
  getSignal,
  getAdaptiveMessage,
  getBreakMessage,
  isPositive,
} from '../utils/emotionMapping';

const API = 'http://localhost:5000/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmotionLogEntry {
  lessonId: string;
  timestamp_ms: number;
  emotion: RawEmotion;
  signal: LearningSignal;
}

interface UseEmotionDetectionOptions {
  courseId: string;
  lessonId: string | null;
  cameraEnabled: boolean;
  /** Pass your AI model's predict function here */
  predictEmotion: (videoEl: HTMLVideoElement) => Promise<RawEmotion> | RawEmotion;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Detection interval in ms (default 3000) */
  intervalMs?: number;
}

interface UseEmotionDetectionReturn {
  currentEmotion: RawEmotion;
  signal: LearningSignal;
  /** Student-safe adaptive message, or null if none needed */
  adaptiveMessage: string | null;
  /** Dismiss the adaptive banner */
  dismissAdaptive: () => void;
  /** Break suggestion message, or null */
  breakMessage: string | null;
  /** Dismiss the break suggestion */
  dismissBreak: () => void;
  /** True when happy is sustained — apply XP multiplier */
  xpMultiplierActive: boolean;
  /** Full emotion log for this session */
  sessionLog: EmotionLogEntry[];
}

// ── Thresholds ────────────────────────────────────────────────────────────────

const ADAPTIVE_THRESHOLD = 3;     // consecutive detections before showing banner
const BREAK_THRESHOLD_ANGRY = 4;  // consecutive angry before break suggestion
const BREAK_THRESHOLD_SAD = 5;    // consecutive sad (≈15s at 3s interval)
const BREAK_THRESHOLD_FEAR = 3;
const BREAK_THRESHOLD_DISGUST = 3;
const XP_HAPPY_STREAK = 10;       // consecutive happy detections for XP multiplier (≈30s)
const NEUTRAL_QUIZ_THRESHOLD = 20; // consecutive neutral before re-engagement prompt
const FLUSH_INTERVAL_MS = 30_000; // flush log to backend every 30s

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEmotionDetection({
  courseId,
  lessonId,
  cameraEnabled,
  predictEmotion,
  videoRef,
  intervalMs = 3000,
}: UseEmotionDetectionOptions): UseEmotionDetectionReturn {
  const [currentEmotion, setCurrentEmotion] = useState<RawEmotion>('neutral');
  const [signal, setSignal] = useState<LearningSignal>('neutral');
  const [adaptiveMessage, setAdaptiveMessage] = useState<string | null>(null);
  const [breakMessage, setBreakMessage] = useState<string | null>(null);
  const [xpMultiplierActive, setXpMultiplierActive] = useState(false);
  const [sessionLog, setSessionLog] = useState<EmotionLogEntry[]>([]);

  // Consecutive counters
  const consecutiveRef = useRef<Record<RawEmotion, number>>({
    happy: 0, sad: 0, disgust: 0, fear: 0, angry: 0, neutral: 0,
  });
  const logBuffer = useRef<EmotionLogEntry[]>([]);
  const adaptiveDismissed = useRef(false);
  const breakDismissed = useRef(false);
  const detectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Flush log buffer to backend ───────────────────────────────────────────
  const flushLog = useCallback(async () => {
    if (!lessonId || logBuffer.current.length === 0) return;
    const toFlush = [...logBuffer.current];
    logBuffer.current = [];
    try {
      await axios.post(`${API}/student/courses/${courseId}/emotion-log`, {
        lessonId,
        entries: toFlush,
      });
    } catch (_) {
      // Non-blocking — re-queue on failure
      logBuffer.current = [...toFlush, ...logBuffer.current];
    }
  }, [courseId, lessonId]);

  // ── Process one detection result ──────────────────────────────────────────
  const processDetection = useCallback(
    (emotion: RawEmotion) => {
      const detectedSignal = getSignal(emotion);

      // Update counters
      const counts = consecutiveRef.current;
      (Object.keys(counts) as RawEmotion[]).forEach((e) => {
        counts[e] = e === emotion ? counts[e] + 1 : 0;
      });

      setCurrentEmotion(emotion);
      setSignal(detectedSignal);

      // Log entry
      if (lessonId) {
        const entry: EmotionLogEntry = {
          lessonId,
          timestamp_ms: Date.now(),
          emotion,
          signal: detectedSignal,
        };
        logBuffer.current.push(entry);
        setSessionLog((prev) => [...prev, entry]);
      }

      // ── Adaptive content banner ──────────────────────────────────────────
      if (!adaptiveDismissed.current) {
        const threshold =
          emotion === 'fear' ? 2 : ADAPTIVE_THRESHOLD;
        if (
          (detectedSignal === 'struggling' || detectedSignal === 'disengaged') &&
          counts[emotion] >= threshold
        ) {
          setAdaptiveMessage(getAdaptiveMessage(emotion));
        }
      }

      // ── Neutral re-engagement ────────────────────────────────────────────
      // (fires separately from adaptive — no banner conflict)
      if (emotion === 'neutral' && counts.neutral >= NEUTRAL_QUIZ_THRESHOLD) {
        // Signal to parent to inject a quiz / interactive element
        // We expose this via the adaptiveMessage with a special key
        setAdaptiveMessage('You seem to be in autopilot — want a quick quiz to test your knowledge?');
        counts.neutral = 0;
      }

      // ── Smart break suggestion ───────────────────────────────────────────
      if (!breakDismissed.current) {
        const breakMsg = getBreakMessage(emotion);
        const thresholds: Partial<Record<RawEmotion, number>> = {
          angry:   BREAK_THRESHOLD_ANGRY,
          sad:     BREAK_THRESHOLD_SAD,
          fear:    BREAK_THRESHOLD_FEAR,
          disgust: BREAK_THRESHOLD_DISGUST,
        };
        const threshold = thresholds[emotion];
        if (breakMsg && threshold && counts[emotion] >= threshold) {
          setBreakMessage(breakMsg);
          counts[emotion] = 0; // reset so it doesn't re-fire immediately
        }
      }

      // ── XP multiplier (happy streak) ─────────────────────────────────────
      setXpMultiplierActive(isPositive(emotion) && counts.happy >= XP_HAPPY_STREAK);
    },
    [lessonId]
  );

  // ── Detection loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraEnabled || !lessonId) return;

    detectionInterval.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video) return;
      try {
        const emotion = await predictEmotion(video);
        processDetection(emotion);
      } catch (_) {
        // Model errors are silent — don't break the learning experience
      }
    }, intervalMs);

    flushInterval.current = setInterval(flushLog, FLUSH_INTERVAL_MS);

    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
      if (flushInterval.current) clearInterval(flushInterval.current);
      flushLog(); // final flush on unmount
    };
  }, [cameraEnabled, lessonId, intervalMs, predictEmotion, processDetection, flushLog, videoRef]);

  // ── Reset dismissed flags when lesson changes ─────────────────────────────
  useEffect(() => {
    adaptiveDismissed.current = false;
    breakDismissed.current = false;
    consecutiveRef.current = { happy: 0, sad: 0, disgust: 0, fear: 0, angry: 0, neutral: 0 };
    setAdaptiveMessage(null);
    setBreakMessage(null);
    setXpMultiplierActive(false);
  }, [lessonId]);

  return {
    currentEmotion,
    signal,
    adaptiveMessage,
    dismissAdaptive: () => {
      setAdaptiveMessage(null);
      adaptiveDismissed.current = true;
    },
    breakMessage,
    dismissBreak: () => {
      setBreakMessage(null);
      breakDismissed.current = true;
    },
    xpMultiplierActive,
    sessionLog,
  };
}