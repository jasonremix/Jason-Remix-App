// Vitest loads this before any test module, so the environment is in place by the time
// `env.ts` and the database singleton are first imported.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:';
process.env.JWT_SECRET ??= 'test-jwt-secret-value-for-suite-only';
process.env.TOKEN_ENCRYPTION_KEY ??= '0'.repeat(64);
