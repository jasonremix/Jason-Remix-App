import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '../lib/auth.ts';
import { ApiError, forbidden, unauthorized } from '../lib/errors.ts';
import { findUserById } from '../services/users.service.ts';

/**
 * Bearer authentication.
 *
 * The token's claims are not trusted on their own: the account is re-read on every
 * request so a ban or deletion takes effect immediately rather than when the token
 * happens to expire.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(unauthorized());
    return;
  }

  try {
    const claims = verifyAccessToken(header.slice(7).trim());
    const user = findUserById(claims.sub);

    if (!user) {
      next(unauthorized());
      return;
    }
    if (user.status === 'BANNED') {
      next(new ApiError('ACCOUNT_BANNED', 'Dieses Konto ist gesperrt.'));
      return;
    }
    if (user.status === 'DELETED') {
      next(unauthorized());
      return;
    }

    req.auth = { userId: user.id, role: user.role, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Administrator gate.
 *
 * The role is read from the database record loaded above, never from the token claim
 * alone, so a stale token issued before a demotion cannot reach these routes.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(unauthorized());
    return;
  }
  if (req.auth.role !== 'ADMIN') {
    next(forbidden());
    return;
  }
  next();
}
