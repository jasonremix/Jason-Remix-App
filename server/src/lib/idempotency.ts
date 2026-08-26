import { db } from '../db/index.ts';
import { badRequest } from './errors.ts';

/**
 * Idempotency for credit-moving endpoints.
 *
 * A client retrying after a timeout must not spend twice. The key is stored with the
 * response it produced; a repeat of the same key returns that response verbatim instead
 * of re-running the operation.
 */

export function readIdempotentResponse<T>(
  key: string,
  userId: string,
  endpoint: string,
): T | null {
  const row = db
    .prepare(`SELECT response FROM idempotency_keys WHERE key = ? AND user_id = ? AND endpoint = ?`)
    .get(key, userId, endpoint) as { response: string } | undefined;

  if (!row) return null;
  try {
    return JSON.parse(row.response) as T;
  } catch {
    return null;
  }
}

export function storeIdempotentResponse(
  key: string,
  userId: string,
  endpoint: string,
  response: unknown,
): void {
  db.prepare(
    `INSERT OR REPLACE INTO idempotency_keys (key, user_id, endpoint, response) VALUES (?, ?, ?, ?)`,
  ).run(key, userId, endpoint, JSON.stringify(response));
}

/** Every credit-moving route requires the header, so a retry is always safe. */
export function requireIdempotencyKey(header: unknown): string {
  const key = typeof header === 'string' ? header.trim() : '';
  if (key.length < 8 || key.length > 200) {
    throw badRequest('This request is missing a valid idempotency key.');
  }
  return key;
}
