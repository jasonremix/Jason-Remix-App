import { Router } from 'express';
import { z } from 'zod';

import { readIdempotentResponse, requireIdempotencyKey, storeIdempotentResponse } from '../lib/idempotency.ts';
import { routeParam } from '../lib/params.ts';
import { limits } from '../lib/rateLimit.ts';
import { parse } from '../lib/validate.ts';
import { authenticate } from '../middleware/authenticate.ts';
import { enterGiveaway, listEntries, listGiveaways } from '../services/giveaways.service.ts';

export const giveawayRoutes = Router();
giveawayRoutes.use(authenticate);

giveawayRoutes.get('/', (req, res) => {
  res.json({
    giveaways: listGiveaways(req.auth!.userId),
    entries: listEntries(req.auth!.userId),
  });
});

const enterSchema = z.object({ entries: z.number().int().min(1).max(50).default(1) });

giveawayRoutes.post('/:giveawayId/enter', limits.mutation(), (req, res) => {
  const userId = req.auth!.userId;
  const { entries } = parse(enterSchema, req.body ?? {});
  const key = requireIdempotencyKey(req.header('idempotency-key'));
  const endpoint = `giveaways:enter:${routeParam(req, 'giveawayId')}`;

  const replay = readIdempotentResponse(key, userId, endpoint);
  if (replay) {
    res.json(replay);
    return;
  }

  const result = enterGiveaway(userId, routeParam(req, 'giveawayId'), entries);
  storeIdempotentResponse(key, userId, endpoint, result);
  res.json(result);
});
