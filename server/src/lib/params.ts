import type { Request } from 'express';

import { badRequest } from './errors.ts';

/**
 * Reads a single route parameter.
 *
 * Express 5 types `req.params` values as `string | string[]` because wildcard segments
 * can repeat. None of this API's routes use those, so an array here means a malformed
 * request rather than something to guess at.
 */
export function routeParam(req: Request, name: string): string {
  const value = (req.params as Record<string, string | string[]>)[name];
  if (typeof value === 'string' && value.length > 0) return value;
  throw badRequest('That request was not understood.');
}
