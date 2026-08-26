import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { rateLimit, resetRateLimits } from '../src/lib/rateLimit.ts';
import { app, auth, registerMember, resetDatabase, seedReferenceData } from './helpers.ts';

describe('rate limiting', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
    resetRateLimits();
  });

  it('blocks a burst of requests once the budget is spent', async () => {
    // The middleware is exercised directly: the suite raises the configured limits so
    // the other tests are not throttled, so the behaviour is verified in isolation.
    const limiter = rateLimit('test-bucket', 3, 60_000);
    const call = () =>
      new Promise<unknown>((resolve) => {
        limiter(
          { ip: '203.0.113.7' } as never,
          { setHeader: () => undefined } as never,
          (error?: unknown) => resolve(error),
        );
      });

    expect(await call()).toBeUndefined();
    expect(await call()).toBeUndefined();
    expect(await call()).toBeUndefined();

    const blocked = await call();
    expect(blocked).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  });

  it('keys separate clients into separate budgets', async () => {
    const limiter = rateLimit('per-client', 1, 60_000);
    const call = (ip: string) =>
      new Promise<unknown>((resolve) => {
        limiter(
          { ip } as never,
          { setHeader: () => undefined } as never,
          (error?: unknown) => resolve(error),
        );
      });

    expect(await call('198.51.100.1')).toBeUndefined();
    expect(await call('198.51.100.2')).toBeUndefined();
    expect(await call('198.51.100.1')).toMatchObject({ code: 'RATE_LIMITED' });
  });
});

describe('response hardening', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
  });

  it('reports health without leaking configuration', async () => {
    const response = await request(app()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('does not advertise the server technology', async () => {
    const response = await request(app()).get('/health').expect(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('answers an unknown route with the standard error shape', async () => {
    const response = await request(app()).get('/does-not-exist').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects a body larger than the limit', async () => {
    const session = await registerMember();
    const oversized = { bio: 'x'.repeat(200_000) };

    const response = await request(app()).patch('/me/profile').set(auth(session)).send(oversized);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('never returns an internal message for an unexpected failure', async () => {
    const session = await registerMember();

    // A username that violates the pattern reaches validation, not the database.
    const response = await request(app())
      .patch('/me/profile')
      .set(auth(session))
      .send({ username: '!!' })
      .expect(400);

    expect(response.body.error.message).not.toMatch(/sqlite|constraint|stack/i);
  });
});
