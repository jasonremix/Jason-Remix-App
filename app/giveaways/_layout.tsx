import { Stack } from 'expo-router';

import { RequireSession } from '@/components/system/RequireSession';
import { palette } from '@/constants/theme';

export default function GiveawaysLayout() {
  return (
    <RequireSession>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: palette.paper },
        }}
      />
    </RequireSession>
  );
}
