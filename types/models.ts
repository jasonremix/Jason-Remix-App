/** Domain models. These mirror the server schema in server/src/db/schema.sql. */

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
  /** Present only where a legal age gate applies; otherwise never collected. */
  birthDate: string | null;
  pushEnabled: boolean;
  completedAt: string | null;
};

export type SpotifyConnectionSummary = {
  connected: boolean;
  spotifyUserId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  product: string | null;
  scopes: string[];
  connectedAt: string | null;
  /** Server-side expiry of the stored access token; refresh is handled server-side. */
  expiresAt: string | null;
};

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

export type StreamingLinks = {
  spotify?: string;
  youtube?: string;
  appleMusic?: string;
  amazonMusic?: string;
  deezer?: string;
  soundcloud?: string;
  tidal?: string;
};

export type Album = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  releaseDate: string;
  trackIds: string[];
};

export type NewsCategory = 'RELEASE' | 'TOUR' | 'REWARD' | 'ANNOUNCEMENT';

export type NewsItem = {
  id: string;
  category: NewsCategory;
  title: string;
  body: string;
  imageUrl: string | null;
  publishedAt: string;
  linkUrl: string | null;
};

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
  /** Seconds until the mission can be claimed again; null for one-shot missions. */
  cooldownSeconds: number | null;
  repeatable: boolean;
  status: MissionStatus;
  /** ISO timestamp when a cooled-down mission becomes claimable again. */
  availableAt: string | null;
  completedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type CreditTransactionType =
  | 'EARN'
  | 'SPEND'
  | 'BONUS'
  | 'ADMIN_ADJUSTMENT'
  | 'REFUND';

export type CreditTransaction = {
  id: string;
  userId: string;
  amount: number;
  type: CreditTransactionType;
  description: string;
  timestamp: string;
  /** Domain reference, e.g. `mission:daily-check-in` or `giveaway:tour-vip`. */
  reference: string | null;
  balanceAfter: number;
};

export type CreditBalance = {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  level: number;
  levelTitle: string;
  nextLevelAt: number | null;
  progressToNextLevel: number;
};

export type RewardCategory = 'MERCH' | 'COLLECTOR' | 'TICKET' | 'EXPERIENCE' | 'DIGITAL';

export type Reward = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  category: RewardCategory;
  cost: number;
  imageUrl: string | null;
  stock: number | null;
  remaining: number | null;
  active: boolean;
  requiresShipping: boolean;
  /** Minimum level required; null when open to everyone. */
  minLevel: number | null;
};

export type RedemptionStatus = 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED' | 'REFUNDED';

export type RewardRedemption = {
  id: string;
  rewardId: string;
  rewardTitle: string;
  userId: string;
  creditsSpent: number;
  status: RedemptionStatus;
  createdAt: string;
  fulfilledAt: string | null;
  note: string | null;
};

export type GiveawayStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'DRAWN' | 'CANCELLED';

export type Giveaway = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  entryCost: number;
  /** Total entries available across all members; null when unlimited. */
  totalEntries: number | null;
  entriesUsed: number;
  /** How many entries a single member may buy. */
  maxEntriesPerUser: number;
  winnerCount: number;
  status: GiveawayStatus;
  terms: string;
  /** The signed-in member's own entries — never used to decide winners. */
  myEntries: number;
  myStatus: GiveawayEntryStatus | null;
};

export type GiveawayEntryStatus = 'ACTIVE' | 'WON' | 'LOST' | 'REFUNDED' | 'VOID';

export type GiveawayEntry = {
  id: string;
  giveawayId: string;
  giveawayTitle: string;
  userId: string;
  creditsSpent: number;
  createdAt: string;
  status: GiveawayEntryStatus;
};

export type AchievementTier = 'STANDARD' | 'RARE' | 'ELITE';

export type Achievement = {
  id: string;
  code: string;
  title: string;
  description: string;
  tier: AchievementTier;
  /** Null while locked. */
  unlockedAt: string | null;
  /** 0..1 — some achievements show partial progress. */
  progress: number;
};

export type PushNotificationRecord = {
  id: string;
  title: string;
  body: string;
  category: 'NEW_RELEASE' | 'NEW_GIVEAWAY' | 'REWARD_UNLOCKED' | 'SPECIAL_DROP' | 'SYSTEM';
  sentAt: string;
  deepLink: string | null;
};

export type AdminActionLogEntry = {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

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
