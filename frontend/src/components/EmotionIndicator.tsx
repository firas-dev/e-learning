// ─── EmotionIndicator.tsx ─────────────────────────────────────────────────────
// Drop-in replacement for the old EmotionIndicator.
// Supports the 6 real emotions from your AI model.

import { Smile, Frown, AlertTriangle, Angry, Meh, ThumbsDown } from 'lucide-react';
import type { RawEmotion } from '../utils/emotionMapping';
import { signalDisplayLabel, emotionToSignal } from '../utils/emotionMapping';

interface EmotionIndicatorProps {
  emotion: RawEmotion;
  size?: 'sm' | 'md' | 'lg';
  /** Show the student-safe signal label instead of raw emotion name */
  showLabel?: boolean;
  /** Use the raw emotion label (for teacher views only) */
  rawLabel?: boolean;
}

const emotionConfig: Record<
  RawEmotion,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  happy:   { icon: Smile,         color: 'text-yellow-500', bgColor: 'bg-yellow-100', label: 'Happy'   },
  neutral: { icon: Meh,           color: 'text-gray-500',   bgColor: 'bg-gray-100',   label: 'Neutral' },
  sad:     { icon: Frown,         color: 'text-blue-500',   bgColor: 'bg-blue-100',   label: 'Sad'     },
  fear:    { icon: AlertTriangle, color: 'text-purple-500', bgColor: 'bg-purple-100', label: 'Fear'    },
  angry:   { icon: Angry,         color: 'text-orange-500', bgColor: 'bg-orange-100', label: 'Angry'   },
  disgust: { icon: ThumbsDown,    color: 'text-red-500',    bgColor: 'bg-red-100',    label: 'Disgust' },
};

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const bgSizeClasses = {
  sm: 'w-6 h-6 p-0.5',
  md: 'w-10 h-10 p-1.5',
  lg: 'w-14 h-14 p-2',
};

export default function EmotionIndicator({
  emotion,
  size = 'md',
  showLabel = false,
  rawLabel = false,
}: EmotionIndicatorProps) {
  // Guard: if an old/unknown emotion string is passed (e.g. 'engaged', 'confused'
  // from code that hasn't been migrated yet), fall back to neutral silently.
  const config = emotionConfig[emotion] ?? emotionConfig['neutral'];
  const IconComponent = config.icon;

  // Student-safe label uses the signal description; teacher view can request raw
  const label = rawLabel
    ? config.label
    : signalDisplayLabel[emotionToSignal[emotion] ?? 'neutral'];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${config.bgColor} rounded-full flex items-center justify-center ${bgSizeClasses[size]}`}
      >
        <IconComponent className={`${config.color} ${sizeClasses[size]}`} />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
    </div>
  );
}