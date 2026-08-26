import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

import { env } from '../env.ts';

/**
 * Password hashing, token hashing and at-rest encryption.
 *
 * Passwords use scrypt (memory-hard, in the standard library — no native build step).
 * Spotify tokens use AES-256-GCM so a database copy alone does not yield usable tokens.
 */

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 2 ** 15; // ~32 MB of memory per hash.
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELISATION = 1;

export const newId = (): string => randomUUID();

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize('NFKC'), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELISATION,
    // scrypt's default maxmem is too small for this cost factor.
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT_COST}$${SCRYPT_BLOCK_SIZE}$${SCRYPT_PARALLELISATION}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Constant-time verification. Returns false for any malformed stored hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, cost, blockSize, parallelisation, saltHex, expectedHex] = parts;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(expectedHex, 'hex');
    const derived = scryptSync(password.normalize('NFKC'), salt, expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelisation),
      maxmem: 64 * 1024 * 1024,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Refresh tokens are stored as SHA-256 digests, never in the clear. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newOpaqueToken(): string {
  return randomBytes(48).toString('base64url');
}

// --- At-rest encryption -------------------------------------------------------

function encryptionKey(): Buffer {
  const key = Buffer.from(env.tokenEncryptionKey, 'hex');
  if (key.length === 32) return key;
  // A non-hex or wrong-length value is stretched deterministically rather than
  // failing at runtime; production validates the real key at startup.
  return createHash('sha256').update(env.tokenEncryptionKey).digest();
}

/** `iv:authTag:ciphertext`, all base64url. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64url')}:${authTag.toString('base64url')}:${ciphertext.toString('base64url')}`;
}

export function decryptSecret(payload: string): string {
  const [ivPart, tagPart, dataPart] = payload.split(':');
  if (!ivPart || !tagPart || !dataPart) throw new Error('malformed ciphertext');

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

// --- Verifiable randomness ------------------------------------------------------

/**
 * Draws `count` distinct indices from `[0, size)` using a cryptographic source, with
 * rejection sampling so the distribution stays uniform.
 *
 * Returns the seed alongside the selection: `giveaway_draws` records the seed's hash so
 * a draw can be re-derived and checked afterwards rather than merely asserted.
 */
export function drawIndices(size: number, count: number): { indices: number[]; seed: string; seedHash: string } {
  const seed = randomBytes(32);
  const chosen = new Set<number>();
  let counter = 0;

  while (chosen.size < Math.min(count, size)) {
    // Each attempt derives a fresh 6-byte value from the seed and a counter, so the
    // whole sequence is reproducible from the seed alone.
    const digest = createHash('sha256')
      .update(seed)
      .update(Buffer.from(String(counter)))
      .digest();
    counter += 1;

    const value = digest.readUIntBE(0, 6);
    const limit = 2 ** 48;
    const bucket = limit - (limit % size);
    if (value >= bucket) continue; // Reject to avoid modulo bias.

    chosen.add(value % size);
  }

  return {
    indices: [...chosen],
    seed: seed.toString('hex'),
    seedHash: createHash('sha256').update(seed).digest('hex'),
  };
}
