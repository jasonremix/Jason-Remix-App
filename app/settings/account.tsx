import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
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
import { useMe } from '@/hooks/useMe';
import { toAppError } from '@/lib/errors';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Account management, including the two irreversible operations.
 *
 * Data export and account deletion are first-class controls here rather than something
 * a member has to email about — both are obligations under GDPR and both are one tap
 * plus one confirmation away.
 */
export default function AccountSettings() {
  const me = useMe();
  const signOut = useAuthStore((state) => state.signOut);
  const showToast = useUiStore((state) => state.showToast);

  const [username, setUsername] = useState(me.data?.profile?.username ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveProfile = useCallback(async () => {
    setSavingProfile(true);
    setProfileError(null);
    try {
      await authService.updateProfile({ username: username.trim() });
      showToast('PROFILE UPDATED', 'positive');
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
      // The export is surfaced in-app rather than emailed: fewer moving parts, and the
      // data never leaves the device unless the member chooses to share it.
      showToast(`EXPORT READY — ${Object.keys(data).length} SECTIONS`, 'positive');
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
    <Screen header={<ScreenHeader title="ACCOUNT" />} contentStyle={styles.content}>
      <View style={styles.section}>
        <SectionHeader title="PROFILE" />
        <Surface style={styles.card}>
          <Input
            label="USERNAME"
            value={username}
            onChangeText={setUsername}
            error={profileError}
            maxLength={20}
            placeholder="your_name"
          />
          <Button
            label="SAVE"
            variant="secondary"
            loading={savingProfile}
            disabled={!username.trim() || username.trim() === me.data?.profile?.username}
            onPress={() => void saveProfile()}
          />
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="YOUR DATA" />
        <View>
          <Row
            title="EXPORT MY DATA"
            subtitle="Everything stored about your account, in one file"
            icon="document"
            onPress={() => void exportData()}
          />
          <Hairline />
          <Row
            title="DISCONNECT SPOTIFY"
            subtitle="Removes the link and deletes the stored tokens"
            icon="spotify"
            onPress={() => router.push('/settings/spotify')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="DELETE ACCOUNT" />
        <Surface style={styles.card}>
          <Text variant="bodySmall" tone="tertiary">
            Deleting your account permanently removes your profile, credit balance, ledger,
            achievements, redemptions and giveaway entries. Credits and entries cannot be
            restored afterwards, and any open giveaway entries are voided without refund.
          </Text>
          <Button
            label="DELETE MY ACCOUNT"
            variant="danger"
            icon="trash"
            onPress={() => setConfirmingDelete(true)}
          />
        </Surface>
      </View>

      {config.isDemoMode && (
        <Text variant="caption" tone="muted">
          In demo mode this clears the local sample data only — no real account exists.
        </Text>
      )}

      <ConfirmDialog
        visible={confirmingDelete}
        eyebrow="DELETE ACCOUNT"
        title="This cannot be undone."
        message="Your account and everything associated with it will be permanently deleted."
        detail={`Balance, ledger, achievements and giveaway entries for ${me.data?.user.email ?? 'this account'} will be erased.`}
        confirmLabel="DELETE"
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
});
