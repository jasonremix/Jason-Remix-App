/**
 * Level thresholds — the authoritative copy.
 *
 * Levels are derived from lifetime *earned* credits so that spending never demotes a
 * member. The client mirrors this table for display only; every level shown in the app
 * ultimately comes from a server response.
 */

export type LevelDefinition = { level: number; threshold: number; title: string };

export const LEVELS: readonly LevelDefinition[] = [
  { level: 1, threshold: 0, title: 'LISTENER' },
  { level: 2, threshold: 500, title: 'FOLLOWER' },
  { level: 3, threshold: 1_500, title: 'SUPPORTER' },
  { level: 4, threshold: 3_000, title: 'INSIDER' },
  { level: 5, threshold: 5_000, title: 'COLLECTOR' },
  { level: 6, threshold: 10_000, title: 'CURATOR' },
  { level: 7, threshold: 20_000, title: 'VIP' },
  { level: 8, threshold: 50_000, title: 'LEGEND' },
];

export type LevelProgress = {
  level: number;
  levelTitle: string;
  nextLevelAt: number | null;
  progressToNextLevel: number;
};

export function resolveLevel(lifetimeEarned: number): LevelProgress {
  const earned = Math.max(0, Math.floor(lifetimeEarned));

  let current = LEVELS[0];
  for (const definition of LEVELS) {
    if (earned >= definition.threshold) current = definition;
    else break;
  }

  const next = LEVELS.find((definition) => definition.level === current.level + 1);
  if (!next) {
    return {
      level: current.level,
      levelTitle: current.title,
      nextLevelAt: null,
      progressToNextLevel: 1,
    };
  }

  const span = next.threshold - current.threshold;
  const gained = earned - current.threshold;
  return {
    level: current.level,
    levelTitle: current.title,
    nextLevelAt: next.threshold,
    progressToNextLevel: span <= 0 ? 1 : Math.min(1, Math.max(0, gained / span)),
  };
}
