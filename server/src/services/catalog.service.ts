import { db } from '../db/index.ts';
import { toIso } from './credits.service.ts';

/** Discography, albums and news. Public data — no per-member state. */

export type StreamingLinks = Record<string, string>;

export type Track = {
  id: string;
  title: string;
  artist: string;
  albumId: string | null;
  coverUrl: string | null;
  releaseDate: string;
  genre: string | null;
  durationMs: number | null;
  isrc: string | null;
  featured: boolean;
  links: StreamingLinks;
};

export type Album = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  releaseDate: string;
  trackIds: string[];
};

export type NewsItem = {
  id: string;
  category: 'RELEASE' | 'TOUR' | 'REWARD' | 'ANNOUNCEMENT';
  title: string;
  body: string;
  imageUrl: string | null;
  publishedAt: string;
  linkUrl: string | null;
};

type TrackRow = {
  id: string;
  title: string;
  artist: string;
  album_id: string | null;
  cover_url: string | null;
  release_date: string;
  genre: string | null;
  duration_ms: number | null;
  isrc: string | null;
  featured: number;
  links: string;
};

function toTrack(row: TrackRow): Track {
  let links: StreamingLinks = {};
  try {
    // Stored as JSON; a malformed value must not take down the whole catalogue.
    const parsed: unknown = JSON.parse(row.links);
    if (parsed && typeof parsed === 'object') links = parsed as StreamingLinks;
  } catch {
    links = {};
  }

  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    albumId: row.album_id,
    coverUrl: row.cover_url,
    releaseDate: row.release_date,
    genre: row.genre,
    durationMs: row.duration_ms,
    isrc: row.isrc,
    featured: row.featured === 1,
    links,
  };
}

export function listTracks(): Track[] {
  const rows = db
    .prepare(`SELECT * FROM tracks ORDER BY release_date DESC, position ASC`)
    .all() as TrackRow[];
  return rows.map(toTrack);
}

export function getTrack(trackId: string): Track | null {
  const row = db.prepare(`SELECT * FROM tracks WHERE id = ?`).get(trackId) as TrackRow | undefined;
  return row ? toTrack(row) : null;
}

export function listAlbums(): Album[] {
  const rows = db.prepare(`SELECT * FROM albums ORDER BY release_date DESC`).all() as {
    id: string;
    title: string;
    artist: string;
    cover_url: string | null;
    release_date: string;
  }[];

  const trackIds = db.prepare(`SELECT id, album_id FROM tracks WHERE album_id IS NOT NULL`).all() as {
    id: string;
    album_id: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    coverUrl: row.cover_url,
    releaseDate: row.release_date,
    trackIds: trackIds.filter((track) => track.album_id === row.id).map((track) => track.id),
  }));
}

export function listNews(limit = 20): NewsItem[] {
  const rows = db
    .prepare(`SELECT * FROM news ORDER BY published_at DESC LIMIT ?`)
    .all(limit) as {
    id: string;
    category: NewsItem['category'];
    title: string;
    body: string;
    image_url: string | null;
    link_url: string | null;
    published_at: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url,
    publishedAt: toIso(row.published_at),
    linkUrl: row.link_url,
  }));
}

export function getCatalog() {
  const tracks = listTracks();
  const featured = tracks.find((track) => track.featured) ?? tracks[0] ?? null;
  return {
    tracks,
    albums: listAlbums(),
    news: listNews(),
    featuredTrackId: featured?.id ?? null,
  };
}
