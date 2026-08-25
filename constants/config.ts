import Constants from 'expo-constants';

/**
 * Runtime configuration.
 *
 * Only non-secret values ever reach the client. The Spotify *client secret* lives
 * exclusively on the API server, which performs the PKCE token exchange on the
 * app's behalf (see server/src/services/spotify.service.ts).
 */

function readEnv(key: string): string | undefined {
  // `process.env.EXPO_PUBLIC_*` is inlined at build time; the extra lookup in
  // `expoConfig.extra` lets the same build be re-pointed from app.json.
  const fromProcess = process.env[key];
  if (fromProcess && fromProcess.length > 0) return fromProcess;
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = extra?.[key];
  return typeof fromExtra === 'string' && fromExtra.length > 0 ? fromExtra : undefined;
}

const apiBaseUrl = readEnv('EXPO_PUBLIC_API_BASE_URL');
const spotifyClientId = readEnv('EXPO_PUBLIC_SPOTIFY_CLIENT_ID');
const forceDemo = readEnv('EXPO_PUBLIC_FORCE_DEMO_MODE') === 'true';

export const config = {
  apiBaseUrl,
  spotifyClientId,

  /**
   * Demo mode runs the whole app against an in-memory dataset so it stays fully
   * explorable before the API and Spotify credentials exist. It is entered only
   * when there is genuinely no backend configured — or when explicitly forced —
   * and every screen states plainly that the data is not real.
   */
  isDemoMode: forceDemo || !apiBaseUrl,

  /** Spotify is only offered when a client id *and* a backend are configured. */
  isSpotifyConfigured: Boolean(spotifyClientId) && Boolean(apiBaseUrl) && !forceDemo,

  /** Scopes are deliberately minimal — read-only, no playback control, no library writes. */
  spotifyScopes: [
    'user-read-email',
    'user-read-private',
    'user-read-currently-playing',
    'user-read-recently-played',
    'user-top-read',
  ] as const,

  requestTimeoutMs: 15_000,
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
} as const;

export type AppConfig = typeof config;
