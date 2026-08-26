import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { app, resetDatabase } from './helpers.ts';
import { db } from '../src/db/index.ts';
import * as mailer from '../src/lib/mailer.ts';

/**
 * Email verification.
 *
 * The transport is stubbed, but everything either side of it is real: the token is
 * issued, hashed, stored, mailed, consumed and recorded exactly as in production. The
 * link asserted on here is the one an inbox would receive.
 */

/** Captures what `sendMail` was handed, and reports a successful delivery. */
function captureSends() {
  const sent: mailer.Mail[] = [];
  vi.spyOn(mailer, 'sendMail').mockImplementation(async (mail) => {
    sent.push(mail);
    return { status: 'SENT', transport: 'smtp', providerId: `stub-${sent.length}` };
  });
  vi.spyOn(mailer, 'isEmailConfigured').mockReturnValue(true);
  return sent;
}

const REGISTRATION = {
  email: 'neu@example.de',
  password: 'passwort12345',
  username: 'neues_mitglied',
  acceptedTerms: true as const,
};

/** Pulls the verification token out of the link in the message body. */
function tokenFrom(mail: mailer.Mail): string {
  const match = /token=([A-Za-z0-9_-]+)/.exec(mail.text);
  if (!match) throw new Error(`No token in mail: ${mail.text}`);
  return match[1];
}

