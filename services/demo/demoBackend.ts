import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppError } from '@/lib/errors';
import { formatSignedCredits } from '@/lib/format';
import { resolveLevel } from '@/lib/levels';
import type {
  AdminAuditResponse,
  AdminDrawResponse,
  AdminUsersResponse,
  CatalogResponse,
  ClaimMissionResponse,
  CreditsResponse,
  EnterGiveawayResponse,
  GiveawaysResponse,
  MeResponse,
  MissionsResponse,
  RedeemRewardResponse,
  RewardsResponse,
  SessionPayload,
  SpotifyExchangeResponse,
} from '@/types/api';
import type {
  Achievement,
  AdminActionLogEntry,
  CreditBalance,
  CreditTransaction,
  Giveaway,
  GiveawayEntry,
  Mission,
  NewsItem,
  Reward,
  RewardRedemption,
  SpotifyConnectionSummary,
  Track,
  User,
  UserProfile,
} from '@/types/models';
import type { NowPlaying, PlayHistoryItem, SpotifyTrack } from '@/types/spotify';

import type {
  AdminAdjustCreditsInput,
  Backend,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '../backend.types';
import {
  DEMO_ACHIEVEMENTS,
  DEMO_ADMIN,
  DEMO_ALBUMS,
  DEMO_GIVEAWAYS,
  DEMO_MISSIONS,
  DEMO_NEWS,
  DEMO_PROFILE,
  DEMO_REWARDS,
  DEMO_STARTING_BALANCE,
  DEMO_STARTING_LIFETIME_EARNED,
  DEMO_TRACKS,
  DEMO_USER,
} from './demoData';

/**
 * In-memory backend used only when no API is configured.
 *
 * It enforces the same rules as the server — cooldowns, stock, entry limits, no
 * negative balances, idempotency — so the app behaves identically once the real API
 * is pointed at. Its state lives under a `jrx.demo.` key and is discarded the moment
 * `EXPO_PUBLIC_API_BASE_URL` is set: demo credits never become real credits.
 */

const DEMO_STATE_KEY = 'jrx.demo.state.v1';

type DemoState = {
  user: User;
  profile: UserProfile;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  transactions: CreditTransaction[];
  missions: Mission[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  giveaways: Giveaway[];
  entries: GiveawayEntry[];
  achievements: Achievement[];
  tracks: Track[];
  news: NewsItem[];
  audit: AdminActionLogEntry[];
  /** Responses already produced for a given idempotency key. */
  idempotency: Record<string, unknown>;
};

let state: DemoState | null = null;
let hydrating: Promise<DemoState> | null = null;

function freshState(user: User = DEMO_USER): DemoState {
  return {
    user,
    profile: { ...DEMO_PROFILE, userId: user.id },
    balance: DEMO_STARTING_BALANCE,
    lifetimeEarned: DEMO_STARTING_LIFETIME_EARNED,
    lifetimeSpent: DEMO_STARTING_LIFETIME_EARNED - DEMO_STARTING_BALANCE,
    transactions: seedTransactions(user.id),
    missions: DEMO_MISSIONS.map((mission) => ({ ...mission })),
    rewards: DEMO_REWARDS.map((reward) => ({ ...reward })),
    redemptions: [],
    giveaways: DEMO_GIVEAWAYS.map((giveaway) => ({ ...giveaway })),
    entries: [],
    achievements: DEMO_ACHIEVEMENTS.map((achievement) => ({ ...achievement })),
    tracks: DEMO_TRACKS.map((track) => ({ ...track })),
    news: DEMO_NEWS.map((item) => ({ ...item })),
    audit: [],
    idempotency: {},
  };
}

function seedTransactions(userId: string): CreditTransaction[] {
  const base = DEMO_STARTING_BALANCE;
  const seeds: { amount: number; type: CreditTransaction['type']; description: string; ago: number }[] = [
    { amount: 100, type: 'EARN', description: 'Täglicher Besuch', ago: 1 },
    { amount: 250, type: 'EARN', description: 'Mission zur neuen Single — Chrome Season', ago: 4 },
    { amount: -1_000, type: 'SPEND', description: 'Gewinnspiel-Los — Zeitgeist-Testpressung', ago: 9 },
    { amount: 500, type: 'EARN', description: 'Community-Mission', ago: 14 },
    { amount: 1_000, type: 'BONUS', description: 'Bonus für frühe Unterstützer', ago: 30 },
  ];

  let running = base;
  return seeds.map((seed, index) => {
    const transaction: CreditTransaction = {
      id: `demo-txn-${index}`,
      userId,
      amount: seed.amount,
      type: seed.type,
      description: seed.description,
      timestamp: new Date(Date.now() - seed.ago * 86_400_000).toISOString(),
      reference: null,
      balanceAfter: running,
    };
    running -= seed.amount;
    return transaction;
  });
}

async function getState(): Promise<DemoState> {
  if (state) return state;
  if (hydrating) return hydrating;

  hydrating = (async () => {
    try {
      const raw = await AsyncStorage.getItem(DEMO_STATE_KEY);
      state = raw ? (JSON.parse(raw) as DemoState) : freshState();
    } catch {
      state = freshState();
    }
    hydrating = null;
    return state;
  })();

  return hydrating;
}

async function commit(next: DemoState): Promise<void> {
  state = next;
  try {
    await AsyncStorage.setItem(DEMO_STATE_KEY, JSON.stringify(next));
  } catch {
    // Demo persistence is a convenience; losing it is not an error worth surfacing.
  }
}

/** Called when leaving demo mode so no placeholder data lingers. */
export async function clearDemoState(): Promise<void> {
  state = null;
  await AsyncStorage.removeItem(DEMO_STATE_KEY);
}

function balanceOf(current: DemoState): CreditBalance {
  const level = resolveLevel(current.lifetimeEarned);
  return {
    balance: current.balance,
    lifetimeEarned: current.lifetimeEarned,
    lifetimeSpent: current.lifetimeSpent,
    level: level.level,
    levelTitle: level.title,
    nextLevelAt: level.nextThreshold,
    progressToNextLevel: level.progress,
  };
}

function applyLedger(
  current: DemoState,
  input: {
    amount: number;
    type: CreditTransaction['type'];
    description: string;
    reference?: string | null;
  },
): { next: DemoState; transaction: CreditTransaction } {
  const nextBalance = current.balance + input.amount;
  if (nextBalance < 0) {
    throw new AppError('INSUFFICIENT_CREDITS', 'Dafür reicht dein Guthaben nicht aus.');
  }

  const transaction: CreditTransaction = {
    id: `demo-txn-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    userId: current.user.id,
    amount: input.amount,
    type: input.type,
    description: input.description,
    timestamp: new Date().toISOString(),
    reference: input.reference ?? null,
    balanceAfter: nextBalance,
  };

  return {
    next: {
      ...current,
      balance: nextBalance,
      lifetimeEarned: current.lifetimeEarned + Math.max(0, input.amount),
      lifetimeSpent: current.lifetimeSpent + Math.max(0, -input.amount),
      transactions: [transaction, ...current.transactions],
    },
    transaction,
  };
}

/** Replays a stored response when the same idempotency key is seen twice. */
async function idempotent<T>(key: string, produce: (current: DemoState) => Promise<T>): Promise<T> {
  const current = await getState();
  const cached = current.idempotency[key];
  if (cached !== undefined) return cached as T;

  const result = await produce(current);
  const withKey = await getState();
  await commit({ ...withKey, idempotency: { ...withKey.idempotency, [key]: result } });
  return result;
}

function unlockAchievements(current: DemoState, codes: string[]): { next: DemoState; unlocked: Achievement[] } {
  const unlocked: Achievement[] = [];
  const achievements = current.achievements.map((achievement) => {
    if (!codes.includes(achievement.code) || achievement.unlockedAt) return achievement;
    const next = { ...achievement, unlockedAt: new Date().toISOString(), progress: 1 };
    unlocked.push(next);
    return next;
  });
  return { next: { ...current, achievements }, unlocked };
}

const spotifyNotConfigured = () =>
  new AppError('SPOTIFY_NOT_CONFIGURED', 'Spotify steht im Demo-Modus nicht zur Verfügung.');

function demoSession(user: User, profile: UserProfile): SessionPayload {
  // Deliberately not a JWT: nothing in demo mode should look like a real credential.
  return {
    accessToken: 'demo-session',
    refreshToken: 'demo-session',
    expiresIn: 3_600,
    user,
    profile,
  };
}

export const demoBackend: Backend = {
  kind: 'demo',

  async register(input: RegisterInput) {
    const next = freshState({ ...DEMO_USER, email: input.email });
    next.profile = { ...next.profile, username: input.username, completedAt: null };
    await commit(next);
    return demoSession(next.user, next.profile);
  },

  async login(input: LoginInput) {
    // The demo admin address opens the admin area so it can be reviewed without a server.
    const isAdmin = input.email.trim().toLowerCase() === DEMO_ADMIN.email;
    const current = await getState();
    const user: User = isAdmin ? DEMO_ADMIN : { ...current.user, email: input.email };
    const next: DemoState = { ...current, user, profile: { ...current.profile, userId: user.id } };
    await commit(next);
    return demoSession(user, next.profile);
  },

  async logout() {
    // Demo data is intentionally kept so the session can be resumed while exploring.
  },

  async me(): Promise<MeResponse> {
    const current = await getState();
    return {
      user: current.user,
      profile: current.profile,
      balance: balanceOf(current),
      spotify: await demoBackend.getSpotifyConnection(),
      achievements: current.achievements,
    };
  },

  async updateProfile(input: UpdateProfileInput) {
    const current = await getState();
    const profile: UserProfile = {
      ...current.profile,
      ...input,
      completedAt: current.profile.completedAt ?? new Date().toISOString(),
    };
    await commit({ ...current, profile });
    return profile;
  },

  async changePassword() {
    throw new AppError('SPOTIFY_NOT_CONFIGURED', 'Im Demo-Modus nicht verfügbar.');
  },

  async deleteAccount() {
    await clearDemoState();
  },

  async exportData() {
    const current = await getState();
    return {
      note: 'Demo-Export — diese Daten sind Beispielinhalte und gehören zu keinem echten Konto.',
      user: current.user,
      profile: current.profile,
      transactions: current.transactions,
      entries: current.entries,
      redemptions: current.redemptions,
    };
  },

  async getCatalog(): Promise<CatalogResponse> {
    const current = await getState();
    const featured = current.tracks.find((track) => track.featured) ?? current.tracks[0];
    return {
      tracks: [...current.tracks].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
      albums: DEMO_ALBUMS,
      news: current.news,
      featuredTrackId: featured?.id ?? null,
    };
  },

  async getTrack(trackId: string) {
    const current = await getState();
    return current.tracks.find((track) => track.id === trackId) ?? null;
  },

  async getCredits(): Promise<CreditsResponse> {
    const current = await getState();
    return {
      balance: balanceOf(current),
      transactions: current.transactions.slice(0, 50),
      nextCursor: null,
    };
  },

  async getMissions(): Promise<MissionsResponse> {
    const current = await getState();
    const now = Date.now();
    const missions = current.missions.map((mission) => {
      if (mission.status !== 'COOLDOWN' || !mission.availableAt) return mission;
      return new Date(mission.availableAt).getTime() <= now
        ? { ...mission, status: 'AVAILABLE' as const, availableAt: null }
        : mission;
    });
    if (missions.some((mission, index) => mission !== current.missions[index])) {
      await commit({ ...current, missions });
    }
    return { missions };
  },

  claimMission(missionId: string, idempotencyKey: string): Promise<ClaimMissionResponse> {
    return idempotent(idempotencyKey, async (current) => {
      const mission = current.missions.find((entry) => entry.id === missionId);
      if (!mission) throw new AppError('NOT_FOUND', 'Diese Mission gibt es nicht mehr.');

      if (mission.type === 'CONNECT_SPOTIFY') {
        // Never award a "connect Spotify" mission without a real connection.
        throw spotifyNotConfigured();
      }
      if (mission.status === 'COMPLETED' && !mission.repeatable) {
        throw new AppError('MISSION_ALREADY_COMPLETED', 'Diese Mission hast du schon abgeschlossen.');
      }
      if (mission.status === 'COOLDOWN') {
        throw new AppError('MISSION_ON_COOLDOWN', 'Diese Mission ist noch nicht wieder bereit.');
      }

      const { next: afterLedger, transaction } = applyLedger(current, {
        amount: mission.reward,
        type: 'EARN',
        description: mission.title,
        reference: `mission:${mission.id}`,
      });

      const updatedMission: Mission = mission.repeatable
        ? {
            ...mission,
            status: 'COOLDOWN',
            completedAt: new Date().toISOString(),
            availableAt: new Date(Date.now() + (mission.cooldownSeconds ?? 0) * 1000).toISOString(),
          }
        : { ...mission, status: 'COMPLETED', completedAt: new Date().toISOString(), availableAt: null };

      const withMission: DemoState = {
        ...afterLedger,
        missions: afterLedger.missions.map((entry) =>
          entry.id === missionId ? updatedMission : entry,
        ),
      };

      const { next, unlocked } = unlockAchievements(
        withMission,
        mission.type === 'NEW_RELEASE' ? ['ZEITGEIST'] : [],
      );
      await commit(next);

      return {
        mission: updatedMission,
        transaction,
        balance: balanceOf(next),
        unlockedAchievements: unlocked,
      };
    });
  },

  async getRewards(): Promise<RewardsResponse> {
    const current = await getState();
    return { rewards: current.rewards, redemptions: current.redemptions };
  },

  redeemReward(rewardId: string, idempotencyKey: string): Promise<RedeemRewardResponse> {
    return idempotent(idempotencyKey, async (current) => {
      const reward = current.rewards.find((entry) => entry.id === rewardId);
      if (!reward || !reward.active) {
        throw new AppError('REWARD_UNAVAILABLE', 'Diese Prämie ist gerade nicht verfügbar.');
      }
      if (reward.remaining !== null && reward.remaining <= 0) {
        throw new AppError('REWARD_UNAVAILABLE', 'Diese Prämie ist vergriffen.');
      }
      const level = resolveLevel(current.lifetimeEarned);
      if (reward.minLevel !== null && level.level < reward.minLevel) {
        throw new AppError('FORBIDDEN', `This reward unlocks at level ${reward.minLevel}.`);
      }

      const { next: afterLedger, transaction } = applyLedger(current, {
        amount: -reward.cost,
        type: 'SPEND',
        description: `Prämie — ${reward.title}`,
        reference: `reward:${reward.id}`,
      });

      const redemption: RewardRedemption = {
        id: `demo-red-${Date.now()}`,
        rewardId: reward.id,
        rewardTitle: reward.title,
        userId: current.user.id,
        creditsSpent: reward.cost,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        fulfilledAt: null,
        note: null,
      };

      const next: DemoState = {
        ...afterLedger,
        rewards: afterLedger.rewards.map((entry) =>
          entry.id === rewardId && entry.remaining !== null
            ? { ...entry, remaining: entry.remaining - 1 }
            : entry,
        ),
        redemptions: [redemption, ...afterLedger.redemptions],
      };
      await commit(next);

      return { redemption, transaction, balance: balanceOf(next) };
    });
  },

  async getGiveaways(): Promise<GiveawaysResponse> {
    const current = await getState();
    const now = Date.now();
    const giveaways = current.giveaways.map((giveaway) => {
      const mine = current.entries.filter((entry) => entry.giveawayId === giveaway.id);
      const ended = new Date(giveaway.endsAt).getTime() <= now;
      const status: Giveaway['status'] =
        giveaway.status === 'DRAWN' || giveaway.status === 'CANCELLED'
          ? giveaway.status
          : ended
            ? 'CLOSED'
            : 'OPEN';
      return {
        ...giveaway,
        status,
        myEntries: mine.length,
        myStatus: mine[0]?.status ?? null,
      };
    });
    return { giveaways, entries: current.entries };
  },

  enterGiveaway(
    giveawayId: string,
    entries: number,
    idempotencyKey: string,
  ): Promise<EnterGiveawayResponse> {
    return idempotent(idempotencyKey, async (current) => {
      const giveaway = current.giveaways.find((entry) => entry.id === giveawayId);
      if (!giveaway) throw new AppError('NOT_FOUND', 'Dieses Gewinnspiel gibt es nicht mehr.');

      const now = Date.now();
      if (new Date(giveaway.startsAt).getTime() > now || new Date(giveaway.endsAt).getTime() <= now) {
        throw new AppError('GIVEAWAY_CLOSED', 'Dieses Gewinnspiel ist beendet.');
      }
      const mine = current.entries.filter((entry) => entry.giveawayId === giveawayId).length;
      if (mine + entries > giveaway.maxEntriesPerUser) {
        throw new AppError(
          'GIVEAWAY_ENTRY_LIMIT',
          'Du hast alle deine Lose für dieses Gewinnspiel genutzt.',
        );
      }
      if (giveaway.totalEntries !== null && giveaway.entriesUsed + entries > giveaway.totalEntries) {
        throw new AppError('GIVEAWAY_CLOSED', 'Alle Lose für dieses Gewinnspiel sind vergeben.');
      }

      const cost = giveaway.entryCost * entries;
      const { next: afterLedger, transaction } = applyLedger(current, {
        amount: -cost,
        type: 'SPEND',
        description: `Gewinnspiel-Los — ${giveaway.title}`,
        reference: `giveaway:${giveaway.id}`,
      });

      const created: GiveawayEntry[] = Array.from({ length: entries }, (_, index) => ({
        id: `demo-entry-${Date.now()}-${index}`,
        giveawayId: giveaway.id,
        giveawayTitle: giveaway.title,
        userId: current.user.id,
        creditsSpent: giveaway.entryCost,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE',
      }));

      const updatedGiveaway: Giveaway = {
        ...giveaway,
        entriesUsed: giveaway.entriesUsed + entries,
        myEntries: mine + entries,
        myStatus: 'ACTIVE',
      };

      const next: DemoState = {
        ...afterLedger,
        giveaways: afterLedger.giveaways.map((entry) =>
          entry.id === giveawayId ? updatedGiveaway : entry,
        ),
        entries: [...created, ...afterLedger.entries],
      };
      await commit(next);

      return {
        entry: created[0],
        giveaway: updatedGiveaway,
        transaction,
        balance: balanceOf(next),
      };
    });
  },

  // --- Spotify: demo mode never claims a connection it does not have ---------
  async getSpotifyConnection(): Promise<SpotifyConnectionSummary> {
    return {
      connected: false,
      spotifyUserId: null,
      displayName: null,
      avatarUrl: null,
      product: null,
      scopes: [],
      connectedAt: null,
      expiresAt: null,
    };
  },

  async exchangeSpotifyCode(): Promise<SpotifyExchangeResponse> {
    throw spotifyNotConfigured();
  },

  async disconnectSpotify() {
    // Nothing to disconnect.
  },

  async getSpotifyNowPlaying(): Promise<NowPlaying | null> {
    return null;
  },

  async getSpotifyRecentlyPlayed(): Promise<PlayHistoryItem[]> {
    return [];
  },

  async getSpotifyTopTracks(): Promise<SpotifyTrack[]> {
    return [];
  },

  async registerPushToken() {
    // No push service in demo mode.
  },

  async setPushEnabled(enabled: boolean) {
    const current = await getState();
    await commit({ ...current, profile: { ...current.profile, pushEnabled: enabled } });
  },

  // --- Admin ----------------------------------------------------------------
  async adminListUsers(): Promise<AdminUsersResponse> {
    const current = await getState();
    const level = resolveLevel(current.lifetimeEarned);
    return {
      users: [
        {
          id: current.user.id,
          email: current.user.email,
          username: current.profile.username,
          role: current.user.role,
          status: current.user.status,
          balance: current.balance,
          lifetimeEarned: current.lifetimeEarned,
          level: level.level,
          createdAt: current.user.createdAt,
          spotifyConnected: false,
        },
      ],
      nextCursor: null,
    };
  },

  async adminSetUserStatus(userId, status) {
    const current = await getState();
    await commit({
      ...current,
      user: current.user.id === userId ? { ...current.user, status } : current.user,
      audit: [auditEntry(current, 'user.status', userId, { status }), ...current.audit],
    });
  },

  async adminAdjustCredits(input: AdminAdjustCreditsInput) {
    const current = await getState();
    const { next } = applyLedger(current, {
      amount: input.amount,
      type: input.type,
      description: input.description,
      reference: `admin:${input.userId}`,
    });
    await commit({
      ...next,
      audit: [
        auditEntry(current, 'credits.adjust', input.userId, {
          amount: formatSignedCredits(input.amount),
        }),
        ...next.audit,
      ],
    });
  },

  async adminUpsertTrack(track) {
    const current = await getState();
    const id = track.id ?? `trk-${Date.now()}`;
    const existing = current.tracks.find((entry) => entry.id === id);
    const merged: Track = {
      id,
      title: track.title,
      artist: track.artist ?? 'Jason Remix',
      albumId: track.albumId ?? null,
      coverUrl: track.coverUrl ?? null,
      releaseDate: track.releaseDate ?? new Date().toISOString().slice(0, 10),
      genre: track.genre ?? null,
      durationMs: track.durationMs ?? null,
      isrc: track.isrc ?? null,
      featured: track.featured ?? false,
      links: track.links ?? existing?.links ?? {},
    };
    const tracks = existing
      ? current.tracks.map((entry) => (entry.id === id ? merged : entry))
      : [merged, ...current.tracks];
    await commit({
      ...current,
      tracks,
      audit: [auditEntry(current, 'track.upsert', id, { title: merged.title }), ...current.audit],
    });
    return merged;
  },

  async adminDeleteTrack(trackId) {
    const current = await getState();
    await commit({
      ...current,
      tracks: current.tracks.filter((entry) => entry.id !== trackId),
      audit: [auditEntry(current, 'track.delete', trackId, null), ...current.audit],
    });
  },

  async adminUpsertNews(item) {
    const current = await getState();
    const created: NewsItem = {
      id: item.id ?? `news-${Date.now()}`,
      category: item.category ?? 'ANNOUNCEMENT',
      title: item.title,
      body: item.body,
      imageUrl: item.imageUrl ?? null,
      publishedAt: item.publishedAt ?? new Date().toISOString(),
      linkUrl: item.linkUrl ?? null,
    };
    await commit({
      ...current,
      news: [created, ...current.news.filter((entry) => entry.id !== created.id)],
      audit: [auditEntry(current, 'news.publish', created.id, { title: created.title }), ...current.audit],
    });
    return created;
  },

  async adminUpsertReward(reward) {
    const current = await getState();
    const id = reward.id ?? `rwd-${Date.now()}`;
    const merged: Reward = {
      id,
      title: reward.title,
      subtitle: reward.subtitle ?? null,
      description: reward.description ?? '',
      category: reward.category ?? 'MERCH',
      cost: reward.cost,
      imageUrl: reward.imageUrl ?? null,
      stock: reward.stock ?? null,
      remaining: reward.remaining ?? reward.stock ?? null,
      active: reward.active ?? true,
      requiresShipping: reward.requiresShipping ?? false,
      minLevel: reward.minLevel ?? null,
    };
    await commit({
      ...current,
      rewards: current.rewards.some((entry) => entry.id === id)
        ? current.rewards.map((entry) => (entry.id === id ? merged : entry))
        : [...current.rewards, merged],
      audit: [auditEntry(current, 'reward.upsert', id, { title: merged.title }), ...current.audit],
    });
    return merged;
  },

  async adminUpsertMission(mission) {
    const current = await getState();
    const id = mission.id ?? `msn-${Date.now()}`;
    const merged: Mission = {
      id,
      type: mission.type ?? 'SPECIAL_EVENT',
      title: mission.title,
      description: mission.description ?? '',
      reward: mission.reward,
      cooldownSeconds: mission.cooldownSeconds ?? null,
      repeatable: mission.repeatable ?? false,
      status: 'AVAILABLE',
      availableAt: null,
      completedAt: null,
      startsAt: mission.startsAt ?? null,
      endsAt: mission.endsAt ?? null,
    };
    await commit({
      ...current,
      missions: current.missions.some((entry) => entry.id === id)
        ? current.missions.map((entry) => (entry.id === id ? merged : entry))
        : [...current.missions, merged],
      audit: [auditEntry(current, 'mission.upsert', id, { title: merged.title }), ...current.audit],
    });
    return merged;
  },

  async adminUpsertGiveaway(giveaway) {
    const current = await getState();
    const id = giveaway.id ?? `gwy-${Date.now()}`;
    const merged: Giveaway = {
      id,
      title: giveaway.title,
      subtitle: giveaway.subtitle ?? null,
      description: giveaway.description ?? '',
      imageUrl: giveaway.imageUrl ?? null,
      startsAt: giveaway.startsAt ?? new Date().toISOString(),
      endsAt: giveaway.endsAt ?? new Date(Date.now() + 14 * 86_400_000).toISOString(),
      entryCost: giveaway.entryCost,
      totalEntries: giveaway.totalEntries ?? null,
      entriesUsed: giveaway.entriesUsed ?? 0,
      maxEntriesPerUser: giveaway.maxEntriesPerUser ?? 1,
      winnerCount: giveaway.winnerCount ?? 1,
      status: giveaway.status ?? 'OPEN',
      terms: giveaway.terms ?? '',
      myEntries: 0,
      myStatus: null,
    };
    await commit({
      ...current,
      giveaways: current.giveaways.some((entry) => entry.id === id)
        ? current.giveaways.map((entry) => (entry.id === id ? merged : entry))
        : [...current.giveaways, merged],
      audit: [auditEntry(current, 'giveaway.upsert', id, { title: merged.title }), ...current.audit],
    });
    return merged;
  },

  async adminCloseGiveaway(giveawayId) {
    const current = await getState();
    const giveaway = current.giveaways.find((entry) => entry.id === giveawayId);
    if (!giveaway) throw new AppError('NOT_FOUND', 'Dieses Gewinnspiel existiert nicht mehr.');
    const closed: Giveaway = { ...giveaway, status: 'CLOSED', endsAt: new Date().toISOString() };
    await commit({
      ...current,
      giveaways: current.giveaways.map((entry) => (entry.id === giveawayId ? closed : entry)),
      audit: [auditEntry(current, 'giveaway.close', giveawayId, null), ...current.audit],
    });
    return closed;
  },

  async adminDrawGiveaway(giveawayId): Promise<AdminDrawResponse> {
    // Draws are a server responsibility. Demo mode refuses rather than faking a winner.
    throw new AppError(
      'FORBIDDEN',
      'Gewinner werden auf dem Server gezogen. Für eine Ziehung muss die API verbunden sein.',
    );
  },

  async adminSendPush(input) {
    const current = await getState();
    await commit({
      ...current,
      audit: [auditEntry(current, 'push.send', null, { title: input.title }), ...current.audit],
    });
  },

  async adminAuditLog(): Promise<AdminAuditResponse> {
    const current = await getState();
    return { entries: current.audit, nextCursor: null };
  },
};

function auditEntry(
  current: DemoState,
  action: string,
  targetId: string | null,
  metadata: Record<string, unknown> | null,
): AdminActionLogEntry {
  return {
    id: `demo-audit-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    adminId: current.user.id,
    adminEmail: current.user.email,
    action,
    targetType: action.split('.')[0],
    targetId,
    metadata,
    createdAt: new Date().toISOString(),
  };
}
