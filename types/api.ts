import type {
  Achievement,
  AdminActionLogEntry,
  AdminUserSummary,
  Album,
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
} from './models';

/** Every error the API returns is shaped like this. */
export type ApiErrorPayload = {
  error: {
    code: ApiErrorCode;
    /** Human-readable, safe to show to a member. */
    message: string;
    /** Field-level validation detail; never shown raw. */
    details?: Record<string, string>;
  };
};

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INSUFFICIENT_CREDITS'
  | 'MISSION_ON_COOLDOWN'
  | 'MISSION_ALREADY_COMPLETED'
  | 'GIVEAWAY_CLOSED'
  | 'GIVEAWAY_ENTRY_LIMIT'
  | 'REWARD_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'SPOTIFY_NOT_CONFIGURED'
  | 'SPOTIFY_AUTH_FAILED'
  | 'TOKEN_EXPIRED'
  | 'ACCOUNT_BANNED'
  | 'SERVER_ERROR'
  | 'OFFLINE';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
};

export type SessionPayload = AuthTokens & {
  user: User;
  profile: UserProfile | null;
};

export type MeResponse = {
  user: User;
  profile: UserProfile | null;
  balance: CreditBalance;
  spotify: SpotifyConnectionSummary;
  achievements: Achievement[];
};

export type CatalogResponse = {
  tracks: Track[];
  albums: Album[];
  news: NewsItem[];
  featuredTrackId: string | null;
};

export type CreditsResponse = {
  balance: CreditBalance;
  transactions: CreditTransaction[];
  nextCursor: string | null;
};

export type MissionsResponse = { missions: Mission[] };

export type ClaimMissionResponse = {
  mission: Mission;
  transaction: CreditTransaction;
  balance: CreditBalance;
  unlockedAchievements: Achievement[];
};

export type RewardsResponse = {
  rewards: Reward[];
  redemptions: RewardRedemption[];
};

export type RedeemRewardResponse = {
  redemption: RewardRedemption;
  transaction: CreditTransaction;
  balance: CreditBalance;
};

export type GiveawaysResponse = {
  giveaways: Giveaway[];
  entries: GiveawayEntry[];
};

export type EnterGiveawayResponse = {
  entry: GiveawayEntry;
  giveaway: Giveaway;
  transaction: CreditTransaction;
  balance: CreditBalance;
};

export type SpotifyExchangeResponse = {
  connection: SpotifyConnectionSummary;
  /** Present only if connecting also completed the CONNECT_SPOTIFY mission. */
  missionAward: ClaimMissionResponse | null;
};

export type AdminUsersResponse = {
  users: AdminUserSummary[];
  nextCursor: string | null;
};

export type AdminAuditResponse = {
  entries: AdminActionLogEntry[];
  nextCursor: string | null;
};

export type AdminDrawResponse = {
  giveawayId: string;
  winners: { userId: string; username: string | null; entryId: string }[];
  /** Public proof material for the draw — see server/src/services/giveaways.service.ts. */
  drawSeedHash: string;
  drawnAt: string;
};
