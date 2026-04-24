import { Clock, Star, Users, Zap } from "lucide-react";
import CountdownTimer from "./CountdownTimer";

const DIFFICULTY = {
  easy:   { label: "Easy",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  medium: { label: "Medium", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  hard:   { label: "Hard",   cls: "bg-red-100 text-red-700 border-red-200" },
};

const TYPE_EMOJI: Record<string, string> = {
  quiz: "📝", coding: "💻", assignment: "📋", mini_project: "🚀", timed: "⏱️",
};

interface Props {
  challenge: {
    _id: string;
    title: string;
    description: string;
    type: string;
    difficulty: "easy" | "medium" | "hard";
    totalPoints: number;
    bonusPoints: number;
    startsAt: string;
    endsAt: string;
    timeLimitMinutes?: number;
    status: string;
    participantCount: number;
  };
  hasSubmitted?: boolean;
  onClick: () => void;
}

export default function ChallengeCard({ challenge, hasSubmitted, onClick }: Props) {
  const diff   = DIFFICULTY[challenge.difficulty];
  const isLive = challenge.status === "active";
  const isDone = challenge.status === "completed";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border-2 transition-all hover:shadow-lg focus:outline-none ${
        isLive
          ? "border-red-400 shadow-red-100 shadow-sm"
          : isDone
          ? "border-gray-200 opacity-80"
          : "border-gray-200 hover:border-violet-300"
      }`}
    >
      {isLive && <div className="h-1 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 rounded-t-2xl" />}

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">{TYPE_EMOJI[challenge.type] ?? "🎯"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-base leading-tight">{challenge.title}</h3>
              {isLive && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex-shrink-0">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
              {hasSubmitted && (
                <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                  ✓ Submitted
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{challenge.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${diff.cls}`}>
            {diff.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full font-semibold">
            <Star className="w-3 h-3" />
            {challenge.totalPoints} pts
          </span>
          {challenge.bonusPoints > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
              <Zap className="w-3 h-3" />
              +{challenge.bonusPoints} bonus
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
            <Users className="w-3.5 h-3.5" />
            {challenge.participantCount}
          </span>
          {challenge.timeLimitMinutes && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              {challenge.timeLimitMinutes}m
            </span>
          )}
        </div>

        {isLive && <CountdownTimer endsAt={challenge.endsAt} compact />}
        {challenge.status === "upcoming" && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 font-medium">
            ⏰ Starts {new Date(challenge.startsAt).toLocaleString()}
          </div>
        )}
        {isDone && (
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            ✅ Ended {new Date(challenge.endsAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </button>
  );
}