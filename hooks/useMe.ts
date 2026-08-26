import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';

/** The signed-in member: identity, balance, Spotify link and achievements in one read. */
export function useMe() {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => authService.me(),
    enabled: status === 'signed-in',
    staleTime: 30_000,
  });
}
