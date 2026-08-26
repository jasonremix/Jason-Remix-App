import { createIdempotencyKey } from '@/lib/apiClient';
import type { EnterGiveawayResponse, GiveawaysResponse } from '@/types/api';

import { getBackend } from './backend';

export const giveawaysService = {
  getGiveaways: (): Promise<GiveawaysResponse> => getBackend().getGiveaways(),
  /**
   * Entries are recorded server-side and winners are drawn there too — the client never
   * selects a winner and never sees other members' entries.
   */
  enter: (
    giveawayId: string,
    entries = 1,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<EnterGiveawayResponse> =>
    getBackend().enterGiveaway(giveawayId, entries, idempotencyKey),
};
