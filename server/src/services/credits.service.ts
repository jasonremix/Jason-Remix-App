import { db } from '../db/index.ts';
import { newId } from '../lib/crypto.ts';
import { ApiError } from '../lib/errors.ts';
import { resolveLevel } from './levels.ts';

/**
 * The credit ledger.
 *
 * This module is the *only* place a balance changes. Everything else — missions,
 * rewards, giveaways, admin adjustments — calls `applyLedgerEntry` inside a surrounding
 * transaction, so a domain record and its ledger row can never disagree.
 *
 * Three invariants hold at all times:
 *   1. A balance is never negative. Enforced here and again by a CHECK constraint.
 *   2. Every movement writes a row recording the balance it produced.
 *   3. Lifetime earned only ever increases, so a member's level cannot fall.
 */

export type CreditTransactionType = 'EARN' | 'SPEND' | 'BONUS' | 'ADMIN_ADJUSTMENT' | 'REFUND';

export type CreditTransaction = {
  id: string;
  userId: string;
  amount: number;
  type: CreditTransactionType;
  description: string;
  timestamp: string;
  reference: string | null;
  balanceAfter: number;
};

export type CreditBalance = {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  level: number;
  levelTitle: string;
  nextLevelAt: number | null;
  progressToNextLevel: number;
};

type BalanceRow = { balance: number; lifetime_earned: number; lifetime_spent: number };

export function ensureBalanceRow(userId: string): void {
  db.prepare(`INSERT OR IGNORE INTO credit_balances (user_id, balance) VALUES (?, 0)`).run(userId);
}

export function getBalance(userId: string): CreditBalance {
  ensureBalanceRow(userId);
  const row = db
    .prepare(`SELECT balance, lifetime_earned, lifetime_spent FROM credit_balances WHERE user_id = ?`)
    .get(userId) as BalanceRow;

  const level = resolveLevel(row.lifetime_earned);
  return {
    balance: row.balance,
    lifetimeEarned: row.lifetime_earned,
    lifetimeSpent: row.lifetime_spent,
    ...level,
  };
}

export type LedgerInput = {
  userId: string;
  /** Positive to credit, negative to debit. Zero is rejected. */
  amount: number;
  type: CreditTransactionType;
  description: string;
  reference?: string | null;
};

/**
 * Applies one movement.
 *
 * Must be called inside a `transaction()` when the caller also writes a domain row —
 * an entry, a redemption, a completion — so both land together or neither does.
 */
export function applyLedgerEntry(input: LedgerInput): {
  transaction: CreditTransaction;
  balance: CreditBalance;
} {
  const amount = Math.trunc(input.amount);
  if (amount === 0) {
    throw new ApiError('BAD_REQUEST', 'A credit movement must be non-zero.');
  }

  ensureBalanceRow(input.userId);

  const current = db
    .prepare(`SELECT balance, lifetime_earned, lifetime_spent FROM credit_balances WHERE user_id = ?`)
    .get(input.userId) as BalanceRow;

  const nextBalance = current.balance + amount;
  if (nextBalance < 0) {
    throw new ApiError('INSUFFICIENT_CREDITS', 'You do not have enough credits for this.');
  }

  const earned = amount > 0 ? amount : 0;
  const spent = amount < 0 ? -amount : 0;

  db.prepare(
    `UPDATE credit_balances
        SET balance = ?, lifetime_earned = lifetime_earned + ?, lifetime_spent = lifetime_spent + ?,
            updated_at = datetime('now')
      WHERE user_id = ?`,
  ).run(nextBalance, earned, spent, input.userId);

  const id = newId();
  db.prepare(
    `INSERT INTO credit_transactions (id, user_id, amount, type, description, reference, balance_after)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.userId, amount, input.type, input.description, input.reference ?? null, nextBalance);

  const row = db
    .prepare(`SELECT created_at FROM credit_transactions WHERE id = ?`)
    .get(id) as { created_at: string };

  return {
    transaction: {
      id,
      userId: input.userId,
      amount,
      type: input.type,
      description: input.description,
      timestamp: toIso(row.created_at),
      reference: input.reference ?? null,
      balanceAfter: nextBalance,
    },
    balance: getBalance(input.userId),
  };
}

export function listTransactions(userId: string, limit = 50, cursor?: string) {
  const rows = db
    .prepare(
      `SELECT id, user_id, amount, type, description, reference, balance_after, created_at
         FROM credit_transactions
        WHERE user_id = ? AND (? IS NULL OR created_at < ?)
        ORDER BY created_at DESC, rowid DESC
        LIMIT ?`,
    )
    .all(userId, cursor ?? null, cursor ?? null, limit + 1) as {
    id: string;
    user_id: string;
    amount: number;
    type: CreditTransactionType;
    description: string;
    reference: string | null;
    balance_after: number;
    created_at: string;
  }[];

  const page = rows.slice(0, limit);
  return {
    transactions: page.map(
      (row): CreditTransaction => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        type: row.type,
        description: row.description,
        timestamp: toIso(row.created_at),
        reference: row.reference,
        balanceAfter: row.balance_after,
      }),
    ),
    nextCursor: rows.length > limit ? page[page.length - 1]?.created_at ?? null : null,
  };
}

/** SQLite stores `YYYY-MM-DD HH:MM:SS` in UTC; the API speaks ISO 8601. */
export function toIso(sqliteTimestamp: string): string {
  if (!sqliteTimestamp) return new Date().toISOString();
  if (sqliteTimestamp.includes('T')) return sqliteTimestamp;
  return `${sqliteTimestamp.replace(' ', 'T')}.000Z`;
}
