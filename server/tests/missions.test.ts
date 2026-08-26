import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { db } from '../src/db/index.ts';
import {
  app,
  auth,
  idempotencyKey,
  registerMember,
  resetDatabase,
  seedReferenceData,
  type Session,
} from './helpers.ts';

const claim = (session: Session, missionId: string, key = idempotencyKey()) =>
  request(app())
    .post(`/missions/${missionId}/claim`)
    .set({ ...auth(session), 'idempotency-key': key });

describe('mission completion', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('awards the mission’s credits and records the ledger entry', async () => {
    const session = await registerMember();

    const response = await claim(session, 'msn-daily').expect(200);

    expect(response.body.transaction.amount).toBe(100);
    expect(response.body.transaction.type).toBe('EARN');
    expect(response.body.transaction.balanceAfter).toBe(100);
    expect(response.body.balance.balance).toBe(100);
    expect(response.body.mission.status).toBe('COOLDOWN');
  });

  it('puts a repeatable mission on cooldown and refuses a second claim', async () => {
    const session = await registerMember();
    await claim(session, 'msn-daily').expect(200);

    const second = await claim(session, 'msn-daily').expect(409);
    expect(second.body.error.code).toBe('MISSION_ON_COOLDOWN');

    const credits = await request(app()).get('/credits').set(auth(session)).expect(200);
    expect(credits.body.balance.balance).toBe(100);
  });

  it('allows a repeatable mission again once the cooldown has passed', async () => {
    const session = await registerMember();
    await claim(session, 'msn-daily').expect(200);

    // Move the recorded completion back beyond the 24-hour cooldown.
    db.prepare(
      `UPDATE mission_completions SET completed_at = datetime('now', '-2 days') WHERE user_id = ?`,
    ).run(session.userId);

    const again = await claim(session, 'msn-daily').expect(200);
    expect(again.body.balance.balance).toBe(200);
  });

  it('refuses a second claim of a one-off mission', async () => {
    const session = await registerMember();
    await claim(session, 'msn-release').expect(200);

    const second = await claim(session, 'msn-release').expect(409);
    expect(second.body.error.code).toBe('MISSION_ALREADY_COMPLETED');
  });

  it('will not award the Spotify mission without a real connection', async () => {
    const session = await registerMember();

    const response = await claim(session, 'msn-spotify').expect(400);
    expect(response.body.error.message).toMatch(/connect spotify/i);

    const credits = await request(app()).get('/credits').set(auth(session)).expect(200);
    expect(credits.body.balance.balance).toBe(0);
  });

  it('returns the original award when the same idempotency key is replayed', async () => {
    const session = await registerMember();
    const key = idempotencyKey();

    const first = await claim(session, 'msn-daily', key).expect(200);
    const replay = await claim(session, 'msn-daily', key).expect(200);

    expect(replay.body.transaction.id).toBe(first.body.transaction.id);

    // Crucially, the replay did not award a second time.
    const credits = await request(app()).get('/credits').set(auth(session)).expect(200);
    expect(credits.body.balance.balance).toBe(100);
    expect(credits.body.transactions).toHaveLength(1);
  });

  it('rejects a claim with no idempotency key', async () => {
    const session = await registerMember();
    await request(app()).post('/missions/msn-daily/claim').set(auth(session)).expect(400);
  });

  it('ignores a client-supplied award amount', async () => {
    const session = await registerMember();

    const response = await request(app())
      .post('/missions/msn-daily/claim')
      .set({ ...auth(session), 'idempotency-key': idempotencyKey() })
      .send({ reward: 999_999, amount: 999_999 })
      .expect(200);

    expect(response.body.transaction.amount).toBe(100);
  });

  it('unlocks the achievement tied to the mission', async () => {
    const session = await registerMember();
    const response = await claim(session, 'msn-release').expect(200);

    const codes = (response.body.unlockedAchievements as { code: string }[]).map((a) => a.code);
    expect(codes).toContain('ZEITGEIST');
  });

  it('does not unlock the same achievement twice', async () => {
    const session = await registerMember();
    await claim(session, 'msn-release').expect(200);

    db.prepare(
      `UPDATE mission_completions SET completed_at = datetime('now', '-2 days') WHERE user_id = ?`,
    ).run(session.userId);

    const second = await claim(session, 'msn-daily').expect(200);
    const codes = (second.body.unlockedAchievements as { code: string }[]).map((a) => a.code);
    expect(codes).not.toContain('ZEITGEIST');
  });

  it('refuses a mission that does not exist', async () => {
    const session = await registerMember();
    await claim(session, 'msn-nonexistent').expect(404);
  });

  it('requires a session', async () => {
    await request(app())
      .post('/missions/msn-daily/claim')
      .set({ 'idempotency-key': idempotencyKey() })
      .expect(401);
  });
});
