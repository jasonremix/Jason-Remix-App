import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { migrate } from './db/index.ts';
import { env, isSpotifyConfigured } from './env.ts';
import { limits } from './lib/rateLimit.ts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import { adminRoutes } from './routes/admin.routes.ts';
import { authRoutes } from './routes/auth.routes.ts';
import { catalogRoutes } from './routes/catalog.routes.ts';
import { creditRoutes } from './routes/credits.routes.ts';
import { giveawayRoutes } from './routes/giveaways.routes.ts';
import { meRoutes, notificationRoutes } from './routes/me.routes.ts';
import { missionRoutes } from './routes/missions.routes.ts';
import { rewardRoutes } from './routes/rewards.routes.ts';
import { spotifyRoutes } from './routes/spotify.routes.ts';

/** Builds the Express application. Exported separately so tests can mount it directly. */
export function createApp() {
  migrate();

  const app = express();

  // Behind a proxy the client address comes from X-Forwarded-For; without this the
  // rate limiter would key every request to the proxy itself.
  app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(
    helmet({
      // The API serves JSON only — no scripts, styles or embedded content.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  app.use(
    cors({
      origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
      credentials: false,
      allowedHeaders: ['content-type', 'authorization', 'idempotency-key', 'x-client-platform', 'x-client-version'],
    }),
  );

  // A small body limit is itself a defence: nothing this API accepts is large.
  app.use(express.json({ limit: '64kb' }));
  app.use(limits.general());

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      spotify: isSpotifyConfigured ? 'configured' : 'not-configured',
      time: new Date().toISOString(),
    });
  });

  app.use('/auth', authRoutes);
  app.use('/me', meRoutes);
  app.use('/catalog', catalogRoutes);
  app.use('/credits', creditRoutes);
  app.use('/missions', missionRoutes);
  app.use('/rewards', rewardRoutes);
  app.use('/giveaways', giveawayRoutes);
  app.use('/spotify', spotifyRoutes);
  app.use('/notifications', notificationRoutes);
  app.use('/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
