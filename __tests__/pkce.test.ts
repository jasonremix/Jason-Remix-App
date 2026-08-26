import { createHash } from 'node:crypto';

import {
  CODE_CHALLENGE_METHOD,
  base64UrlEncode,
  createCodeChallenge,
  createCodeVerifier,
  createPkcePair,
  createState,
  randomStringFromBytes,
  safeEquals,
} from '@/lib/pkce';

/**
 * PKCE construction (RFC 7636). These assertions are what stop the Spotify flow from
 * silently degrading to something weaker.
 */
describe('code verifier', () => {
  it('produces a verifier of the requested length', async () => {
    await expect(createCodeVerifier(43)).resolves.toHaveLength(43);
    await expect(createCodeVerifier(96)).resolves.toHaveLength(96);
    await expect(createCodeVerifier(128)).resolves.toHaveLength(128);
  });

  it('refuses a length outside the range the spec allows', async () => {
    await expect(createCodeVerifier(42)).rejects.toThrow(/between 43 and 128/);
    await expect(createCodeVerifier(129)).rejects.toThrow(/between 43 and 128/);
  });

  it('uses only unreserved characters', async () => {
    const verifier = await createCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('draws every character from the supplied bytes', () => {
    const bytes = Uint8Array.from([0, 1, 2, 63, 64, 255]);
    const value = randomStringFromBytes(bytes, 6);
    expect(value).toHaveLength(6);
    expect(value).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('refuses to silently shorten a value when given too few bytes', () => {
    expect(() => randomStringFromBytes(Uint8Array.from([1, 2, 3]), 32)).toThrow(
      /at least 32 random bytes/,
    );
  });
});

describe('code challenge', () => {
  it('is the base64url SHA-256 of the verifier', async () => {
    const verifier = 'a'.repeat(64);
    const challenge = await createCodeChallenge(verifier);

    const expected = createHash('sha256').update(verifier).digest('base64');
    expect(challenge).toBe(base64UrlEncode(expected));
  });

  it('is url-safe and unpadded', async () => {
    const challenge = await createCodeChallenge('verifier-value-for-the-test-1234567890abcdef');
    expect(challenge).not.toContain('+');
    expect(challenge).not.toContain('/');
    expect(challenge).not.toContain('=');
  });

  it('converts base64 into base64url correctly', () => {
    expect(base64UrlEncode('ab+/cd==')).toBe('ab-_cd');
  });
});

describe('pkce pair', () => {
  it('always uses S256, never plain', async () => {
    const pair = await createPkcePair();
    expect(pair.codeChallengeMethod).toBe('S256');
    expect(CODE_CHALLENGE_METHOD).toBe('S256');
  });

  it('produces a challenge that matches its verifier', async () => {
    const pair = await createPkcePair();
    await expect(createCodeChallenge(pair.codeVerifier)).resolves.toBe(pair.codeChallenge);
  });

  it('includes a state value for the CSRF round trip', async () => {
    const pair = await createPkcePair();
    expect(pair.state).toHaveLength(32);
  });
});

describe('state comparison', () => {
  it('matches identical values', async () => {
    const state = await createState();
    expect(safeEquals(state, state)).toBe(true);
  });

  it('rejects a different value or a different length', () => {
    expect(safeEquals('abcdef', 'abcdeg')).toBe(false);
    expect(safeEquals('abcdef', 'abcde')).toBe(false);
    expect(safeEquals('', 'a')).toBe(false);
  });
});
