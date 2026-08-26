import type { NowPlaying } from '@/types/spotify';

import { getBackend } from '../backend';
import { SPOTIFY_TTL, assertSpotifyConfigured, cached } from './spotifyApi';

/**
 * Read-only playback state.
 *
 * This reports what Spotify says is playing. The app never starts, stops or seeks
 * playback, never copies audio, and never stores anything it reads here.
 */
export const spotifyPlayback = {
  getNowPlaying: (): Promise<NowPlaying | null> => {
    assertSpotifyConfigured();
    return cached('spotify:now-playing', SPOTIFY_TTL.nowPlaying, () =>
      getBackend().getSpotifyNowPlaying(),
    );
  },
};
