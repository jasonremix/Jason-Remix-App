import { Router } from 'express';
import { z } from 'zod';

import { isSpotifyConfigured } from '../env.ts';
import { ApiError } from '../lib/errors.ts';
import { limits } from '../lib/rateLimit.ts';
import { parse } from '../lib/validate.ts';
import { asyncRoute } from '../middleware/asyncRoute.ts';
import { authenticate } from '../middleware/authenticate.ts';
import { awardSpotifyMissionIfPending } from '../services/missions.service.ts';
import {
  disconnect,
  exchangeCode,
  getConnection,
  getNowPlaying,
  getRecentlyPlayed,
  getTopTracks,
} from '../services/spotify.service.ts';

/**
 * Spotify endpoints.
 *
 * The app never talks to Spotify's API directly: it authorises in the browser, hands
 * the code here, and reads everything else through these routes. That keeps the client
 * secret and the member's Spotify tokens on the server.
 */
export const spotifyRoutes = Router();
spotifyRoutes.use(authenticate);

spotifyRoutes.get('/connection', (req, res) => {
  res.json(getConnection(req.auth!.userId));
});

const exchangeSchema = z.object({
  code: z.string().min(10).max(1000),
  codeVerifier: z.string().min(43).max(128),
  redirectUri: z.string().url(),
  state: z.string().min(8).max(200),
});

spotifyRoutes.post(
  '/exchange',
  limits.mutation(),
  asyncRoute(async (req, res) => {
    if (!isSpotifyConfigured) {
      throw new ApiError('SPOTIFY_NOT_CONFIGURED', 'Spotify steht noch nicht zur Verfügung.');
    }

    const input = parse(exchangeSchema, req.body);
    const userId = req.auth!.userId;

    const connection = await exchangeCode(userId, {
      code: input.code,
      codeVerifier: input.codeVerifier,
      redirectUri: input.redirectUri,
    });

    // Connecting may complete the CONNECT SPOTIFY mission. The award is decided here,
    // after a connection genuinely exists — never on the client's say-so.
    const missionAward = awardSpotifyMissionIfPending(userId);

    res.json({ connection, missionAward });
  }),
);

spotifyRoutes.post('/disconnect', limits.mutation(), (req, res) => {
  disconnect(req.auth!.userId);
  res.status(204).end();
});

spotifyRoutes.get(
  '/now-playing',
  asyncRoute(async (req, res) => {
    res.json(await getNowPlaying(req.auth!.userId));
  }),
);

spotifyRoutes.get(
  '/recently-played',
  asyncRoute(async (req, res) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) }), req.query);
    res.json(await getRecentlyPlayed(req.auth!.userId, limit));
  }),
);

spotifyRoutes.get(
  '/top-tracks',
  asyncRoute(async (req, res) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) }), req.query);
    res.json(await getTopTracks(req.auth!.userId, limit));
  }),
);
