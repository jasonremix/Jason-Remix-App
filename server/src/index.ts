import { createApp } from './app.ts';
import { env, isSpotifyConfigured } from './env.ts';
import { logger } from './lib/logger.ts';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`Jason Remix API listening on :${env.port}`, {
    environment: env.nodeEnv,
    spotify: isSpotifyConfigured ? 'configured' : 'not configured',
  });
});

// Finish in-flight requests before exiting so a deploy cannot cut a credit
// transaction in half.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => process.exit(0));
  });
}
