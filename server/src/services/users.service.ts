import { db, transaction } from '../db/index.ts';
import { hashPassword, newId, verifyPassword } from '../lib/crypto.ts';
import { ApiError, notFound, unauthorized } from '../lib/errors.ts';
import { revokeAllRefreshTokens } from '../lib/auth.ts';
import { ensureBalanceRow, getBalance, toIso } from './credits.service.ts';
import { resolveLevel } from './levels.ts';

/** Accounts and profiles. */

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BANNED' | 'DELETED';

export type User = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  /** Null until the member follows the link in the confirmation email. */
  emailVerifiedAt: string | null;
};

export type UserProfile = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  birthDate: string | null;
  pushEnabled: boolean;
  completedAt: string | null;
};

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  email_verified_at: string | null;
};

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  birth_date: string | null;
  push_enabled: number;
  completed_at: string | null;
};

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  role: row.role,
  status: row.status,
  createdAt: toIso(row.created_at),
  emailVerifiedAt: row.email_verified_at ? toIso(row.email_verified_at) : null,
});

const toProfile = (row: ProfileRow): UserProfile => ({
  userId: row.user_id,
  username: row.username,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  bio: row.bio,
  country: row.country,
  birthDate: row.birth_date,
  pushEnabled: row.push_enabled === 1,
  completedAt: row.completed_at ? toIso(row.completed_at) : null,
});

export function findUserById(userId: string): User | null {
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function getProfile(userId: string): UserProfile | null {
  const row = db.prepare(`SELECT * FROM user_profiles WHERE user_id = ?`).get(userId) as
    | ProfileRow
    | undefined;
  return row ? toProfile(row) : null;
}

export function createUser(input: {
  email: string;
  password: string;
  username: string;
  role?: UserRole;
}): { user: User; profile: UserProfile } {
  return transaction(() => {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();

    const existingEmail = db.prepare(`SELECT 1 FROM users WHERE email = ?`).get(email);
    if (existingEmail) {
      // Deliberately the same wording as a username clash — this endpoint should not
      // become a way to test which addresses are registered.
      throw new ApiError('CONFLICT', 'Diese E-Mail-Adresse oder dieser Benutzername ist schon vergeben.');
    }
    const existingUsername = db.prepare(`SELECT 1 FROM user_profiles WHERE username = ?`).get(username);
    if (existingUsername) {
      throw new ApiError('CONFLICT', 'Diese E-Mail-Adresse oder dieser Benutzername ist schon vergeben.');
    }

    const userId = newId();
    db.prepare(`INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)`).run(
      userId,
      email,
      hashPassword(input.password),
      input.role ?? 'USER',
    );
    db.prepare(`INSERT INTO user_profiles (user_id, username) VALUES (?, ?)`).run(userId, username);
    ensureBalanceRow(userId);

    return {
      user: findUserById(userId) as User,
      profile: getProfile(userId) as UserProfile,
    };
  });
}

export function authenticate(email: string, password: string): User {
  const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.trim().toLowerCase()) as
    | UserRow
    | undefined;

  // Hash even when the account does not exist, so response timing does not reveal
  // which addresses are registered.
  const hash = row?.password_hash ?? '$scrypt$1$1$1$00$00';
  const valid = verifyPassword(password, hash);

  if (!row || !valid) throw unauthorized('Diese Angaben passen zu keinem Konto.');
  if (row.status === 'BANNED') {
    throw new ApiError('ACCOUNT_BANNED', 'Dieses Konto ist gesperrt.');
  }
  if (row.status === 'DELETED') throw unauthorized('Diese Angaben passen zu keinem Konto.');

  return toUser(row);
}

export function updateProfile(
  userId: string,
  input: Partial<Pick<UserProfile, 'username' | 'displayName' | 'avatarUrl' | 'bio' | 'country'>>,
): UserProfile {
  const existing = getProfile(userId);
  if (!existing) throw notFound('Profil nicht gefunden.');

  if (input.username && input.username !== existing.username) {
    const clash = db
      .prepare(`SELECT 1 FROM user_profiles WHERE username = ? AND user_id <> ?`)
      .get(input.username, userId);
    if (clash) throw new ApiError('CONFLICT', 'Dieser Benutzername ist schon vergeben.');
  }

  db.prepare(
    `UPDATE user_profiles
        SET username = COALESCE(?, username),
            display_name = COALESCE(?, display_name),
            avatar_url = COALESCE(?, avatar_url),
            bio = COALESCE(?, bio),
            country = COALESCE(?, country),
            completed_at = COALESCE(completed_at, datetime('now')),
            updated_at = datetime('now')
      WHERE user_id = ?`,
  ).run(
    input.username ?? null,
    input.displayName ?? null,
    input.avatarUrl ?? null,
    input.bio ?? null,
    input.country ?? null,
    userId,
  );

  return getProfile(userId) as UserProfile;
}

