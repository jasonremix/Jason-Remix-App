import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toAppError } from '@/lib/errors';
import { useHaptics } from '@/hooks/useHaptics';
import { CREDIT_SENSITIVE_KEYS, queryKeys } from '@/lib/queryClient';
import { missionsService } from '@/services/missions.service';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

export function useMissions() {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.missions,
    queryFn: () => missionsService.getMissions(),
    enabled: status === 'signed-in',
    staleTime: 15_000,
  });
}

/** Claims a mission and, on success, flashes the awarded amount. */
export function useClaimMission() {
  const queryClient = useQueryClient();
  const pulseCredits = useUiStore((state) => state.pulseCredits);
  const showToast = useUiStore((state) => state.showToast);
  const { success, warn } = useHaptics();

  return useMutation({
    mutationFn: (missionId: string) => missionsService.claim(missionId),
    onSuccess: (result) => {
      pulseCredits(result.transaction.amount);
      success();
      for (const achievement of result.unlockedAchievements) {
        showToast(`ACHIEVEMENT UNLOCKED — ${achievement.title}`, 'positive');
      }
      // The server's balance is authoritative: refetch rather than patch locally.
      for (const key of CREDIT_SENSITIVE_KEYS) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: (error) => {
      warn();
      showToast(toAppError(error).message, 'negative');
    },
  });
}
