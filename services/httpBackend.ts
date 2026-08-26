import { apiClient, clearTokens, persistTokens } from '@/lib/apiClient';
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
  Giveaway,
  Mission,
  NewsItem,
  Reward,
  SpotifyConnectionSummary,
  Track,
  UserProfile,
} from '@/types/models';
import type { NowPlaying, PlayHistoryItem, SpotifyTrack } from '@/types/spotify';

import type {
  AdminAdjustCreditsInput,
  AdminPushInput,
  Backend,
  LoginInput,
  RegisterInput,
  SpotifyExchangeInput,
  UpdateProfileInput,
} from './backend.types';

/** The real backend. Every credit-moving call carries an idempotency key. */
export const httpBackend: Backend = {
  kind: 'http',

  async register(input: RegisterInput) {
    const session = await apiClient.post<SessionPayload>('/auth/register', input, {
      anonymous: true,
    });
    await persistTokens(session);
    return session;
  },

  async login(input: LoginInput) {
    const session = await apiClient.post<SessionPayload>('/auth/login', input, {
      anonymous: true,
    });
    await persistTokens(session);
    return session;
  },

  async logout() {
    // Best effort: revoke server-side, but always drop local credentials.
    try {
      await apiClient.post<void>('/auth/logout');
    } finally {
      await clearTokens();
    }
  },

  me: () => apiClient.get<MeResponse>('/me'),

  updateProfile: (input: UpdateProfileInput) =>
    apiClient.patch<UserProfile>('/me/profile', input),

  changePassword: (input) => apiClient.post<void>('/me/password', input),

  async deleteAccount(input) {
    await apiClient.post<void>('/me/delete', input);
    await clearTokens();
  },

  exportData: () => apiClient.get<Record<string, unknown>>('/me/export'),

  getCatalog: () => apiClient.get<CatalogResponse>('/catalog'),

  getTrack: (trackId) => apiClient.get<Track | null>(`/catalog/tracks/${trackId}`),

  getCredits: (cursor) => apiClient.get<CreditsResponse>('/credits', { query: { cursor } }),

  getMissions: () => apiClient.get<MissionsResponse>('/missions'),

  claimMission: (missionId, idempotencyKey) =>
    apiClient.post<ClaimMissionResponse>(`/missions/${missionId}/claim`, undefined, {
      idempotencyKey,
    }),

  getRewards: () => apiClient.get<RewardsResponse>('/rewards'),

  redeemReward: (rewardId, idempotencyKey) =>
    apiClient.post<RedeemRewardResponse>(`/rewards/${rewardId}/redeem`, undefined, {
      idempotencyKey,
    }),

  getGiveaways: () => apiClient.get<GiveawaysResponse>('/giveaways'),

  enterGiveaway: (giveawayId, entries, idempotencyKey) =>
    apiClient.post<EnterGiveawayResponse>(
      `/giveaways/${giveawayId}/enter`,
      { entries },
      { idempotencyKey },
    ),

  getSpotifyConnection: () => apiClient.get<SpotifyConnectionSummary>('/spotify/connection'),

  exchangeSpotifyCode: (input: SpotifyExchangeInput) =>
    apiClient.post<SpotifyExchangeResponse>('/spotify/exchange', input),

  disconnectSpotify: () => apiClient.post<void>('/spotify/disconnect'),

  getSpotifyNowPlaying: () => apiClient.get<NowPlaying | null>('/spotify/now-playing'),

  getSpotifyRecentlyPlayed: (limit = 10) =>
    apiClient.get<PlayHistoryItem[]>('/spotify/recently-played', { query: { limit } }),

  getSpotifyTopTracks: (limit = 10) =>
    apiClient.get<SpotifyTrack[]>('/spotify/top-tracks', { query: { limit } }),

  registerPushToken: (input) => apiClient.post<void>('/notifications/token', input),

  setPushEnabled: (enabled) => apiClient.post<void>('/notifications/preferences', { enabled }),

  adminListUsers: (cursor, query) =>
    apiClient.get<AdminUsersResponse>('/admin/users', { query: { cursor, q: query } }),

  adminSetUserStatus: (userId, status) =>
    apiClient.post<void>(`/admin/users/${userId}/status`, { status }),

  adminAdjustCredits: (input: AdminAdjustCreditsInput) =>
    apiClient.post<void>('/admin/credits/adjust', input, {
      idempotencyKey: `${input.userId}:${input.amount}:${input.description}`,
    }),

  adminUpsertTrack: (track) => apiClient.post<Track>('/admin/tracks', track),
  adminDeleteTrack: (trackId) => apiClient.delete<void>(`/admin/tracks/${trackId}`),
  adminUpsertNews: (item) => apiClient.post<NewsItem>('/admin/news', item),
  adminUpsertReward: (reward) => apiClient.post<Reward>('/admin/rewards', reward),
  adminUpsertMission: (mission) => apiClient.post<Mission>('/admin/missions', mission),
  adminUpsertGiveaway: (giveaway) => apiClient.post<Giveaway>('/admin/giveaways', giveaway),
  adminCloseGiveaway: (giveawayId) =>
    apiClient.post<Giveaway>(`/admin/giveaways/${giveawayId}/close`),
  adminDrawGiveaway: (giveawayId) =>
    apiClient.post<AdminDrawResponse>(`/admin/giveaways/${giveawayId}/draw`),
  adminSendPush: (input: AdminPushInput) => apiClient.post<void>('/admin/notifications', input),
  adminAuditLog: (cursor) =>
    apiClient.get<AdminAuditResponse>('/admin/audit', { query: { cursor } }),
};
