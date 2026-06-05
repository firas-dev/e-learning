// ─── emotionMapping.ts ────────────────────────────────────────────────────────
// Central mapping layer between your AI model's raw emotions and the platform's
// learning signals. All features use this — never scatter raw emotion checks.

export type RawEmotion = 'happy' | 'sad' | 'disgust' | 'fear' | 'angry' | 'neutral';

export type LearningSignal = 'positive' | 'neutral' | 'struggling' | 'disengaged';

// ── Raw → Signal ─────────────────────────────────────────────────────────────
export const emotionToSignal: Record<RawEmotion, LearningSignal> = {
  happy:   'positive',    // enjoying the content
  neutral: 'neutral',     // passively following
  sad:     'struggling',  // lost or overwhelmed
  fear:    'struggling',  // intimidated by difficulty
  angry:   'disengaged',  // frustrated with pacing
  disgust: 'disengaged',  // content not resonating
};

// ── Student-facing labels (never show raw "disgust" to a student) ─────────────
export const signalDisplayLabel: Record<LearningSignal, string> = {
  positive:   'Going well',
  neutral:    'Following along',
  struggling: 'Challenging session',
  disengaged: 'Low engagement',
};

// ── Adaptive content messages shown to the student ───────────────────────────
export const signalAdaptiveMessage: Record<LearningSignal, string | null> = {
  positive:   null, // no banner needed — XP multiplier fires silently
  neutral:    null,
  struggling: "Looks tricky — want a recap or a hint from your teacher?",
  disengaged: "Seems like this isn't landing. Want to skip ahead or take a break?",
};

// ── Fear-specific override (more reassuring than generic "struggling") ────────
export const fearAdaptiveMessage =
  "Don't worry — this is hard for everyone. Here's a hint to get started.";

// ── Smart break messages per raw emotion ─────────────────────────────────────
export const breakMessages: Partial<Record<RawEmotion, string>> = {
  angry:   'Take a breath 🧘 — frustration detected. Pause for 3 minutes?',
  sad:     'You seem discouraged. Want to revisit an easier section first?',
  fear:    "Don't worry — this is hard for everyone. Want a hint to get unstuck?",
  disgust: "Let's try a different approach. Want to switch to a text or video version?",
};

// ── Heatmap colour per raw emotion (for teacher analytics) ───────────────────
export const emotionHeatColor: Record<RawEmotion, string> = {
  happy:   '#3B9122', // green
  neutral: '#888780', // gray
  sad:     '#3B8BD4', // blue
  fear:    '#7F77DD', // purple
  angry:   '#E8762E', // orange
  disgust: '#E24B4A', // red
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the learning signal for a raw emotion */
export function getSignal(emotion: RawEmotion): LearningSignal {
  return emotionToSignal[emotion];
}

/** True if the signal should trigger an adaptive content banner */
export function needsAdaptiveAction(emotion: RawEmotion): boolean {
  return getSignal(emotion) === 'struggling' || getSignal(emotion) === 'disengaged';
}

/** Returns the student-safe message for an emotion (never clinical) */
export function getAdaptiveMessage(emotion: RawEmotion): string | null {
  if (emotion === 'fear') return fearAdaptiveMessage;
  return signalAdaptiveMessage[getSignal(emotion)];
}

/** Returns the break suggestion message if one exists for this emotion */
export function getBreakMessage(emotion: RawEmotion): string | null {
  return breakMessages[emotion] ?? null;
}

/** True when happy sustained — XP multiplier should activate */
export function isPositive(emotion: RawEmotion): boolean {
  return emotion === 'happy';
}

/** Compute ratio of an emotion in a log array */
export function emotionRatio(log: RawEmotion[], emotion: RawEmotion): number {
  if (log.length === 0) return 0;
  return log.filter(e => e === emotion).length / log.length;
}

/** Returns dominant emotion from a snapshot object */
export function dominantEmotion(
  snapshot: Record<RawEmotion, number>
): RawEmotion {
  return (Object.entries(snapshot) as [RawEmotion, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
}