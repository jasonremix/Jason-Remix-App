import { Redirect, Stack } from 'expo-router';

import { palette } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

/**
 * Admin-Bereich.
 *
 * Diese Sperre ist Bequemlichkeit, nicht die Zugriffskontrolle: jede `/admin/*`-Route
 * der API prüft die Rolle unabhängig gegen den Datenbankeintrag. Wer diese Bildschirme
 * auf anderem Weg erreicht, kann hier trotzdem nichts ausrichten.
 */
export default function AdminLayout() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);

  if (status === 'signed-out') return <Redirect href="/(auth)/login" />;
  if (status === 'signed-in' && role !== 'ADMIN') return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: palette.paper },
      }}
    />
  );
}
