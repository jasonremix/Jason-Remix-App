import { router } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';

export default function NotFound() {
  return (
    <Screen>
      <EmptyState
        icon="alert"
        eyebrow="404"
        title="This page does not exist."
        message="The link you followed does not lead anywhere in the app."
        actionLabel="BACK TO HOME"
        onAction={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}
