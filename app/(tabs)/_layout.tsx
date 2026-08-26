import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/components/nav/TabBar';
import { palette } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

export default function TabsLayout() {
  const status = useAuthStore((state) => state.status);

  // The tab tree is only ever mounted for a signed-in member.
  if (status === 'signed-out') return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'HOME' }} />
      <Tabs.Screen name="music" options={{ title: 'MUSIC' }} />
      <Tabs.Screen name="rewards" options={{ title: 'REWARDS' }} />
      <Tabs.Screen name="credits" options={{ title: 'CREDITS' }} />
      <Tabs.Screen name="profile" options={{ title: 'PROFILE' }} />
    </Tabs>
  );
}
