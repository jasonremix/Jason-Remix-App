import { config } from '@/constants/config';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Shared transport for Spotify-derived data.
 *
 * Requests do not go to Spotify directly: they go to our API server, which holds the
 * member's Spotify tokens, refreshes them when needed, and forwards the call. That keeps
 * Spotify credentials off the device entirely and lets rate limiting be enforced once,
 * centrally, rather than per install.
 *
 * Nothing fetched here is persisted to disk, and no audio is ever retrieved — only
 * metadata that Spotify exposes for display.
 */

type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<unknown>>();

/** Set when the server reports a 429 so we stop calling until the window passes. */
let backoffUntil = 0;

export function isRateLimited(now: number = Date.now()): boolean {
  return now < backoffUntil;
}

export function noteRateLimit(retryAfterSeconds: number): void {
  backoffUntil = Date.now() + Math.max(1, retryAfterSeconds) * 1000;
}

export function clearSpotifyCache(): void {
  cache.clear();
  backoffUntil = 0;
}

/**
 * Runs `loader`, memoising the result for `ttlMs`. Spotify's rate limits are per-app,
 * so a short cache in front of polling endpoints matters more than it usually would.
 */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;

  if (isRateLimited(now)) {
    if (hit) return hit.value;
    throw new AppError('RATE_LIMITED', 'Zu viele Anfragen an Spotify. Bitte warte einen Moment.');
  }

  try {
    const value = await loader();
    cache.set(key, { value, expiresAt: now + ttlMs });
    return value;
  } catch (error) {
    if (error instanceof AppError && error.code === 'RATE_LIMITED') {
      noteRateLimit(30);
      if (hit) return hit.value;
    }
    throw error;
  }
}

/** Polling intervals, chosen to stay well inside Spotify's limits. */
export const SPOTIFY_TTL = {
  nowPlaying: 15_000,
  recentlyPlayed: 120_000,
  topTracks: 600_000,
  connection: 60_000,
} as const;

export function assertSpotifyConfigured(): void {
  if (!config.isSpotifyConfigured) {
    logger.debug('spotify request attempted while unconfigured');
    throw new AppError('SPOTIFY_NOT_CONFIGURED', 'Spotify steht noch nicht zur Verfügung.');
  }
}
