import { db, transaction } from '../db/index.ts';
import { newId } from '../lib/crypto.ts';
import { ApiError, notFound } from '../lib/errors.ts';
import { applyLedgerEntry, toIso, type CreditBalance, type CreditTransaction } from './credits.service.ts';
import { evaluateStandingAchievements, unlockAchievements, type Achievement } from './achievements.service.ts';

/**
 * Missions.
 *
 * Eligibility, cooldown and the award amount are all decided here. The client sends only
 * a mission id — it cannot propose an amount, and a stale or forged claim simply fails.
 */

export type MissionType =
  | 'DAILY_CHECK_IN'
  | 'CONNECT_SPOTIFY'
  | 'COMPLETE_PROFILE'
  | 'NEW_RELEASE'
  | 'COMMUNITY'
  | 'SPECIAL_EVENT';

export type MissionStatus = 'AVAILABLE' | 'COMPLETED' | 'COOLDOWN' | 'LOCKED' | 'EXPIRED';

export type Mission = {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  reward: number;
  cooldownSeconds: number | null;
  repeatable: boolean;
  status: MissionStatus;
  availableAt: string | null;
  completedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

type MissionRow = {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  reward: number;
  cooldown_seconds: number | null;
  repeatable: number;
  starts_at: string | null;
  ends_at: string | null;
  last_completed_at: string | null;
  completion_count: number;
};

const MISSION_SELECT = `
  SELECT m.id, m.type, m.title, m.description, m.reward, m.cooldown_seconds, m.repeatable,
         m.starts_at, m.ends_at,
         (SELECT MAX(mc.completed_at) FROM mission_completions mc
           WHERE mc.mission_id = m.id AND mc.user_id = ?)  AS last_completed_at,
         (SELECT COUNT(*) FROM mission_completions mc
           WHERE mc.mission_id = m.id AND mc.user_id = ?)  AS completion_count
    FROM missions m
   WHERE m.active = 1
   ORDER BY m.position, m.title`;

export function listMissions(userId: string): Mission[] {
  const rows = db.prepare(MISSION_SELECT).all(userId, userId) as MissionRow[];
  return rows.map((row) => toMission(row));
}

function getMissionRow(missionId: string, userId: string): MissionRow | undefined {
  const rows = db.prepare(MISSION_SELECT).all(userId, userId) as MissionRow[];
  return rows.find((row) => row.id === missionId);
}

function toMission(row: MissionRow, now = Date.now()): Mission {
  const repeatable = row.repeatable === 1;
  const lastCompleted = row.last_completed_at ? toIso(row.last_completed_at) : null;

  let status: MissionStatus = 'AVAILABLE';
  let availableAt: string | null = null;

  if (row.starts_at && new Date(row.starts_at).getTime() > now) {
    status = 'LOCKED';
    availableAt = row.starts_at;
  } else if (row.ends_at && new Date(row.ends_at).getTime() <= now) {
    status = 'EXPIRED';
  } else if (row.completion_count > 0 && !repeatable) {
    status = 'COMPLETED';
  } else if (repeatable && lastCompleted && row.cooldown_seconds) {
    const readyAt = new Date(lastCompleted).getTime() + row.cooldown_seconds * 1000;
    if (readyAt > now) {
      status = 'COOLDOWN';
      availableAt = new Date(readyAt).toISOString();
    }
  }

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    reward: row.reward,
    cooldownSeconds: row.cooldown_seconds,
    repeatable,
    status,
    availableAt,
    completedAt: lastCompleted,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

export type ClaimResult = {
  mission: Mission;
  transaction: CreditTransaction;
  balance: CreditBalance;
  unlockedAchievements: Achievement[];
};

/**
 * Claims a mission for a member.
 *
 * `CONNECT_SPOTIFY` is special: it can only be claimed while an actual Spotify
 * connection exists, so the app can never award it by asking nicely.
 */
export function claimMission(userId: string, missionId: string): ClaimResult {
  return transaction(() => {
    const row = getMissionRow(missionId, userId);
    if (!row) throw notFound('Diese Mission gibt es nicht mehr.');

    const mission = toMission(row);

    switch (mission.status) {
      case 'COMPLETED':
        throw new ApiError('MISSION_ALREADY_COMPLETED', 'Diese Mission hast du schon abgeschlossen.');
      case 'COOLDOWN':
        throw new ApiError('MISSION_ON_COOLDOWN', 'Diese Mission ist noch nicht wieder bereit. Schau bald wieder rein.');
      case 'LOCKED':
        throw new ApiError('BAD_REQUEST', 'Diese Mission hat noch nicht begonnen.');
      case 'EXPIRED':
        throw new ApiError('BAD_REQUEST', 'Diese Mission ist beendet.');
      default:
        break;
    }

    if (mission.type === 'CONNECT_SPOTIFY' && !hasSpotifyConnection(userId)) {
      throw new ApiError('BAD_REQUEST', 'Verbinde zuerst Spotify, um diese Mission abzuschließen.');
    }
    if (mission.type === 'COMPLETE_PROFILE' && !hasCompletedProfile(userId)) {
      throw new ApiError('BAD_REQUEST', 'Vervollständige dein Profil, um diese Mission abzuschließen.');
    }

    const { transaction: ledgerEntry, balance } = applyLedgerEntry({
      userId,
      amount: mission.reward,
      type: 'EARN',
      description: mission.title,
      reference: `mission:${mission.id}`,
    });

    db.prepare(
      `INSERT INTO mission_completions (id, mission_id, user_id, transaction_id, awarded)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(newId(), mission.id, userId, ledgerEntry.id, mission.reward);

    const unlocked = [
      ...unlockAchievements(userId, achievementCodesFor(mission.type)),
      ...evaluateStandingAchievements(userId),
    ];

    const refreshed = getMissionRow(missionId, userId);
    return {
      mission: refreshed ? toMission(refreshed) : mission,
      transaction: ledgerEntry,
      balance,
      unlockedAchievements: dedupe(unlocked),
    };
  });
}

function achievementCodesFor(type: MissionType): string[] {
  switch (type) {
    case 'NEW_RELEASE':
      return ['ZEITGEIST'];
    case 'CONNECT_SPOTIFY':
      return ['FIRST_LISTEN'];
    case 'COMPLETE_PROFILE':
      return ['EARLY_SUPPORTER'];
    default:
      return [];
  }
}

function dedupe(achievements: Achievement[]): Achievement[] {
  const seen = new Set<string>();
  return achievements.filter((achievement) => {
    if (seen.has(achievement.id)) return false;
    seen.add(achievement.id);
    return true;
  });
}

function hasSpotifyConnection(userId: string): boolean {
  const row = db.prepare(`SELECT 1 FROM spotify_connections WHERE user_id = ?`).get(userId);
  return Boolean(row);
}

function hasCompletedProfile(userId: string): boolean {
  const row = db
    .prepare(`SELECT completed_at FROM user_profiles WHERE user_id = ?`)
    .get(userId) as { completed_at: string | null } | undefined;
  return Boolean(row?.completed_at);
}

/**
 * Awards the Spotify mission immediately after a successful connection, if it is
 * outstanding. Returns null when there is nothing to award — never a fabricated award.
 */
export function awardSpotifyMissionIfPending(userId: string): ClaimResult | null {
  const mission = listMissions(userId).find(
    (entry) => entry.type === 'CONNECT_SPOTIFY' && entry.status === 'AVAILABLE',
  );
  if (!mission) return null;

  try {
    return claimMission(userId, mission.id);
  } catch {
    // A race with a concurrent claim is not a reason to fail the connection itself.
    return null;
  }
}
