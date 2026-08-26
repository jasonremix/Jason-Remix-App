import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { alpha, palette, radius, spacing } from '@/constants/theme';
import { config } from '@/constants/config';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Offline notice.
 *
 * Content already loaded stays on screen — this only states that live features are
 * paused, rather than replacing the page with an error.
 */
export function OfflineBanner() {
  const { isOnline, isPending } = useNetworkStatus();
  if (isOnline || isPending) return null;

  return (
    <View style={[styles.banner, styles.offline]} accessibilityRole="alert">
      <Icon name="offline" size={15} color={palette.silver} />
      <View style={styles.text}>
        <Text variant="label" tone="secondary" uppercase>
          OFFLINE
        </Text>
        <Text variant="caption" tone="muted">
          Some features are currently unavailable.
        </Text>
      </View>
    </View>
  );
}

/**
 * Demo notice.
 *
 * Shown wherever placeholder data appears. The app must never let demo content be
 * mistaken for a real account, so this is deliberately persistent rather than
 * dismissible.
 */
export function DemoBanner({ compact = false }: { compact?: boolean }) {
  if (!config.isDemoMode) return null;

  if (compact) {
    return (
      <View style={[styles.banner, styles.demo, styles.compact]}>
        <Icon name="info" size={13} color={palette.titanium} />
        <Text variant="labelWide" tone="muted" uppercase>
          DEMO MODE
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.banner, styles.demo]}>
      <Icon name="info" size={15} color={palette.titanium} />
      <View style={styles.text}>
        <Text variant="label" tone="tertiary" uppercase>
          DEMO MODE
        </Text>
        <Text variant="caption" tone="muted">
          Sample data. No account is affected and no credits are real.
        </Text>
      </View>
    </View>
  );
}

/** States plainly that Spotify has no credentials yet, instead of failing silently. */
export function SpotifyUnavailableNotice() {
  if (config.isSpotifyConfigured) return null;

  return (
    <View style={[styles.banner, styles.demo]}>
      <Icon name="spotify" size={15} color={palette.titanium} />
      <View style={styles.text}>
        <Text variant="label" tone="tertiary" uppercase>
          SPOTIFY NOT CONFIGURED
        </Text>
        <Text variant="caption" tone="muted">
          Connecting becomes available once Spotify credentials are set for this build.
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
  offline: { backgroundColor: palette.gunmetal, borderColor: alpha.edge },
  demo: { backgroundColor: palette.well, borderColor: alpha.hairline },
  text: { flex: 1, gap: 2 },
});
