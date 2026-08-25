import type { PlayHistoryItem } from '@/types/spotify';

import { getBackend } from '../backend';
import { SPOTIFY_TTL, assertSpotifyConfigured, cached } from './spotifyApi';

/** Recently played tracks, for display only. */
export const spotifyHistory = {
  getRecentlyPlayed: (limit = 10): Promise<PlayHistoryItem[]> => {
    assertSpotifyConfigured();
    return cached(`spotify:recent:${limit}`, SPOTIFY_TTL.recentlyPlayed, () =>
      getBackend().getSpotifyRecentlyPlayed(limit),
    );
  },
};
