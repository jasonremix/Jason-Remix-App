import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

import { db, migrate, transaction } from './index.ts';
import { logger } from '../lib/logger.ts';

/**
 * Imports the real discography from a JSON file.
 *
 *   npm run import:catalog                  → ./catalog.json
 *   npm run import:catalog -- ./other.json
 *
 * Idempotent and keyed on `id`, so the file stays the source of truth and can be
 * re-imported after every edit. The whole import runs in one transaction: a file
 * with one bad row changes nothing at all, rather than leaving the catalogue
 * half-updated.
 */

const linksSchema = z
  .record(z.string(), z.string().url().nullable())
  .transform((links) =>
    // Nulls are how the template says "no link for this platform"; they must not
    // reach the app as empty entries.
    Object.fromEntries(Object.entries(links).filter(([, url]) => Boolean(url))) as Record<string, string>,
  );

const albumSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().default('Jason Remix'),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD'),
  coverUrl: z.string().url().nullish(),
});

const trackSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().default('Jason Remix'),
  albumId: z.string().nullish(),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD'),
  genre: z.string().nullish(),
  durationSeconds: z.number().int().positive().nullish(),
  isrc: z.string().nullish(),
  coverUrl: z.string().url().nullish(),
  featured: z.boolean().default(false),
  links: linksSchema.default({}),
});

const newsSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['RELEASE', 'TOUR', 'REWARD', 'ANNOUNCEMENT']).default('ANNOUNCEMENT'),
  title: z.string().min(1),
  body: z.string().min(1),
  imageUrl: z.string().url().nullish(),
  linkUrl: z.string().url().nullish(),
});

const catalogSchema = z.object({
  _comment: z.unknown().optional(),
  albums: z.array(albumSchema).default([]),
  tracks: z.array(trackSchema).default([]),
  news: z.array(newsSchema).default([]),
});

function main(): void {
  const path = resolve(process.argv[2] ?? './catalog.json');

  if (!existsSync(path)) {
    logger.error(`No catalogue file at ${path}. Copy catalog.example.json to catalog.json first.`);
    process.exitCode = 1;
    return;
  }

  const parsed = catalogSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    logger.error('The catalogue file is not valid:');
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const { albums, tracks, news } = parsed.data;

  const featured = tracks.filter((track) => track.featured);
  if (featured.length > 1) {
    logger.error(
      `Only one release can be featured on Home; ${featured.length} are marked: ${featured
        .map((track) => track.id)
        .join(', ')}`,
    );
    process.exitCode = 1;
    return;
  }

  migrate();

  transaction(() => {
    const upsertAlbum = db.prepare(
      `INSERT INTO albums (id, title, artist, cover_url, release_date)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title, artist = excluded.artist,
         cover_url = excluded.cover_url, release_date = excluded.release_date`,
    );
    for (const album of albums) {
      upsertAlbum.run(album.id, album.title, album.artist, album.coverUrl ?? null, album.releaseDate);
    }

    // A single featured release, so Home cannot end up with two heroes.
    if (featured.length === 1) db.prepare(`UPDATE tracks SET featured = 0`).run();

    const upsertTrack = db.prepare(
      `INSERT INTO tracks (id, title, artist, album_id, cover_url, release_date, genre,
                           duration_ms, isrc, featured, links)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title, artist = excluded.artist, album_id = excluded.album_id,
         cover_url = excluded.cover_url, release_date = excluded.release_date,
         genre = excluded.genre, duration_ms = excluded.duration_ms, isrc = excluded.isrc,
         featured = excluded.featured, links = excluded.links, updated_at = datetime('now')`,
    );
    for (const track of tracks) {
      upsertTrack.run(
        track.id,
        track.title,
        track.artist,
        track.albumId ?? null,
        track.coverUrl ?? null,
        track.releaseDate,
        track.genre ?? null,
        track.durationSeconds ? track.durationSeconds * 1000 : null,
        track.isrc ?? null,
        track.featured ? 1 : 0,
        JSON.stringify(track.links),
      );
    }

    const upsertNews = db.prepare(
      `INSERT INTO news (id, category, title, body, image_url, link_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         category = excluded.category, title = excluded.title, body = excluded.body,
         image_url = excluded.image_url, link_url = excluded.link_url`,
    );
    for (const item of news) {
      upsertNews.run(
        item.id,
        item.category,
        item.title,
        item.body,
        item.imageUrl ?? null,
        item.linkUrl ?? null,
      );
    }
  });

  logger.info(
    `Imported ${tracks.length} release(s), ${albums.length} album(s), ${news.length} news item(s).`,
  );

  const withoutLinks = tracks.filter((track) => Object.keys(track.links).length === 0);
  if (withoutLinks.length > 0) {
    logger.warn(
      `${withoutLinks.length} release(s) have no streaming links and will show no PLAY button: ${withoutLinks
        .map((track) => track.id)
        .join(', ')}`,
    );
  }

  db.close();
}

main();
