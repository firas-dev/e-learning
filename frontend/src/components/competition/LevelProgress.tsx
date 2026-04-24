const THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];

interface Props {
  points: number;
  level: number;
  compact?: boolean;
}

export default function LevelProgress({ points, level, compact = false }: Props) {
  const prev = THRESHOLDS[level - 1] ?? 0;
  const next = THRESHOLDS[level]     ?? THRESHOLDS[THRESHOLDS.length - 1];
  const pct  = next > prev ? Math.min(100, Math.round(((points - prev) / (next - prev)) * 100)) : 100;

  const LEVEL_COLORS = [
    "from-gray-400 to-gray-500",
    "from-green-400 to-emerald-500",
    "from-blue-400 to-cyan-500",
    "from-violet-400 to-purple-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
    "from-indigo-400 to-blue-600",
    "from-teal-400 to-cyan-600",
    "from-yellow-400 to-amber-600",
    "from-red-400 to-rose-600",
  ];
  const grad = LEVEL_COLORS[Math.min(level - 1, LEVEL_COLORS.length - 1)];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
          {level}
        </div>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-16">
          <div className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-400 tabular-nums">{points}pts</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm`}>
            {level}
          </div>
          <span className="font-bold text-gray-900 text-sm">Level {level}</span>
        </div>
        <span className="text-xs text-gray-400 tabular-nums">
          {points.toLocaleString()} / {next.toLocaleString()} pts
        </span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">{pct}% to Level {level + 1}</p>
    </div>
  );
}