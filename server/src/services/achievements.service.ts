import { db } from '../db/index.ts';
import { toIso } from './credits.service.ts';

/**
 * Achievements.
 *
 * Unlocks are evaluated server-side after any event that could trigger one. The client
 * is told what was unlocked; it never decides.
 */

export type Achievement = {
  id: string;
  code: string;
  title: string;
  description: string;
  tier: 'STANDARD' | 'RARE' | 'ELITE';
  unlockedAt: string | null;
  progress: number;
};

type AchievementRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  tier: 'STANDARD' | 'RARE' | 'ELITE';
  unlocked_at: string | null;
};

export function listAchievements(userId: string): Achievement[] {
  const rows = db
    .prepare(
      `SELECT a.id, a.code, a.title, a.description, a.tier, ua.unlocked_at
         FROM achievements a
         LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
        ORDER BY a.position, a.title`,
    )
    .all(userId) as AchievementRow[];

  const progress = computeProgress(userId);

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    tier: row.tier,
    unlockedAt: row.unlocked_at ? toIso(row.unlocked_at) : null,
    progress: row.unlocked_at ? 1 : (progress[row.code] ?? 0),
  }));
}

/** Partial progress for the achievements that have a measurable path. */
function computeProgress(userId: string): Record<string, number> {
  const balance = db
    .prepare(`SELECT lifetime_earned FROM credit_balances WHERE user_id = ?`)
    .get(userId) as { lifetime_earned: number } | undefined;
  const earned = balance?.lifetime_earned ?? 0;

  const checkIns = db
    .prepare(
      `SELECT COUNT(*) AS count
         FROM mission_completions mc
         JOIN missions m ON m.id = mc.mission_id
        WHERE mc.user_id = ? AND m.type = 'DAILY_CHECK_IN'`,
    )
    .get(userId) as { count: number };

  return {
    CREDITS_COLLECTOR: Math.min(1, earned / 50_000),
    SUPER_FAN: Math.min(1, checkIns.count / 30),
    VIP_MEMBER: Math.min(1, earned / 20_000),
    JASON_LEGEND: Math.min(1, earned / 50_000),
  };
}

/**
 * Unlocks by code, ignoring anything already held or unknown.
 * Returns only what actually changed, so the app can announce it once.
 */
export function unlockAchievements(userId: string, codes: string[]): Achievement[] {
  if (codes.length === 0) return [];

  const unlocked: Achievement[] = [];
  const select = db.prepare(`SELECT id, code, title, description, tier FROM achievements WHERE code = ?`);
  const insert = db.prepare(
    `INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)`,
  );

  for (const code of codes) {
    const achievement = select.get(code) as Omit<AchievementRow, 'unlocked_at'> | undefined;
    if (!achievement) continue;

    const result = insert.run(userId, achievement.id);
    if (result.changes === 0) continue; // Already held.

    unlocked.push({
      id: achievement.id,
      code: achievement.code,
      title: achievement.title,
      description: achievement.description,
      tier: achievement.tier,
      unlockedAt: new Date().toISOString(),
      progress: 1,
    });
  }

  return unlocked;
}

/**
 * Re-evaluates the achievements that follow purely from a member's standing.
 * Called after every credit movement.
 */
export function evaluateStandingAchievements(userId: string): Achievement[] {
  const balance = db
    .prepare(`SELECT lifetime_earned FROM credit_balances WHERE user_id = ?`)
    .get(userId) as { lifetime_earned: number } | undefined;
  if (!balance) return [];

  const earned = balance.lifetime_earned;
  const codes: string[] = [];
  if (earned >= 1) codes.push('FIRST_LISTEN');
  if (earned >= 20_000) codes.push('VIP_MEMBER');
  if (earned >= 50_000) codes.push('CREDITS_COLLECTOR', 'JASON_LEGEND');

  const checkIns = db
    .prepare(
      `SELECT COUNT(*) AS count
         FROM mission_completions mc
         JOIN missions m ON m.id = mc.mission_id
        WHERE mc.user_id = ? AND m.type = 'DAILY_CHECK_IN'`,
    )
    .get(userId) as { count: number };
  if (checkIns.count >= 30) codes.push('SUPER_FAN');

  return unlockAchievements(userId, codes);
}
