import type { SpotifyConnectionSummary } from '@/types/models';

import { getBackend } from '../backend';
import { SPOTIFY_TTL, cached } from './spotifyApi';

/** The connected Spotify account as the server sees it. */
export const spotifyProfile = {
  get: (): Promise<SpotifyConnectionSummary> =>
    cached('spotify:connection', SPOTIFY_TTL.connection, () =>
      getBackend().getSpotifyConnection(),
    ),
};
