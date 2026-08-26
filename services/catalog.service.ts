import type { CatalogResponse } from '@/types/api';
import type { Track } from '@/types/models';

import { getBackend } from './backend';

/** Discography and news. */
export const catalogService = {
  getCatalog: (): Promise<CatalogResponse> => getBackend().getCatalog(),
  getTrack: (trackId: string): Promise<Track | null> => getBackend().getTrack(trackId),
};

/** Streaming platforms in the order they are presented on a release. */
export const PLATFORM_ORDER = [
  'spotify',
  'youtube',
  'appleMusic',
  'amazonMusic',
  'deezer',
  'tidal',
  'soundcloud',
] as const;

export const PLATFORM_LABELS: Record<(typeof PLATFORM_ORDER)[number], string> = {
  spotify: 'SPOTIFY',
  youtube: 'YOUTUBE',
  appleMusic: 'APPLE MUSIC',
  amazonMusic: 'AMAZON MUSIC',
  deezer: 'DEEZER',
  tidal: 'TIDAL',
  soundcloud: 'SOUNDCLOUD',
};
