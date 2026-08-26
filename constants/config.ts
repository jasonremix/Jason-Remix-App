import Constants from 'expo-constants';

/**
 * Runtime configuration.
 *
 * Only non-secret values ever reach the client. The Spotify *client secret* lives
 * exclusively on the API server, which performs the PKCE token exchange on the
 * app's behalf (see server/src/services/spotify.service.ts).
 */

/**
 * `EXPO_PUBLIC_*` variables are substituted into the bundle at build time, and that
 * substitution is a *static* text replacement: `process.env[key]` is never rewritten and
 * would always read as undefined in a release build. Each variable therefore has to be
 * named literally here.
 *
 * `expoConfig.extra` is consulted as a fallback so one built binary can be re-pointed
 * from app.json without a rebuild.
 */
function fromExtra(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const value = extra?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function pick(inlined: string | undefined, key: string): string | undefined {
  return inlined && inlined.length > 0 ? inlined : fromExtra(key);
}

const apiBaseUrl = pick(process.env.EXPO_PUBLIC_API_BASE_URL, 'EXPO_PUBLIC_API_BASE_URL');
const spotifyClientId = pick(
  process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID,
  'EXPO_PUBLIC_SPOTIFY_CLIENT_ID',
);
const forceDemo =
  pick(process.env.EXPO_PUBLIC_FORCE_DEMO_MODE, 'EXPO_PUBLIC_FORCE_DEMO_MODE') === 'true';

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
