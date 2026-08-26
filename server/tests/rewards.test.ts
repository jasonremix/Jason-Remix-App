import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { db } from '../src/db/index.ts';
import {
  app,
  auth,
  grantCredits,
  idempotencyKey,
  registerMember,
  resetDatabase,
  seedReferenceData,
  type Session,
} from './helpers.ts';

const redeem = (session: Session, rewardId: string, key = idempotencyKey()) =>
  request(app())
    .post(`/rewards/${rewardId}/redeem`)
    .set({ ...auth(session), 'idempotency-key': key });

describe('reward redemption', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('debits the cost and creates a pending redemption', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 2_000);

    const response = await redeem(session, 'rwd-merch').expect(200);

    expect(response.body.transaction.amount).toBe(-1_000);
    expect(response.body.transaction.type).toBe('SPEND');
    expect(response.body.balance.balance).toBe(1_000);
    expect(response.body.redemption.status).toBe('PENDING');
    expect(response.body.redemption.rewardTitle).toBe('MERCH');
  });

  it('refuses when the balance is too low and changes nothing', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 500);

    const response = await redeem(session, 'rwd-merch').expect(409);
    expect(response.body.error.code).toBe('INSUFFICIENT_CREDITS');

    const credits = await request(app()).get('/credits').set(auth(session)).expect(200);
    expect(credits.body.balance.balance).toBe(500);

    const remaining = db.prepare(`SELECT remaining FROM rewards WHERE id = 'rwd-merch'`).get() as {
      remaining: number;
    };
    expect(remaining.remaining).toBe(5);
  });

  it('refuses a reward above the member’s level', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 12_000); // Enough credits, but level 6 needs 10,000 earned…
    db.prepare(`UPDATE credit_balances SET lifetime_earned = 1000 WHERE user_id = ?`).run(
      session.userId,
    );

    const response = await redeem(session, 'rwd-vip').expect(403);
    expect(response.body.error.message).toMatch(/level/i);
  });

  it('decrements stock and sells out exactly once', async () => {
    const first = await registerMember();
    const second = await registerMember();
    grantCredits(first.userId, 1_000);
    grantCredits(second.userId, 1_000);

    await redeem(first, 'rwd-single').expect(200);

    const soldOut = await redeem(second, 'rwd-single').expect(409);
    expect(soldOut.body.error.code).toBe('REWARD_UNAVAILABLE');

    // The second member keeps their credits.
    const credits = await request(app()).get('/credits').set(auth(second)).expect(200);
    expect(credits.body.balance.balance).toBe(1_000);
  });

  it('replays the original redemption for a repeated idempotency key', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 3_000);
    const key = idempotencyKey();

    const first = await redeem(session, 'rwd-merch', key).expect(200);
    const replay = await redeem(session, 'rwd-merch', key).expect(200);

    expect(replay.body.redemption.id).toBe(first.body.redemption.id);

    const credits = await request(app()).get('/credits').set(auth(session)).expect(200);
    expect(credits.body.balance.balance).toBe(2_000);
  });

  it('lists a member’s own redemptions and nobody else’s', async () => {
    const first = await registerMember();
    const second = await registerMember();
    grantCredits(first.userId, 1_000);

    await redeem(first, 'rwd-merch').expect(200);

    const mine = await request(app()).get('/rewards').set(auth(first)).expect(200);
    const theirs = await request(app()).get('/rewards').set(auth(second)).expect(200);

    expect(mine.body.redemptions).toHaveLength(1);
    expect(theirs.body.redemptions).toHaveLength(0);
  });

  it('requires a session', async () => {
    await request(app()).get('/rewards').expect(401);
  });
});
