import { db, transaction } from '../db/index.ts';
import { drawIndices, newId } from '../lib/crypto.ts';
import { ApiError, notFound } from '../lib/errors.ts';
import { applyLedgerEntry, toIso, type CreditBalance, type CreditTransaction } from './credits.service.ts';

/**
 * Giveaways.
 *
 * Two rules shape this module:
 *   1. Entries are only ever created server-side, inside the same transaction as the
 *      credit debit and the capacity check.
 *   2. Winners are drawn here and nowhere else. The draw records the entry pool size and
 *      the hash of the random seed, so it can be shown to have happened as described
 *      rather than simply asserted.
 */

export type GiveawayStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'DRAWN' | 'CANCELLED';
export type GiveawayEntryStatus = 'ACTIVE' | 'WON' | 'LOST' | 'REFUNDED' | 'VOID';

export type Giveaway = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  entryCost: number;
  totalEntries: number | null;
  entriesUsed: number;
  maxEntriesPerUser: number;
  winnerCount: number;
  status: GiveawayStatus;
  terms: string;
  myEntries: number;
  myStatus: GiveawayEntryStatus | null;
};

export type GiveawayEntry = {
  id: string;
  giveawayId: string;
  giveawayTitle: string;
  userId: string;
  creditsSpent: number;
  createdAt: string;
  status: GiveawayEntryStatus;
};

type GiveawayRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  image_url: string | null;
  starts_at: string;
  ends_at: string;
  entry_cost: number;
  total_entries: number | null;
  entries_used: number;
  max_entries_per_user: number;
  winner_count: number;
  status: GiveawayStatus;
  terms: string;
  my_entries?: number;
  my_status?: GiveawayEntryStatus | null;
};

/** Derives the live status: a stored OPEN row whose window has passed reads as CLOSED. */
function effectiveStatus(row: GiveawayRow, now = Date.now()): GiveawayStatus {
  if (row.status === 'DRAWN' || row.status === 'CANCELLED' || row.status === 'CLOSED') {
    return row.status;
  }
  if (new Date(row.starts_at).getTime() > now) return 'SCHEDULED';
  if (new Date(row.ends_at).getTime() <= now) return 'CLOSED';
  return 'OPEN';
}

function toGiveaway(row: GiveawayRow): Giveaway {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    imageUrl: row.image_url,
    startsAt: toIso(row.starts_at),
    endsAt: toIso(row.ends_at),
    entryCost: row.entry_cost,
    totalEntries: row.total_entries,
    entriesUsed: row.entries_used,
    maxEntriesPerUser: row.max_entries_per_user,
    winnerCount: row.winner_count,
    status: effectiveStatus(row),
    terms: row.terms,
    myEntries: row.my_entries ?? 0,
    myStatus: row.my_status ?? null,
  };
}

export function listGiveaways(userId: string): Giveaway[] {
  const rows = db
    .prepare(
      `SELECT g.*,
              (SELECT COUNT(*) FROM giveaway_entries e
                WHERE e.giveaway_id = g.id AND e.user_id = ? AND e.status <> 'REFUNDED') AS my_entries,
              (SELECT e.status FROM giveaway_entries e
                WHERE e.giveaway_id = g.id AND e.user_id = ?
                ORDER BY CASE e.status WHEN 'WON' THEN 0 ELSE 1 END, e.created_at DESC
                LIMIT 1) AS my_status
         FROM giveaways g
        ORDER BY g.ends_at DESC`,
    )
    .all(userId, userId) as GiveawayRow[];

  return rows.map(toGiveaway);
}

export function listEntries(userId: string): GiveawayEntry[] {
  const rows = db
    .prepare(
      `SELECT e.id, e.giveaway_id, e.user_id, e.credits_spent, e.status, e.created_at,
              g.title AS giveaway_title
         FROM giveaway_entries e
         JOIN giveaways g ON g.id = e.giveaway_id
        WHERE e.user_id = ?
        ORDER BY e.created_at DESC`,
    )
    .all(userId) as {
    id: string;
    giveaway_id: string;
    user_id: string;
    credits_spent: number;
    status: GiveawayEntryStatus;
    created_at: string;
    giveaway_title: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    giveawayId: row.giveaway_id,
    giveawayTitle: row.giveaway_title,
    userId: row.user_id,
    creditsSpent: row.credits_spent,
    createdAt: toIso(row.created_at),
    status: row.status,
  }));
}

