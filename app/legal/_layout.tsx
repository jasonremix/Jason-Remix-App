import { Stack } from 'expo-router';

import { palette } from '@/constants/theme';

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: palette.black },
      }}
    />
  );
}
