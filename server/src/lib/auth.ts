import jwt from 'jsonwebtoken';

import { db } from '../db/index.ts';
import { env } from '../env.ts';
import { hashToken, newId, newOpaqueToken } from './crypto.ts';
import { ApiError, unauthorized } from './errors.ts';

/**
 * Session tokens.
 *
 * Access tokens are short-lived JWTs; refresh tokens are opaque, stored as hashes, and
 * rotated on every use. Reuse of an already-rotated refresh token revokes the whole
 * family — the standard defence against a stolen refresh token being replayed.
 */

export type AccessTokenClaims = {
  sub: string;
  role: 'USER' | 'ADMIN';
};

export function issueAccessToken(userId: string, role: 'USER' | 'ADMIN'): string {
  return jwt.sign({ sub: userId, role } satisfies AccessTokenClaims, env.jwtSecret, {
    expiresIn: env.accessTokenTtlSeconds,
    issuer: 'jason-remix-api',
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { issuer: 'jason-remix-api' });
    if (typeof decoded === 'string' || !decoded.sub) throw new Error('malformed');
    return { sub: String(decoded.sub), role: (decoded as AccessTokenClaims).role ?? 'USER' };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError('TOKEN_EXPIRED', 'Your session expired. Please sign in again.');
    }
    throw unauthorized();
  }
}

export function issueRefreshToken(userId: string): string {
  const token = newOpaqueToken();
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlSeconds * 1000).toISOString();

  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
  ).run(newId(), userId, hashToken(token), expiresAt);

  return token;
}

export type RefreshResult = { userId: string; role: 'USER' | 'ADMIN' };

/**
 * Consumes a refresh token and returns its owner. The token is revoked here; the caller
 * issues a replacement, so a token is never valid twice.
 */
export function consumeRefreshToken(token: string): RefreshResult {
  const hash = hashToken(token);
  const row = db
    .prepare(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.role, u.status
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = ?`,
    )
    .get(hash) as
    | { id: string; user_id: string; expires_at: string; revoked_at: string | null; role: 'USER' | 'ADMIN'; status: string }
    | undefined;

  if (!row) throw unauthorized();

  if (row.revoked_at) {
    // Presenting a revoked token means one leaked: drop every session for this account.
    revokeAllRefreshTokens(row.user_id);
    throw unauthorized();
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    throw new ApiError('TOKEN_EXPIRED', 'Your session expired. Please sign in again.');
  }

  if (row.status !== 'ACTIVE') {
    throw new ApiError('ACCOUNT_BANNED', 'Dieses Konto ist gesperrt.');
  }

  db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE id = ?`).run(row.id);
  return { userId: row.user_id, role: row.role };
}

export function revokeRefreshToken(token: string): void {
  db.prepare(
    `UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ? AND revoked_at IS NULL`,
  ).run(hashToken(token));
}

export function revokeAllRefreshTokens(userId: string): void {
  db.prepare(
    `UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`,
  ).run(userId);
}
