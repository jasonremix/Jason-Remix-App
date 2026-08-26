import { createIdempotencyKey } from '@/lib/apiClient';
import type { ClaimMissionResponse, MissionsResponse } from '@/types/api';

import { getBackend } from './backend';

export const missionsService = {
  getMissions: (): Promise<MissionsResponse> => getBackend().getMissions(),
  /**
   * The server decides whether a claim is valid — eligibility, cooldown and the award
   * amount are never trusted from here.
   */
  claim: (missionId: string, idempotencyKey = createIdempotencyKey()): Promise<ClaimMissionResponse> =>
    getBackend().claimMission(missionId, idempotencyKey),
};