export type EnterResult = {
  entry: GiveawayEntry;
  giveaway: Giveaway;
  transaction: CreditTransaction;
  balance: CreditBalance;
};

export function enterGiveaway(userId: string, giveawayId: string, entries: number): EnterResult {
  if (!Number.isInteger(entries) || entries < 1 || entries > 50) {
    throw new ApiError('BAD_REQUEST', 'Wähle eine gültige Anzahl an Losen.');
  }

  return transaction(() => {
    const row = db.prepare(`SELECT * FROM giveaways WHERE id = ?`).get(giveawayId) as
      | GiveawayRow
      | undefined;
    if (!row) throw notFound('Dieses Gewinnspiel gibt es nicht mehr.');

    if (effectiveStatus(row) !== 'OPEN') {
      throw new ApiError('GIVEAWAY_CLOSED', 'Dieses Gewinnspiel ist beendet.');
    }

    const mine = db
      .prepare(
        `SELECT COUNT(*) AS count FROM giveaway_entries
          WHERE giveaway_id = ? AND user_id = ? AND status <> 'REFUNDED'`,
      )
      .get(giveawayId, userId) as { count: number };

    if (mine.count + entries > row.max_entries_per_user) {
      throw new ApiError('GIVEAWAY_ENTRY_LIMIT', 'Du hast alle deine Lose für dieses Gewinnspiel genutzt.');
    }

    // Guarded capacity update — the same pattern as reward stock, for the same reason.
    if (row.total_entries !== null) {
      const result = db
        .prepare(
          `UPDATE giveaways SET entries_used = entries_used + ?
            WHERE id = ? AND entries_used + ? <= total_entries`,
        )
        .run(entries, giveawayId, entries);
      if (result.changes === 0) {
        throw new ApiError('GIVEAWAY_CLOSED', 'Alle Lose für dieses Gewinnspiel sind vergeben.');
      }
    } else {
      db.prepare(`UPDATE giveaways SET entries_used = entries_used + ? WHERE id = ?`).run(
        entries,
        giveawayId,
      );
    }

    const cost = row.entry_cost * entries;
    const { transaction: ledgerEntry, balance } = applyLedgerEntry({
      userId,
      amount: -cost,
      type: 'SPEND',
      description: `Giveaway entry — ${row.title}`,
      reference: `giveaway:${row.id}`,
    });

    const insert = db.prepare(
      `INSERT INTO giveaway_entries (id, giveaway_id, user_id, transaction_id, credits_spent, status)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
    );

    let firstEntryId = '';
    for (let index = 0; index < entries; index += 1) {
      const entryId = newId();
      if (index === 0) firstEntryId = entryId;
      insert.run(entryId, giveawayId, userId, ledgerEntry.id, row.entry_cost);
    }

    const created = db
      .prepare(`SELECT created_at FROM giveaway_entries WHERE id = ?`)
      .get(firstEntryId) as { created_at: string };

    const refreshed = db.prepare(`SELECT * FROM giveaways WHERE id = ?`).get(giveawayId) as GiveawayRow;

    return {
      entry: {
        id: firstEntryId,
        giveawayId,
        giveawayTitle: row.title,
        userId,
        creditsSpent: row.entry_cost,
        createdAt: toIso(created.created_at),
        status: 'ACTIVE',
      },
      giveaway: toGiveaway({ ...refreshed, my_entries: mine.count + entries, my_status: 'ACTIVE' }),
      transaction: ledgerEntry,
      balance,
    };
  });
}

// --- Administration ------------------------------------------------------------

export function closeGiveaway(giveawayId: string): Giveaway {
  const row = db.prepare(`SELECT * FROM giveaways WHERE id = ?`).get(giveawayId) as
    | GiveawayRow
    | undefined;
  if (!row) throw notFound('Dieses Gewinnspiel existiert nicht mehr.');

  db.prepare(
    `UPDATE giveaways SET status = 'CLOSED', ends_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?`,
  ).run(giveawayId);

  const updated = db.prepare(`SELECT * FROM giveaways WHERE id = ?`).get(giveawayId) as GiveawayRow;
  return toGiveaway(updated);
}

export type DrawResult = {
  giveawayId: string;
  winners: { userId: string; username: string | null; entryId: string }[];
  drawSeedHash: string;
  drawnAt: string;
};

/**
 * Draws winners.
 *
 * Selection happens over the recorded entries with a cryptographic random source and
 * rejection sampling, so every entry has an equal chance. A giveaway can only be drawn
 * once: the status check inside the transaction makes a second attempt fail.
 */
export function drawGiveaway(giveawayId: string, adminId: string): DrawResult {
  return transaction(() => {
    const row = db.prepare(`SELECT * FROM giveaways WHERE id = ?`).get(giveawayId) as
      | GiveawayRow
      | undefined;
    if (!row) throw notFound('Dieses Gewinnspiel existiert nicht mehr.');

    if (row.status === 'DRAWN') {
      throw new ApiError('CONFLICT', 'Dieses Gewinnspiel wurde bereits gezogen.');
    }
    if (effectiveStatus(row) === 'OPEN') {
      throw new ApiError('BAD_REQUEST', 'Schließe das Gewinnspiel, bevor du Gewinner ziehst.');
    }

    const entries = db
      .prepare(
        `SELECT e.id, e.user_id, p.username
           FROM giveaway_entries e
           LEFT JOIN user_profiles p ON p.user_id = e.user_id
          WHERE e.giveaway_id = ? AND e.status = 'ACTIVE'
          ORDER BY e.created_at ASC, e.id ASC`,
      )
      .all(giveawayId) as { id: string; user_id: string; username: string | null }[];

    if (entries.length === 0) {
      throw new ApiError('BAD_REQUEST', 'Es gibt keine Lose, aus denen gezogen werden kann.');
    }

    // One win per member: draw over entries but stop once enough distinct members
    // have been selected, so a member with ten entries cannot take two prizes.
    const winners: { userId: string; username: string | null; entryId: string }[] = [];
    const wonUserIds = new Set<string>();
    const { indices, seedHash } = drawIndices(entries.length, entries.length);

    for (const index of indices) {
      if (winners.length >= row.winner_count) break;
      const entry = entries[index];
      if (!entry || wonUserIds.has(entry.user_id)) continue;
      wonUserIds.add(entry.user_id);
      winners.push({ userId: entry.user_id, username: entry.username, entryId: entry.id });
    }

    const winningEntryIds = new Set(winners.map((winner) => winner.entryId));
    const markWon = db.prepare(`UPDATE giveaway_entries SET status = 'WON' WHERE id = ?`);
    const markLost = db.prepare(
      `UPDATE giveaway_entries SET status = 'LOST' WHERE giveaway_id = ? AND status = 'ACTIVE'`,
    );

    markLost.run(giveawayId);
    for (const entryId of winningEntryIds) markWon.run(entryId);

    const drawnAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO giveaway_draws (id, giveaway_id, drawn_by, seed_hash, entry_count, winner_entries)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(newId(), giveawayId, adminId, seedHash, entries.length, JSON.stringify([...winningEntryIds]));

    db.prepare(`UPDATE giveaways SET status = 'DRAWN', updated_at = datetime('now') WHERE id = ?`).run(
      giveawayId,
    );

    return { giveawayId, winners, drawSeedHash: seedHash, drawnAt };
  });
}

/** Cancels a giveaway and refunds every active entry in one transaction. */
export function cancelGiveaway(giveawayId: string): { refunded: number } {
  return transaction(() => {
    const row = db.prepare(`SELECT * FROM giveaways WHERE id = ?`).get(giveawayId) as
      | GiveawayRow
      | undefined;
    if (!row) throw notFound('Dieses Gewinnspiel existiert nicht mehr.');
    if (row.status === 'DRAWN') {
      throw new ApiError('CONFLICT', 'Ein bereits gezogenes Gewinnspiel lässt sich nicht mehr absagen.');
    }

    const entries = db
      .prepare(
        `SELECT id, user_id, credits_spent FROM giveaway_entries
          WHERE giveaway_id = ? AND status = 'ACTIVE'`,
      )
      .all(giveawayId) as { id: string; user_id: string; credits_spent: number }[];

    for (const entry of entries) {
      applyLedgerEntry({
        userId: entry.user_id,
        amount: entry.credits_spent,
        type: 'REFUND',
        description: `Refund — ${row.title}`,
        reference: `giveaway:${giveawayId}`,
      });
      db.prepare(`UPDATE giveaway_entries SET status = 'REFUNDED' WHERE id = ?`).run(entry.id);
    }

    db.prepare(
      `UPDATE giveaways SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?`,
    ).run(giveawayId);

    return { refunded: entries.length };
  });
}
