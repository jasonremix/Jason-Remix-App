import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useHaptics } from '@/hooks/useHaptics';
import { toAppError } from '@/lib/errors';
import { CREDIT_SENSITIVE_KEYS, queryKeys } from '@/lib/queryClient';
import { rewardsService } from '@/services/rewards.service';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

export function useRewards() {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.rewards,
    queryFn: () => rewardsService.getRewards(),
    enabled: status === 'signed-in',
    staleTime: 60_000,
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const { success, warn } = useHaptics();

  return useMutation({
    mutationFn: (rewardId: string) => rewardsService.redeem(rewardId),
    onSuccess: (result) => {
      success();
      showToast(`${result.redemption.rewardTitle} — request received`, 'positive');
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
