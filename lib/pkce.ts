import * as Crypto from 'expo-crypto';

/**
 * PKCE helpers for the Spotify Authorization Code flow (RFC 7636).
 *
 * The app is a public client: it holds no client secret. It proves possession of the
 * authorization request by sending `code_challenge = BASE64URL(SHA256(code_verifier))`
 * up front and the verifier at exchange time. `code_challenge_method` is always S256 —
 * `plain` is never used, and the implicit grant is not used at all.
 */

/** Unreserved characters permitted in a code verifier per RFC 7636 §4.1. */
const VERIFIER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export const CODE_CHALLENGE_METHOD = 'S256' as const;

export function base64UrlEncode(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Maps random bytes onto the unreserved alphabet, one character per byte.
 *
 * Throws rather than truncating when there are too few bytes: silently returning a
 * shorter value than the caller asked for would weaken a verifier or a state without
 * anything failing visibly.
 */
export function randomStringFromBytes(bytes: Uint8Array, length: number): string {
  if (bytes.length < length) {
    throw new Error(`need at least ${length} random bytes, received ${bytes.length}`);
  }

  let out = '';
  for (let i = 0; i < length; i += 1) {
    // 64 divides 256 evenly, so masking to six bits is unbiased across the alphabet.
    out += VERIFIER_ALPHABET[bytes[i] & 0x3f];
  }
  return out;
}

/** Generates a 96-character verifier (inside the 43–128 range the spec allows). */
export async function createCodeVerifier(length = 96): Promise<string> {
  if (length < 43 || length > 128) {
    throw new Error('code_verifier length must be between 43 and 128 characters');
  }
  const bytes = await Crypto.getRandomBytesAsync(length);
  return randomStringFromBytes(bytes, length);
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return base64UrlEncode(digest);
}

/** Length of the opaque `state` value, in characters. */
const STATE_LENGTH = 32;

/** Opaque value echoed back by the authorization server to defend against CSRF. */
export async function createState(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(STATE_LENGTH);
  return randomStringFromBytes(bytes, STATE_LENGTH);
}

export type PkcePair = {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: typeof CODE_CHALLENGE_METHOD;
  state: string;
};

export async function createPkcePair(): Promise<PkcePair> {
  const codeVerifier = await createCodeVerifier();
  const [codeChallenge, state] = await Promise.all([
    createCodeChallenge(codeVerifier),
    createState(),
  ]);
  return { codeVerifier, codeChallenge, codeChallengeMethod: CODE_CHALLENGE_METHOD, state };
}

/** Constant-time-ish comparison for the `state` round-trip. */
export function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
