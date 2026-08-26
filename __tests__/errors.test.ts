import { AppError, fromApiPayload, messageForCode, toAppError } from '@/lib/errors';
import { logger, redact } from '@/lib/logger';

describe('error wording', () => {
  it('gives every code member-safe copy', () => {
    expect(messageForCode('INSUFFICIENT_CREDITS')).toBe('You do not have enough credits for this.');
    expect(messageForCode('OFFLINE')).toMatch(/offline/i);
    expect(messageForCode('SERVER_ERROR')).toBe('Something went wrong.');
  });

  it('never surfaces a status code or internal detail to a member', () => {
    const error = fromApiPayload({ error: { code: 'SERVER_ERROR', message: 'SQLITE_CONSTRAINT' } }, 500);
    expect(error.message).toBe('Something went wrong.');
    expect(error.message).not.toContain('SQLITE');
  });

  it('does pass through validation copy, which is written for members', () => {
    const error = fromApiPayload(
      { error: { code: 'BAD_REQUEST', message: 'Use at least 10 characters.', details: { password: 'Too short.' } } },
      400,
    );
    expect(error.message).toBe('Use at least 10 characters.');
    expect(error.details?.password).toBe('Too short.');
  });

  it('falls back to the status when the payload has no code', () => {
    expect(fromApiPayload(null, 401).code).toBe('UNAUTHORIZED');
    expect(fromApiPayload(null, 403).code).toBe('FORBIDDEN');
    expect(fromApiPayload(null, 404).code).toBe('NOT_FOUND');
    expect(fromApiPayload(null, 429).code).toBe('RATE_LIMITED');
    expect(fromApiPayload(null, 500).code).toBe('SERVER_ERROR');
  });

  it('treats a network failure as offline and retryable', () => {
    const error = toAppError(new TypeError('Network request failed'));
    expect(error.code).toBe('OFFLINE');
    expect(error.retryable).toBe(true);
  });

  it('does not mark a permission failure as retryable', () => {
    expect(new AppError('FORBIDDEN', 'No.').retryable).toBe(false);
  });

  it('passes an AppError through unchanged', () => {
    const original = new AppError('GIVEAWAY_CLOSED', 'This giveaway is closed.');
    expect(toAppError(original)).toBe(original);
  });
});

describe('log redaction', () => {
  it('masks anything that looks like a credential by key', () => {
    const result = redact({
      accessToken: 'super-secret-value',
      refreshToken: 'another-secret',
      codeVerifier: 'pkce-verifier',
      password: 'hunter2',
      username: 'demo_member',
    }) as Record<string, unknown>;

    expect(result.accessToken).toBe('[redacted]');
    expect(result.refreshToken).toBe('[redacted]');
    expect(result.codeVerifier).toBe('[redacted]');
    expect(result.password).toBe('[redacted]');
    // Non-sensitive fields survive, or the logs would be useless.
    expect(result.username).toBe('demo_member');
  });

  it('masks a bearer header found inside a string', () => {
    const result = redact('authorization: Bearer abcdefghijklmnopqrstuvwxyz012345') as string;
    expect(result).not.toContain('abcdefghijklmnopqrstuvwxyz012345');
  });

  it('masks a long opaque value even under an innocuous key', () => {
    const result = redact({ note: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9payloadsignature' }) as {
      note: string;
    };
    expect(result.note).toBe('[redacted]');
  });

  it('redacts a whole subtree when its key is sensitive', () => {
    const result = redact({ session: { tokens: [{ accessToken: 'secret-value' }] } }) as {
      session: { tokens: unknown };
    };
    // The entire array goes, not just the leaf — nothing under a "tokens" key survives.
    expect(result.session.tokens).toBe('[redacted]');
  });

  it('recurses through ordinary keys and arrays', () => {
    const result = redact({
      entries: [{ label: 'Daily check-in', accessToken: 'secret-value' }],
    }) as { entries: Record<string, unknown>[] };

    expect(result.entries[0].label).toBe('Daily check-in');
    expect(result.entries[0].accessToken).toBe('[redacted]');
  });

  it('redacts before anything reaches the console', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logger.warn('spotify exchange failed', { accessToken: 'must-not-appear-in-logs' });

    expect(spy).toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).not.toContain('must-not-appear-in-logs');
    spy.mockRestore();
  });
});
