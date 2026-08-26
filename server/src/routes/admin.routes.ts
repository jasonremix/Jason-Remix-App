import { Router } from 'express';
import { z } from 'zod';

import { db, transaction } from '../db/index.ts';
import { recordAdminAction } from '../lib/audit.ts';
import { newId } from '../lib/crypto.ts';
import { notFound } from '../lib/errors.ts';
import { routeParam } from '../lib/params.ts';
import { activeTransport, isEmailConfigured, maskEmail } from '../lib/mailer.ts';
import { limits } from '../lib/rateLimit.ts';
import { parse } from '../lib/validate.ts';
import { authenticate, requireAdmin } from '../middleware/authenticate.ts';
import { evaluateStandingAchievements } from '../services/achievements.service.ts';
import { applyLedgerEntry, toIso } from '../services/credits.service.ts';
import { listDeliveries } from '../services/email.service.ts';
import { cancelGiveaway, closeGiveaway, drawGiveaway } from '../services/giveaways.service.ts';
import { listUsersForAdmin, setUserStatus } from '../services/users.service.ts';

/**
 * Administration.
 *
 * Every route here sits behind `authenticate` *and* `requireAdmin`, and every action
 * that changes a member's standing writes an audit entry. Hiding the UI is not the
 * access control — this is.
 */
export const adminRoutes = Router();
adminRoutes.use(authenticate, requireAdmin);

function audit(
  req: { auth?: { userId: string; email: string } },
  action: string,
  targetId?: string | null,
  metadata?: Record<string, unknown> | null,
) {
  recordAdminAction({
    adminId: req.auth!.userId,
    adminEmail: req.auth!.email,
    action,
    targetType: action.split('.')[0],
    targetId: targetId ?? null,
    metadata: metadata ?? null,
  });
}

// --- Members ---------------------------------------------------------------------

adminRoutes.get('/users', (req, res) => {
  const { q, cursor, limit } = parse(
    z.object({
      q: z.string().trim().max(80).optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
    req.query,
  );
  res.json(listUsersForAdmin(q, limit, cursor));
});

adminRoutes.post('/users/:userId/status', limits.mutation(), (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['ACTIVE', 'BANNED']) }), req.body);
  setUserStatus(routeParam(req, 'userId'), status);
  audit(req, 'user.status', routeParam(req, 'userId'), { status });
  res.status(204).end();
});

// --- Credits ----------------------------------------------------------------------

const adjustSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().refine((value) => value !== 0, 'Enter a non-zero amount.'),
  description: z.string().trim().min(3).max(200),
  type: z.enum(['ADMIN_ADJUSTMENT', 'BONUS', 'REFUND']).default('ADMIN_ADJUSTMENT'),
});

adminRoutes.post('/credits/adjust', limits.mutation(), (req, res) => {
  const input = parse(adjustSchema, req.body);

  const result = transaction(() => {
    const entry = applyLedgerEntry({
      userId: input.userId,
      amount: input.amount,
      type: input.type,
      description: input.description,
      reference: `admin:${req.auth!.userId}`,
    });
    evaluateStandingAchievements(input.userId);
    return entry;
  });

  audit(req, 'credits.adjust', input.userId, {
    amount: input.amount,
    type: input.type,
    balanceAfter: result.balance.balance,
  });

  res.json(result);
});

// --- Catalogue ---------------------------------------------------------------------

const trackSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(120),
  artist: z.string().trim().max(120).default('Jason Remix'),
  albumId: z.string().nullish(),
  coverUrl: z.string().url().max(500).nullish(),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.'),
  genre: z.string().trim().max(60).nullish(),
  durationMs: z.number().int().positive().nullish(),
  isrc: z.string().trim().max(20).nullish(),
  featured: z.boolean().default(false),
  links: z.record(z.string(), z.string().url()).default({}),
});

