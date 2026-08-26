import { LEVELS, MAX_LEVEL, type LevelDefinition } from '@/constants/levels';

export type LevelProgress = {
  level: number;
  title: string;
  /** Lifetime earned credits at which the current level started. */
  currentThreshold: number;
  /** Lifetime earned credits needed for the next level; null at max level. */
  nextThreshold: number | null;
  /** 0..1 progress through the current level; 1 at max level. */
  progress: number;
  /** Credits still needed to level up; null at max level. */
  remaining: number | null;
};

/**
 * Levels are computed from lifetime *earned* credits so that spending never demotes
 * a member. Mirrors server/src/services/levels.ts exactly.
 */
export function resolveLevel(lifetimeEarned: number): LevelProgress {
  const earned = Math.max(0, Math.floor(lifetimeEarned));

  let current: LevelDefinition = LEVELS[0];
  for (const definition of LEVELS) {
    if (earned >= definition.threshold) current = definition;
    else break;
  }

  const next = LEVELS.find((definition) => definition.level === current.level + 1) ?? null;
  if (!next || current.level >= MAX_LEVEL) {
    return {
      level: current.level,
      title: current.title,
      currentThreshold: current.threshold,
      nextThreshold: null,
      progress: 1,
      remaining: null,
    };
  }

  const span = next.threshold - current.threshold;
  const gained = earned - current.threshold;
  return {
    level: current.level,
    title: current.title,
    currentThreshold: current.threshold,
    nextThreshold: next.threshold,
    progress: span <= 0 ? 1 : Math.min(1, Math.max(0, gained / span)),
    remaining: Math.max(0, next.threshold - earned),
  };
}

/** `LEVEL 08` — levels are always zero-padded in the UI. */
export function formatLevel(level: number): string {
  return `LEVEL ${level.toString().padStart(2, '0')}`;
}
