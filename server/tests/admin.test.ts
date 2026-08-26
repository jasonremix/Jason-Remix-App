import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import jwt from 'jsonwebtoken';

import { db } from '../src/db/index.ts';
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

const adminHeaders = (session: Session) => ({ ...auth(session), 'idempotency-key': idempotencyKey() });

/** Every admin route, exercised as an ordinary member. None may succeed. */
const ADMIN_ROUTES: [string, string, unknown][] = [
  ['get', '/admin/users', undefined],
  ['get', '/admin/audit', undefined],
  ['post', '/admin/credits/adjust', { userId: 'x', amount: 1_000_000, description: 'free money' }],
  ['post', '/admin/tracks', { title: 'Injected', releaseDate: '2026-01-01' }],
  ['post', '/admin/news', { title: 'Injected', body: 'Injected' }],
  ['post', '/admin/rewards', { title: 'Injected', cost: 1 }],
  ['post', '/admin/missions', { title: 'Injected', reward: 100 }],
  [
    'post',
    '/admin/giveaways',
    { title: 'Injected', startsAt: new Date().toISOString(), endsAt: new Date().toISOString(), entryCost: 1 },
  ],
  ['post', '/admin/giveaways/gwy-open/close', undefined],
  ['post', '/admin/giveaways/gwy-open/draw', undefined],
  ['post', '/admin/notifications', { title: 'Injected', body: 'Injected' }],
];

