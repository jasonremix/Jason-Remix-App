import type { SpotifyTrack } from '@/types/spotify';

import { getBackend } from '../backend';
import { SPOTIFY_TTL, assertSpotifyConfigured, cached } from './spotifyApi';

export const spotifyTopTracks = {
  get: (limit = 10): Promise<SpotifyTrack[]> => {
    assertSpotifyConfigured();
    return cached(`spotify:top:${limit}`, SPOTIFY_TTL.topTracks, () =>
      getBackend().getSpotifyTopTracks(limit),
    );
  },
};
