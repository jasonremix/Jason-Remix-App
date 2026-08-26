import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queryKeys } from '@/lib/queryClient';
import { catalogService } from '@/services/catalog.service';
import type { Track } from '@/types/models';

export function useCatalog() {
  const query = useQuery({
    queryKey: queryKeys.catalog,
    queryFn: () => catalogService.getCatalog(),
    // The discography changes rarely; keeping it warm makes Home feel instant.
    staleTime: 5 * 60_000,
  });

  const featuredTrack = useMemo<Track | null>(() => {
    const data = query.data;
    if (!data) return null;
    return data.tracks.find((track) => track.id === data.featuredTrackId) ?? data.tracks[0] ?? null;
  }, [query.data]);

  return { ...query, featuredTrack };
}

export function useTrack(trackId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.track(trackId ?? ''),
    queryFn: () => catalogService.getTrack(trackId as string),
    enabled: Boolean(trackId),
    staleTime: 5 * 60_000,
  });
}
