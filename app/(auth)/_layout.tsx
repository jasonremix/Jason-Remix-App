import { Stack } from 'expo-router';

import { palette } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: palette.paper },
      }}
    />
  );
}
