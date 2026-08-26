import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

/**
 * The single place a failure becomes a response.
 *
 * Known failures keep their member-safe wording. Anything unexpected is logged
 * internally and reported as a generic message — no stack traces, no SQL, no internals
 * ever reach a client.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json(error.toPayload());
    return;
  }

  logger.error('unhandled error', {
    path: req.path,
    method: req.method,
    message: error instanceof Error ? error.message : 'unknown',
  });

  res.status(500).json({
    error: { code: 'SERVER_ERROR', message: 'Something went wrong.' },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'This is no longer available.' } });
}