describe('registration email', () => {
  beforeEach(() => {
    resetDatabase();
    vi.restoreAllMocks();
  });

  it('creates the account and emails a confirmation link', async () => {
    const sent = captureSends();

    const response = await request(app()).post('/auth/register').send(REGISTRATION).expect(201);

    expect(response.body.emailVerification).toEqual({ required: true, sent: true, reason: null });
    expect(response.body.user.emailVerifiedAt).toBeNull();

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('neu@example.de');
    expect(sent[0].subject).toBe('Bestätige deine E-Mail-Adresse');
    expect(sent[0].text).toContain('neues_mitglied');
    expect(sent[0].html).toContain('/auth/verify-email?token=');
  });

  it('stores only the hash of the token, never the token itself', async () => {
    const sent = captureSends();
    await request(app()).post('/auth/register').send(REGISTRATION).expect(201);

    const token = tokenFrom(sent[0]);
    const rows = db.prepare(`SELECT token_hash FROM email_verifications`).all() as {
      token_hash: string;
    }[];

    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toBe(token);
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('records the delivery so a claimed send is always backed by a row', async () => {
    captureSends();
    await request(app()).post('/auth/register').send(REGISTRATION).expect(201);

    const rows = db.prepare(`SELECT kind, status, recipient FROM email_deliveries`).all();
    expect(rows).toEqual([
      { kind: 'VERIFY_EMAIL', status: 'SENT', recipient: 'neu@example.de' },
    ]);
  });

  it('reports honestly when no transport is configured', async () => {
    vi.spyOn(mailer, 'isEmailConfigured').mockReturnValue(false);
    vi.spyOn(mailer, 'sendMail').mockImplementation(async () => ({
      status: 'SKIPPED',
      transport: 'none',
      error: 'No email transport configured (set RESEND_API_KEY or SMTP_HOST).',
    }));

    const response = await request(app()).post('/auth/register').send(REGISTRATION).expect(201);

    // The account still exists — but nothing claims a message was sent.
    expect(response.body.user.email).toBe('neu@example.de');
    expect(response.body.emailVerification.sent).toBe(false);
    expect(response.body.emailVerification.reason).toMatch(/nicht eingerichtet/i);

    const [delivery] = db.prepare(`SELECT status FROM email_deliveries`).all() as { status: string }[];
    expect(delivery.status).toBe('SKIPPED');
  });

  it('records a failed delivery rather than swallowing it', async () => {
    vi.spyOn(mailer, 'isEmailConfigured').mockReturnValue(true);
    vi.spyOn(mailer, 'sendMail').mockImplementation(async () => ({
      status: 'FAILED',
      transport: 'smtp',
      error: 'Connection refused',
    }));

    const response = await request(app()).post('/auth/register').send(REGISTRATION).expect(201);
    expect(response.body.emailVerification.sent).toBe(false);

    const [delivery] = db.prepare(`SELECT status, error FROM email_deliveries`).all() as {
      status: string;
      error: string;
    }[];
    expect(delivery.status).toBe('FAILED');
    expect(delivery.error).toBe('Connection refused');
  });
});

describe('confirming an address', () => {
  beforeEach(() => {
    resetDatabase();
    vi.restoreAllMocks();
  });

  async function registerAndGetToken() {
    const sent = captureSends();
    const response = await request(app()).post('/auth/register').send(REGISTRATION).expect(201);
    return { token: tokenFrom(sent[0]), session: response.body, sent };
  }

  it('marks the account verified and sends the welcome message', async () => {
    const { token, sent } = await registerAndGetToken();

    const response = await request(app()).post('/auth/verify-email').send({ token }).expect(200);
    expect(response.body.verified).toBe(true);
    expect(response.body.alreadyVerified).toBe(false);
    expect(response.body.verifiedAt).toBeTruthy();

    expect(sent).toHaveLength(2);
    expect(sent[1].subject).toBe('Deine E-Mail ist bestätigt');
  });

  it('serves a page, not JSON, when the link is opened in a browser', async () => {
    const { token } = await registerAndGetToken();

    const response = await request(app()).get(`/auth/verify-email?token=${token}`).expect(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.text).toContain('E-Mail bestätigt');
  });

  it('treats a second tap on the same link as already done', async () => {
    const { token } = await registerAndGetToken();
    await request(app()).post('/auth/verify-email').send({ token }).expect(200);

    const again = await request(app()).post('/auth/verify-email').send({ token }).expect(200);
    expect(again.body.alreadyVerified).toBe(true);
  });

  it('rejects an unknown token', async () => {
    await request(app())
      .post('/auth/verify-email')
      .send({ token: 'a'.repeat(43) })
      .expect(400);
  });

  it('rejects an expired token', async () => {
    const { token } = await registerAndGetToken();
    db.prepare(`UPDATE email_verifications SET expires_at = '2020-01-01 00:00:00'`).run();

    await request(app()).post('/auth/verify-email').send({ token }).expect(400);
  });

  it('reports the verified state on the session afterwards', async () => {
    const { token } = await registerAndGetToken();
    await request(app()).post('/auth/verify-email').send({ token }).expect(200);

    const login = await request(app())
      .post('/auth/login')
      .send({ email: REGISTRATION.email, password: REGISTRATION.password })
      .expect(200);

    expect(login.body.user.emailVerifiedAt).toBeTruthy();
  });
});

describe('requesting a new link', () => {
  beforeEach(() => {
    resetDatabase();
    vi.restoreAllMocks();
  });

  it('invalidates the previous link so only the newest one works', async () => {
    const sent = captureSends();
    const registration = await request(app()).post('/auth/register').send(REGISTRATION).expect(201);
    const firstToken = tokenFrom(sent[0]);

    await request(app())
      .post('/auth/resend-verification')
      .set('authorization', `Bearer ${registration.body.accessToken}`)
      .expect(200);

    const secondToken = tokenFrom(sent[1]);
    expect(secondToken).not.toBe(firstToken);

    await request(app()).post('/auth/verify-email').send({ token: firstToken }).expect(400);
    await request(app()).post('/auth/verify-email').send({ token: secondToken }).expect(200);
  });

  it('does not send again once the address is confirmed', async () => {
    const sent = captureSends();
    const registration = await request(app()).post('/auth/register').send(REGISTRATION).expect(201);
    await request(app()).post('/auth/verify-email').send({ token: tokenFrom(sent[0]) }).expect(200);

    const countBefore = sent.length;
    const response = await request(app())
      .post('/auth/resend-verification')
      .set('authorization', `Bearer ${registration.body.accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ sent: false, alreadyVerified: true, reason: null });
    expect(sent).toHaveLength(countBefore);
  });

  it('requires a session', async () => {
    await request(app()).post('/auth/resend-verification').expect(401);
  });

  it('reports the current status to the app', async () => {
    captureSends();
    const registration = await request(app()).post('/auth/register').send(REGISTRATION).expect(201);

    const response = await request(app())
      .get('/auth/verification-status')
      .set('authorization', `Bearer ${registration.body.accessToken}`)
      .expect(200);

    expect(response.body.verified).toBe(false);
    expect(response.body.emailConfigured).toBe(true);
  });
});

describe('addresses in logs', () => {
  it('masks the local part', () => {
    expect(mailer.maskEmail('jason@jasonremix.de')).toBe('j***n@jasonremix.de');
    expect(mailer.maskEmail('a@b.de')).toBe('a***@b.de');
    expect(mailer.maskEmail('not-an-address')).toBe('***');
  });
});
