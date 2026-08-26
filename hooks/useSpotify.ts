import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { config } from '@/constants/config';
import { useHaptics } from '@/hooks/useHaptics';
import { toAppError } from '@/lib/errors';
import { CREDIT_SENSITIVE_KEYS, queryKeys } from '@/lib/queryClient';
import {
  clearSpotifyCache,
  connectSpotify,
  spotifyDisconnect,
  spotifyHistory,
  spotifyPlayback,
  spotifyProfile,
  spotifyTopTracks,
} from '@/services/spotify';
import { useAuthStore } from '@/store/authStore';
import { useSpotifyStore } from '@/store/spotifyStore';
import { useUiStore } from '@/store/uiStore';

/** The stored connection as the server reports it. */
export function useSpotifyConnection() {
  const status = useAuthStore((state) => state.status);
  const setConnection = useSpotifyStore((state) => state.setConnection);

  return useQuery({
    queryKey: queryKeys.spotifyConnection,
    queryFn: async () => {
      const connection = await spotifyProfile.get();
      setConnection(connection);
      return connection;
    },
    enabled: status === 'signed-in' && config.isSpotifyConfigured,
    staleTime: 60_000,
  });
}

/** Polls the currently playing track while the Music screen is open. */
export function useNowPlaying(enabled: boolean) {
  const connection = useSpotifyStore((state) => state.connection);
  return useQuery({
    queryKey: queryKeys.spotifyNowPlaying,
    queryFn: () => spotifyPlayback.getNowPlaying(),
    enabled: enabled && config.isSpotifyConfigured && Boolean(connection?.connected),
    // Matches the service-level cache so polling never outruns Spotify's rate limits.
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

export function useRecentlyPlayed(enabled: boolean, limit = 8) {
  const connection = useSpotifyStore((state) => state.connection);
  return useQuery({
    queryKey: [...queryKeys.spotifyRecent, limit],
    queryFn: () => spotifyHistory.getRecentlyPlayed(limit),
    enabled: enabled && config.isSpotifyConfigured && Boolean(connection?.connected),
    staleTime: 120_000,
  });
}

export function useTopTracks(enabled: boolean, limit = 8) {
  const connection = useSpotifyStore((state) => state.connection);
  return useQuery({
    queryKey: [...queryKeys.spotifyTop, limit],
    queryFn: () => spotifyTopTracks.get(limit),
    enabled: enabled && config.isSpotifyConfigured && Boolean(connection?.connected),
    staleTime: 600_000,
  });
}

/**
 * Runs the PKCE sign-in. Connecting may also complete the CONNECT SPOTIFY mission —
 * that award is decided and applied by the server, never here.
 */
export function useConnectSpotify() {
  const queryClient = useQueryClient();
  const setConnecting = useSpotifyStore((state) => state.setConnecting);
  const setConnection = useSpotifyStore((state) => state.setConnection);
  const setError = useSpotifyStore((state) => state.setError);
  const showToast = useUiStore((state) => state.showToast);
  const pulseCredits = useUiStore((state) => state.pulseCredits);
  const { success, warn } = useHaptics();

  return useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectSpotify();

      if (result.outcome === 'not-configured') {
        setError('Spotify is not available yet.');
        showToast('SPOTIFY NOT CONFIGURED', 'neutral');
        return result;
      }
      if (result.outcome === 'cancelled') {
        setConnecting(false);
        return result;
      }

      setConnection(result.response.connection);
      success();

      if (result.response.missionAward) {
        pulseCredits(result.response.missionAward.transaction.amount);
      }
      for (const key of [...CREDIT_SENSITIVE_KEYS, queryKeys.spotifyConnection]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      return result;
    } catch (error) {
      warn();
      const appError = toAppError(error);
      setError(appError.message);
      showToast(appError.message, 'negative');
      throw appError;
    } finally {
      setConnecting(false);
    }
  }, [
    pulseCredits,
    queryClient,
    setConnecting,
    setConnection,
    setError,
    showToast,
    success,
    warn,
  ]);
}

export function useDisconnectSpotify() {
  const queryClient = useQueryClient();
  const reset = useSpotifyStore((state) => state.reset);
  const showToast = useUiStore((state) => state.showToast);

  return useMutation({
    mutationFn: () => spotifyDisconnect.run(),
    onSuccess: () => {
      reset();
      clearSpotifyCache();
      showToast('SPOTIFY DISCONNECTED', 'neutral');
      void queryClient.invalidateQueries({ queryKey: queryKeys.spotifyConnection });
      void queryClient.removeQueries({ queryKey: queryKeys.spotifyNowPlaying });
      void queryClient.removeQueries({ queryKey: queryKeys.spotifyRecent });
      void queryClient.removeQueries({ queryKey: queryKeys.spotifyTop });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
    onError: (error) => {
      showToast(toAppError(error).message, 'negative');
    },
  });
}
