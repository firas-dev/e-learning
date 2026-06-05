// ─── EmotionOverlay.tsx ───────────────────────────────────────────────────────
// Renders adaptive content banners and smart break suggestions during a lesson.
// Drop this inside RecordedCourse.tsx wherever the AI Monitoring panel is.
//
// Usage:
//   <EmotionOverlay
//     currentEmotion={currentEmotion}
//     signal={signal}
//     adaptiveMessage={adaptiveMessage}
//     onDismissAdaptive={dismissAdaptive}
//     breakMessage={breakMessage}
//     onDismissBreak={dismissBreak}
//     xpMultiplierActive={xpMultiplierActive}
//     onContactTeacher={() => setCurrentPage('messages')}
//   />

import { X, Zap, Coffee, MessageCircle, ChevronRight } from 'lucide-react';
import EmotionIndicator from './EmotionIndicator';
import type { RawEmotion, LearningSignal } from '../utils/emotionMapping';

interface EmotionOverlayProps {
  currentEmotion: RawEmotion;
  signal: LearningSignal;
  adaptiveMessage: string | null;
  onDismissAdaptive: () => void;
  breakMessage: string | null;
  onDismissBreak: () => void;
  xpMultiplierActive: boolean;
  onContactTeacher?: () => void;
}

// Signal → banner colour classes
const signalBannerStyle: Record<LearningSignal, { bg: string; border: string; text: string; icon: string }> = {
  positive:   { bg: 'bg-green-50',  border: 'border-green-400', text: 'text-green-800',  icon: 'text-green-500' },
  neutral:    { bg: 'bg-blue-50',   border: 'border-blue-400',  text: 'text-blue-800',   icon: 'text-blue-500'  },
  struggling: { bg: 'bg-amber-50',  border: 'border-amber-400', text: 'text-amber-800',  icon: 'text-amber-500' },
  disengaged: { bg: 'bg-red-50',    border: 'border-red-400',   text: 'text-red-800',    icon: 'text-red-500'   },
};

export default function EmotionOverlay({
  currentEmotion,
  signal,
  adaptiveMessage,
  onDismissAdaptive,
  breakMessage,
  onDismissBreak,
  xpMultiplierActive,
  onContactTeacher,
}: EmotionOverlayProps) {
  const style = signalBannerStyle[signal];

  return (
    <div className="space-y-3">

      {/* ── AI Monitoring Status Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI Monitoring Active
          </h3>
          {xpMultiplierActive && (
            <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
              <Zap className="w-3 h-3" /> ×1.2 XP active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <EmotionIndicator emotion={currentEmotion} size="md" />
          <div>
            <p className="text-sm font-medium text-gray-900 capitalize">{currentEmotion}</p>
            <p className="text-xs text-gray-500">Current state</p>
          </div>
        </div>
      </div>

      {/* ── Adaptive Content Banner ───────────────────────────────────────── */}
      {adaptiveMessage && (
        <div className={`rounded-xl border-l-4 ${style.bg} ${style.border} p-4 flex gap-3`}>
          <div className="flex-1">
            <p className={`text-sm font-medium ${style.text}`}>{adaptiveMessage}</p>
            {(signal === 'struggling' || signal === 'disengaged') && onContactTeacher && (
              <button
                onClick={onContactTeacher}
                className={`mt-2 flex items-center gap-1 text-xs font-medium ${style.text} hover:underline`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Message your teacher
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={onDismissAdaptive}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Smart Break Suggestion ─────────────────────────────────────────── */}
      {breakMessage && (
        <div className="rounded-xl border-l-4 bg-purple-50 border-purple-400 p-4 flex gap-3">
          <Coffee className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-800">{breakMessage}</p>
          </div>
          <button
            onClick={onDismissBreak}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
            aria-label="Dismiss break suggestion"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}