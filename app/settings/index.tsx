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

/** Der Einstiegspunkt in alles, was ein Mitglied an sich selbst ändern kann. */
export default function Settings() {
  const me = useMe();
  const isAdmin = useIsAdmin();
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <Screen header={<ScreenHeader title="EINSTELLUNGEN" />} contentStyle={styles.content}>
      <DemoBanner />

      <View style={styles.section}>
        <SectionHeader title="KONTO" />
        <View>
          <Row title="E-MAIL" value={me.data?.user.email} showChevron={false} />
          <Hairline />
          <Row
            title="BENUTZERNAME"
            value={me.data?.profile?.username ?? '—'}
            showChevron={false}
          />
          <Hairline />
          <Row
            title="KONTO VERWALTEN"
            icon="user"
            onPress={() => router.push('/settings/account')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="VERBINDUNGEN" />
        <View>
          <Row
            title="SPOTIFY"
            value={
              !config.isSpotifyConfigured
                ? 'NICHT EINGERICHTET'
                : me.data?.spotify.connected
                  ? 'VERBUNDEN'
                  : 'NICHT VERBUNDEN'
            }
            icon="spotify"
            onPress={() => router.push('/settings/spotify')}
          />
          <Hairline />
          <Row
            title="BENACHRICHTIGUNGEN"
            value={me.data?.profile?.pushEnabled ? 'AN' : 'AUS'}
            icon="bell"
            onPress={() => router.push('/settings/notifications')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="RECHTLICHES" />
        <View>
          <Row
            title="DATENSCHUTZERKLÄRUNG"
            icon="shield"
            onPress={() => router.push('/legal/privacy')}
          />
          <Hairline />
          <Row
            title="NUTZUNGSBEDINGUNGEN"
            icon="document"
            onPress={() => router.push('/legal/terms')}
          />
          <Hairline />
          <Row
            title="TEILNAHMEBEDINGUNGEN"
            icon="ticket"
            onPress={() => router.push('/legal/giveaway-terms')}
          />
          <Hairline />
          <Row
            title="SPOTIFY-HINWEIS"
            icon="info"
            onPress={() => router.push('/legal/spotify-notice')}
          />
          <Hairline />
          <Row title="IMPRESSUM" icon="document" onPress={() => router.push('/legal/imprint')} />
        </View>
      </View>

      {isAdmin && (
        <View style={styles.section}>
          <SectionHeader title="VERWALTUNG" />
          <Row title="ADMIN-BEREICH" icon="lock" onPress={() => router.push('/admin')} />
        </View>
      )}

      <View style={styles.section}>
        <Row
          title="ABMELDEN"
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
          {config.isDemoMode
            ? 'Demo-Modus — kein Server verbunden'
            : 'Mit der Jason-Remix-API verbunden'}
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
