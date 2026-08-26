// Imported per weight rather than from the package root: the root re-exports every
// weight and italic, which would pull roughly 6 MB of unused typefaces into the bundle.
import { Inter_300Light } from '@expo-google-fonts/inter/300Light';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Sora_300Light } from '@expo-google-fonts/sora/300Light';
import { Sora_400Regular } from '@expo-google-fonts/sora/400Regular';
import { Sora_500Medium } from '@expo-google-fonts/sora/500Medium';
import { Sora_600SemiBold } from '@expo-google-fonts/sora/600SemiBold';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootScreen } from '@/components/system/BootScreen';
import { CreditPulse } from '@/components/credits/CreditPulse';
import { ToastHost } from '@/components/ui/ToastHost';
import { palette } from '@/constants/theme';
import { createQueryClient } from '@/lib/queryClient';
import { maybeCompleteAuthSession } from '@/services/spotify';
import { installSessionExpiryHandler, useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

// Keeps the native splash up until fonts and session state are ready, so the first
// frame the member sees is already the finished interface.
void SplashScreen.preventAutoHideAsync();

// Closes any browser session left dangling by a previous OAuth attempt.
maybeCompleteAuthSession();

export default function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), []);
  const [bootComplete, setBootComplete] = useState(false);

  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateOnboarding = useOnboardingStore((state) => state.hydrate);
  const authStatus = useAuthStore((state) => state.status);
  const onboardingReady = useOnboardingStore((state) => state.ready);

  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
  });

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.black);
    installSessionExpiryHandler();
    void hydrateAuth();
    void hydrateOnboarding();
  }, [hydrateAuth, hydrateOnboarding]);

  const stateReady = authStatus !== 'unknown' && onboardingReady;
  // A font failure must not strand the member on a blank screen — the system face is
  // an acceptable fallback, a permanently held splash is not.
  const assetsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (assetsReady) void SplashScreen.hideAsync();
  }, [assetsReady]);

  if (!assetsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.black }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />

          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 220,
              contentStyle: { backgroundColor: palette.black },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="track/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="giveaways" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="legal" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="admin" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="achievements" options={{ animation: 'slide_from_right' }} />
          </Stack>

          <CreditPulse />
          <ToastHost />

          {/* The brand moment: holds over the app until state is ready, then dissolves. */}
          {!bootComplete && (
            <BootScreen ready={stateReady} onFinished={() => setBootComplete(true)} />
          )}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
