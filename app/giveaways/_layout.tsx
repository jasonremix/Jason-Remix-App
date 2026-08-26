import { Stack } from 'expo-router';

import { palette } from '@/constants/theme';

export default function GiveawaysLayout() {
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
