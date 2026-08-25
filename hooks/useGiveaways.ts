import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useHaptics } from '@/hooks/useHaptics';
import { toAppError } from '@/lib/errors';
import { CREDIT_SENSITIVE_KEYS, queryKeys } from '@/lib/queryClient';
import { giveawaysService } from '@/services/giveaways.service';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

export function useGiveaways() {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.giveaways,
    queryFn: () => giveawaysService.getGiveaways(),
    enabled: status === 'signed-in',
    staleTime: 30_000,
  });
}

export function useEnterGiveaway() {
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const { success, warn } = useHaptics();

  return useMutation({
    mutationFn: ({ giveawayId, entries }: { giveawayId: string; entries: number }) =>
      giveawaysService.enter(giveawayId, entries),
    onSuccess: (result) => {
      success();
      showToast('ENTRY CONFIRMED', 'positive');
      void result;
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
