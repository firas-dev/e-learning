const LEVEL_THRESHOLDS = [0,100,300,600,1000,1500,2200,3000,4000,5500];

export default function LevelProgress({ points, level }) {
  const next = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const prev = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const pct = next > prev ? Math.min(100, Math.round(((points - prev) / (next - prev)) * 100)) : 100;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-violet-700">Level {level}</span>
        <span className="text-xs text-gray-400">{points} / {next} pts to Level {level + 1}</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{pct}% to next level</p>
    </div>
  );
}