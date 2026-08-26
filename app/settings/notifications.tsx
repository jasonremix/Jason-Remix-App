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
  { title: 'NEUE VERÖFFENTLICHUNG', example: '„Zeitgeist ist jetzt verfügbar.“' },
  { title: 'NEUES GEWINNSPIEL', example: '„Ein neues Gewinnspiel hat begonnen.“' },
  { title: 'PRÄMIE FREIGESCHALTET', example: '„Dein Guthaben reicht für eine neue Prämie.“' },
  { title: 'SPECIAL DROP', example: '„Ein exklusiver Jason-Remix-Drop ist da.“' },
];

/**
 * Push-Einstellungen. Standardmäßig aus, und der Systemstatus wird ehrlich angezeigt
 * statt beschönigt.
 */
export default function NotificationSettings() {
  const me = useMe();
  const showToast = useUiStore((state) => state.showToast);

  const [permission, setPermission] = useState<PushPermission>('undetermined');
  const [busy, setBusy] = useState(false);
  /**
   * Nur gesetzt, solange ein Umschalten läuft: der Schalter reagiert sofort, ohne dass
   * der Serverwert dauerhaft in lokalen Zustand kopiert wird — sobald neu geladen ist,
   * zählt wieder die Antwort des Servers.
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
            showToast('BENACHRICHTIGUNGEN SIND IN DEN SYSTEMEINSTELLUNGEN GESPERRT', 'neutral');
          }
        } else {
          await notificationsService.disable();
        }
        await me.refetch();
      } catch (error) {
        showToast(toAppError(error).message, 'negative');
      } finally {
        // Zurück an den Serverwert, der inzwischen neu geladen wurde.
        setOptimistic(null);
        setBusy(false);
      }
    },
    [me, showToast],
  );

  return (
    <Screen header={<ScreenHeader title="BENACHRICHTIGUNGEN" />} contentStyle={styles.content}>
      <DemoBanner />

      <Surface style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text variant="heading" tone="primary">
              Push-Benachrichtigungen
            </Text>
            <Text variant="bodySmall" tone="muted">
              Veröffentlichungen, Gewinnspiele und Drops. Standardmäßig aus — du
              entscheidest.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(next) => void toggle(next)}
            disabled={busy}
            trackColor={{ false: palette.ruleStrong, true: palette.inkSoft }}
            thumbColor={enabled ? palette.ink : palette.faint}
            ios_backgroundColor={palette.ruleStrong}
          />
        </View>

        {permission === 'denied' && (
          <>
            <Hairline style={styles.divider} />
            <Text variant="bodySmall" tone="muted">
              Benachrichtigungen sind für diese App in deinen Geräteeinstellungen
              deaktiviert.
            </Text>
            <Button
              label="SYSTEMEINSTELLUNGEN ÖFFNEN"
              variant="secondary"
              size="sm"
              icon="external"
              onPress={() => void Linking.openSettings()}
            />
          </>
        )}
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="DAS WÜRDEST DU BEKOMMEN" />
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
        Benachrichtigungs-Tokens werden nur gespeichert, solange Benachrichtigungen
        eingeschaltet sind, und gelöscht, sobald du sie ausschaltest oder dein Konto
        löschst.
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
