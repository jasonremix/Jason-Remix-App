import { Router } from 'express';
import { z } from 'zod';

import { env } from '../env.ts';
import { consumeRefreshToken, issueAccessToken, issueRefreshToken, revokeRefreshToken } from '../lib/auth.ts';
import { limits } from '../lib/rateLimit.ts';
import { parse } from '../lib/validate.ts';
import { asyncRoute } from '../middleware/asyncRoute.ts';
import { authenticate } from '../middleware/authenticate.ts';
import { isEmailConfigured } from '../lib/mailer.ts';
import {
  consumeVerificationToken,
  isVerified,
  sendVerificationEmail,
  sendWelcomeEmail,
  verifiedAt,
} from '../services/email.service.ts';
import { authenticate as authenticateUser, createUser, findUserById, getProfile } from '../services/users.service.ts';

/** Registration, sign-in, refresh and sign-out. Rate limited tightly. */
export const authRoutes = Router();

const emailSchema = z.string().trim().toLowerCase().email('Diese E-Mail-Adresse sieht nicht richtig aus.');
const passwordSchema = z
  .string()
  .min(10, 'Verwende mindestens 10 Zeichen.')
  .max(200, 'Dieses Passwort ist zu lang.')
  .regex(/[a-z]/i, 'Mindestens ein Buchstabe und eine Ziffer.')
  .regex(/[0-9]/, 'Mindestens ein Buchstabe und eine Ziffer.');
const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_.]{3,20}$/i, 'Verwende 3–20 Buchstaben, Ziffern, Punkte oder Unterstriche.');

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  acceptedTerms: z.literal(true, { message: 'Bitte akzeptiere die Bedingungen, um fortzufahren.' }),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Gib dein Passwort ein.'),
});

const refreshSchema = z.object({ refreshToken: z.string().min(10) });

/**
 * Creates the account and emails the confirmation link.
 *
 * The account is usable straight away — an unconfirmed address restricts nothing yet,
 * it is simply surfaced in the app until confirmed. `emailVerification` reports what
 * actually happened to the message, so the app never tells a member to check an inbox
 * that nothing was sent to.
 */
authRoutes.post(
  '/register',
  limits.auth(),
  asyncRoute(async (req, res) => {
    const input = parse(registerSchema, req.body);
    const { user, profile } = createUser(input);

    const outcome = await sendVerificationEmail(user.id);

    res.status(201).json({
      accessToken: issueAccessToken(user.id, user.role),
      refreshToken: issueRefreshToken(user.id),
      expiresIn: env.accessTokenTtlSeconds,
      user,
      profile,
      emailVerification: {
        required: true,
        sent: outcome.sent,
        reason: outcome.reason,
      },
    });
  }),
);

/**
 * Confirms an address.
 *
 * Reached from the link in the email, so it answers a GET from a browser with a small
 * page rather than JSON, and offers a deep link back into the app. The same token can
 * also be posted by the app itself when it handles the link directly.
 */
authRoutes.get(
  '/verify-email',
  limits.auth(),
  asyncRoute(async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    try {
      const { userId, alreadyVerified } = consumeVerificationToken(token);
      if (!alreadyVerified) await sendWelcomeEmail(userId);
      res.status(200).type('html').send(verificationPage(true, alreadyVerified));
    } catch {
      res.status(400).type('html').send(verificationPage(false, false));
    }
  }),
);

/** The same confirmation, for an app that captured the token from a deep link. */
authRoutes.post(
  '/verify-email',
  limits.auth(),
  asyncRoute(async (req, res) => {
    const { token } = parse(z.object({ token: z.string().min(10) }), req.body);
    const { userId, alreadyVerified } = consumeVerificationToken(token);
    if (!alreadyVerified) await sendWelcomeEmail(userId);
    res.json({ verified: true, alreadyVerified, verifiedAt: verifiedAt(userId) });
  }),
);

/** Issues a new link, invalidating any earlier one. */
authRoutes.post(
  '/resend-verification',
  limits.auth(),
  authenticate,
  asyncRoute(async (req, res) => {
    const userId = req.auth!.userId;

    if (isVerified(userId)) {
      res.json({ sent: false, alreadyVerified: true, reason: null });
      return;
    }

    const outcome = await sendVerificationEmail(userId);
    res.json({ sent: outcome.sent, alreadyVerified: false, reason: outcome.reason });
  }),
);

/** Lets the app show the true state without guessing from a stale session. */
authRoutes.get('/verification-status', authenticate, (req, res) => {
  const userId = req.auth!.userId;
  res.json({
    verified: isVerified(userId),
    verifiedAt: verifiedAt(userId),
    emailConfigured: isEmailConfigured(),
  });
});

/** The page the confirmation link lands on. Plain, self-contained, no assets. */
function verificationPage(ok: boolean, alreadyVerified: boolean): string {
  const heading = ok
    ? alreadyVerified
      ? 'Schon bestätigt.'
      : 'E-Mail bestätigt.'
    : 'Link ungültig.';
  const body = ok
    ? alreadyVerified
      ? 'Diese Adresse war bereits bestätigt. Du kannst das Fenster schließen.'
      : 'Danke — dein Konto ist jetzt vollständig freigeschaltet. Du kannst zurück in die App.'
    : 'Dieser Bestätigungslink ist ungültig oder abgelaufen. Fordere in der App unter „Konto“ einen neuen an.';

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jason Remix</title></head>
<body style="margin:0;background:#F0F1F3;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:420px;margin:0 auto;padding:72px 24px">
    <div style="font-size:22px;font-weight:800;letter-spacing:-0.8px;color:#0D0E11">JASON REMIX</div>
    <div style="font-size:10px;letter-spacing:2px;color:#6B7078;padding-top:6px">DIE OFFIZIELLE APP</div>
    <h1 style="font-size:28px;font-weight:800;letter-spacing:-0.8px;color:${ok ? '#0D0E11' : '#B3261E'};margin:40px 0 12px">${heading}</h1>
    <p style="font-size:15px;line-height:24px;color:#3A3E45;margin:0 0 28px">${body}</p>
    <a href="${env.appScheme}://" style="display:inline-block;background:#001EC8;color:#fff;
       text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;padding:15px 26px">APP ÖFFNEN</a>
  </div>
</body></html>`;
}

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
