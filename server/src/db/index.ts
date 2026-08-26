import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

import { env } from '../env.ts';

/**
 * SQLite connection.
 *
 * better-sqlite3 is synchronous, which is exactly what a credit ledger wants: a
 * transaction really is atomic with no interleaving await points inside it.
 */

const here = dirname(fileURLToPath(import.meta.url));

function openDatabase(): Database.Database {
  if (env.databaseUrl === ':memory:') return new Database(':memory:');

  const file = resolve(process.cwd(), env.databaseUrl);
  const directory = dirname(file);
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  return new Database(file);
}

export const db = openDatabase();

// WAL keeps reads from blocking writes; the busy timeout stops a concurrent write
// from failing outright under load.
if (env.databaseUrl !== ':memory:') db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

/**
 * Columns added to a table that already exists in a deployed database.
 *
 * `schema.sql` only ever runs as CREATE TABLE IF NOT EXISTS, so a new column on an
 * existing table has to be added separately. Each entry is applied only when the
 * column is genuinely absent, which keeps `migrate()` safe to call repeatedly.
 */
const ADDED_COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: 'users', column: 'email_verified_at', definition: 'TEXT' },
];

/** Applies the schema. Safe to call repeatedly — every statement is IF NOT EXISTS. */
export function migrate(target: Database.Database = db): void {
  const schema = readFileSync(resolve(here, 'schema.sql'), 'utf8');
  target.exec(schema);

  for (const { table, column, definition } of ADDED_COLUMNS) {
    const columns = target.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (columns.some((existing) => existing.name === column)) continue;
    target.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/**
 * Runs `work` inside a transaction.
 *
 * Every credit movement goes through here: the ledger row, the balance update and the
 * domain record (entry, redemption, completion) either all land or none do.
 */
export function transaction<T>(work: () => T): T {
  return db.transaction(work)();
}

export type Db = Database.Database;