adminRoutes.post('/tracks', limits.mutation(), (req, res) => {
  const input = parse(trackSchema, req.body);
  const id = input.id ?? newId();

  transaction(() => {
    // Only one release is ever the featured one.
    if (input.featured) db.prepare(`UPDATE tracks SET featured = 0`).run();

    db.prepare(
      `INSERT INTO tracks (id, title, artist, album_id, cover_url, release_date, genre,
                           duration_ms, isrc, featured, links)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title, artist = excluded.artist, album_id = excluded.album_id,
         cover_url = excluded.cover_url, release_date = excluded.release_date,
         genre = excluded.genre, duration_ms = excluded.duration_ms, isrc = excluded.isrc,
         featured = excluded.featured, links = excluded.links, updated_at = datetime('now')`,
    ).run(
      id,
      input.title,
      input.artist,
      input.albumId ?? null,
      input.coverUrl ?? null,
      input.releaseDate,
      input.genre ?? null,
      input.durationMs ?? null,
      input.isrc ?? null,
      input.featured ? 1 : 0,
      JSON.stringify(input.links),
    );
  });

  audit(req, 'track.upsert', id, { title: input.title });
  res.json({ ...input, id });
});

adminRoutes.delete('/tracks/:trackId', limits.mutation(), (req, res) => {
  const result = db.prepare(`DELETE FROM tracks WHERE id = ?`).run(routeParam(req, 'trackId'));
  if (result.changes === 0) throw notFound('Diese Veröffentlichung gibt es nicht mehr.');
  audit(req, 'track.delete', routeParam(req, 'trackId'));
  res.status(204).end();
});

const newsSchema = z.object({
  id: z.string().optional(),
  category: z.enum(['RELEASE', 'TOUR', 'REWARD', 'ANNOUNCEMENT']).default('ANNOUNCEMENT'),
  title: z.string().trim().min(1).max(140),
  body: z.string().trim().min(1).max(2000),
  imageUrl: z.string().url().max(500).nullish(),
  linkUrl: z.string().url().max(500).nullish(),
});

adminRoutes.post('/news', limits.mutation(), (req, res) => {
  const input = parse(newsSchema, req.body);
  const id = input.id ?? newId();

  db.prepare(
    `INSERT INTO news (id, category, title, body, image_url, link_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       category = excluded.category, title = excluded.title, body = excluded.body,
       image_url = excluded.image_url, link_url = excluded.link_url`,
  ).run(id, input.category, input.title, input.body, input.imageUrl ?? null, input.linkUrl ?? null);

  audit(req, 'news.publish', id, { title: input.title });
  res.json({ ...input, id, publishedAt: new Date().toISOString() });
});

// --- Rewards and missions -------------------------------------------------------------

const rewardSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().max(120).nullish(),
  description: z.string().trim().max(1000).default(''),
  category: z.enum(['MERCH', 'COLLECTOR', 'TICKET', 'EXPERIENCE', 'DIGITAL']).default('MERCH'),
  cost: z.number().int().positive(),
  imageUrl: z.string().url().max(500).nullish(),
  stock: z.number().int().nonnegative().nullish(),
  active: z.boolean().default(true),
  requiresShipping: z.boolean().default(false),
  minLevel: z.number().int().min(1).max(8).nullish(),
});

adminRoutes.post('/rewards', limits.mutation(), (req, res) => {
  const input = parse(rewardSchema, req.body);
  const id = input.id ?? newId();

  db.prepare(
    `INSERT INTO rewards (id, title, subtitle, description, category, cost, image_url, stock,
                          remaining, active, requires_shipping, min_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, subtitle = excluded.subtitle, description = excluded.description,
       category = excluded.category, cost = excluded.cost, image_url = excluded.image_url,
       stock = excluded.stock, active = excluded.active,
       requires_shipping = excluded.requires_shipping, min_level = excluded.min_level,
       updated_at = datetime('now')`,
  ).run(
    id,
    input.title,
    input.subtitle ?? null,
    input.description,
    input.category,
    input.cost,
    input.imageUrl ?? null,
    input.stock ?? null,
    input.stock ?? null,
    input.active ? 1 : 0,
    input.requiresShipping ? 1 : 0,
    input.minLevel ?? null,
  );

  audit(req, 'reward.upsert', id, { title: input.title, cost: input.cost });
  res.json({ ...input, id, remaining: input.stock ?? null });
});

const missionSchema = z.object({
  id: z.string().optional(),
  type: z
    .enum(['DAILY_CHECK_IN', 'CONNECT_SPOTIFY', 'COMPLETE_PROFILE', 'NEW_RELEASE', 'COMMUNITY', 'SPECIAL_EVENT'])
    .default('SPECIAL_EVENT'),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(''),
  reward: z.number().int().positive().max(100_000),
  cooldownSeconds: z.number().int().positive().nullish(),
  repeatable: z.boolean().default(false),
  active: z.boolean().default(true),
  startsAt: z.string().nullish(),
  endsAt: z.string().nullish(),
});

