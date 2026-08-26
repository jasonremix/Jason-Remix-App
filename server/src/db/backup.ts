import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { db } from './index.ts';
import { logger } from '../lib/logger.ts';

/**
 * Online database backup.
 *
 * Uses SQLite's own backup API rather than copying the file: copying a live
 * database can capture a half-written page, and with WAL enabled it would also
 * miss everything still in the write-ahead log. This produces a consistent
 * snapshot while the server keeps serving.
 *
 *   npm run backup                       → ./backups/jason-remix-<timestamp>.sqlite
 *   npm run backup -- /mnt/backups       → into that directory
 *
 * Run it from cron or a scheduled platform job. The ledger is the one thing in
 * this system that cannot be reconstructed from anywhere else.
 */

const RETAIN = Number(process.env.BACKUP_RETAIN ?? 14);

async function main(): Promise<void> {
  const target = resolve(process.argv[2] ?? process.env.BACKUP_DIR ?? './backups');
  if (!existsSync(target)) mkdirSync(target, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(target, `jason-remix-${stamp}.sqlite`);

  await db.backup(file);

  const { size } = statSync(file);
  logger.info(`Backup written: ${file} (${(size / 1024).toFixed(0)} KB)`);

  prune(target);
  db.close();
}

/** Keeps the most recent `RETAIN` snapshots so the directory cannot grow forever. */
function prune(directory: string): void {
  const snapshots = readdirSync(directory)
    .filter((name) => /^jason-remix-.*\.sqlite$/.test(name))
    .map((name) => ({ name, path: join(directory, name) }))
    .sort((a, b) => statSync(b.path).mtimeMs - statSync(a.path).mtimeMs);

  for (const stale of snapshots.slice(RETAIN)) {
    unlinkSync(stale.path);
    logger.info(`Pruned old backup: ${stale.name}`);
  }
}

main().catch((error) => {
  logger.error('Backup failed', { message: error instanceof Error ? error.message : 'unknown' });
  process.exitCode = 1;
});
