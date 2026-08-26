import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DemoBanner } from '@/components/system/Banners';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Hairline } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { brand } from '@/constants/brand';
import { config } from '@/constants/config';
import { spacing } from '@/constants/theme';
import { useMe } from '@/hooks/useMe';
import { useAuthStore, useIsAdmin } from '@/store/authStore';

export default function Settings() {
  const me = useMe();
  const isAdmin = useIsAdmin();
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <Screen header={<ScreenHeader title="SETTINGS" />} contentStyle={styles.content}>
      <DemoBanner />

      <View style={styles.section}>
        <SectionHeader title="ACCOUNT" />
        <View>
          <Row title="EMAIL" value={me.data?.user.email} showChevron={false} />
          <Hairline />
          <Row title="USERNAME" value={me.data?.profile?.username ?? '—'} showChevron={false} />
          <Hairline />
          <Row title="MANAGE ACCOUNT" icon="user" onPress={() => router.push('/settings/account')} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="CONNECTIONS" />
        <View>
          <Row
            title="SPOTIFY"
            value={
              !config.isSpotifyConfigured
                ? 'NOT CONFIGURED'
                : me.data?.spotify.connected
                  ? 'CONNECTED'
                  : 'NOT CONNECTED'
            }
            icon="spotify"
            onPress={() => router.push('/settings/spotify')}
          />
          <Hairline />
          <Row
            title="NOTIFICATIONS"
            value={me.data?.profile?.pushEnabled ? 'ON' : 'OFF'}
            icon="bell"
            onPress={() => router.push('/settings/notifications')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="LEGAL" />
        <View>
          <Row title="PRIVACY POLICY" icon="shield" onPress={() => router.push('/legal/privacy')} />
          <Hairline />
          <Row title="TERMS OF USE" icon="document" onPress={() => router.push('/legal/terms')} />
          <Hairline />
          <Row title="GIVEAWAY CONDITIONS" icon="ticket" onPress={() => router.push('/legal/giveaway-terms')} />
          <Hairline />
          <Row title="SPOTIFY NOTICE" icon="info" onPress={() => router.push('/legal/spotify-notice')} />
          <Hairline />
          <Row title="IMPRINT" icon="document" onPress={() => router.push('/legal/imprint')} />
        </View>
      </View>

      {isAdmin && (
        <View style={styles.section}>
          <SectionHeader title="ADMINISTRATION" />
          <Row title="ADMIN DASHBOARD" icon="lock" onPress={() => router.push('/admin')} />
        </View>
      )}

      <View style={styles.section}>
        <Row
          title="SIGN OUT"
          icon="logout"
          showChevron={false}
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/login');
          }}
        />
      </View>

      <View style={styles.about}>
        <Text variant="caption" tone="muted" align="center">
          {brand.name} · Version {config.appVersion}
        </Text>
        <Text variant="caption" tone="muted" align="center">
          {config.isDemoMode ? 'Demo mode — no server connected' : 'Connected to the Jason Remix API'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
  about: { gap: spacing.xs, marginTop: spacing.base },
});
