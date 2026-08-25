import { createIdempotencyKey } from '@/lib/apiClient';
import type { CreditsResponse } from '@/types/api';

import { getBackend } from './backend';

/**
 * Credits are read-only from the client's point of view: the balance shown is always
 * whatever the server last returned. Nothing here computes or adjusts a balance locally.
 */
export const creditsService = {
  getCredits: (cursor?: string): Promise<CreditsResponse> => getBackend().getCredits(cursor),
  /** Every mutation gets a fresh key so a retry can never double-apply. */
  newIdempotencyKey: createIdempotencyKey,
};
