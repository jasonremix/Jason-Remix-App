import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';

import { useVerifyEmailToken } from '@/hooks/useEmailVerification';
import { config } from '@/constants/config';

/**
 * Fängt Bestätigungslinks ab, die in der App landen.
 *
 * Zwei Fälle: die App war zu und wurde durch den Link gestartet, oder sie lief bereits
 * und bekommt den Link nachgereicht. Beide führen über dieselbe Funktion, und jedes
 * Token wird nur einmal eingelöst — sonst würde ein zweiter Aufruf desselben Links als
 * Fehler erscheinen, obwohl gerade alles geklappt hat.
 *
 * Rendert nichts.
 */
export function VerificationLinkHandler() {
  const verify = useVerifyEmailToken();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (config.isDemoMode) return;

    const consume = (url: string | null) => {
      if (!url) return;
      const token = Linking.parse(url).queryParams?.token;
      if (typeof token !== 'string' || token.length < 10) return;
      if (handled.current.has(token)) return;
      handled.current.add(token);
      void verify(token);
    };

    void Linking.getInitialURL().then(consume);
    const subscription = Linking.addEventListener('url', (event) => consume(event.url));
    return () => subscription.remove();
  }, [verify]);

  return null;
}
