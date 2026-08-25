import { createIdempotencyKey } from '@/lib/apiClient';
import type { RedeemRewardResponse, RewardsResponse } from '@/types/api';

import { getBackend } from './backend';

export const rewardsService = {
  getRewards: (): Promise<RewardsResponse> => getBackend().getRewards(),
  redeem: (rewardId: string, idempotencyKey = createIdempotencyKey()): Promise<RedeemRewardResponse> =>
    getBackend().redeemReward(rewardId, idempotencyKey),
};
