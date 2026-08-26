import { router } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';

export default function NotFound() {
  return (
    <Screen>
      <EmptyState
        icon="alert"
        eyebrow="404"
        title="Diese Seite gibt es nicht."
        message="Der Link, dem du gefolgt bist, führt in dieser App nirgendwo hin."
        actionLabel="ZURÜCK ZUM START"
        onAction={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}
