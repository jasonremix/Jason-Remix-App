import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DemoBanner } from '@/components/system/Banners';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Hairline, Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

/** The administration index. Deliberately plain — these screens are tools. */
export default function AdminHome() {
  const user = useAuthStore((state) => state.user);

  return (
    <Screen header={<ScreenHeader title="ADMIN" />} contentStyle={styles.content}>
      <DemoBanner />

      <Surface style={styles.identity}>
        <View style={styles.identityRow}>
          <Text variant="labelWide" tone="muted" uppercase>
            SIGNED IN AS
          </Text>
          <Chip label="ADMIN" tone="warning" />
        </View>
        <Text variant="body" tone="secondary">
          {user?.email}
        </Text>
        <Text variant="caption" tone="muted">
          Every action below is recorded in the audit log with your account against it.
        </Text>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="CATALOGUE" />
        <View>
          <Row title="RELEASES" subtitle="Add or edit tracks, covers and links" icon="disc" onPress={() => router.push('/admin/tracks')} />
          <Hairline />
          <Row title="NEWS" subtitle="Publish an announcement to Home" icon="document" onPress={() => router.push('/admin/news')} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="ECONOMY" />
        <View>
          <Row title="MISSIONS" subtitle="Create and edit ways to earn credits" icon="token" onPress={() => router.push('/admin/missions')} />
          <Hairline />
          <Row title="REWARDS" subtitle="The redemption ladder and its stock" icon="gift" onPress={() => router.push('/admin/rewards')} />
          <Hairline />
          <Row title="BADGES" subtitle="Achievements members can unlock" icon="star" onPress={() => router.push('/admin/badges')} />
          <Hairline />
          <Row title="CREDITS" subtitle="Grant, correct or refund a balance" icon="edit" onPress={() => router.push('/admin/credits')} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="GIVEAWAYS" />
        <Row title="GIVEAWAYS & DRAWS" subtitle="Create, close and draw winners" icon="ticket" onPress={() => router.push('/admin/giveaways')} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="MEMBERS" />
        <View>
          <Row title="MEMBERS" subtitle="Look up accounts, suspend or restore" icon="user" onPress={() => router.push('/admin/users')} />
          <Hairline />
          <Row title="PUSH NOTIFICATIONS" subtitle="Queue a message to opted-in members" icon="bell" onPress={() => router.push('/admin/notifications')} />
          <Hairline />
          <Row title="AUDIT LOG" subtitle="Every administrative action, in order" icon="shield" onPress={() => router.push('/admin/audit')} />
        </View>
      </View>

      {config.isDemoMode && (
        <Text variant="caption" tone="muted">
          Demo mode keeps these screens explorable, but a draw needs the real API — winners
          are never selected on the device.
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  identity: { padding: spacing.lg, gap: spacing.sm },
  identityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: spacing.base },
});
