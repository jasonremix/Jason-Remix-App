import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { palette } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

/**
 * Entry gate.
 *
 * Onboarding first, then sign-in, then the app. Rendered under the boot screen, so the
 * redirect is never visible as a flash of the wrong screen.
 */
export default function Index() {
  const authStatus = useAuthStore((state) => state.status);
  const { ready, completed } = useOnboardingStore();

  if (!ready || authStatus === 'unknown') {
    return <View style={{ flex: 1, backgroundColor: palette.paper }} />;
  }

  if (!completed) return <Redirect href="/(onboarding)" />;
  if (authStatus !== 'signed-in') return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}