export function changePassword(userId: string, currentPassword: string, newPassword: string): void {
  const row = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(userId) as
    | { password_hash: string }
    | undefined;
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    throw unauthorized('Dein aktuelles Passwort stimmt nicht.');
  }

  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(
    hashPassword(newPassword),
    userId,
  );
  // Changing a password ends every other session.
  revokeAllRefreshTokens(userId);
}

/**
 * Deletes an account and everything attached to it.
 *
 * Every child table cascades from `users`, so this really does remove the ledger,
 * entries, redemptions, achievements, push tokens and the Spotify connection. Active
 * giveaway entries are voided first so a deleted account cannot win a draw.
 */
export function deleteAccount(userId: string): void {
  transaction(() => {
    db.prepare(
      `UPDATE giveaway_entries SET status = 'VOID' WHERE user_id = ? AND status = 'ACTIVE'`,
    ).run(userId);
    db.prepare(`DELETE FROM spotify_connections WHERE user_id = ?`).run(userId);
    db.prepare(`DELETE FROM push_tokens WHERE user_id = ?`).run(userId);
    revokeAllRefreshTokens(userId);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  });
}

/** GDPR Art. 15/20 export: everything held about the member, in one document. */
export function exportUserData(userId: string): Record<string, unknown> {
  const user = findUserById(userId);
  if (!user) throw notFound('Konto nicht gefunden.');

  const query = <T>(sql: string): T[] => db.prepare(sql).all(userId) as T[];

  return {
    exportedAt: new Date().toISOString(),
    user,
    profile: getProfile(userId),
    balance: getBalance(userId),
    creditTransactions: query(
      `SELECT amount, type, description, reference, balance_after, created_at
         FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC`,
    ),
    missionCompletions: query(
      `SELECT mission_id, awarded, completed_at FROM mission_completions WHERE user_id = ?`,
    ),
    rewardRedemptions: query(
      `SELECT reward_id, credits_spent, status, created_at FROM reward_redemptions WHERE user_id = ?`,
    ),
    giveawayEntries: query(
      `SELECT giveaway_id, credits_spent, status, created_at FROM giveaway_entries WHERE user_id = ?`,
    ),
    achievements: query(
      `SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?`,
    ),
    // Deliberately excluded: password hash, refresh token hashes and the encrypted
    // Spotify tokens. Those are credentials, not personal data to hand back.
    spotifyConnection: db
      .prepare(
        `SELECT spotify_user_id, display_name, product, scopes, connected_at
           FROM spotify_connections WHERE user_id = ?`,
      )
      .get(userId) ?? null,
  };
}

export type AdminUserSummary = {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  balance: number;
  lifetimeEarned: number;
  level: number;
  createdAt: string;
  spotifyConnected: boolean;
};

export function listUsersForAdmin(query: string | undefined, limit: number, cursor?: string) {
  const search = query ? `%${query.trim()}%` : null;

  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, u.created_at,
              p.username,
              COALESCE(b.balance, 0) AS balance,
              COALESCE(b.lifetime_earned, 0) AS lifetime_earned,
              (SELECT COUNT(*) FROM spotify_connections s WHERE s.user_id = u.id) AS spotify
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         LEFT JOIN credit_balances b ON b.user_id = u.id
        WHERE (? IS NULL OR u.email LIKE ? OR p.username LIKE ?)
          AND (? IS NULL OR u.created_at < ?)
        ORDER BY u.created_at DESC
        LIMIT ?`,
    )
    .all(search, search, search, cursor ?? null, cursor ?? null, limit + 1) as {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    created_at: string;
    username: string | null;
    balance: number;
    lifetime_earned: number;
    spotify: number;
  }[];

  const page = rows.slice(0, limit);
  return {
    users: page.map(
      (row): AdminUserSummary => ({
        id: row.id,
        email: row.email,
        username: row.username,
        role: row.role,
        status: row.status,
        balance: row.balance,
        lifetimeEarned: row.lifetime_earned,
        level: resolveLevel(row.lifetime_earned).level,
        createdAt: toIso(row.created_at),
        spotifyConnected: row.spotify > 0,
      }),
    ),
    nextCursor: rows.length > limit ? page[page.length - 1]?.created_at ?? null : null,
  };
}

export function setUserStatus(userId: string, status: 'ACTIVE' | 'BANNED'): void {
  const result = db
    .prepare(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(status, userId);
  if (result.changes === 0) throw notFound('Konto nicht gefunden.');
  // A ban takes effect immediately, not when the access token happens to expire.
  if (status === 'BANNED') revokeAllRefreshTokens(userId);
}
