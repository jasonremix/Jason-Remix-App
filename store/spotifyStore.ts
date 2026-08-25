import { create } from 'zustand';

import { config } from '@/constants/config';
import type { SpotifyConnectionSummary } from '@/types/models';

/**
 * Spotify connection state as last reported by the server.
 *
 * `connected` is only ever set from a server response — the app must never present a
 * connection that does not exist.
 */

type SpotifyState = {
  connection: SpotifyConnectionSummary | null;
  connecting: boolean;
  lastError: string | null;
  setConnection: (connection: SpotifyConnectionSummary | null) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (message: string | null) => void;
  reset: () => void;
};

const emptyConnection: SpotifyConnectionSummary = {
  connected: false,
  spotifyUserId: null,
  displayName: null,
  avatarUrl: null,
  product: null,
  scopes: [],
  connectedAt: null,
  expiresAt: null,
};

export const useSpotifyStore = create<SpotifyState>((set) => ({
  connection: null,
  connecting: false,
  lastError: null,
  setConnection: (connection) => set({ connection, lastError: null }),
  setConnecting: (connecting) => set({ connecting }),
  setError: (lastError) => set({ lastError, connecting: false }),
  reset: () => set({ connection: emptyConnection, connecting: false, lastError: null }),
}));

export const useSpotifyAvailable = () => config.isSpotifyConfigured;