adminRoutes.post('/missions', limits.mutation(), (req, res) => {
  const input = parse(missionSchema, req.body);
  const id = input.id ?? newId();

  db.prepare(
    `INSERT INTO missions (id, type, title, description, reward, cooldown_seconds, repeatable,
                           active, starts_at, ends_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       type = excluded.type, title = excluded.title, description = excluded.description,
       reward = excluded.reward, cooldown_seconds = excluded.cooldown_seconds,
       repeatable = excluded.repeatable, active = excluded.active,
       starts_at = excluded.starts_at, ends_at = excluded.ends_at, updated_at = datetime('now')`,
  ).run(
    id,
    input.type,
    input.title,
    input.description,
    input.reward,
    input.cooldownSeconds ?? null,
    input.repeatable ? 1 : 0,
    input.active ? 1 : 0,
    input.startsAt ?? null,
    input.endsAt ?? null,
  );

  audit(req, 'mission.upsert', id, { title: input.title, reward: input.reward });
  res.json({ ...input, id, status: 'AVAILABLE' });
});

const achievementSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().regex(/^[A-Z0-9_]{3,40}$/, 'Use uppercase letters, numbers and underscores.'),
  title: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).default(''),
  tier: z.enum(['STANDARD', 'RARE', 'ELITE']).default('STANDARD'),
});

adminRoutes.post('/achievements', limits.mutation(), (req, res) => {
  const input = parse(achievementSchema, req.body);
  const id = input.id ?? newId();

  db.prepare(
    `INSERT INTO achievements (id, code, title, description, tier)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(code) DO UPDATE SET
       title = excluded.title, description = excluded.description, tier = excluded.tier`,
  ).run(id, input.code, input.title, input.description, input.tier);

  audit(req, 'achievement.upsert', id, { code: input.code });
  res.json({ ...input, id });
});

// --- Giveaways ------------------------------------------------------------------------

const giveawaySchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(100),
  subtitle: z.string().trim().max(120).nullish(),
  description: z.string().trim().max(2000).default(''),
  imageUrl: z.string().url().max(500).nullish(),
  startsAt: z.string(),
  endsAt: z.string(),
  entryCost: z.number().int().positive(),
  totalEntries: z.number().int().positive().nullish(),
  maxEntriesPerUser: z.number().int().min(1).max(50).default(1),
  winnerCount: z.number().int().min(1).max(100).default(1),
  terms: z.string().trim().max(4000).default(''),
});

adminRoutes.post('/giveaways', limits.mutation(), (req, res) => {
  const input = parse(giveawaySchema, req.body);
  const id = input.id ?? newId();

  db.prepare(
    `INSERT INTO giveaways (id, title, subtitle, description, image_url, starts_at, ends_at,
                            entry_cost, total_entries, max_entries_per_user, winner_count, terms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, subtitle = excluded.subtitle, description = excluded.description,
       image_url = excluded.image_url, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
       entry_cost = excluded.entry_cost, total_entries = excluded.total_entries,
       max_entries_per_user = excluded.max_entries_per_user, winner_count = excluded.winner_count,
       terms = excluded.terms, updated_at = datetime('now')`,
  ).run(
    id,
    input.title,
    input.subtitle ?? null,
    input.description,
    input.imageUrl ?? null,
    input.startsAt,
    input.endsAt,
    input.entryCost,
    input.totalEntries ?? null,
    input.maxEntriesPerUser,
    input.winnerCount,
    input.terms,
  );

  audit(req, 'giveaway.upsert', id, { title: input.title });
  res.json({ ...input, id, status: 'OPEN', entriesUsed: 0, myEntries: 0, myStatus: null });
});

adminRoutes.post('/giveaways/:giveawayId/close', limits.mutation(), (req, res) => {
  const giveaway = closeGiveaway(routeParam(req, 'giveawayId'));
  audit(req, 'giveaway.close', routeParam(req, 'giveawayId'));
  res.json(giveaway);
});

