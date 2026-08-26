import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { DemoBanner } from '@/components/system/Banners';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Hairline, Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { palette, spacing } from '@/constants/theme';
import { useMe } from '@/hooks/useMe';
import { toAppError } from '@/lib/errors';
import { notificationsService, type PushPermission } from '@/services/notifications.service';
import { useUiStore } from '@/store/uiStore';

const CATEGORIES = [
  { title: 'NEW RELEASE', example: '“Zeitgeist is available now.”' },
  { title: 'NEW GIVEAWAY', example: '“A new giveaway has started.”' },
  { title: 'REWARD UNLOCKED', example: '“You have enough credits for a new reward.”' },
  { title: 'SPECIAL DROP', example: '“An exclusive Jason Remix drop is available.”' },
];

/** Push preferences. Opt-in, with the system permission state shown honestly. */
export default function NotificationSettings() {
  const me = useMe();
  const showToast = useUiStore((state) => state.showToast);

  const [permission, setPermission] = useState<PushPermission>('undetermined');
  const [busy, setBusy] = useState(false);
  /**
   * Set only while a toggle is in flight, so the switch responds immediately without
   * the server value being mirrored into local state — once the refetch lands, the
   * server's answer is what shows.
   */
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const enabled = optimistic ?? Boolean(me.data?.profile?.pushEnabled);

  useEffect(() => {
    void notificationsService.getPermission().then(setPermission);
  }, []);

  const toggle = useCallback(
    async (next: boolean) => {
      setBusy(true);
      setOptimistic(next);
      try {
        if (next) {
          const result = await notificationsService.enable();
          setPermission(result);
          setOptimistic(result === 'granted');
          if (result !== 'granted') {
            showToast('NOTIFICATIONS ARE BLOCKED IN SYSTEM SETTINGS', 'neutral');
          }
        } else {
          await notificationsService.disable();
        }
        await me.refetch();
      } catch (error) {
        showToast(toAppError(error).message, 'negative');
      } finally {
        // Hand control back to the server value now that it has been refetched.
        setOptimistic(null);
        setBusy(false);
      }
    },
    [me, showToast],
  );

  return (
    <Screen header={<ScreenHeader title="NOTIFICATIONS" />} contentStyle={styles.content}>
      <DemoBanner />

      <Surface style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text variant="heading" tone="primary">
              Push notifications
            </Text>
            <Text variant="bodySmall" tone="muted">
              Releases, giveaways and drops. Off by default — you decide.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(next) => void toggle(next)}
            disabled={busy}
            trackColor={{ false: palette.steel, true: palette.brushed }}
            thumbColor={enabled ? palette.offWhite : palette.titanium}
            ios_backgroundColor={palette.steel}
          />
        </View>

        {permission === 'denied' && (
          <>
            <Hairline style={styles.divider} />
            <Text variant="bodySmall" tone="muted">
              Notifications are turned off for this app in your device settings.
            </Text>
            <Button
              label="OPEN SYSTEM SETTINGS"
              variant="secondary"
              size="sm"
              icon="external"
              onPress={() => void Linking.openSettings()}
            />
          </>
        )}
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="WHAT YOU WOULD RECEIVE" />
        <View>
          {CATEGORIES.map((category, index) => (
            <View key={category.title}>
              <Row title={category.title} subtitle={category.example} showChevron={false} />
              {index < CATEGORIES.length - 1 && <Hairline />}
            </View>
          ))}
        </View>
      </View>

      <Text variant="caption" tone="muted">
        Notification tokens are stored only while notifications are switched on and are
        deleted when you turn them off or delete your account.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  card: { padding: spacing.lg, gap: spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  toggleText: { flex: 1, gap: spacing.xs },
  divider: { marginVertical: spacing.xs },
  section: { gap: spacing.base },
});
