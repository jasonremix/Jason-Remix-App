import { Router } from 'express';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { newId } from '../lib/crypto.ts';
import { limits } from '../lib/rateLimit.ts';
import { parse } from '../lib/validate.ts';
import { authenticate } from '../middleware/authenticate.ts';
import { listAchievements } from '../services/achievements.service.ts';
import { getBalance } from '../services/credits.service.ts';
import { getConnection } from '../services/spotify.service.ts';
import {
  changePassword,
  deleteAccount,
  exportUserData,
  findUserById,
  getProfile,
  updateProfile,
} from '../services/users.service.ts';

export const meRoutes = Router();
meRoutes.use(authenticate);

meRoutes.get('/', (req, res) => {
  const userId = req.auth!.userId;
  res.json({
    user: findUserById(userId),
    profile: getProfile(userId),
    balance: getBalance(userId),
    spotify: getConnection(userId),
    achievements: listAchievements(userId),
  });
});

const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9_.]{3,20}$/i, 'Verwende 3–20 Buchstaben, Ziffern, Punkte oder Unterstriche.')
    .optional(),
  displayName: z.string().trim().max(60).nullish(),
  avatarUrl: z.string().url().max(500).nullish(),
  bio: z.string().trim().max(280).nullish(),
  country: z.string().trim().length(2).nullish(),
});

meRoutes.patch('/profile', limits.mutation(), (req, res) => {
  const input = parse(profileSchema, req.body);
  res.json(updateProfile(req.auth!.userId, input));
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(10, 'Verwende mindestens 10 Zeichen.')
    .regex(/[a-z]/i, 'Mindestens ein Buchstabe und eine Ziffer.')
    .regex(/[0-9]/, 'Mindestens ein Buchstabe und eine Ziffer.'),
});

meRoutes.post('/password', limits.auth(), (req, res) => {
  const input = parse(passwordSchema, req.body);
  changePassword(req.auth!.userId, input.currentPassword, input.newPassword);
  res.status(204).end();
});

meRoutes.get('/export', limits.mutation(), (req, res) => {
  res.json(exportUserData(req.auth!.userId));
});

/** Irreversible. Cascades remove every record belonging to the account. */
meRoutes.post('/delete', limits.auth(), (req, res) => {
  deleteAccount(req.auth!.userId);
  res.status(204).end();
});

// --- Notifications ---------------------------------------------------------------

export const notificationRoutes = Router();
notificationRoutes.use(authenticate);

const pushTokenSchema = z.object({
  token: z.string().min(8).max(300),
  platform: z.string().min(1).max(20),
});

notificationRoutes.post('/token', limits.mutation(), (req, res) => {
  const input = parse(pushTokenSchema, req.body);
  db.prepare(
    `INSERT INTO push_tokens (id, user_id, token, platform) VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform`,
  ).run(newId(), req.auth!.userId, input.token, input.platform);
  res.status(204).end();
});

notificationRoutes.post('/preferences', limits.mutation(), (req, res) => {
  const { enabled } = parse(z.object({ enabled: z.boolean() }), req.body);
  const userId = req.auth!.userId;

  db.prepare(
    `UPDATE user_profiles SET push_enabled = ?, updated_at = datetime('now') WHERE user_id = ?`,
  ).run(enabled ? 1 : 0, userId);

  // Turning notifications off removes the tokens as well — the preference alone would
  // leave a deliverable token sitting in the database.
  if (!enabled) db.prepare(`DELETE FROM push_tokens WHERE user_id = ?`).run(userId);

  res.status(204).end();
});
