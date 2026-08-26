import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { db } from '../src/db/index.ts';
import { applyLedgerEntry, getBalance } from '../src/services/credits.service.ts';
import {
  app,
  auth,
  grantCredits,
  registerMember,
  resetDatabase,
  seedReferenceData,
} from './helpers.ts';

describe('credit balance', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('starts at zero on level one', async () => {
    const session = await registerMember();
    const response = await request(app()).get('/credits').set(auth(session)).expect(200);

    expect(response.body.balance).toMatchObject({
      balance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      level: 1,
    });
    expect(response.body.transactions).toEqual([]);
  });

  it('derives the level from lifetime earned, not the current balance', async () => {
    const session = await registerMember();

    applyLedgerEntry({
      userId: session.userId,
      amount: 6_000,
      type: 'BONUS',
      description: 'Test award',
    });
    const afterEarning = getBalance(session.userId);
    expect(afterEarning.level).toBe(5);

    // Spending most of it must not demote the member.
    applyLedgerEntry({
      userId: session.userId,
      amount: -5_500,
      type: 'SPEND',
      description: 'Test spend',
    });
    const afterSpending = getBalance(session.userId);

    expect(afterSpending.balance).toBe(500);
    expect(afterSpending.level).toBe(5);
    expect(afterSpending.lifetimeEarned).toBe(6_000);
    expect(afterSpending.lifetimeSpent).toBe(5_500);
  });

  it('refuses to let a balance go negative', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 100);

    expect(() =>
      applyLedgerEntry({
        userId: session.userId,
        amount: -500,
        type: 'SPEND',
        description: 'Too much',
      }),
    ).toThrowError(/enough credits/i);

    expect(getBalance(session.userId).balance).toBe(100);
  });

  it('rejects a zero-value movement', async () => {
    const session = await registerMember();
    expect(() =>
      applyLedgerEntry({ userId: session.userId, amount: 0, type: 'BONUS', description: 'Nothing' }),
    ).toThrowError();
  });

  it('is not readable without a session', async () => {
    await request(app()).get('/credits').expect(401);
  });

  it('never exposes another member’s balance', async () => {
    const first = await registerMember();
    const second = await registerMember();
    grantCredits(first.userId, 5_000);

    const response = await request(app()).get('/credits').set(auth(second)).expect(200);
    expect(response.body.balance.balance).toBe(0);
  });
});

describe('credit transactions', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('records the running balance on every entry', async () => {
    const session = await registerMember();

    applyLedgerEntry({ userId: session.userId, amount: 1_000, type: 'BONUS', description: 'One' });
    applyLedgerEntry({ userId: session.userId, amount: 250, type: 'EARN', description: 'Two' });
    applyLedgerEntry({ userId: session.userId, amount: -400, type: 'SPEND', description: 'Three' });

    const response = await request(app()).get('/credits').set(auth(session)).expect(200);
    const transactions = response.body.transactions as { description: string; balanceAfter: number }[];

    expect(transactions).toHaveLength(3);
    // Newest first.
    expect(transactions[0]).toMatchObject({ description: 'Three', balanceAfter: 850 });
    expect(transactions[1]).toMatchObject({ description: 'Two', balanceAfter: 1_250 });
    expect(transactions[2]).toMatchObject({ description: 'One', balanceAfter: 1_000 });
    expect(response.body.balance.balance).toBe(850);
  });

  it('keeps the ledger and the cached balance in agreement', async () => {
    const session = await registerMember();
    applyLedgerEntry({ userId: session.userId, amount: 1_000, type: 'BONUS', description: 'Opening' });

    for (let index = 0; index < 12; index += 1) {
      applyLedgerEntry({
        userId: session.userId,
        amount: index % 3 === 0 ? -50 : 200,
        type: index % 3 === 0 ? 'SPEND' : 'EARN',
        description: `Movement ${index}`,
      });
    }

    const sum = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM credit_transactions WHERE user_id = ?`)
      .get(session.userId) as { total: number };

    expect(getBalance(session.userId).balance).toBe(sum.total);
  });

  it('paginates with a cursor', async () => {
    const session = await registerMember();
    for (let index = 0; index < 5; index += 1) {
      applyLedgerEntry({
        userId: session.userId,
        amount: 100,
        type: 'EARN',
        description: `Entry ${index}`,
      });
    }

    const first = await request(app()).get('/credits?limit=2').set(auth(session)).expect(200);
    expect(first.body.transactions).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();
  });
});
