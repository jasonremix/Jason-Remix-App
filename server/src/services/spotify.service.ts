import { db } from '../db/index.ts';
import { env, isSpotifyConfigured } from '../env.ts';
import { decryptSecret, encryptSecret } from '../lib/crypto.ts';
import { ApiError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';
import { toIso } from './credits.service.ts';

/**
 * Spotify integration.
 *
 * The client secret exists only in this process. The app performs the PKCE
 * authorization step, then hands the server the code and verifier; the server does the
 * token exchange, encrypts the resulting tokens and keeps them. Spotify tokens are
 * never returned to the app in any response.
 *
 * Everything read here is metadata for display. No audio is requested, downloaded,
 * stored or re-served, and nothing in this file writes media to disk.
 */

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

/** Treated as a Jason Remix release when the artist matches. */
const ARTIST_NAME = 'Jason Remix';

export type SpotifyConnectionSummary = {
  connected: boolean;
  spotifyUserId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  product: string | null;
  scopes: string[];
  connectedAt: string | null;
  expiresAt: string | null;
};

const DISCONNECTED: SpotifyConnectionSummary = {
  connected: false,
  spotifyUserId: null,
  displayName: null,
  avatarUrl: null,
  product: null,
  scopes: [],
  connectedAt: null,
  expiresAt: null,
};

type ConnectionRow = {
  user_id: string;
  spotify_user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  product: string | null;
  scopes: string;
  access_token_cipher: string;
  refresh_token_cipher: string;
  access_token_expires_at: string;
  connected_at: string;
};

function requireConfigured(): void {
  if (!isSpotifyConfigured) {
    throw new ApiError('SPOTIFY_NOT_CONFIGURED', 'Spotify is not available yet.');
  }
}

export function getConnection(userId: string): SpotifyConnectionSummary {
  const row = db.prepare(`SELECT * FROM spotify_connections WHERE user_id = ?`).get(userId) as
    | ConnectionRow
    | undefined;
  if (!row) return DISCONNECTED;

  return {
    connected: true,
    spotifyUserId: row.spotify_user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    product: row.product,
    scopes: row.scopes ? row.scopes.split(' ').filter(Boolean) : [],
    connectedAt: toIso(row.connected_at),
    expiresAt: row.access_token_expires_at,
  };
}

export function disconnect(userId: string): void {
  db.prepare(`DELETE FROM spotify_connections WHERE user_id = ?`).run(userId);
}

// --- Token exchange -------------------------------------------------------------

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

/**
 * Exchanges an authorization code for tokens.
 *
 * The client secret is sent here, from the server, over TLS to Spotify — the one place
 * it is ever used. The PKCE verifier proves the code belongs to the app instance that
 * started the flow.
 */
export async function exchangeCode(
  userId: string,
  input: { code: string; codeVerifier: string; redirectUri: string },
): Promise<SpotifyConnectionSummary> {
  requireConfigured();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: env.spotifyClientId as string,
    client_secret: env.spotifyClientSecret as string,
    code_verifier: input.codeVerifier,
  });

  const tokens = await postToken(body);
  if (!tokens.refresh_token) {
    // Without a refresh token the connection would silently die within the hour.
    throw new ApiError('SPOTIFY_AUTH_FAILED', 'Spotify could not be connected.');
  }

  const profile = await fetchProfile(tokens.access_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  db.prepare(
    `INSERT INTO spotify_connections (
        user_id, spotify_user_id, display_name, avatar_url, product, scopes,
        access_token_cipher, refresh_token_cipher, access_token_expires_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
        spotify_user_id = excluded.spotify_user_id,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        product = excluded.product,
        scopes = excluded.scopes,
        access_token_cipher = excluded.access_token_cipher,
        refresh_token_cipher = excluded.refresh_token_cipher,
        access_token_expires_at = excluded.access_token_expires_at,
        updated_at = datetime('now')`,
  ).run(
    userId,
    profile.id,
    profile.display_name ?? null,
    profile.images?.[0]?.url ?? null,
    profile.product ?? null,
    tokens.scope ?? '',
    encryptSecret(tokens.access_token),
    encryptSecret(tokens.refresh_token),
    expiresAt,
  );

  return getConnection(userId);
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    // The response body can contain the submitted parameters — never log or forward it.
    logger.warn('spotify token exchange rejected', { status: response.status });
    throw new ApiError('SPOTIFY_AUTH_FAILED', 'Spotify could not be connected.');
  }

  return (await response.json()) as TokenResponse;
}

/**
 * Returns a usable access token, refreshing first when it is inside its last minute.
 * A refresh that Spotify rejects means the member revoked access: the stored connection
 * is deleted rather than left in a broken state.
 */
