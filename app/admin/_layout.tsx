import { Redirect, Stack } from 'expo-router';

import { palette } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

/**
 * Administration area.
 *
 * This gate is a convenience, not the access control: every `/admin/*` API route
 * independently verifies the role against the database record, so a member who reaches
 * these screens some other way still cannot do anything.
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
        contentStyle: { backgroundColor: palette.black },
      }}
    />
  );
}
