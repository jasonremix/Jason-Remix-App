import { db, migrate } from './index.ts';
import { newId } from '../lib/crypto.ts';
import { createUser } from '../services/users.service.ts';

/**
 * Seeds the reference data the app needs to be usable: missions, achievements, the
 * reward ladder, a first giveaway, the discography and news.
 *
 * Idempotent — every insert is `INSERT OR IGNORE` keyed on a stable id, so running it
 * again after a deploy adds anything new without disturbing live data.
 */

migrate();

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

// --- Missions ------------------------------------------------------------------

const missions: [string, string, string, string, number, number | null, number, number][] = [
  ['msn-daily', 'DAILY_CHECK_IN', 'DAILY CHECK-IN', 'Open the app once a day.', 100, 86_400, 1, 0],
  ['msn-spotify', 'CONNECT_SPOTIFY', 'CONNECT SPOTIFY', 'Link your Spotify account to personalise your experience.', 250, null, 0, 1],
  ['msn-profile', 'COMPLETE_PROFILE', 'COMPLETE PROFILE', 'Choose a username and add a picture.', 100, null, 0, 2],
  ['msn-release', 'NEW_RELEASE', 'NEW RELEASE MISSION', 'Listen to the current release on your platform of choice.', 250, null, 0, 3],
  ['msn-community', 'COMMUNITY', 'COMMUNITY MISSION', 'Share the new release with someone who has not heard it yet.', 500, 604_800, 1, 4],
];

const insertMission = db.prepare(
  `INSERT OR IGNORE INTO missions (id, type, title, description, reward, cooldown_seconds, repeatable, position)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);
for (const mission of missions) insertMission.run(...mission);

// --- Achievements ---------------------------------------------------------------

const achievements: [string, string, string, string, string, number][] = [
  ['ach-first-listen', 'FIRST_LISTEN', 'FIRST LISTEN', 'You opened the app and started your collection.', 'STANDARD', 0],
  ['ach-early', 'EARLY_SUPPORTER', 'EARLY SUPPORTER', 'A member since the first season.', 'RARE', 1],
  ['ach-zeitgeist', 'ZEITGEIST', 'ZEITGEIST', 'Completed the Zeitgeist release mission.', 'STANDARD', 2],
  ['ach-super-fan', 'SUPER_FAN', 'SUPER FAN', 'Checked in on thirty separate days.', 'RARE', 3],
  ['ach-collector', 'CREDITS_COLLECTOR', 'CREDITS COLLECTOR', 'Earned 50,000 credits in total.', 'ELITE', 4],
  ['ach-vip', 'VIP_MEMBER', 'VIP MEMBER', 'Reached level 07.', 'ELITE', 5],
  ['ach-legend', 'JASON_LEGEND', 'JASON LEGEND', 'Reached level 08 — the highest tier.', 'ELITE', 6],
];

const insertAchievement = db.prepare(
  `INSERT OR IGNORE INTO achievements (id, code, title, description, tier, position) VALUES (?, ?, ?, ?, ?, ?)`,
);
for (const achievement of achievements) insertAchievement.run(...achievement);

// --- Rewards ---------------------------------------------------------------------

const rewards: [string, string, string, string, string, number, number, number, number | null, number][] = [
  ['rwd-merch', 'MERCH', 'Member tee, black on black', 'Heavyweight tee with a tonal Jason Remix mark. Ships within Germany and the EU.', 'MERCH', 1_000, 200, 1, null, 0],
  ['rwd-collector', 'COLLECTOR BOX', 'Numbered edition', 'A numbered box with the current pressing, a brushed metal member card and a signed insert.', 'COLLECTOR', 2_500, 100, 1, 3, 1],
  ['rwd-ticket', 'CONCERT TICKET', 'See You Soon Tour 2027', 'One standing ticket for a date of your choice, subject to availability.', 'TICKET', 5_000, 60, 0, 4, 2],
  ['rwd-vip', 'VIP EXPERIENCE', 'Soundcheck access', 'Early entry, soundcheck access and a dedicated member area for the night.', 'EXPERIENCE', 10_000, 20, 0, 5, 3],
  ['rwd-meet', 'MEET & GREET', 'Backstage, before the show', 'A small-group meet & greet with Jason before doors, plus a photo.', 'EXPERIENCE', 15_000, 10, 0, 6, 4],
];

const insertReward = db.prepare(
  `INSERT OR IGNORE INTO rewards (id, title, subtitle, description, category, cost, stock, remaining,
                                  requires_shipping, min_level, position)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
for (const [id, title, subtitle, description, category, cost, stock, shipping, minLevel, position] of rewards) {
  insertReward.run(id, title, subtitle, description, category, cost, stock, stock, shipping, minLevel, position);
}

// --- Catalogue ---------------------------------------------------------------------

db.prepare(
  `INSERT OR IGNORE INTO albums (id, title, cover_url, release_date) VALUES (?, ?, ?, ?)`,
).run('alb-zeitgeist', 'Zeitgeist', null, '2026-07-29');

const tracks: [string, string, string | null, string, string, number, number][] = [
  ['trk-zeitgeist', 'Zeitgeist', 'alb-zeitgeist', '2026-07-29', 'Electronic', 214_000, 1],
  ['trk-havel-nights', 'Havel Nights', 'alb-zeitgeist', '2026-05-15', 'Deep House', 236_000, 0],
  ['trk-titanium-heart', 'Titanium Heart', 'alb-zeitgeist', '2026-03-06', 'Melodic Techno', 258_000, 0],
  ['trk-chrome-season', 'Chrome Season', null, '2025-09-12', 'Electronic', 199_000, 0],
  ['trk-obsidian', 'Obsidian', null, '2025-06-27', 'Techno', 288_000, 0],
];

const insertTrack = db.prepare(
  `INSERT OR IGNORE INTO tracks (id, title, album_id, release_date, genre, duration_ms, featured, links)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);
for (const [id, title, albumId, releaseDate, genre, duration, featured] of tracks) {
  const query = encodeURIComponent(`Jason Remix ${title}`);
  insertTrack.run(
    id,
    title,
    albumId,
    releaseDate,
    genre,
    duration,
    featured,
    JSON.stringify({
      spotify: `https://open.spotify.com/search/${query}`,
      youtube: `https://www.youtube.com/results?search_query=${query}`,
      appleMusic: `https://music.apple.com/search?term=${query}`,
    }),
  );
}

