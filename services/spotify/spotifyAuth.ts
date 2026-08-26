import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { config } from '@/constants/config';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createPkcePair, safeEquals } from '@/lib/pkce';
import { SecureKeys, secureStorage } from '@/lib/secureStorage';
import type { SpotifyExchangeResponse } from '@/types/api';

import { getBackend } from '../backend';

/**
 * Spotify sign-in — Authorization Code flow with PKCE (RFC 7636).
 *
 * Security shape:
 *  - The app is a *public* client. It holds no client secret and never receives one.
 *  - `code_challenge_method` is always S256; the implicit grant is not used.
 *  - The `state` value and `code_verifier` are held in the Keychain/Keystore for the
 *    duration of the flow and deleted immediately afterwards, success or failure.
 *  - The authorization code is handed to our API server, which performs the token
 *    exchange and keeps the access/refresh tokens server-side. Spotify tokens are
 *    therefore never stored on the device at all.
 */

const AUTHORIZATION_ENDPOINT = 'https://accounts.spotify.com/authorize';

export const spotifyDiscovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: AUTHORIZATION_ENDPOINT,
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

/**
 * The redirect target registered in the Spotify dashboard. Surfaced in Settings →
 * Spotify so the exact value in use can be copied without guesswork.
 */
export function getRedirectUri(): string {
  return AuthSession.makeRedirectUri({ scheme: 'jasonremix', path: 'spotify-callback' });
}

export type SpotifyConnectResult =
  | { outcome: 'connected'; response: SpotifyExchangeResponse }
  | { outcome: 'cancelled' }
  | { outcome: 'not-configured' };

/** Completes any browser session left open by a previous attempt. */
export function maybeCompleteAuthSession(): void {
  WebBrowser.maybeCompleteAuthSession();
}

export async function connectSpotify(): Promise<SpotifyConnectResult> {
  if (!config.isSpotifyConfigured || !config.spotifyClientId) {
    return { outcome: 'not-configured' };
  }

  const redirectUri = getRedirectUri();
  const { codeVerifier, codeChallenge, codeChallengeMethod, state } = await createPkcePair();

  // Held only for the round trip; cleared in `finally` below.
  await Promise.all([
    secureStorage.set(SecureKeys.spotifyVerifier, codeVerifier),
    secureStorage.set(SecureKeys.spotifyState, state),
  ]);

  try {
    const request = new AuthSession.AuthRequest({
      clientId: config.spotifyClientId,
      scopes: [...config.spotifyScopes],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false, // PKCE parameters are supplied explicitly below.
      codeChallenge,
      codeChallengeMethod:
        codeChallengeMethod === 'S256'
          ? AuthSession.CodeChallengeMethod.S256
          : AuthSession.CodeChallengeMethod.Plain,
      state,
      extraParams: {
        // Always show the consent screen so a member can see exactly what is shared.
        show_dialog: 'true',
      },
    });

    const result = await request.promptAsync(spotifyDiscovery, { showInRecents: false });

    if (result.type === 'cancel' || result.type === 'dismiss') return { outcome: 'cancelled' };
    if (result.type !== 'success') {
      logger.warn('spotify authorization did not complete', { type: result.type });
      throw new AppError('SPOTIFY_AUTH_FAILED', 'Spotify could not be connected.');
    }

    const returnedState = result.params.state;
    const storedState = await secureStorage.get(SecureKeys.spotifyState);
    if (!storedState || typeof returnedState !== 'string' || !safeEquals(storedState, returnedState)) {
      // A mismatched state means the response did not come from the request we made.
      throw new AppError('SPOTIFY_AUTH_FAILED', 'Spotify could not be connected.');
    }

    const code = result.params.code;
    if (typeof code !== 'string' || code.length === 0) {
      throw new AppError('SPOTIFY_AUTH_FAILED', 'Spotify could not be connected.');
    }

    const response = await getBackend().exchangeSpotifyCode({
      code,
      codeVerifier,
      redirectUri,
      state: returnedState,
    });

    return { outcome: 'connected', response };
  } finally {
    // The verifier is single-use; keeping it around would weaken the flow.
    await Promise.all([
      secureStorage.remove(SecureKeys.spotifyVerifier),
      secureStorage.remove(SecureKeys.spotifyState),
    ]);
  }
}

/**
 * Human-readable description of exactly what each requested scope grants, shown before
 * the member is sent to Spotify.
 */
export const SCOPE_DESCRIPTIONS: Record<string, string> = {
  'user-read-email': 'Deine bei Spotify hinterlegte E-Mail-Adresse',
  'user-read-private': 'Dein Spotify-Profil und deine Abo-Art',
  'user-read-currently-playing': 'Der Titel, den du gerade hörst',
  'user-read-recently-played': 'Deine zuletzt gehörten Titel',
  'user-top-read': 'Deine meistgehörten Titel',
};

export function describeRequestedScopes(): { scope: string; description: string }[] {
  return config.spotifyScopes.map((scope) => ({
    scope,
    description: SCOPE_DESCRIPTIONS[scope] ?? scope,
  }));
}
