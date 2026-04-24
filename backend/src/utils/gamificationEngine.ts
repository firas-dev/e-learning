// backend/src/utils/gamificationEngine.ts

export type Difficulty = "easy" | "medium" | "hard";

export const LEVEL_THRESHOLDS = [
  { level: 1,  minPoints: 0 },
  { level: 2,  minPoints: 100 },
  { level: 3,  minPoints: 300 },
  { level: 4,  minPoints: 600 },
  { level: 5,  minPoints: 1000 },
  { level: 6,  minPoints: 1500 },
  { level: 7,  minPoints: 2200 },
  { level: 8,  minPoints: 3000 },
  { level: 9,  minPoints: 4000 },
  { level: 10, minPoints: 5500 },
];

export const POINTS_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy:   50,
  medium: 100,
  hard:   200,
};

export const BADGE_DEFINITIONS = [
  { id: "first_blood",    name: "First Blood",    icon: "🩸", description: "First to submit in a challenge" },
  { id: "speed_runner",   name: "Speed Runner",   icon: "⚡", description: "Submit in top 10% fastest" },
  { id: "perfect_score",  name: "Perfect Score",  icon: "💯", description: "100% on a challenge" },
  { id: "problem_solver", name: "Problem Solver", icon: "🧩", description: "Complete 10 challenges" },
  { id: "streak_3",       name: "On Fire",        icon: "🔥", description: "3-day participation streak" },
  { id: "streak_7",       name: "Streak Master",  icon: "🌟", description: "7-day participation streak" },
  { id: "top_3",          name: "Podium",         icon: "🥇", description: "Finish in top 3 of a challenge" },
  { id: "helper",         name: "Helpful",        icon: "🤝", description: "Post 5 helpful replies" },
  { id: "consistent",     name: "Consistent",     icon: "📅", description: "Attempt 5 consecutive challenges" },
  { id: "veteran",        name: "Veteran",         icon: "🎖️", description: "Reach level 7" },
];

export function calculateLevel(points: number): number {
  let level = 1;
  for (const t of LEVEL_THRESHOLDS) {
    if (points >= t.minPoints) level = t.level;
  }
  return level;
}

export function getNextLevelThreshold(level: number): number {
  const next = LEVEL_THRESHOLDS[level]; // index = level (0-based levels are offset by 1)
  return next?.minPoints ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].minPoints;
}

export function calculateBonusPoints(
  totalBonusPool: number,
  startsAt: Date,
  endsAt: Date,
  submittedAt: Date
): number {
  if (totalBonusPool <= 0) return 0;
  const totalWindow = endsAt.getTime() - startsAt.getTime();
  const elapsed = submittedAt.getTime() - startsAt.getTime();
  const ratio = Math.max(0, 1 - elapsed / totalWindow);
  return Math.round(totalBonusPool * Math.pow(ratio, 1.5));
}

export function calculateStreakMultiplier(streak: number): number {
  if (streak >= 14) return 0.5;
  if (streak >= 7)  return 0.3;
  if (streak >= 3)  return 0.15;
  return 0;
}

export interface BadgeCheckStats {
  challengesCompleted: number;
  streak: number;
  hasPerfectScore: boolean;
  isFirstBlood: boolean;
  isTop3: boolean;
  isSpeedRunner: boolean;
  helpfulPosts: number;
  level: number;
  challengesAttempted: number;
}

export function getNewBadges(currentBadgeIds: string[], stats: BadgeCheckStats): typeof BADGE_DEFINITIONS {
  const earned = new Set(currentBadgeIds);
  const newBadges: typeof BADGE_DEFINITIONS = [];

  const tryAdd = (id: string, condition: boolean) => {
    if (condition && !earned.has(id)) {
      const def = BADGE_DEFINITIONS.find((b) => b.id === id);
      if (def) newBadges.push(def);
    }
  };

  tryAdd("first_blood",    stats.isFirstBlood);
  tryAdd("speed_runner",   stats.isSpeedRunner);
  tryAdd("perfect_score",  stats.hasPerfectScore);
  tryAdd("problem_solver", stats.challengesCompleted >= 10);
  tryAdd("streak_3",       stats.streak >= 3);
  tryAdd("streak_7",       stats.streak >= 7);
  tryAdd("top_3",          stats.isTop3);
  tryAdd("helper",         stats.helpfulPosts >= 5);
  tryAdd("consistent",     stats.challengesAttempted >= 5);
  tryAdd("veteran",        stats.level >= 7);

  return newBadges;
}

export function updateStreak(lastActiveDate: Date | undefined): {
  current: number; action: "same_day" | "extended" | "reset";
} {
  if (!lastActiveDate) return { current: 1, action: "extended" };

  const today = new Date().toDateString();
  const last  = new Date(lastActiveDate).toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();

  if (last === today)      return { current: 0, action: "same_day" };
  if (last === yesterday)  return { current: 1, action: "extended" };
  return { current: 1, action: "reset" };
}