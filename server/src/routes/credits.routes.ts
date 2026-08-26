import { Router } from 'express';
import { z } from 'zod';

import { parse } from '../lib/validate.ts';
import { authenticate } from '../middleware/authenticate.ts';
import { getBalance, listTransactions } from '../services/credits.service.ts';

export const creditRoutes = Router();
creditRoutes.use(authenticate);

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

creditRoutes.get('/', (req, res) => {
  const { cursor, limit } = parse(querySchema, req.query);
  const { transactions, nextCursor } = listTransactions(req.auth!.userId, limit, cursor);

  res.json({
    balance: getBalance(req.auth!.userId),
    transactions,
    nextCursor,
  });
});
