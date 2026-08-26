import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { db } from '../src/db/index.ts';
import { decryptSecret } from '../src/lib/crypto.ts';
import {
  app,
  auth,
  idempotencyKey,
  registerMember,
  resetDatabase,
  seedReferenceData,
  type Session,
} from './helpers.ts';

/**
 * Spotify is stubbed at the `fetch` boundary: these tests verify what the server does
 * with a response, not Spotify itself. No network call is made.
 */

const TOKEN_RESPONSE = {
  access_token: 'stub-access-token-value',
  refresh_token: 'stub-refresh-token-value',
  expires_in: 3600,
  scope: 'user-read-email user-read-private user-read-currently-playing',
  token_type: 'Bearer',
};

const PROFILE_RESPONSE = {
  id: 'spotify-user-1',
  display_name: 'Demo Listener',
  images: [{ url: 'https://i.example/avatar.jpg' }],
  product: 'premium',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stubSpotify(handler: (url: string, init?: RequestInit) => Response) {
  const spy = vi.fn((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init)),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

const defaultHandler = (url: string) => {
  if (url.includes('accounts.spotify.com/api/token')) return jsonResponse(TOKEN_RESPONSE);
  if (url.endsWith('/v1/me')) return jsonResponse(PROFILE_RESPONSE);
  return jsonResponse({}, 404);
};

const exchangePayload = {
  code: 'authorization-code-from-spotify',
  codeVerifier: 'a'.repeat(64),
  redirectUri: 'jasonremix://spotify-callback',
  state: 'state-value-from-the-request',
};

const connect = (session: Session) =>
  request(app())
    .post('/spotify/exchange')
    .set({ ...auth(session), 'idempotency-key': idempotencyKey() })
    .send(exchangePayload);

describe('spotify connection', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
    stubSpotify(defaultHandler);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports no connection before the flow has run', async () => {
    const session = await registerMember();
    const response = await request(app()).get('/spotify/connection').set(auth(session)).expect(200);

    expect(response.body).toMatchObject({ connected: false, spotifyUserId: null });
  });

  it('exchanges the authorization code and stores the connection', async () => {
    const session = await registerMember();
    const response = await connect(session).expect(200);

    expect(response.body.connection).toMatchObject({
      connected: true,
      spotifyUserId: 'spotify-user-1',
      displayName: 'Demo Listener',
      product: 'premium',
    });
  });

  it('sends the client secret and the PKCE verifier to Spotify, and nothing else', async () => {
    const spy = stubSpotify(defaultHandler);
    const session = await registerMember();
    await connect(session).expect(200);

    const tokenCall = spy.mock.calls.find(([url]) => String(url).includes('/api/token'));
    expect(tokenCall).toBeTruthy();

    const body = String((tokenCall?.[1] as RequestInit).body);
    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code_verifier=');
    expect(body).toContain('client_secret=test-client-secret');
  });

  it('never returns Spotify tokens to the client', async () => {
    const session = await registerMember();
    const response = await connect(session).expect(200);

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain(TOKEN_RESPONSE.access_token);
    expect(serialised).not.toContain(TOKEN_RESPONSE.refresh_token);

    const connection = await request(app()).get('/spotify/connection').set(auth(session)).expect(200);
    expect(JSON.stringify(connection.body)).not.toContain(TOKEN_RESPONSE.access_token);
  });

  it('stores the tokens encrypted rather than in the clear', async () => {
    const session = await registerMember();
    await connect(session).expect(200);

    const row = db
      .prepare(`SELECT access_token_cipher, refresh_token_cipher FROM spotify_connections WHERE user_id = ?`)
      .get(session.userId) as { access_token_cipher: string; refresh_token_cipher: string };

    expect(row.access_token_cipher).not.toContain(TOKEN_RESPONSE.access_token);
    expect(row.refresh_token_cipher).not.toContain(TOKEN_RESPONSE.refresh_token);
    // …and the ciphertext really does decrypt back to the original.
    expect(decryptSecret(row.access_token_cipher)).toBe(TOKEN_RESPONSE.access_token);
  });

  it('awards the CONNECT SPOTIFY mission once a connection genuinely exists', async () => {
    const session = await registerMember();
    const response = await connect(session).expect(200);

    expect(response.body.missionAward.transaction.amount).toBe(250);

    const credits = await request(app()).get('/credits').set(auth(session)).expect(200);
    expect(credits.body.balance.balance).toBe(250);
  });

  it('does not award the mission a second time on reconnect', async () => {
    const session = await registerMember();
    await connect(session).expect(200);

    const second = await connect(session).expect(200);
    expect(second.body.missionAward).toBeNull();

    const credits = await request(app()).get('/credits').set(auth(session)).expect(200);
    expect(credits.body.balance.balance).toBe(250);
  });

  it('refuses an exchange when Spotify rejects the code', async () => {
    stubSpotify((url) =>
      url.includes('/api/token')
        ? jsonResponse({ error: 'invalid_grant' }, 400)
        : jsonResponse(PROFILE_RESPONSE),
    );

    const session = await registerMember();
    const response = await connect(session).expect(502);

    expect(response.body.error.code).toBe('SPOTIFY_AUTH_FAILED');
    expect(response.body.error.message).not.toContain('invalid_grant');
  });

  it('rejects a malformed verifier before contacting Spotify', async () => {
    const spy = stubSpotify(defaultHandler);
    const session = await registerMember();

    await request(app())
      .post('/spotify/exchange')
      .set({ ...auth(session), 'idempotency-key': idempotencyKey() })
      .send({ ...exchangePayload, codeVerifier: 'too-short' })
      .expect(400);

    expect(spy).not.toHaveBeenCalled();
  });

  it('requires a session', async () => {
    await request(app()).post('/spotify/exchange').send(exchangePayload).expect(401);
    await request(app()).get('/spotify/connection').expect(401);
  });
});