describe('unauthorised admin access', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('refuses every admin route to an ordinary member', async () => {
    const member = await registerMember();

    for (const [method, path, body] of ADMIN_ROUTES) {
      const response = await (request(app()) as never as Record<string, (p: string) => request.Test>)
        [method](path)
        .set(adminHeaders(member))
        .send(body ?? {});

      expect(response.status, `${method.toUpperCase()} ${path}`).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('refuses every admin route with no session at all', async () => {
    for (const [method, path, body] of ADMIN_ROUTES) {
      const response = await (request(app()) as never as Record<string, (p: string) => request.Test>)
        [method](path)
        .set({ 'idempotency-key': idempotencyKey() })
        .send(body ?? {});

      expect(response.status, `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });

  it('ignores an ADMIN claim in a token when the account is not an administrator', async () => {
    const member = await registerMember();

    // Correctly signed, but the role claim is a lie: the database is what decides.
    const forged = jwt.sign({ sub: member.userId, role: 'ADMIN' }, process.env.JWT_SECRET as string, {
      issuer: 'jason-remix-api',
      expiresIn: 3600,
    });

    const response = await request(app())
      .get('/admin/users')
      .set({ Authorization: `Bearer ${forged}` })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('stops honouring an existing admin token after a demotion', async () => {
    const admin = await registerMember();
    promoteToAdmin(admin.userId);
    await request(app()).get('/admin/users').set(auth(admin)).expect(200);

    db.prepare(`UPDATE users SET role = 'USER' WHERE id = ?`).run(admin.userId);
    await request(app()).get('/admin/users').set(auth(admin)).expect(403);
  });

  it('does not let a member grant themselves credits', async () => {
    const member = await registerMember();

    await request(app())
      .post('/admin/credits/adjust')
      .set(adminHeaders(member))
      .send({ userId: member.userId, amount: 999_999, description: 'self-service' })
      .expect(403);

    const credits = await request(app()).get('/credits').set(auth(member)).expect(200);
    expect(credits.body.balance.balance).toBe(0);
  });
});

describe('administration', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('adjusts a member’s credits and writes an audit entry', async () => {
    const member = await registerMember();
    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    const response = await request(app())
      .post('/admin/credits/adjust')
      .set(adminHeaders(admin))
      .send({ userId: member.userId, amount: 1_500, description: 'Goodwill correction' })
      .expect(200);

    expect(response.body.balance.balance).toBe(1_500);
    expect(response.body.transaction.type).toBe('ADMIN_ADJUSTMENT');

    const audit = await request(app()).get('/admin/audit').set(auth(admin)).expect(200);
    const entry = (audit.body.entries as { action: string; targetId: string }[])[0];
    expect(entry.action).toBe('credits.adjust');
    expect(entry.targetId).toBe(member.userId);
  });

  it('cannot push a balance below zero with a negative adjustment', async () => {
    const member = await registerMember();
    grantCredits(member.userId, 100);

    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    const response = await request(app())
      .post('/admin/credits/adjust')
      .set(adminHeaders(admin))
      .send({ userId: member.userId, amount: -5_000, description: 'Clawback' })
      .expect(409);

    expect(response.body.error.code).toBe('INSUFFICIENT_CREDITS');
  });

  it('suspends a member and ends their session immediately', async () => {
    const member = await registerMember();
    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    await request(app())
      .post(`/admin/users/${member.userId}/status`)
      .set(adminHeaders(admin))
      .send({ status: 'BANNED' })
      .expect(204);

    const response = await request(app()).get('/me').set(auth(member)).expect(403);
    expect(response.body.error.code).toBe('ACCOUNT_BANNED');

    await request(app()).post('/auth/refresh').send({ refreshToken: member.refreshToken }).expect(401);
  });

  it('records the administrator behind every catalogue change', async () => {
    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    await request(app())
      .post('/admin/tracks')
      .set(adminHeaders(admin))
      .send({ title: 'New Single', releaseDate: '2026-09-01', featured: true, links: {} })
      .expect(200);

    const audit = await request(app()).get('/admin/audit').set(auth(admin)).expect(200);
    const entry = (audit.body.entries as { action: string; adminEmail: string }[])[0];
    expect(entry.action).toBe('track.upsert');
    expect(entry.adminEmail).toBe(admin.email);
  });

  it('keeps exactly one featured release', async () => {
    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    await request(app())
      .post('/admin/tracks')
      .set(adminHeaders(admin))
      .send({ title: 'Newer Single', releaseDate: '2026-09-01', featured: true, links: {} })
      .expect(200);

    const featured = db.prepare(`SELECT COUNT(*) AS count FROM tracks WHERE featured = 1`).get() as {
      count: number;
    };
    expect(featured.count).toBe(1);
  });

  it('validates admin input rather than trusting it', async () => {
    const admin = await registerMember();
    promoteToAdmin(admin.userId);

    await request(app())
      .post('/admin/credits/adjust')
      .set(adminHeaders(admin))
      .send({ userId: admin.userId, amount: 0, description: 'Nothing at all' })
      .expect(400);

    await request(app())
      .post('/admin/rewards')
      .set(adminHeaders(admin))
      .send({ title: 'Broken', cost: -5 })
      .expect(400);
  });
});

describe('account deletion', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('erases the account and everything attached to it', async () => {
    const member = await registerMember();
    grantCredits(member.userId, 2_000);

    await request(app())
      .post(`/giveaways/gwy-open/enter`)
      .set({ ...auth(member), 'idempotency-key': idempotencyKey() })
      .send({ entries: 1 })
      .expect(200);

    await request(app()).post('/me/delete').set(auth(member)).expect(204);

    expect(db.prepare(`SELECT 1 FROM users WHERE id = ?`).get(member.userId)).toBeUndefined();
    expect(
      db.prepare(`SELECT 1 FROM credit_transactions WHERE user_id = ?`).get(member.userId),
    ).toBeUndefined();
    expect(
      db.prepare(`SELECT 1 FROM giveaway_entries WHERE user_id = ?`).get(member.userId),
    ).toBeUndefined();

    await request(app()).get('/me').set(auth(member)).expect(401);
  });

  it('exports the member’s data without any credential material', async () => {
    const member = await registerMember();
    grantCredits(member.userId, 300);

    const response = await request(app()).get('/me/export').set(auth(member)).expect(200);

    expect(response.body.user.email).toBe(member.email);
    expect(response.body.creditTransactions.length).toBeGreaterThan(0);

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain('scrypt');
    expect(serialised).not.toContain('password');
    expect(serialised).not.toContain('token_cipher');
  });
});
