import { createHash, randomBytes } from 'node:crypto';

import { db } from '../db/index.ts';
import { env } from '../env.ts';
import { ApiError } from '../lib/errors.ts';
import { sendMail, type SendResult } from '../lib/mailer.ts';
import { newId } from '../lib/crypto.ts';
import { toIso } from './credits.service.ts';
import { findUserById } from './users.service.ts';

/**
 * Account emails.
 *
 * Two messages exist: the address confirmation sent at registration, and the welcome
 * that follows once the address is confirmed. Both are recorded in `email_deliveries`
 * before anything reports them as sent, so "we emailed you" is always backed by a row.
 *
 * Verification tokens are stored as SHA-256 hashes. The plaintext exists only inside
 * the link in the member's inbox, so a database dump cannot be used to confirm
 * somebody else's address.
 */

const TOKEN_BYTES = 32;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export type VerificationOutcome = {
  /** True only when a message genuinely left the process. */
  sent: boolean;
  /** Why it did not, when it did not — safe to show a member. */
  reason: string | null;
};

// --- Delivery log --------------------------------------------------------------------

function recordDelivery(entry: {
  userId: string | null;
  recipient: string;
  kind: 'VERIFY_EMAIL' | 'WELCOME' | 'EMAIL_CHANGED';
  subject: string;
  result: SendResult;
}): void {
  db.prepare(
    `INSERT INTO email_deliveries (id, user_id, recipient, kind, subject, transport, status, provider_id, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    newId(),
    entry.userId,
    entry.recipient,
    entry.kind,
    entry.subject,
    entry.result.transport,
    entry.result.status,
    entry.result.status === 'SENT' ? entry.result.providerId : null,
    entry.result.status === 'SENT' ? null : entry.result.error,
  );
}

export type EmailDelivery = {
  id: string;
  recipient: string;
  kind: string;
  subject: string;
  transport: string;
  status: string;
  error: string | null;
  createdAt: string;
};

/** The delivery log, newest first. Read by the admin area. */
export function listDeliveries(limit = 50): EmailDelivery[] {
  const rows = db
    .prepare(
      `SELECT id, recipient, kind, subject, transport, status, error, created_at
         FROM email_deliveries ORDER BY created_at DESC LIMIT ?`,
    )
    .all(Math.min(limit, 200)) as {
    id: string;
    recipient: string;
    kind: string;
    subject: string;
    transport: string;
    status: string;
    error: string | null;
    created_at: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    recipient: row.recipient,
    kind: row.kind,
    subject: row.subject,
    transport: row.transport,
    status: row.status,
    error: row.error,
    createdAt: toIso(row.created_at),
  }));
}

// --- Templates -----------------------------------------------------------------------

/**
 * One shared shell for both messages.
 *
 * Email clients ignore most of a stylesheet, so everything is inline and the layout is
 * a single centred table — the same paper ground, ultramarine accent and heavy
 * headline the app uses, rendered with what an inbox actually supports.
 */
function shell({ heading, body, action }: { heading: string; body: string; action?: { label: string; url: string } }) {
  const button = action
    ? `<tr><td style="padding:8px 0 28px">
         <a href="${action.url}"
            style="display:inline-block;background:#001EC8;color:#FFFFFF;text-decoration:none;
                   font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;
                   letter-spacing:1px;padding:16px 28px">${action.label}</a>
       </td></tr>`
    : '';

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${heading}</title></head>
<body style="margin:0;padding:0;background:#F0F1F3">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F1F3">
  <tr><td align="center" style="padding:40px 20px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="max-width:520px;background:#FFFFFF;border:1px solid #D9DCE1">
      <tr><td style="padding:32px 32px 0">
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;
                    letter-spacing:-0.8px;color:#0D0E11">JASON REMIX</div>
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;
                    color:#6B7078;padding-top:6px">DIE OFFIZIELLE APP</div>
      </td></tr>
      <tr><td style="padding:28px 32px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:24px;font-weight:800;
                         letter-spacing:-0.6px;color:#0D0E11;padding-bottom:16px">${heading}</td></tr>
          <tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;
                         color:#3A3E45;padding-bottom:24px">${body}</td></tr>
          ${button}
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 32px">
        <div style="border-top:1px solid #D9DCE1;padding-top:20px;
                    font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#6B7078">
          Diese E-Mail wurde an dich verschickt, weil mit deiner Adresse ein Konto in der
          Jason-Remix-App angelegt wurde. Wenn du das nicht warst, kannst du diese Nachricht
          ignorieren — ohne Bestätigung passiert mit der Adresse nichts.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function verificationMail(username: string, link: string) {
  return {
    subject: 'Bestätige deine E-Mail-Adresse',
    html: shell({
      heading: `Willkommen, ${escapeHtml(username)}.`,
      body:
        'Dein Konto ist angelegt. Bestätige noch kurz deine E-Mail-Adresse — danach kannst du ' +
        'Credits sammeln, Prämien einlösen und an Gewinnspielen teilnehmen.<br><br>' +
        `Der Link gilt ${Math.round(env.email.verificationTtlSeconds / 3600)} Stunden.`,
      action: { label: 'E-MAIL BESTÄTIGEN', url: link },
    }),
    text: [
      `Willkommen, ${username}.`,
      '',
      'Dein Konto ist angelegt. Bestätige noch kurz deine E-Mail-Adresse:',
      link,
      '',
      `Der Link gilt ${Math.round(env.email.verificationTtlSeconds / 3600)} Stunden.`,
      '',
      'Wenn du kein Konto angelegt hast, kannst du diese Nachricht ignorieren.',
    ].join('\n'),
  };
}

function welcomeMail(username: string) {
  return {
    subject: 'Deine E-Mail ist bestätigt',
    html: shell({
      heading: 'Alles klar.',
      body:
        `Deine Adresse ist bestätigt, ${escapeHtml(username)} — dein Konto ist damit vollständig ` +
        'freigeschaltet.<br><br>' +
        'Öffne die App, um deine ersten Missionen zu erledigen. Jede erledigte Mission bringt ' +
        'Jason Credits, und die wiederum schalten Prämien und Lose für Gewinnspiele frei.',
    }),
    text: [
      'Alles klar.',
      '',
      `Deine Adresse ist bestätigt, ${username} — dein Konto ist vollständig freigeschaltet.`,
      '',
      'Öffne die App, um deine ersten Missionen zu erledigen. Jede erledigte Mission bringt',
      'Jason Credits, und die schalten Prämien und Lose für Gewinnspiele frei.',
    ].join('\n'),
  };
}

/** Minimal escaping — a username reaches the template, and it is member-supplied. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Verification --------------------------------------------------------------------

/** The link that goes into the email. It lands on the API, not on the app. */
export function verificationLink(token: string): string {
  return `${env.publicBaseUrl.replace(/\/$/, '')}/auth/verify-email?token=${token}`;
}

/**
 * Issues a fresh verification token and emails it.
 *
 * Any earlier unconsumed token for the account is invalidated first, so only the most
 * recent link in an inbox works.
 */
export async function sendVerificationEmail(userId: string): Promise<VerificationOutcome> {
  const user = findUserById(userId);
  if (!user) throw new ApiError('NOT_FOUND', 'Dieses Konto gibt es nicht.');

  const profile = db.prepare(`SELECT username FROM user_profiles WHERE user_id = ?`).get(userId) as
    | { username: string }
    | undefined;

  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + env.email.verificationTtlSeconds * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  db.prepare(
    `UPDATE email_verifications SET consumed_at = datetime('now')
      WHERE user_id = ? AND consumed_at IS NULL`,
  ).run(userId);

  db.prepare(
    `INSERT INTO email_verifications (id, user_id, email, token_hash, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(newId(), userId, user.email, sha256(token), expiresAt);

  const mail = verificationMail(profile?.username ?? 'Mitglied', verificationLink(token));
  const result = await sendMail({ to: user.email, ...mail });

  recordDelivery({
    userId,
    recipient: user.email,
    kind: 'VERIFY_EMAIL',
    subject: mail.subject,
    result,
  });

  if (result.status === 'SENT') return { sent: true, reason: null };
  if (result.status === 'SKIPPED') {
    return {
      sent: false,
      reason: 'Der E-Mail-Versand ist auf diesem Server noch nicht eingerichtet.',
    };
  }
  return { sent: false, reason: 'Die Bestätigungsmail konnte gerade nicht zugestellt werden.' };
}

/**
 * Consumes a verification token.
 *
 * Returns the account it belonged to. An expired, unknown or already-used token is
 * rejected with the same message, so this cannot be used to probe which links exist.
 */
export function consumeVerificationToken(token: string): { userId: string; alreadyVerified: boolean } {
  const presented = sha256(token);

  const row = db
    .prepare(
      `SELECT id, user_id, expires_at, consumed_at FROM email_verifications WHERE token_hash = ?`,
    )
    .get(presented) as
    | { id: string; user_id: string; expires_at: string; consumed_at: string | null }
    | undefined;

  const invalid = new ApiError(
    'BAD_REQUEST',
    'Dieser Bestätigungslink ist ungültig oder abgelaufen. Fordere in der App einen neuen an.',
  );

  if (!row) throw invalid;

  if (row.consumed_at) {
    const user = findUserById(row.user_id);
    // A member who taps the same link twice should land on "already done", not an error.
    if (user && isVerified(row.user_id)) return { userId: row.user_id, alreadyVerified: true };
    throw invalid;
  }

  if (new Date(`${row.expires_at.replace(' ', 'T')}Z`).getTime() < Date.now()) throw invalid;

  db.prepare(`UPDATE email_verifications SET consumed_at = datetime('now') WHERE id = ?`).run(row.id);
  db.prepare(`UPDATE users SET email_verified_at = datetime('now'), updated_at = datetime('now')
               WHERE id = ? AND email_verified_at IS NULL`).run(row.user_id);

  return { userId: row.user_id, alreadyVerified: false };
}

export function isVerified(userId: string): boolean {
  const row = db.prepare(`SELECT email_verified_at FROM users WHERE id = ?`).get(userId) as
    | { email_verified_at: string | null }
    | undefined;
  return Boolean(row?.email_verified_at);
}

export function verifiedAt(userId: string): string | null {
  const row = db.prepare(`SELECT email_verified_at FROM users WHERE id = ?`).get(userId) as
    | { email_verified_at: string | null }
    | undefined;
  return row?.email_verified_at ? toIso(row.email_verified_at) : null;
}

/** Sent once, after the address is confirmed. A failure here never blocks anything. */
export async function sendWelcomeEmail(userId: string): Promise<void> {
  const user = findUserById(userId);
  if (!user) return;

  const profile = db.prepare(`SELECT username FROM user_profiles WHERE user_id = ?`).get(userId) as
    | { username: string }
    | undefined;

  const mail = welcomeMail(profile?.username ?? 'Mitglied');
  const result = await sendMail({ to: user.email, ...mail });

  recordDelivery({ userId, recipient: user.email, kind: 'WELCOME', subject: mail.subject, result });
}
