import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { creditsService } from '@/services/credits.service';
import { useAuthStore } from '@/store/authStore';

/**
 * Balance and ledger.
 *
 * The value rendered is always the server's. Nothing in the app adds to or subtracts
 * from a balance locally — a mutation returns the authoritative new balance and that
 * replaces the cache wholesale.
 */
export function useCredits() {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.credits,
    queryFn: () => creditsService.getCredits(),
    enabled: status === 'signed-in',
    staleTime: 15_000,
  });
}
