import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { db } from '../src/db/index.ts';
import { drawGiveaway } from '../src/services/giveaways.service.ts';
import {
  app,
  auth,
  grantCredits,
  idempotencyKey,
  promoteToAdmin,
  registerMember,
  resetDatabase,
  seedReferenceData,
  type Session,
} from './helpers.ts';

const enter = (session: Session, giveawayId: string, entries = 1, key = idempotencyKey()) =>
  request(app())
    .post(`/giveaways/${giveawayId}/enter`)
    .set({ ...auth(session), 'idempotency-key': key })
    .send({ entries });

describe('giveaway entry', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('creates an entry and debits the cost', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 2_000);

    const response = await enter(session, 'gwy-open').expect(200);

    expect(response.body.transaction.amount).toBe(-500);
    expect(response.body.balance.balance).toBe(1_500);
    expect(response.body.entry.status).toBe('ACTIVE');
    expect(response.body.giveaway.myEntries).toBe(1);
  });

  it('charges per entry when several are bought at once', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 2_000);

    const response = await enter(session, 'gwy-open', 3).expect(200);

    expect(response.body.transaction.amount).toBe(-1_500);
    expect(response.body.giveaway.myEntries).toBe(3);

    const entries = db
      .prepare(`SELECT COUNT(*) AS count FROM giveaway_entries WHERE user_id = ?`)
      .get(session.userId) as { count: number };
    expect(entries.count).toBe(3);
  });

  it('enforces the per-member entry limit', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 10_000);

    await enter(session, 'gwy-open', 3).expect(200);

    const response = await enter(session, 'gwy-open', 1).expect(409);
    expect(response.body.error.code).toBe('GIVEAWAY_ENTRY_LIMIT');
  });

  it('refuses a closed giveaway', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 2_000);

    const response = await enter(session, 'gwy-closed').expect(409);
    expect(response.body.error.code).toBe('GIVEAWAY_CLOSED');

    const credits = await request(app()).get('/credits').set(auth(session)).expect(200);
    expect(credits.body.balance.balance).toBe(2_000);
  });

  it('refuses when the balance is too low', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 100);

    const response = await enter(session, 'gwy-open').expect(409);
    expect(response.body.error.code).toBe('INSUFFICIENT_CREDITS');

    const entries = db
      .prepare(`SELECT COUNT(*) AS count FROM giveaway_entries WHERE user_id = ?`)
      .get(session.userId) as { count: number };
    expect(entries.count).toBe(0);
  });

  it('replays the original entry for a repeated idempotency key', async () => {
    const session = await registerMember();
    grantCredits(session.userId, 5_000);
    const key = idempotencyKey();

    const first = await enter(session, 'gwy-open', 1, key).expect(200);
    const replay = await enter(session, 'gwy-open', 1, key).expect(200);

    expect(replay.body.entry.id).toBe(first.body.entry.id);

    const entries = db
      .prepare(`SELECT COUNT(*) AS count FROM giveaway_entries WHERE user_id = ?`)
      .get(session.userId) as { count: number };
    expect(entries.count).toBe(1);
  });

  it('does not expose other members’ entries', async () => {
    const first = await registerMember();
    const second = await registerMember();
    grantCredits(first.userId, 2_000);

    await enter(first, 'gwy-open').expect(200);

    const response = await request(app()).get('/giveaways').set(auth(second)).expect(200);
    expect(response.body.entries).toHaveLength(0);

    const giveaway = (response.body.giveaways as { id: string; myEntries: number }[]).find(
      (entry) => entry.id === 'gwy-open',
    );
    expect(giveaway?.myEntries).toBe(0);
  });

  it('respects the overall entry capacity', async () => {
    db.prepare(`UPDATE giveaways SET total_entries = 2, entries_used = 1 WHERE id = 'gwy-open'`).run();

    const session = await registerMember();
    grantCredits(session.userId, 5_000);

    await enter(session, 'gwy-open', 1).expect(200);
    const overflow = await enter(session, 'gwy-open', 1).expect(409);
    expect(overflow.body.error.code).toBe('GIVEAWAY_CLOSED');
  });
});

describe('giveaway draw', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('is refused while the giveaway is still open', async () => {
    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    const response = await request(app())
      .post('/admin/giveaways/gwy-open/draw')
      .set({ ...auth(admin), 'idempotency-key': idempotencyKey() })
      .expect(400);

    expect(response.body.error.message).toMatch(/Schließe das Gewinnspiel/i);
  });

  it('selects winners from the recorded entries and records the draw', async () => {
    const members: Session[] = [];
    for (let index = 0; index < 5; index += 1) {
      const member = await registerMember();
      grantCredits(member.userId, 1_000);
      await enter(member, 'gwy-open').expect(200);
      members.push(member);
    }

    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    db.prepare(`UPDATE giveaways SET status = 'CLOSED' WHERE id = 'gwy-open'`).run();
    const result = drawGiveaway('gwy-open', admin.userId);

    expect(result.winners).toHaveLength(1);
    expect(members.map((member) => member.userId)).toContain(result.winners[0].userId);
    expect(result.drawSeedHash).toMatch(/^[0-9a-f]{64}$/);

    const record = db.prepare(`SELECT * FROM giveaway_draws WHERE giveaway_id = 'gwy-open'`).get() as {
      entry_count: number;
      seed_hash: string;
    };
    expect(record.entry_count).toBe(5);
    expect(record.seed_hash).toBe(result.drawSeedHash);

    const statuses = db
      .prepare(`SELECT status, COUNT(*) AS count FROM giveaway_entries GROUP BY status`)
      .all() as { status: string; count: number }[];
    expect(statuses.find((row) => row.status === 'WON')?.count).toBe(1);
    expect(statuses.find((row) => row.status === 'LOST')?.count).toBe(4);
  });

  it('cannot be drawn twice', async () => {
    const member = await registerMember();
    grantCredits(member.userId, 1_000);
    await enter(member, 'gwy-open').expect(200);

    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    db.prepare(`UPDATE giveaways SET status = 'CLOSED' WHERE id = 'gwy-open'`).run();
    drawGiveaway('gwy-open', admin.userId);

    expect(() => drawGiveaway('gwy-open', admin.userId)).toThrowError(/bereits gezogen/i);
  });

  it('never gives one member two prizes', async () => {
    const greedy = await registerMember();
    grantCredits(greedy.userId, 5_000);
    await enter(greedy, 'gwy-open', 3).expect(200);

    const other = await registerMember();
    grantCredits(other.userId, 1_000);
    await enter(other, 'gwy-open', 1).expect(200);

    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    db.prepare(`UPDATE giveaways SET status = 'CLOSED', winner_count = 2 WHERE id = 'gwy-open'`).run();
    const result = drawGiveaway('gwy-open', admin.userId);

    const winnerIds = result.winners.map((winner) => winner.userId);
    expect(new Set(winnerIds).size).toBe(winnerIds.length);
    expect(winnerIds).toHaveLength(2);
  });

  it('refunds every entry when a giveaway is cancelled', async () => {
    const member = await registerMember();
    grantCredits(member.userId, 2_000);
    await enter(member, 'gwy-open', 2).expect(200);

    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    await request(app())
      .post('/admin/giveaways/gwy-open/cancel')
      .set({ ...auth(admin), 'idempotency-key': idempotencyKey() })
      .expect(200);

    const credits = await request(app()).get('/credits').set(auth(member)).expect(200);
    expect(credits.body.balance.balance).toBe(2_000);
  });
});
