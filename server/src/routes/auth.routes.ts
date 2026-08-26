import { Router } from 'express';
import { z } from 'zod';

import { env } from '../env.ts';
import { consumeRefreshToken, issueAccessToken, issueRefreshToken, revokeRefreshToken } from '../lib/auth.ts';
import { limits } from '../lib/rateLimit.ts';
import { parse } from '../lib/validate.ts';
import { authenticate } from '../middleware/authenticate.ts';
import { authenticate as authenticateUser, createUser, findUserById, getProfile } from '../services/users.service.ts';

/** Registration, sign-in, refresh and sign-out. Rate limited tightly. */
export const authRoutes = Router();

const emailSchema = z.string().trim().toLowerCase().email('That email address does not look right.');
const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(200, 'That password is too long.')
  .regex(/[a-z]/i, 'Include at least one letter and one number.')
  .regex(/[0-9]/, 'Include at least one letter and one number.');
const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_.]{3,20}$/i, 'Use 3–20 letters, numbers, dots or underscores.');

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  acceptedTerms: z.literal(true, { message: 'Please accept the terms to continue.' }),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

const refreshSchema = z.object({ refreshToken: z.string().min(10) });

authRoutes.post('/register', limits.auth(), (req, res) => {
  const input = parse(registerSchema, req.body);
  const { user, profile } = createUser(input);

  res.status(201).json({
    accessToken: issueAccessToken(user.id, user.role),
    refreshToken: issueRefreshToken(user.id),
    expiresIn: env.accessTokenTtlSeconds,
    user,
    profile,
  });
});

authRoutes.post('/login', limits.auth(), (req, res) => {
  const input = parse(loginSchema, req.body);
  const user = authenticateUser(input.email, input.password);

  res.json({
    accessToken: issueAccessToken(user.id, user.role),
    refreshToken: issueRefreshToken(user.id),
    expiresIn: env.accessTokenTtlSeconds,
    user,
    profile: getProfile(user.id),
  });
});

/** Rotates the refresh token: the presented one is revoked and a new one issued. */
authRoutes.post('/refresh', limits.auth(), (req, res) => {
  const { refreshToken } = parse(refreshSchema, req.body);
  const { userId, role } = consumeRefreshToken(refreshToken);
  const user = findUserById(userId);

  res.json({
    accessToken: issueAccessToken(userId, role),
    refreshToken: issueRefreshToken(userId),
    expiresIn: env.accessTokenTtlSeconds,
    user,
    profile: getProfile(userId),
  });
});

authRoutes.post('/logout', authenticate, (req, res) => {
  const token = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null;
  if (token) revokeRefreshToken(token);
  res.status(204).end();
});