describe('spotify playback reads', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
    stubSpotify(defaultHandler);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalises the currently playing track', async () => {
    const session = await registerMember();
    await connect(session).expect(200);

    stubSpotify((url) => {
      if (url.includes('currently-playing')) {
        return jsonResponse({
          is_playing: true,
          progress_ms: 42_000,
          item: {
            id: 'track-1',
            name: 'Zeitgeist',
            duration_ms: 214_000,
            artists: [{ name: 'Jason Remix' }],
            album: { images: [{ url: 'https://i.example/cover.jpg' }] },
            external_urls: { spotify: 'https://open.spotify.com/track/track-1' },
          },
        });
      }
      return jsonResponse({}, 204);
    });

    const response = await request(app()).get('/spotify/now-playing').set(auth(session)).expect(200);

    expect(response.body).toMatchObject({
      isPlaying: true,
      title: 'Zeitgeist',
      artist: 'Jason Remix',
      progressMs: 42_000,
      durationMs: 214_000,
      isJasonRemix: true,
    });
  });

  it('returns nothing rather than an error when no track is playing', async () => {
    const session = await registerMember();
    await connect(session).expect(200);

    stubSpotify(() => new Response(null, { status: 204 }));

    const response = await request(app()).get('/spotify/now-playing').set(auth(session)).expect(200);
    expect(response.body).toBeNull();
  });

  it('surfaces a Spotify rate limit as RATE_LIMITED', async () => {
    const session = await registerMember();
    await connect(session).expect(200);

    stubSpotify(
      () => new Response('{}', { status: 429, headers: { 'retry-after': '11' } }),
    );

    const response = await request(app()).get('/spotify/now-playing').set(auth(session)).expect(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });

  it('drops the stored connection when Spotify reports the token is no longer valid', async () => {
    const session = await registerMember();
    await connect(session).expect(200);

    stubSpotify(() => new Response('{}', { status: 401 }));

    await request(app()).get('/spotify/now-playing').set(auth(session)).expect(502);

    const row = db.prepare(`SELECT 1 FROM spotify_connections WHERE user_id = ?`).get(session.userId);
    expect(row).toBeUndefined();
  });
});

describe('spotify disconnect', () => {
  beforeEach(() => {
    resetDatabase();
    seedReferenceData();
    stubSpotify(defaultHandler);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes the stored connection and its tokens', async () => {
    const session = await registerMember();
    await connect(session).expect(200);

    await request(app())
      .post('/spotify/disconnect')
      .set({ ...auth(session), 'idempotency-key': idempotencyKey() })
      .expect(204);

    const row = db.prepare(`SELECT 1 FROM spotify_connections WHERE user_id = ?`).get(session.userId);
    expect(row).toBeUndefined();

    const connection = await request(app()).get('/spotify/connection').set(auth(session)).expect(200);
    expect(connection.body.connected).toBe(false);
  });

  it('leaves credits already earned untouched', async () => {
    const session = await registerMember();
    await connect(session).expect(200);

    await request(app())
      .post('/spotify/disconnect')
      .set({ ...auth(session), 'idempotency-key': idempotencyKey() })
      .expect(204);

    const credits = await request(app()).get('/credits').set(auth(session)).expect(200);
    expect(credits.body.balance.balance).toBe(250);
  });

  it('is harmless when there is nothing connected', async () => {
    const session = await registerMember();
    await request(app())
      .post('/spotify/disconnect')
      .set({ ...auth(session), 'idempotency-key': idempotencyKey() })
      .expect(204);
  });

  it('requires a session', async () => {
    await request(app()).post('/spotify/disconnect').expect(401);
  });
});
