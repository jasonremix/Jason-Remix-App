import type {
  AdminAuditResponse,
  AdminEmailLogResponse,
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
  ResendVerificationResult,
  RewardsResponse,
  SessionPayload,
  SpotifyExchangeResponse,
  VerificationState,
} from '@/types/api';
import type {
  Giveaway,
  Mission,
  NewsItem,
  Reward,
  SpotifyConnectionSummary,
  Track,
  UserProfile,
} from '@/types/models';
import type { NowPlaying, PlayHistoryItem, SpotifyTrack } from '@/types/spotify';

/**
 * The single contract every screen talks to.
 *
 * Two implementations satisfy it: `httpBackend` (the real API) and `demoBackend`
 * (in-memory, used only when no API is configured). Because both are typed against
 * this interface, a demo screen can never drift from the real one.
 */
export interface Backend {
  readonly kind: 'http' | 'demo';

  // --- Authentication -----------------------------------------------------
  register(input: RegisterInput): Promise<SessionPayload>;
  login(input: LoginInput): Promise<SessionPayload>;
  logout(): Promise<void>;
  me(): Promise<MeResponse>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
  /** Irreversible: erases the account and all associated records. */
  deleteAccount(input: { password?: string }): Promise<void>;
  /** Exports everything held about the member (GDPR Art. 15/20). */
  exportData(): Promise<Record<string, unknown>>;

  // --- Email confirmation -------------------------------------------------
  /** The server's own answer, so a stale session cannot show the wrong state. */
  verificationStatus(): Promise<VerificationState>;
  /** Issues a fresh link, invalidating any earlier one. */
  resendVerification(): Promise<ResendVerificationResult>;
  /** Confirms an address from a token the app captured out of a deep link. */
  verifyEmail(token: string): Promise<{ verified: boolean; alreadyVerified: boolean }>;

  // --- Catalog ------------------------------------------------------------
  getCatalog(): Promise<CatalogResponse>;
  getTrack(trackId: string): Promise<Track | null>;

  // --- Credits ------------------------------------------------------------
  getCredits(cursor?: string): Promise<CreditsResponse>;

  // --- Missions -----------------------------------------------------------
  getMissions(): Promise<MissionsResponse>;
  claimMission(missionId: string, idempotencyKey: string): Promise<ClaimMissionResponse>;

  // --- Rewards ------------------------------------------------------------
  getRewards(): Promise<RewardsResponse>;
  redeemReward(rewardId: string, idempotencyKey: string): Promise<RedeemRewardResponse>;

  // --- Giveaways ----------------------------------------------------------
  getGiveaways(): Promise<GiveawaysResponse>;
  enterGiveaway(
    giveawayId: string,
    entries: number,
    idempotencyKey: string,
  ): Promise<EnterGiveawayResponse>;

  // --- Spotify ------------------------------------------------------------
  getSpotifyConnection(): Promise<SpotifyConnectionSummary>;
  /**
   * Hands the authorization code and PKCE verifier to the server, which performs the
   * token exchange with the client secret. The client never sees Spotify tokens.
   */
  exchangeSpotifyCode(input: SpotifyExchangeInput): Promise<SpotifyExchangeResponse>;
  disconnectSpotify(): Promise<void>;
  getSpotifyNowPlaying(): Promise<NowPlaying | null>;
  getSpotifyRecentlyPlayed(limit?: number): Promise<PlayHistoryItem[]>;
  getSpotifyTopTracks(limit?: number): Promise<SpotifyTrack[]>;

  // --- Notifications ------------------------------------------------------
  registerPushToken(input: { token: string; platform: string }): Promise<void>;
  setPushEnabled(enabled: boolean): Promise<void>;

  // --- Admin --------------------------------------------------------------
  adminListUsers(cursor?: string, query?: string): Promise<AdminUsersResponse>;
  adminSetUserStatus(userId: string, status: 'ACTIVE' | 'BANNED'): Promise<void>;
  adminAdjustCredits(input: AdminAdjustCreditsInput): Promise<void>;
  adminUpsertTrack(track: Partial<Track> & { title: string }): Promise<Track>;
  adminDeleteTrack(trackId: string): Promise<void>;
  adminUpsertNews(item: Partial<NewsItem> & { title: string; body: string }): Promise<NewsItem>;
  adminUpsertReward(reward: Partial<Reward> & { title: string; cost: number }): Promise<Reward>;
  adminUpsertMission(mission: Partial<Mission> & { title: string; reward: number }): Promise<Mission>;
  adminUpsertGiveaway(
    giveaway: Partial<Giveaway> & { title: string; entryCost: number },
  ): Promise<Giveaway>;
  adminCloseGiveaway(giveawayId: string): Promise<Giveaway>;
  adminDrawGiveaway(giveawayId: string): Promise<AdminDrawResponse>;
  adminSendPush(input: AdminPushInput): Promise<void>;
  adminAuditLog(cursor?: string): Promise<AdminAuditResponse>;
  /** The email delivery log, so a claimed send can be checked. */
  adminEmailLog(): Promise<AdminEmailLogResponse>;
}

export type RegisterInput = {
  email: string;
  password: string;
  username: string;
  acceptedTerms: boolean;
};

export type LoginInput = { email: string; password: string };

export type UpdateProfileInput = {
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  country?: string | null;
};

export type SpotifyExchangeInput = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  /** Echoed back so the server can bind the exchange to the request it issued. */
  state: string;
};

export type AdminAdjustCreditsInput = {
  userId: string;
  amount: number;
  description: string;
  type: 'ADMIN_ADJUSTMENT' | 'BONUS' | 'REFUND';
};

export type AdminPushInput = {
  title: string;
  body: string;
  category: 'NEW_RELEASE' | 'NEW_GIVEAWAY' | 'REWARD_UNLOCKED' | 'SPECIAL_DROP' | 'SYSTEM';
  deepLink?: string;
};
