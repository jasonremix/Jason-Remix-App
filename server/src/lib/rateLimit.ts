import type { NextFunction, Request, Response } from 'express';

import { env } from '../env.ts';
import { ApiError } from './errors.ts';

/**
 * Fixed-window rate limiting, keyed by authenticated user where possible and by client
 * address otherwise.
 *
 * In-process by design: it is the right shape for a single-instance deployment and the
 * seam to swap for a shared store is one function. Auth and credit-moving endpoints get
 * far tighter budgets than reads.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Drops expired buckets so the map cannot grow without bound. */
function sweep(now: number): void {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(name: string, max: number, windowMs = env.rateLimit.windowMs) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    sweep(now);

    const identity = req.auth?.userId ?? req.ip ?? 'anonymous';
    const key = `${name}:${identity}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('retry-after', String(retryAfter));
      next(new ApiError('RATE_LIMITED', 'Too many attempts. Please wait a moment.'));
      return;
    }

    next();
  };
}

/** Test helper — the suite exercises limits and must start from a clean slate. */
export function resetRateLimits(): void {
  buckets.clear();
}

export const limits = {
  general: () => rateLimit('general', env.rateLimit.generalMax),
  auth: () => rateLimit('auth', env.rateLimit.authMax),
  mutation: () => rateLimit('mutation', env.rateLimit.mutationMax),
};
