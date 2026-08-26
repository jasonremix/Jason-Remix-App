import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '../src/app.ts';
import { db, migrate } from '../src/db/index.ts';
import { resetRateLimits } from '../src/lib/rateLimit.ts';

/** Shared fixtures. Each suite starts from an empty database with the same reference data. */

// The schema must exist before the first `beforeEach` runs, which is earlier than the
// first `app()` call in suites that reset the database first.
migrate();

let cachedApp: Express | null = null;

export function app(): Express {
  cachedApp ??= createApp();
  return cachedApp;
}

/** Wipes member data between tests while leaving the schema in place. */
export function resetDatabase(): void {
  const tables = [
    'email_deliveries',
    'email_verifications',
    'idempotency_keys',
    'admin_action_log',
    'push_notifications',
    'push_tokens',
    'user_achievements',
    'giveaway_draws',
    'giveaway_entries',
    'giveaways',
    'reward_redemptions',
    'rewards',
    'mission_completions',
    'missions',
    'achievements',
    'credit_transactions',
    'credit_balances',
    'spotify_connections',
    'refresh_tokens',
    'user_profiles',
    'users',
    'news',
    'tracks',
    'albums',
  ];

  db.pragma('foreign_keys = OFF');
  for (const table of tables) db.prepare(`DELETE FROM ${table}`).run();
  db.pragma('foreign_keys = ON');
  resetRateLimits();
}

export function seedReferenceData(): void {
  db.prepare(
    `INSERT INTO missions (id, type, title, description, reward, cooldown_seconds, repeatable, position)
     VALUES ('msn-daily', 'DAILY_CHECK_IN', 'DAILY CHECK-IN', 'Open the app once a day.', 100, 86400, 1, 0)`,
  ).run();
  db.prepare(
    `INSERT INTO missions (id, type, title, description, reward, repeatable, position)
     VALUES ('msn-spotify', 'CONNECT_SPOTIFY', 'CONNECT SPOTIFY', 'Link your Spotify account.', 250, 0, 1)`,
  ).run();
  db.prepare(
    `INSERT INTO missions (id, type, title, description, reward, repeatable, position)
     VALUES ('msn-release', 'NEW_RELEASE', 'NEW RELEASE MISSION', 'Listen to the release.', 250, 0, 2)`,
  ).run();

  db.prepare(
    `INSERT INTO achievements (id, code, title, description, tier, position)
     VALUES ('ach-first', 'FIRST_LISTEN', 'FIRST LISTEN', 'Started your collection.', 'STANDARD', 0)`,
  ).run();
  db.prepare(
    `INSERT INTO achievements (id, code, title, description, tier, position)
     VALUES ('ach-zeitgeist', 'ZEITGEIST', 'ZEITGEIST', 'Completed the release mission.', 'STANDARD', 1)`,
  ).run();

  db.prepare(
    `INSERT INTO rewards (id, title, description, category, cost, stock, remaining, position)
     VALUES ('rwd-merch', 'MERCH', 'A member tee.', 'MERCH', 1000, 5, 5, 0)`,
  ).run();
  db.prepare(
    `INSERT INTO rewards (id, title, description, category, cost, min_level, position)
     VALUES ('rwd-vip', 'VIP EXPERIENCE', 'Soundcheck access.', 'EXPERIENCE', 10000, 5, 1)`,
  ).run();
  db.prepare(
    `INSERT INTO rewards (id, title, description, category, cost, stock, remaining, position)
     VALUES ('rwd-single', 'LAST ONE', 'Exactly one available.', 'COLLECTOR', 100, 1, 1, 2)`,
  ).run();

  const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

  db.prepare(
    `INSERT INTO giveaways (id, title, description, starts_at, ends_at, entry_cost, total_entries,
                            max_entries_per_user, winner_count, terms)
     VALUES ('gwy-open', 'OPEN GIVEAWAY', 'A giveaway that is open.', ?, ?, 500, 100, 3, 1, 'Terms.')`,
  ).run(iso(-1), iso(7));

  db.prepare(
    `INSERT INTO giveaways (id, title, description, starts_at, ends_at, entry_cost,
                            max_entries_per_user, winner_count, terms)
     VALUES ('gwy-closed', 'CLOSED GIVEAWAY', 'A giveaway that has ended.', ?, ?, 500, 1, 1, 'Terms.')`,
  ).run(iso(-10), iso(-2));

  db.prepare(
    `INSERT INTO tracks (id, title, release_date, genre, featured, links)
     VALUES ('trk-zeitgeist', 'Zeitgeist', '2026-07-29', 'Electronic', 1, '{"spotify":"https://open.spotify.com/x"}')`,
  ).run();
}

export type Session = {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
};

let userCounter = 0;

export async function registerMember(
  overrides: Partial<{ email: string; password: string; username: string }> = {},
): Promise<Session> {
  userCounter += 1;
  const email = overrides.email ?? `member${userCounter}@jasonremix.test`;
  const password = overrides.password ?? 'correct-horse-9';
  const username = overrides.username ?? `member_${userCounter}`;

  const response = await request(app())
    .post('/auth/register')
    .send({ email, password, username, acceptedTerms: true })
    .expect(201);

  return {
    userId: response.body.user.id,
    email,
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
  };
}

/** Promotes an account to ADMIN directly — there is deliberately no API path for this. */
export function promoteToAdmin(userId: string): void {
  db.prepare(`UPDATE users SET role = 'ADMIN' WHERE id = ?`).run(userId);
}

/** Grants credits through the ledger so balances used by tests are genuinely earned. */
export function grantCredits(userId: string, amount: number): void {
  db.prepare(
    `UPDATE credit_balances SET balance = balance + ?, lifetime_earned = lifetime_earned + ?
      WHERE user_id = ?`,
  ).run(amount, amount, userId);
  db.prepare(
    `INSERT INTO credit_transactions (id, user_id, amount, type, description, balance_after)
     VALUES (lower(hex(randomblob(16))), ?, ?, 'BONUS', 'Test grant',
             (SELECT balance FROM credit_balances WHERE user_id = ?))`,
  ).run(userId, amount, userId);
}

export const auth = (session: Session) => ({ Authorization: `Bearer ${session.accessToken}` });

/** Every credit-moving endpoint requires one; tests generate a fresh key per call. */
export const idempotencyKey = () => `test-key-${Math.random().toString(36).slice(2)}-${Date.now()}`;
