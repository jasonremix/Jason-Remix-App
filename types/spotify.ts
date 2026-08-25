/** Subset of the Spotify Web API surface the app reads. Read-only, no playback control. */

export type SpotifyImage = { url: string; width: number | null; height: number | null };

export type SpotifyUserProfile = {
  id: string;
  display_name: string | null;
  email?: string;
  images: SpotifyImage[];
  product?: 'premium' | 'free' | 'open';
  external_urls: { spotify: string };
  followers?: { total: number };
};

export type SpotifyArtistRef = { id: string; name: string; external_urls: { spotify: string } };

export type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtistRef[];
  album: { id: string; name: string; images: SpotifyImage[] };
  external_urls: { spotify: string };
};

export type SpotifyCurrentlyPlaying = {
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyTrack | null;
  currently_playing_type?: string;
};

export type SpotifyRecentlyPlayed = {
  items: { track: SpotifyTrack; played_at: string }[];
};

export type SpotifyTopTracks = { items: SpotifyTrack[] };

/** Normalised shape the UI renders, decoupled from the raw API payloads. */
export type NowPlaying = {
  isPlaying: boolean;
  trackId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  progressMs: number;
  durationMs: number;
  spotifyUrl: string;
  /** True when the track is a Jason Remix release. */
  isJasonRemix: boolean;
};

export type PlayHistoryItem = {
  trackId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  playedAt: string;
  spotifyUrl: string;
  isJasonRemix: boolean;
};