async function accessTokenFor(userId: string): Promise<string> {
  requireConfigured();

  const row = db.prepare(`SELECT * FROM spotify_connections WHERE user_id = ?`).get(userId) as
    | ConnectionRow
    | undefined;
  if (!row) throw new ApiError('BAD_REQUEST', 'Connect Spotify first.');

  const expiresAt = new Date(row.access_token_expires_at).getTime();
  if (Number.isFinite(expiresAt) && Date.now() < expiresAt - 60_000) {
    return decryptSecret(row.access_token_cipher);
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: decryptSecret(row.refresh_token_cipher),
    client_id: env.spotifyClientId as string,
    client_secret: env.spotifyClientSecret as string,
  });

  try {
    const tokens = await postToken(body);
    const nextExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    db.prepare(
      `UPDATE spotify_connections
          SET access_token_cipher = ?,
              refresh_token_cipher = COALESCE(?, refresh_token_cipher),
              access_token_expires_at = ?,
              updated_at = datetime('now')
        WHERE user_id = ?`,
    ).run(
      encryptSecret(tokens.access_token),
      tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
      nextExpiry,
      userId,
    );

    return tokens.access_token;
  } catch {
    disconnect(userId);
    throw new ApiError('SPOTIFY_AUTH_FAILED', 'Your Spotify connection needs to be renewed.');
  }
}

// --- Read-only API access ----------------------------------------------------------

async function spotifyGet<T>(userId: string, path: string): Promise<T | null> {
  const token = await accessTokenFor(userId);
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });

  // 204 means "nothing playing" on the playback endpoints — an empty result, not a failure.
  if (response.status === 204 || response.status === 404) return null;

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after') ?? '5');
    logger.warn('spotify rate limited', { retryAfter });
    throw new ApiError('RATE_LIMITED', 'Too many requests to Spotify. Please wait a moment.');
  }

  if (response.status === 401) {
    disconnect(userId);
    throw new ApiError('SPOTIFY_AUTH_FAILED', 'Your Spotify connection needs to be renewed.');
  }

  if (!response.ok) {
    logger.warn('spotify request failed', { status: response.status, path });
    throw new ApiError('SPOTIFY_AUTH_FAILED', 'Spotify could not be reached right now.');
  }

  return (await response.json()) as T;
}

type SpotifyImage = { url: string };
type SpotifyArtist = { name: string };
type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: { images: SpotifyImage[] };
  external_urls: { spotify: string };
};

type SpotifyProfile = {
  id: string;
  display_name: string | null;
  images?: SpotifyImage[];
  product?: string;
};

async function fetchProfile(accessToken: string): Promise<SpotifyProfile> {
  const response = await fetch(`${API_BASE}/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new ApiError('SPOTIFY_AUTH_FAILED', 'Spotify could not be connected.');
  }
  return (await response.json()) as SpotifyProfile;
}

const isJasonRemix = (track: SpotifyTrack) =>
  track.artists.some((artist) => artist.name.toLowerCase() === ARTIST_NAME.toLowerCase());

export async function getNowPlaying(userId: string) {
  const data = await spotifyGet<{
    is_playing: boolean;
    progress_ms: number | null;
    item: SpotifyTrack | null;
  }>(userId, '/me/player/currently-playing');

  if (!data?.item) return null;

  return {
    isPlaying: data.is_playing,
    trackId: data.item.id,
    title: data.item.name,
    artist: data.item.artists.map((artist) => artist.name).join(', '),
    coverUrl: data.item.album.images?.[0]?.url ?? null,
    progressMs: data.progress_ms ?? 0,
    durationMs: data.item.duration_ms,
    spotifyUrl: data.item.external_urls.spotify,
    isJasonRemix: isJasonRemix(data.item),
  };
}

export async function getRecentlyPlayed(userId: string, limit = 10) {
  const data = await spotifyGet<{ items: { track: SpotifyTrack; played_at: string }[] }>(
    userId,
    `/me/player/recently-played?limit=${Math.min(50, Math.max(1, limit))}`,
  );

  return (data?.items ?? []).map((item) => ({
    trackId: item.track.id,
    title: item.track.name,
    artist: item.track.artists.map((artist) => artist.name).join(', '),
    coverUrl: item.track.album.images?.[0]?.url ?? null,
    playedAt: item.played_at,
    spotifyUrl: item.track.external_urls.spotify,
    isJasonRemix: isJasonRemix(item.track),
  }));
}

export async function getTopTracks(userId: string, limit = 10) {
  const data = await spotifyGet<{ items: SpotifyTrack[] }>(
    userId,
    `/me/top/tracks?limit=${Math.min(50, Math.max(1, limit))}&time_range=short_term`,
  );
  return data?.items ?? [];
}