/** The draw itself. Recorded with the entry count and the seed hash. */
adminRoutes.post('/giveaways/:giveawayId/draw', limits.mutation(), (req, res) => {
  const result = drawGiveaway(routeParam(req, 'giveawayId'), req.auth!.userId);
  audit(req, 'giveaway.draw', routeParam(req, 'giveawayId'), {
    winners: result.winners.length,
    seedHash: result.drawSeedHash,
  });
  res.json(result);
});

adminRoutes.post('/giveaways/:giveawayId/cancel', limits.mutation(), (req, res) => {
  const result = cancelGiveaway(routeParam(req, 'giveawayId'));
  audit(req, 'giveaway.cancel', routeParam(req, 'giveawayId'), result);
  res.json(result);
});

// --- Redemptions -----------------------------------------------------------------------

adminRoutes.post('/redemptions/:redemptionId/status', limits.mutation(), (req, res) => {
  const { status, note } = parse(
    z.object({
      status: z.enum(['PENDING', 'APPROVED', 'FULFILLED', 'REJECTED']),
      note: z.string().trim().max(300).nullish(),
    }),
    req.body,
  );

  const result = db
    .prepare(
      `UPDATE reward_redemptions
          SET status = ?, note = COALESCE(?, note),
              fulfilled_at = CASE WHEN ? = 'FULFILLED' THEN datetime('now') ELSE fulfilled_at END
        WHERE id = ?`,
    )
    .run(status, note ?? null, status, routeParam(req, 'redemptionId'));

  if (result.changes === 0) throw notFound('Diese Einlösung gibt es nicht mehr.');
  audit(req, 'redemption.status', routeParam(req, 'redemptionId'), { status });
  res.status(204).end();
});

// --- Notifications ------------------------------------------------------------------------

const pushSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(300),
  category: z
    .enum(['NEW_RELEASE', 'NEW_GIVEAWAY', 'REWARD_UNLOCKED', 'SPECIAL_DROP', 'SYSTEM'])
    .default('SYSTEM'),
  deepLink: z.string().max(300).nullish(),
});

/**
 * Records a notification for dispatch.
 *
 * Delivery itself is deliberately left to a worker reading this table: pushing from
 * inside a request would block the admin on a third-party service.
 */
adminRoutes.post('/notifications', limits.mutation(), (req, res) => {
  const input = parse(pushSchema, req.body);
  const id = newId();

  db.prepare(
    `INSERT INTO push_notifications (id, title, body, category, deep_link, sent_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.title, input.body, input.category, input.deepLink ?? null, req.auth!.userId);

  const recipients = db
    .prepare(
      `SELECT COUNT(*) AS count FROM push_tokens t
         JOIN user_profiles p ON p.user_id = t.user_id
        WHERE p.push_enabled = 1`,
    )
    .get() as { count: number };

  audit(req, 'push.send', id, { title: input.title, recipients: recipients.count });
  res.json({ id, queuedFor: recipients.count });
});

// --- Audit log ----------------------------------------------------------------------------

/**
 * The email delivery log.
 *
 * Recipients are masked: an admin needs to see that a message went out and to whom
 * roughly, not to read the whole member list off this screen.
 */
adminRoutes.get('/email-log', (req, res) => {
  const { limit } = parse(
    z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }),
    req.query,
  );

  res.json({
    transport: activeTransport(),
    configured: isEmailConfigured(),
    entries: listDeliveries(limit).map((entry) => ({
      ...entry,
      recipient: maskEmail(entry.recipient),
    })),
  });
});

adminRoutes.get('/audit', (req, res) => {
  const { cursor, limit } = parse(
    z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).default(100),
    }),
    req.query,
  );

  const rows = db
    .prepare(
      `SELECT id, admin_id, admin_email, action, target_type, target_id, metadata, created_at
         FROM admin_action_log
        WHERE (? IS NULL OR created_at < ?)
        ORDER BY created_at DESC
        LIMIT ?`,
    )
    .all(cursor ?? null, cursor ?? null, limit + 1) as {
    id: string;
    admin_id: string;
    admin_email: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    metadata: string | null;
    created_at: string;
  }[];

  const page = rows.slice(0, limit);
  res.json({
    entries: page.map((row) => ({
      id: row.id,
      adminId: row.admin_id,
      adminEmail: row.admin_email,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
      createdAt: toIso(row.created_at),
    })),
    nextCursor: rows.length > limit ? page[page.length - 1]?.created_at ?? null : null,
  });
});
