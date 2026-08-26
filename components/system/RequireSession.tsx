import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useAuthStore } from '@/store/authStore';

/**
 * Hält einen Bereich für angemeldete Mitglieder frei.
 *
 * Wichtig ist der dritte Zustand: solange die Sitzung noch geprüft wird (`unknown`),
 * wird weder umgeleitet noch der Inhalt gezeigt — sonst blitzt beim Start kurz die
 * Anmeldung auf, oder es steht ein leeres Formular da, das nie gefüllt wird.
 *
 * Das ist Bequemlichkeit, keine Zugriffskontrolle: die API prüft jede Anfrage selbst.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);

  if (status === 'unknown') return null;
  if (status === 'signed-out') return <Redirect href="/(auth)/login" />;
  return <>{children}</>;
}
