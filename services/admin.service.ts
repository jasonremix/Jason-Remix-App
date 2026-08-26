import type { AdminAuditResponse, AdminDrawResponse, AdminUsersResponse } from '@/types/api';
import type { Giveaway, Mission, NewsItem, Reward, Track } from '@/types/models';

import { getBackend } from './backend';
import type { AdminAdjustCreditsInput, AdminPushInput } from './backend.types';

/**
 * Admin operations.
 *
 * Role is enforced on the server for every one of these calls; hiding the UI is only
 * a convenience, never the access control.
 */
export const adminService = {
  listUsers: (cursor?: string, query?: string): Promise<AdminUsersResponse> =>
    getBackend().adminListUsers(cursor, query),
  setUserStatus: (userId: string, status: 'ACTIVE' | 'BANNED') =>
    getBackend().adminSetUserStatus(userId, status),
  adjustCredits: (input: AdminAdjustCreditsInput) => getBackend().adminAdjustCredits(input),
  upsertTrack: (track: Partial<Track> & { title: string }) => getBackend().adminUpsertTrack(track),
  deleteTrack: (trackId: string) => getBackend().adminDeleteTrack(trackId),
  upsertNews: (item: Partial<NewsItem> & { title: string; body: string }) =>
    getBackend().adminUpsertNews(item),
  upsertReward: (reward: Partial<Reward> & { title: string; cost: number }) =>
    getBackend().adminUpsertReward(reward),
  upsertMission: (mission: Partial<Mission> & { title: string; reward: number }) =>
    getBackend().adminUpsertMission(mission),
  upsertGiveaway: (giveaway: Partial<Giveaway> & { title: string; entryCost: number }) =>
    getBackend().adminUpsertGiveaway(giveaway),
  closeGiveaway: (giveawayId: string) => getBackend().adminCloseGiveaway(giveawayId),
  drawGiveaway: (giveawayId: string): Promise<AdminDrawResponse> =>
    getBackend().adminDrawGiveaway(giveawayId),
  sendPush: (input: AdminPushInput) => getBackend().adminSendPush(input),
  auditLog: (cursor?: string): Promise<AdminAuditResponse> => getBackend().adminAuditLog(cursor),
};
