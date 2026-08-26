import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { toAppError } from '@/lib/errors';
import { queryKeys } from '@/lib/queryClient';
import { getBackend } from '@/services/backend';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Bestätigungsstand der E-Mail-Adresse.
 *
 * Der Stand kommt immer vom Server: eine gespeicherte Sitzung kann veraltet sein, wenn
 * jemand den Link auf einem anderen Gerät geöffnet hat. Solange die Antwort noch nicht
 * da ist, behauptet die App weder das eine noch das andere.
 */
export function useVerificationStatus() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.verification,
    queryFn: () => getBackend().verificationStatus(),
    enabled: status === 'signed-in',
    staleTime: 30_000,
  });
}

/**
 * Der beste verfügbare Bestätigungsstand — oder `null`, solange keiner vorliegt.
 *
 * Zwei Quellen: die Sitzung im Auth-Store (steht direkt nach dem Start bereit) und die
 * Serverabfrage (aktueller, kommt aber später). Die Serverantwort gewinnt, sobald sie da
 * ist. Solange keine der beiden geantwortet hat, ist die Antwort `null` — und die
 * Oberfläche behauptet dann weder „bestätigt“ noch „nicht bestätigt“.
 */
export function useEmailVerified(): {
  verified: boolean | null;
  emailConfigured: boolean | null;
} {
  const user = useAuthStore((state) => state.user);
  const status = useVerificationStatus();

  if (status.data) {
    return { verified: status.data.verified, emailConfigured: status.data.emailConfigured };
  }
  if (user) return { verified: Boolean(user.emailVerifiedAt), emailConfigured: null };
  return { verified: null, emailConfigured: null };
}

/** Fordert einen neuen Link an und sagt anschließend, was wirklich passiert ist. */
export function useResendVerification() {
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const markEmailVerified = useAuthStore((state) => state.markEmailVerified);

  return useMutation({
    mutationFn: () => getBackend().resendVerification(),
    onSuccess: (result) => {
      if (result.alreadyVerified) {
        markEmailVerified(new Date().toISOString());
        showToast('ADRESSE IST BEREITS BESTÄTIGT', 'positive');
      } else if (result.sent) {
        showToast('NEUE BESTÄTIGUNGSMAIL VERSCHICKT', 'positive');
      } else {
        // Kein Versand — dann sagt die App genau das, statt aufs Postfach zu zeigen.
        showToast(result.reason ?? 'ES WURDE KEINE E-MAIL VERSCHICKT', 'negative');
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.verification });
    },
    onError: (error) => showToast(toAppError(error).message, 'negative'),
  });
}

/**
 * Löst ein Token ein, das die App aus einem Deep Link gefischt hat.
 *
 * Wird sowohl beim Kaltstart über den Link als auch bei einem Link im laufenden
 * Betrieb verwendet.
 */
export function useVerifyEmailToken() {
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const markEmailVerified = useAuthStore((state) => state.markEmailVerified);

  return useCallback(
    async (token: string) => {
      try {
        const result = await getBackend().verifyEmail(token);
        markEmailVerified(new Date().toISOString());
        showToast(
          result.alreadyVerified ? 'ADRESSE WAR SCHON BESTÄTIGT' : 'E-MAIL BESTÄTIGT',
          'positive',
        );
        await queryClient.invalidateQueries({ queryKey: queryKeys.verification });
        await queryClient.invalidateQueries({ queryKey: queryKeys.me });
        return true;
      } catch (error) {
        showToast(toAppError(error).message, 'negative');
        return false;
      }
    },
    [markEmailVerified, queryClient, showToast],
  );
}
