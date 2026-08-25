import { SecureKeys, secureStorage } from '@/lib/secureStorage';

import { getBackend } from '../backend';
import { clearSpotifyCache } from './spotifyApi';

/**
 * Severs the Spotify link.
 *
 * The server revokes and deletes the stored tokens; locally we drop any cached Spotify
 * data and the transient PKCE material. Nothing Spotify-derived survives this call.
 */
export const spotifyDisconnect = {
  async run(): Promise<void> {
    try {
      await getBackend().disconnectSpotify();
    } finally {
      clearSpotifyCache();
      await Promise.all([
        secureStorage.remove(SecureKeys.spotifyState),
        secureStorage.remove(SecureKeys.spotifyVerifier),
      ]);
    }
  },
};