const insertNews = db.prepare(
  `INSERT OR IGNORE INTO news (id, category, title, body) VALUES (?, ?, ?, ?)`,
);
insertNews.run('news-zeitgeist', 'RELEASE', 'ZEITGEIST is out now', 'The new single is available on every major platform.');
insertNews.run('news-tour', 'TOUR', 'SEE YOU SOON TOUR 2027', 'Dates across Germany announced. Members get early access to the ticket window.');
insertNews.run('news-reward', 'REWARD', 'New reward: Collector Box', 'A numbered box with the current pressing and a metal member card.');

// --- A first giveaway ------------------------------------------------------------------

db.prepare(
  `INSERT OR IGNORE INTO giveaways (id, title, subtitle, description, starts_at, ends_at, entry_cost,
                                    total_entries, max_entries_per_user, winner_count, terms)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
).run(
  'gwy-tour-vip',
  'SEE YOU SOON TOUR 2027',
  'VIP EXPERIENCE',
  'Two VIP places for the tour opening, including soundcheck access and backstage entry.',
  days(-1),
  days(21),
  1_000,
  5_000,
  5,
  2,
  'Open to members aged 18 or over resident in the EU. Credits spent on entries are not refundable once the draw has taken place. Winners are drawn at random on the server and notified in the app.',
);

// --- First administrator ------------------------------------------------------------------

const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (adminEmail && adminPassword) {
  const existing = db.prepare(`SELECT 1 FROM users WHERE email = ?`).get(adminEmail.toLowerCase());
  if (existing) {
    console.log(`Administrator ${adminEmail} already exists.`);
  } else {
    createUser({ email: adminEmail, password: adminPassword, username: `admin_${newId().slice(0, 6)}`, role: 'ADMIN' });
    console.log(`Administrator created: ${adminEmail}`);
  }
} else {
  console.log(
    'No administrator created. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.',
  );
}

console.log('Seed complete.');
db.close();
