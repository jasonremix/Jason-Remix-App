import { randomBytes } from 'node:crypto';

import dotenv from 'dotenv';

dotenv.config();

/**
 * Server configuration.
 *
 * Secrets are read here and nowhere else. In production every secret must be supplied
 * explicitly — the process refuses to start otherwise, so a deployment can never
 * silently fall back to a development key.
 */

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function required(name: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;

  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  // Development and test get an ephemeral key so the server is runnable out of the box.
  // It changes on every restart, which invalidates old tokens — that is intentional.
  return randomBytes(32).toString('hex');
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function number(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  isTest,
  port: number('PORT', 4000),

  /** SQLite file. `:memory:` is used by the test suite. */
  databaseUrl: process.env.DATABASE_URL ?? './data/jason-remix.sqlite',

  /** Signs access tokens. Rotating it signs everyone out, by design. */
  jwtSecret: required('JWT_SECRET'),
  accessTokenTtlSeconds: number('ACCESS_TOKEN_TTL_SECONDS', 15 * 60),
  refreshTokenTtlSeconds: number('REFRESH_TOKEN_TTL_SECONDS', 30 * 24 * 60 * 60),

  /**
   * Encrypts Spotify tokens at rest (AES-256-GCM). Must be 32 bytes, hex-encoded.
   * Losing it means stored Spotify links can no longer be decrypted and members
   * simply have to reconnect — it is never used for anything else.
   */
  tokenEncryptionKey: required('TOKEN_ENCRYPTION_KEY'),

  /**
   * Spotify credentials.
   *
   * The secret lives here and only here. It is never sent to the app, never logged,
   * and never included in an API response.
   */
  spotifyClientId: optional('SPOTIFY_CLIENT_ID'),
  spotifyClientSecret: optional('SPOTIFY_CLIENT_SECRET'),

  /** Comma-separated list of allowed origins, or `*` in development. */
  corsOrigins: (process.env.CORS_ORIGINS ?? '*').split(',').map((origin) => origin.trim()),

  rateLimit: {
    windowMs: number('RATE_LIMIT_WINDOW_MS', 60_000),
    /** Generous for reads. */
    generalMax: number('RATE_LIMIT_GENERAL_MAX', 240),
    /** Tight, because these are the endpoints worth brute-forcing. */
    authMax: number('RATE_LIMIT_AUTH_MAX', 10),
    /** Anything that moves credits. */
    mutationMax: number('RATE_LIMIT_MUTATION_MAX', 30),
  },
} as const;

/** True when Spotify is fully configured; the routes refuse cleanly when it is not. */
export const isSpotifyConfigured = Boolean(env.spotifyClientId && env.spotifyClientSecret);
