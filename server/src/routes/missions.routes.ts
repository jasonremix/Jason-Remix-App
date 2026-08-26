import { Router } from 'express';

import { readIdempotentResponse, requireIdempotencyKey, storeIdempotentResponse } from '../lib/idempotency.ts';
import { routeParam } from '../lib/params.ts';
import { limits } from '../lib/rateLimit.ts';
import { authenticate } from '../middleware/authenticate.ts';
import { claimMission, listMissions } from '../services/missions.service.ts';

export const missionRoutes = Router();
missionRoutes.use(authenticate);

missionRoutes.get('/', (req, res) => {
  res.json({ missions: listMissions(req.auth!.userId) });
});

/**
 * Claiming is the canonical credit-earning path, so it is idempotent: a client that
 * retries after a timeout gets the original award back rather than a second one.
 */
missionRoutes.post('/:missionId/claim', limits.mutation(), (req, res) => {
  const userId = req.auth!.userId;
  const key = requireIdempotencyKey(req.header('idempotency-key'));
  const endpoint = `missions:claim:${routeParam(req, 'missionId')}`;

  const replay = readIdempotentResponse(key, userId, endpoint);
  if (replay) {
    res.json(replay);
    return;
  }

  const result = claimMission(userId, routeParam(req, 'missionId'));
  storeIdempotentResponse(key, userId, endpoint, result);
  res.json(result);
});
