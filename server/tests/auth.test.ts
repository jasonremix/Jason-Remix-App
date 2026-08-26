import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import jwt from 'jsonwebtoken';

import { app, auth, registerMember, resetDatabase, seedReferenceData } from './helpers.ts';

describe('registration', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('creates an account with a profile and a zero balance', async () => {
    const response = await request(app())
      .post('/auth/register')
      .send({
        email: 'New.Member@JasonRemix.test',
        password: 'correct-horse-9',
        username: 'new_member',
        acceptedTerms: true,
      })
      .expect(201);

    expect(response.body.user.email).toBe('new.member@jasonremix.test');
    expect(response.body.user.role).toBe('USER');
    expect(response.body.profile.username).toBe('new_member');
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();

    const me = await request(app())
      .get('/me')
      .set({ Authorization: `Bearer ${response.body.accessToken}` })
      .expect(200);

    expect(me.body.balance.balance).toBe(0);
    expect(me.body.balance.level).toBe(1);
  });

  it('never returns the password hash', async () => {
    const response = await request(app())
      .post('/auth/register')
      .send({
        email: 'hash@jasonremix.test',
        password: 'correct-horse-9',
        username: 'hash_member',
        acceptedTerms: true,
      })
      .expect(201);

    expect(JSON.stringify(response.body)).not.toContain('scrypt');
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a weak password with field-level detail', async () => {
    const response = await request(app())
      .post('/auth/register')
      .send({ email: 'weak@jasonremix.test', password: 'short', username: 'weak', acceptedTerms: true })
      .expect(400);

    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(response.body.error.details.password).toBeTruthy();
  });

  it('requires the terms to be accepted', async () => {
    await request(app())
      .post('/auth/register')
      .send({
        email: 'terms@jasonremix.test',
        password: 'correct-horse-9',
        username: 'terms_member',
        acceptedTerms: false,
      })
      .expect(400);
  });

  it('does not reveal whether an email or a username was the clash', async () => {
    await registerMember({ email: 'taken@jasonremix.test', username: 'taken_name' });

    const byEmail = await request(app())
      .post('/auth/register')
      .send({
        email: 'taken@jasonremix.test',
        password: 'correct-horse-9',
        username: 'other_name',
        acceptedTerms: true,
      })
      .expect(409);

    const byUsername = await request(app())
      .post('/auth/register')
      .send({
        email: 'other@jasonremix.test',
        password: 'correct-horse-9',
        username: 'taken_name',
        acceptedTerms: true,
      })
      .expect(409);

    expect(byEmail.body.error.message).toBe(byUsername.body.error.message);
  });
});

describe('login', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('signs in with correct credentials', async () => {
    await registerMember({ email: 'signin@jasonremix.test', password: 'correct-horse-9' });

    const response = await request(app())
      .post('/auth/login')
      .send({ email: 'signin@jasonremix.test', password: 'correct-horse-9' })
      .expect(200);

    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.user.email).toBe('signin@jasonremix.test');
  });

  it('rejects a wrong password', async () => {
    await registerMember({ email: 'wrong@jasonremix.test', password: 'correct-horse-9' });

    const response = await request(app())
      .post('/auth/login')
      .send({ email: 'wrong@jasonremix.test', password: 'not-the-password-1' })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('gives the same answer for an unknown account as for a wrong password', async () => {
    await registerMember({ email: 'known@jasonremix.test', password: 'correct-horse-9' });

    const unknown = await request(app())
      .post('/auth/login')
      .send({ email: 'nobody@jasonremix.test', password: 'correct-horse-9' })
      .expect(401);

    const wrongPassword = await request(app())
      .post('/auth/login')
      .send({ email: 'known@jasonremix.test', password: 'wrong-password-1' })
      .expect(401);

    expect(unknown.body.error.message).toBe(wrongPassword.body.error.message);
  });

  it('refuses a suspended account', async () => {
    const session = await registerMember({ email: 'banned@jasonremix.test' });
    const { db } = await import('../src/db/index.ts');
    db.prepare(`UPDATE users SET status = 'BANNED' WHERE id = ?`).run(session.userId);

    const response = await request(app())
      .post('/auth/login')
      .send({ email: 'banned@jasonremix.test', password: 'correct-horse-9' })
      .expect(403);

    expect(response.body.error.code).toBe('ACCOUNT_BANNED');
  });
});

describe('token expiration', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('rejects an expired access token with TOKEN_EXPIRED', async () => {
    const session = await registerMember();

    const expired = jwt.sign({ sub: session.userId, role: 'USER' }, process.env.JWT_SECRET as string, {
      issuer: 'jason-remix-api',
      expiresIn: -60,
    });

    const response = await request(app())
      .get('/me')
      .set({ Authorization: `Bearer ${expired}` })
      .expect(401);

    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const session = await registerMember();
    const forged = jwt.sign({ sub: session.userId, role: 'ADMIN' }, 'not-the-real-secret', {
      issuer: 'jason-remix-api',
      expiresIn: 3600,
    });

    await request(app()).get('/me').set({ Authorization: `Bearer ${forged}` }).expect(401);
  });

  it('exchanges a refresh token and rotates it', async () => {
    const session = await registerMember();

    const refreshed = await request(app())
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    expect(refreshed.body.accessToken).toBeTruthy();
    expect(refreshed.body.refreshToken).not.toBe(session.refreshToken);

    // The original is now spent.
    await request(app()).post('/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
  });

  it('revokes every session when a rotated refresh token is replayed', async () => {
    const session = await registerMember();

    const refreshed = await request(app())
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    // Replaying the old token means it leaked: the new one must die with it.
    await request(app()).post('/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
    await request(app())
      .post('/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(401);
  });

  it('refuses a request with no token at all', async () => {
    await request(app()).get('/me').expect(401);
  });

  it('stops accepting a token once the account is suspended', async () => {
    const session = await registerMember();
    await request(app()).get('/me').set(auth(session)).expect(200);

    const { db } = await import('../src/db/index.ts');
    db.prepare(`UPDATE users SET status = 'BANNED' WHERE id = ?`).run(session.userId);

    const response = await request(app()).get('/me').set(auth(session)).expect(403);
    expect(response.body.error.code).toBe('ACCOUNT_BANNED');
  });
});
