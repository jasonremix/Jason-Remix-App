/**
 * Level thresholds. Levels are derived from *lifetime earned* credits, not from the
 * spendable balance — otherwise redeeming a reward would demote a member.
 *
 * The same table exists on the server (server/src/services/levels.ts); the client
 * copy is for display only and is always reconciled with the server value.
 */

export type LevelDefinition = {
  level: number;
  /** Insgesamt verdiente Credits, die für dieses Level nötig sind. */
  threshold: number;
  title: string;
};

export const LEVELS: readonly LevelDefinition[] = [
  { level: 1, threshold: 0, title: 'HÖRER' },
  { level: 2, threshold: 500, title: 'FOLLOWER' },
  { level: 3, threshold: 1_500, title: 'UNTERSTÜTZER' },
  { level: 4, threshold: 3_000, title: 'INSIDER' },
  { level: 5, threshold: 5_000, title: 'SAMMLER' },
  { level: 6, threshold: 10_000, title: 'KURATOR' },
  { level: 7, threshold: 20_000, title: 'VIP' },
  { level: 8, threshold: 50_000, title: 'LEGENDE' },
] as const;

export const MAX_LEVEL = LEVELS[LEVELS.length - 1].level;
