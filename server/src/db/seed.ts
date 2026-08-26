import { db, migrate } from './index.ts';
import { newId } from '../lib/crypto.ts';
import { createUser } from '../services/users.service.ts';

/**
 * Seeds the reference data the app needs to be usable: missions, achievements, the
 * reward ladder, a first giveaway, the discography and news. All member-facing text is
 * German, because that is what a real member reads.
 *
 * Idempotent — every insert is `INSERT OR IGNORE` keyed on a stable id, so running it
 * again after a deploy adds anything new without disturbing live data.
 */

migrate();

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

// --- Missions ------------------------------------------------------------------

const missions: [string, string, string, string, number, number | null, number, number][] = [
  ['msn-daily', 'DAILY_CHECK_IN', 'TÄGLICHER BESUCH', 'Öffne die App einmal am Tag.', 100, 86_400, 1, 0],
  ['msn-spotify', 'CONNECT_SPOTIFY', 'SPOTIFY VERBINDEN', 'Verbinde dein Spotify-Konto, damit die App persönlicher wird.', 250, null, 0, 1],
  ['msn-profile', 'COMPLETE_PROFILE', 'PROFIL VERVOLLSTÄNDIGEN', 'Wähle einen Benutzernamen und lade ein Bild hoch.', 100, null, 0, 2],
  ['msn-release', 'NEW_RELEASE', 'MISSION ZUR NEUEN SINGLE', 'Hör die aktuelle Veröffentlichung auf der Plattform deiner Wahl.', 250, null, 0, 3],
  ['msn-community', 'COMMUNITY', 'COMMUNITY-MISSION', 'Teile die neue Veröffentlichung mit jemandem, der sie noch nicht kennt.', 500, 604_800, 1, 4],
];

const insertMission = db.prepare(
  `INSERT OR IGNORE INTO missions (id, type, title, description, reward, cooldown_seconds, repeatable, position)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);
for (const mission of missions) insertMission.run(...mission);

// --- Achievements ---------------------------------------------------------------

const achievements: [string, string, string, string, string, number][] = [
  ['ach-first-listen', 'FIRST_LISTEN', 'ERSTES HÖREN', 'Du hast die App geöffnet und deine Sammlung begonnen.', 'STANDARD', 0],
  ['ach-early', 'EARLY_SUPPORTER', 'FRÜHER UNTERSTÜTZER', 'Mitglied seit der ersten Saison.', 'RARE', 1],
  ['ach-zeitgeist', 'ZEITGEIST', 'ZEITGEIST', 'Die Mission zur Zeitgeist-Veröffentlichung abgeschlossen.', 'STANDARD', 2],
  ['ach-super-fan', 'SUPER_FAN', 'SUPER FAN', 'An dreißig verschiedenen Tagen vorbeigeschaut.', 'RARE', 3],
  ['ach-collector', 'CREDITS_COLLECTOR', 'CREDIT-SAMMLER', 'Insgesamt 50.000 Credits verdient.', 'ELITE', 4],
  ['ach-vip', 'VIP_MEMBER', 'VIP-MITGLIED', 'Level 07 erreicht.', 'ELITE', 5],
  ['ach-legend', 'JASON_LEGEND', 'JASON-LEGENDE', 'Level 08 erreicht — die höchste Stufe.', 'ELITE', 6],
];

const insertAchievement = db.prepare(
  `INSERT OR IGNORE INTO achievements (id, code, title, description, tier, position) VALUES (?, ?, ?, ?, ?, ?)`,
);
for (const achievement of achievements) insertAchievement.run(...achievement);

// --- Rewards ---------------------------------------------------------------------

const rewards: [string, string, string, string, string, number, number, number, number | null, number][] = [
  ['rwd-merch', 'MERCH', 'Mitglieder-Shirt, Schwarz auf Schwarz', 'Schweres Shirt mit Ton-in-Ton-Aufdruck der Jason-Remix-Marke. Versand innerhalb Deutschlands und der EU.', 'MERCH', 1_000, 200, 1, null, 0],
  ['rwd-collector', 'SAMMLERBOX', 'Nummerierte Auflage', 'Eine nummerierte Box mit der aktuellen Pressung, einer Mitgliedskarte aus gebürstetem Metall und einem signierten Einlegeblatt.', 'COLLECTOR', 2_500, 100, 1, 3, 1],
  ['rwd-ticket', 'KONZERTTICKET', 'See You Soon Tour 2027', 'Ein Stehplatzticket für einen Termin deiner Wahl, solange verfügbar.', 'TICKET', 5_000, 60, 0, 4, 2],
  ['rwd-vip', 'VIP-ERLEBNIS', 'Zutritt zum Soundcheck', 'Früher Einlass, Zutritt zum Soundcheck und ein eigener Mitgliederbereich für den Abend.', 'EXPERIENCE', 10_000, 20, 0, 5, 3],
  ['rwd-meet', 'MEET & GREET', 'Backstage, vor der Show', 'Ein Meet & Greet mit Jason in kleiner Runde vor dem Einlass, samt Foto.', 'EXPERIENCE', 15_000, 10, 0, 6, 4],
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
insertNews.run('news-zeitgeist', 'RELEASE', 'ZEITGEIST ist da', 'Die neue Single ist auf allen großen Plattformen verfügbar.');
insertNews.run('news-tour', 'TOUR', 'SEE YOU SOON TOUR 2027', 'Die Termine in ganz Deutschland stehen. Mitglieder kommen früher an den Ticketvorverkauf.');
insertNews.run('news-reward', 'REWARD', 'Neue Prämie: Sammlerbox', 'Eine nummerierte Box mit der aktuellen Pressung und einer Mitgliedskarte aus Metall.');

// --- A first giveaway ------------------------------------------------------------------

db.prepare(
  `INSERT OR IGNORE INTO giveaways (id, title, subtitle, description, starts_at, ends_at, entry_cost,
                                    total_entries, max_entries_per_user, winner_count, terms)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
).run(
  'gwy-tour-vip',
  'SEE YOU SOON TOUR 2027',
  'VIP-ERLEBNIS',
  'Zwei VIP-Plätze zum Tourauftakt, inklusive Zutritt zum Soundcheck und Backstage-Bereich.',
  days(-1),
  days(21),
  1_000,
  5_000,
  5,
  2,
  'Teilnahmeberechtigt sind Mitglieder ab 18 Jahren mit Wohnsitz in der EU. Für Lose eingesetzte Credits werden nach der Ziehung nicht erstattet. Die Gewinner werden per Zufall auf dem Server gezogen und in der App benachrichtigt.',
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
