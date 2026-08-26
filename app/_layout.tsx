// Imported per weight rather than from the package root: the root re-exports every
// weight and italic, which would pull several MB of unused typefaces into the bundle.
import { Manrope_300Light } from '@expo-google-fonts/manrope/300Light';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { Syne_500Medium } from '@expo-google-fonts/syne/500Medium';
import { Syne_600SemiBold } from '@expo-google-fonts/syne/600SemiBold';
import { Syne_700Bold } from '@expo-google-fonts/syne/700Bold';
import { Syne_800ExtraBold } from '@expo-google-fonts/syne/800ExtraBold';
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
    Manrope_300Light,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Syne_500Medium,
    Syne_600SemiBold,
    Syne_700Bold,
    Syne_800ExtraBold,
  });

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.paper);
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.paper }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />

          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 220,
              contentStyle: { backgroundColor: palette.paper },
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
