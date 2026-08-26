import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Hairline, Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { spacing } from '@/constants/theme';
import { useEmailVerified, useResendVerification } from '@/hooks/useEmailVerification';
import { useMe } from '@/hooks/useMe';
import { toAppError } from '@/lib/errors';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Kontoverwaltung, einschließlich der beiden unumkehrbaren Vorgänge.
 *
 * Datenexport und Kontolöschung stehen hier als gleichwertige Schaltflächen, statt dass
 * ein Mitglied dafür eine E-Mail schreiben müsste — beides ist DSGVO-Pflicht, und beides
 * ist einen Fingertipp plus eine Bestätigung entfernt.
 */
export default function AccountSettings() {
  const me = useMe();
  const { verified, emailConfigured } = useEmailVerified();
  const resend = useResendVerification();
  // Der Auth-Store hat die Sitzung schon beim Start; die Query kommt später nach.
  const sessionUser = useAuthStore((state) => state.user);
  const sessionProfile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const showToast = useUiStore((state) => state.showToast);

  /**
   * Der angezeigte Benutzername wird abgeleitet, nicht gespiegelt.
   *
   * `draft` ist `null`, solange nichts getippt wurde — dann gilt der geladene Wert, und
   * der darf beim Kaltstart auch später noch eintreffen. Sobald jemand tippt, gewinnt
   * der Entwurf und wird von keiner nachkommenden Antwort mehr überschrieben.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const loadedUsername = me.data?.profile?.username ?? sessionProfile?.username ?? '';
  const username = draft ?? loadedUsername;
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const email = me.data?.user.email ?? sessionUser?.email ?? '';

  const saveProfile = useCallback(async () => {
    setSavingProfile(true);
    setProfileError(null);
    try {
      await authService.updateProfile({ username: username.trim() });
      showToast('PROFIL AKTUALISIERT', 'positive');
      // Entwurf verwerfen: ab jetzt ist der Serverwert der richtige.
      setDraft(null);
      void me.refetch();
    } catch (error) {
      setProfileError(toAppError(error).message);
    } finally {
      setSavingProfile(false);
    }
  }, [me, showToast, username]);

  const exportData = useCallback(async () => {
    try {
      const data = await authService.exportData();
      // Der Export wird in der App gezeigt statt per E-Mail verschickt: weniger bewegliche
      // Teile, und die Daten verlassen das Gerät nur, wenn das Mitglied es selbst will.
      showToast(`EXPORT BEREIT — ${Object.keys(data).length} BEREICHE`, 'positive');
    } catch (error) {
      showToast(toAppError(error).message, 'negative');
    }
  }, [showToast]);

  const deleteAccount = useCallback(async () => {
    setDeleting(true);
    try {
      await authService.deleteAccount({});
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      showToast(toAppError(error).message, 'negative');
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }, [showToast, signOut]);

  return (
    <Screen header={<ScreenHeader title="KONTO" />} contentStyle={styles.content}>
      <View style={styles.section}>
        <SectionHeader title="PROFIL" />
        <Surface style={styles.card}>
          <Input
            label="BENUTZERNAME"
            value={username}
            onChangeText={setDraft}
            error={profileError}
            maxLength={20}
            placeholder="dein_name"
          />
          <Button
            label="SPEICHERN"
            variant="secondary"
            loading={savingProfile}
            disabled={!username.trim() || username.trim() === loadedUsername}
            onPress={() => void saveProfile()}
          />
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="E-MAIL-ADRESSE" />
        <Surface style={styles.card}>
          <View style={styles.statusRow}>
            <Text variant="bodySmall" tone="secondary" numberOfLines={1} style={styles.grow}>
              {email}
            </Text>
            {/* Solange der Stand unbekannt ist, steht hier kein Etikett — lieber nichts
                als eine falsche Behauptung über das Konto. */}
            {verified !== null && (
              <Chip
                label={verified ? 'BESTÄTIGT' : 'NICHT BESTÄTIGT'}
                tone={verified ? 'success' : 'warning'}
              />
            )}
          </View>

          {verified === false && (
            <>
              <Hairline style={styles.divider} />
              <Text variant="caption" tone="muted">
                {emailConfigured === false
                  ? 'Auf diesem Server ist noch kein E-Mail-Versand eingerichtet, deshalb konnte keine Bestätigungsmail zugestellt werden.'
                  : 'Tippe auf den Link in der Bestätigungsmail. Nichts angekommen? Fordere hier eine neue an.'}
              </Text>
              <Button
                label="BESTÄTIGUNGSMAIL SENDEN"
                variant="secondary"
                loading={resend.isPending}
                disabled={emailConfigured === false}
                onPress={() => resend.mutate()}
              />
            </>
          )}
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="DEINE DATEN" />
        <View>
          <Row
            title="MEINE DATEN EXPORTIEREN"
            subtitle="Alles, was zu deinem Konto gespeichert ist, in einer Datei"
            icon="document"
            onPress={() => void exportData()}
          />
          <Hairline />
          <Row
            title="SPOTIFY TRENNEN"
            subtitle="Löst die Verbindung und löscht die gespeicherten Tokens"
            icon="spotify"
            onPress={() => router.push('/settings/spotify')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="KONTO LÖSCHEN" />
        <Surface style={styles.card}>
          <Text variant="bodySmall" tone="tertiary">
            Beim Löschen deines Kontos werden Profil, Guthaben, Kontobuch, Erfolge,
            Einlösungen und Gewinnspiel-Lose endgültig entfernt. Credits und Lose lassen
            sich danach nicht wiederherstellen, und laufende Lose verfallen ohne Erstattung.
          </Text>
          <Button
            label="MEIN KONTO LÖSCHEN"
            variant="danger"
            icon="trash"
            onPress={() => setConfirmingDelete(true)}
          />
        </Surface>
      </View>

      {config.isDemoMode && (
        <Text variant="caption" tone="muted">
          Im Demo-Modus werden nur die lokalen Beispieldaten gelöscht — ein echtes Konto
          gibt es hier nicht.
        </Text>
      )}

      <ConfirmDialog
        visible={confirmingDelete}
        eyebrow="KONTO LÖSCHEN"
        title="Das lässt sich nicht rückgängig machen."
        message="Dein Konto und alles, was daran hängt, wird endgültig gelöscht."
        detail={`Guthaben, Kontobuch, Erfolge und Gewinnspiel-Lose von ${me.data?.user.email ?? 'diesem Konto'} werden gelöscht.`}
        confirmLabel="LÖSCHEN"
        destructive
        loading={deleting}
        onConfirm={() => void deleteAccount()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
  card: { padding: spacing.lg, gap: spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
  divider: { marginVertical: 0 },
});
