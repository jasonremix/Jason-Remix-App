import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    // The database is a process-wide singleton, so the suites share one file and run
    // sequentially rather than trampling each other from separate workers.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: ':memory:',
      JWT_SECRET: 'test-jwt-secret-value-for-suite-only',
      TOKEN_ENCRYPTION_KEY: '0'.repeat(64),
      RATE_LIMIT_AUTH_MAX: '500',
      RATE_LIMIT_MUTATION_MAX: '500',
      RATE_LIMIT_GENERAL_MAX: '2000',
      // Present so the Spotify routes are reachable; every outbound call is stubbed.
      SPOTIFY_CLIENT_ID: 'test-client-id',
      SPOTIFY_CLIENT_SECRET: 'test-client-secret',
    },
  },
});
