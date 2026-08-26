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

/** Die Admin-Übersicht. Bewusst nüchtern — diese Bildschirme sind Werkzeuge. */
export default function AdminHome() {
  const user = useAuthStore((state) => state.user);

  return (
    <Screen header={<ScreenHeader title="ADMIN" />} contentStyle={styles.content}>
      <DemoBanner />

      <Surface style={styles.identity}>
        <View style={styles.identityRow}>
          <Text variant="labelWide" tone="muted" uppercase>
            ANGEMELDET ALS
          </Text>
          <Chip label="ADMIN" tone="warning" />
        </View>
        <Text variant="body" tone="secondary">
          {user?.email}
        </Text>
        <Text variant="caption" tone="muted">
          Jede Aktion hier unten wird im Prüfprotokoll mit deinem Konto festgehalten.
        </Text>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="KATALOG" />
        <View>
          <Row
            title="VERÖFFENTLICHUNGEN"
            subtitle="Titel, Cover und Links anlegen oder ändern"
            icon="disc"
            onPress={() => router.push('/admin/tracks')}
          />
          <Hairline />
          <Row
            title="AKTUELLES"
            subtitle="Eine Meldung auf der Startseite veröffentlichen"
            icon="document"
            onPress={() => router.push('/admin/news')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="WIRTSCHAFT" />
        <View>
          <Row
            title="MISSIONEN"
            subtitle="Wege zu Credits anlegen und bearbeiten"
            icon="token"
            onPress={() => router.push('/admin/missions')}
          />
          <Hairline />
          <Row
            title="PRÄMIEN"
            subtitle="Der Katalog zum Einlösen und sein Bestand"
            icon="gift"
            onPress={() => router.push('/admin/rewards')}
          />
          <Hairline />
          <Row
            title="ABZEICHEN"
            subtitle="Erfolge, die Mitglieder freischalten können"
            icon="star"
            onPress={() => router.push('/admin/badges')}
          />
          <Hairline />
          <Row
            title="CREDITS"
            subtitle="Guthaben gutschreiben, korrigieren oder erstatten"
            icon="edit"
            onPress={() => router.push('/admin/credits')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="GEWINNSPIELE" />
        <Row
          title="GEWINNSPIELE & ZIEHUNGEN"
          subtitle="Anlegen, schließen und Gewinner ziehen"
          icon="ticket"
          onPress={() => router.push('/admin/giveaways')}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="MITGLIEDER" />
        <View>
          <Row
            title="MITGLIEDER"
            subtitle="Konten nachschlagen, sperren oder wiederherstellen"
            icon="user"
            onPress={() => router.push('/admin/users')}
          />
          <Hairline />
          <Row
            title="PUSH-NACHRICHTEN"
            subtitle="Eine Nachricht an Mitglieder mit Einwilligung einreihen"
            icon="bell"
            onPress={() => router.push('/admin/notifications')}
          />
          <Hairline />
          <Row
            title="PRÜFPROTOKOLL"
            subtitle="Jede Verwaltungsaktion, der Reihe nach"
            icon="shield"
            onPress={() => router.push('/admin/audit')}
          />
        </View>
      </View>

      {config.isDemoMode && (
        <Text variant="caption" tone="muted">
          Im Demo-Modus lassen sich diese Bildschirme ansehen, eine Ziehung braucht aber die
          echte API — Gewinner werden niemals auf dem Gerät ausgewählt.
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
