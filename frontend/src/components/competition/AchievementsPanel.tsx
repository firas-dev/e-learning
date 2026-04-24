import { IRoomStudentStats } from "../../hooks/useCompetition";
import LevelProgress from "./LevelProgress";
import { Trophy, Flame, Target, Clock } from "lucide-react";

const ALL_BADGES = [
  { id: "first_blood",    name: "First Blood",    icon: "🩸", description: "First to submit in a challenge" },
  { id: "speed_runner",   name: "Speed Runner",   icon: "⚡", description: "Submitted in the top 10% fastest" },
  { id: "perfect_score",  name: "Perfect Score",  icon: "💯", description: "Achieved 100% on a challenge" },
  { id: "problem_solver", name: "Problem Solver", icon: "🧩", description: "Completed 10 challenges" },
  { id: "streak_3",       name: "On Fire",        icon: "🔥", description: "3-day participation streak" },
  { id: "streak_7",       name: "Streak Master",  icon: "🌟", description: "7-day participation streak" },
  { id: "top_3",          name: "Podium",         icon: "🥇", description: "Finished in top 3" },
  { id: "helper",         name: "Helpful",        icon: "🤝", description: "Posted 5 helpful replies" },
  { id: "consistent",     name: "Consistent",     icon: "📅", description: "Attempted 5 consecutive challenges" },
  { id: "veteran",        name: "Veteran",        icon: "🎖️", description: "Reached level 7" },
];

interface Props {
  stats: IRoomStudentStats | null;
}

export default function AchievementsPanel({ stats }: Props) {
  if (!stats) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        No stats yet — join a challenge to start earning!
      </div>
    );
  }

  const earnedIds = new Set(stats.badges.map((b) => b.id));

  return (
    <div className="space-y-6">
      {/* Personal stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Trophy,  label: "Total Points",    value: stats.totalPoints.toLocaleString(), color: "text-amber-500" },
          { icon: Target,  label: "Challenges Done", value: stats.challengesCompleted,          color: "text-violet-500" },
          { icon: Flame,   label: "Best Streak",     value: `${stats.streak.longest} days`,    color: "text-orange-500" },
          { icon: Clock,   label: "Current Streak",  value: `${stats.streak.current} days`,    color: "text-blue-500" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Level progress */}
      <LevelProgress points={stats.totalPoints} level={stats.level} />

      {/* Badge grid */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          Badges — {earnedIds.size} / {ALL_BADGES.length}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {ALL_BADGES.map((badge) => {
            const earned = earnedIds.has(badge.id);
            const earnedBadge = stats.badges.find((b) => b.id === badge.id);
            return (
              <div
                key={badge.id}
                title={badge.description}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  earned
                    ? "border-violet-200 bg-violet-50 shadow-sm"
                    : "border-gray-200 bg-gray-50 opacity-40 grayscale"
                }`}
              >
                <span className="text-3xl">{badge.icon}</span>
                <p className="text-xs font-semibold text-gray-900 text-center leading-tight">{badge.name}</p>
                {earned && earnedBadge && (
                  <p className="text-xs text-violet-500">
                    {new Date(earnedBadge.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                )}
                {!earned && (
                  <p className="text-xs text-gray-400 text-center leading-tight">{badge.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}