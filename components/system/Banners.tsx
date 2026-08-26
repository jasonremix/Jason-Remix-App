import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { palette, radius, spacing } from '@/constants/theme';
import { config } from '@/constants/config';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Offline-Hinweis.
 *
 * Bereits geladene Inhalte bleiben stehen — der Hinweis sagt nur, dass Live-Funktionen
 * pausieren, statt die Seite durch einen Fehler zu ersetzen.
 */
export function OfflineBanner() {
  const { isOnline, isPending } = useNetworkStatus();
  if (isOnline || isPending) return null;

  return (
    <View style={[styles.banner, styles.offline]} accessibilityRole="alert">
      <Icon name="offline" size={16} color={palette.warning} />
      <View style={styles.text}>
        <Text variant="label" tone="primary" uppercase>
          OFFLINE
        </Text>
        <Text variant="caption" tone="tertiary">
          Einige Funktionen sind gerade nicht verfügbar.
        </Text>
      </View>
    </View>
  );
}

/**
 * Demo-Hinweis.
 *
 * Erscheint überall dort, wo Beispieldaten stehen. Demo-Inhalte dürfen nie für ein
 * echtes Konto gehalten werden, deshalb ist der Hinweis bewusst dauerhaft und nicht
 * wegklickbar.
 */
export function DemoBanner({ compact = false }: { compact?: boolean }) {
  if (!config.isDemoMode) return null;

  if (compact) {
    return (
      <View style={[styles.banner, styles.demo, styles.compact]}>
        <Icon name="info" size={13} color={palette.accent} />
        <Text variant="labelWide" tone="accent" uppercase>
          DEMO-MODUS
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.banner, styles.demo]}>
      <Icon name="info" size={16} color={palette.accent} />
      <View style={styles.text}>
        <Text variant="label" tone="accent" uppercase>
          DEMO-MODUS
        </Text>
        <Text variant="caption" tone="tertiary">
          Beispieldaten. Kein Konto ist betroffen, keine Credits sind echt.
        </Text>
      </View>
    </View>
  );
}

/** Sagt klar, dass für Spotify noch keine Zugangsdaten hinterlegt sind, statt still zu scheitern. */
export function SpotifyUnavailableNotice() {
  if (config.isSpotifyConfigured) return null;

  return (
    <View style={[styles.banner, styles.demo]}>
      <Icon name="spotify" size={16} color={palette.muted} />
      <View style={styles.text}>
        <Text variant="label" tone="primary" uppercase>
          SPOTIFY NICHT KONFIGURIERT
        </Text>
        <Text variant="caption" tone="tertiary">
          Das Verbinden wird möglich, sobald für diesen Build Spotify-Zugangsdaten hinterlegt sind.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compact: { alignSelf: 'flex-start', paddingVertical: 6 },
  offline: { backgroundColor: palette.warningWash, borderColor: palette.warningWash },
  demo: { backgroundColor: palette.accentWash, borderColor: palette.accentWash },
  text: { flex: 1, gap: 2 },
});
