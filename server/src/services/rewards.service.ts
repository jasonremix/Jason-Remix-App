import { db, transaction } from '../db/index.ts';
import { newId } from '../lib/crypto.ts';
import { ApiError, notFound } from '../lib/errors.ts';
import { applyLedgerEntry, getBalance, toIso, type CreditBalance, type CreditTransaction } from './credits.service.ts';
import { resolveLevel } from './levels.ts';

/**
 * Rewards and redemptions.
 *
 * Stock is decremented in the same transaction as the debit, with a guarded UPDATE, so
 * two members redeeming the last item cannot both succeed.
 */

export type Reward = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  category: 'MERCH' | 'COLLECTOR' | 'TICKET' | 'EXPERIENCE' | 'DIGITAL';
  cost: number;
  imageUrl: string | null;
  stock: number | null;
  remaining: number | null;
  active: boolean;
  requiresShipping: boolean;
  minLevel: number | null;
};

export type RewardRedemption = {
  id: string;
  rewardId: string;
  rewardTitle: string;
  userId: string;
  creditsSpent: number;
  status: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED' | 'REFUNDED';
  createdAt: string;
  fulfilledAt: string | null;
  note: string | null;
};

type RewardRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  category: Reward['category'];
  cost: number;
  image_url: string | null;
  stock: number | null;
  remaining: number | null;
  active: number;
  requires_shipping: number;
  min_level: number | null;
};

function toReward(row: RewardRow): Reward {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    category: row.category,
    cost: row.cost,
    imageUrl: row.image_url,
    stock: row.stock,
    remaining: row.remaining,
    active: row.active === 1,
    requiresShipping: row.requires_shipping === 1,
    minLevel: row.min_level,
  };
}

export function listRewards(): Reward[] {
  const rows = db
    .prepare(`SELECT * FROM rewards WHERE active = 1 ORDER BY cost ASC, position ASC`)
    .all() as RewardRow[];
  return rows.map(toReward);
}

export function listRedemptions(userId: string): RewardRedemption[] {
  const rows = db
    .prepare(
      `SELECT r.id, r.reward_id, r.user_id, r.credits_spent, r.status, r.created_at, r.fulfilled_at,
              r.note, w.title AS reward_title
         FROM reward_redemptions r
         JOIN rewards w ON w.id = r.reward_id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC`,
    )
    .all(userId) as {
    id: string;
    reward_id: string;
    user_id: string;
    credits_spent: number;
    status: RewardRedemption['status'];
    created_at: string;
    fulfilled_at: string | null;
    note: string | null;
    reward_title: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    rewardId: row.reward_id,
    rewardTitle: row.reward_title,
    userId: row.user_id,
    creditsSpent: row.credits_spent,
    status: row.status,
    createdAt: toIso(row.created_at),
    fulfilledAt: row.fulfilled_at ? toIso(row.fulfilled_at) : null,
    note: row.note,
  }));
}

export type RedeemResult = {
  redemption: RewardRedemption;
  transaction: CreditTransaction;
  balance: CreditBalance;
};

export function redeemReward(userId: string, rewardId: string): RedeemResult {
  return transaction(() => {
    const row = db.prepare(`SELECT * FROM rewards WHERE id = ?`).get(rewardId) as RewardRow | undefined;
    if (!row) throw notFound('Diese Prämie gibt es nicht mehr.');

    const reward = toReward(row);
    if (!reward.active) {
      throw new ApiError('REWARD_UNAVAILABLE', 'Diese Prämie ist gerade nicht verfügbar.');
    }

    if (reward.minLevel !== null) {
      const balance = getBalance(userId);
      const level = resolveLevel(balance.lifetimeEarned);
      if (level.level < reward.minLevel) {
        throw new ApiError('FORBIDDEN', `Diese Prämie schaltet sich frei ab Level ${reward.minLevel}.`);
      }
    }

    // Guarded decrement: the WHERE clause is what makes the last item safe under
    // concurrency — a second redemption matches no row and is rejected.
    if (reward.remaining !== null) {
      const result = db
        .prepare(`UPDATE rewards SET remaining = remaining - 1 WHERE id = ? AND remaining > 0`)
        .run(rewardId);
      if (result.changes === 0) {
        throw new ApiError('REWARD_UNAVAILABLE', 'Diese Prämie ist vergriffen.');
      }
    }

    const { transaction: ledgerEntry, balance } = applyLedgerEntry({
      userId,
      amount: -reward.cost,
      type: 'SPEND',
      description: `Reward — ${reward.title}`,
      reference: `reward:${reward.id}`,
    });

    const redemptionId = newId();
    db.prepare(
      `INSERT INTO reward_redemptions (id, reward_id, user_id, transaction_id, credits_spent, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
    ).run(redemptionId, reward.id, userId, ledgerEntry.id, reward.cost);

    const created = db
      .prepare(`SELECT created_at FROM reward_redemptions WHERE id = ?`)
      .get(redemptionId) as { created_at: string };

    return {
      redemption: {
        id: redemptionId,
        rewardId: reward.id,
        rewardTitle: reward.title,
        userId,
        creditsSpent: reward.cost,
        status: 'PENDING',
        createdAt: toIso(created.created_at),
        fulfilledAt: null,
        note: null,
      },
      transaction: ledgerEntry,
      balance,
    };
  });
}
