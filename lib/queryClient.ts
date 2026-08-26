import { QueryClient } from '@tanstack/react-query';

import { AppError } from './errors';

/** Query keys are declared once so invalidation can never miss a cache. */
export const queryKeys = {
  me: ['me'] as const,
  verification: ['auth', 'verification'] as const,
  catalog: ['catalog'] as const,
  track: (id: string) => ['catalog', 'track', id] as const,
  credits: ['credits'] as const,
  missions: ['missions'] as const,
  rewards: ['rewards'] as const,
  giveaways: ['giveaways'] as const,
  spotifyConnection: ['spotify', 'connection'] as const,
  spotifyNowPlaying: ['spotify', 'now-playing'] as const,
  spotifyRecent: ['spotify', 'recent'] as const,
  spotifyTop: ['spotify', 'top'] as const,
  adminUsers: ['admin', 'users'] as const,
  adminAudit: ['admin', 'audit'] as const,
};

/** Anything that moves credits invalidates all of these together. */
export const CREDIT_SENSITIVE_KEYS = [
  queryKeys.me,
  queryKeys.credits,
  queryKeys.missions,
  queryKeys.rewards,
  queryKeys.giveaways,
] as const;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        retry(failureCount, error) {
          // Only transient failures are worth retrying; a 403 will still be a 403.
          if (error instanceof AppError && !error.retryable) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
