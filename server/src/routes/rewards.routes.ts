import { Router } from 'express';

import { readIdempotentResponse, requireIdempotencyKey, storeIdempotentResponse } from '../lib/idempotency.ts';
import { routeParam } from '../lib/params.ts';
import { limits } from '../lib/rateLimit.ts';
import { authenticate } from '../middleware/authenticate.ts';
import { listRedemptions, listRewards, redeemReward } from '../services/rewards.service.ts';

export const rewardRoutes = Router();
rewardRoutes.use(authenticate);

rewardRoutes.get('/', (req, res) => {
  res.json({
    rewards: listRewards(),
    redemptions: listRedemptions(req.auth!.userId),
  });
});

rewardRoutes.post('/:rewardId/redeem', limits.mutation(), (req, res) => {
  const userId = req.auth!.userId;
  const key = requireIdempotencyKey(req.header('idempotency-key'));
  const endpoint = `rewards:redeem:${routeParam(req, 'rewardId')}`;

  const replay = readIdempotentResponse(key, userId, endpoint);
  if (replay) {
    res.json(replay);
    return;
  }

  const result = redeemReward(userId, routeParam(req, 'rewardId'));
  storeIdempotentResponse(key, userId, endpoint, result);
  res.json(result);
});
