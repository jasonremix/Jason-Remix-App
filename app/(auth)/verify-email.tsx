import { router } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Monogram } from '@/components/brand/Monogram';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { Hairline, Surface } from '@/components/ui/Surface';
import { layout, palette, spacing } from '@/constants/theme';
import { useResendVerification, useVerificationStatus } from '@/hooks/useEmailVerification';
import { useAuthStore } from '@/store/authStore';

/**
 * Der Bildschirm direkt nach der Registrierung.
 *
 * Er sagt genau eines von zwei Dingen: entweder ist eine Mail unterwegs, oder es ist
 * keine rausgegangen und warum. Nie „schau in dein Postfach“, wenn nichts verschickt
 * wurde — das ist der ganze Zweck dieser Seite.
 */
export default function VerifyEmail() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const lastVerification = useAuthStore((state) => state.lastVerification);
  const status = useVerificationStatus();
  const resend = useResendVerification();

  const verified = Boolean(user?.emailVerifiedAt) || Boolean(status.data?.verified);

  // Sobald bestätigt ist, hat diese Seite keinen Zweck mehr.
  useEffect(() => {
    if (verified) router.replace('/(tabs)');
  }, [verified]);

  const skip = useCallback(() => router.replace('/(tabs)'), []);

  const sent = lastVerification?.sent ?? true;
  const reason = lastVerification?.reason ?? null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.huge }]}>
      <View style={styles.content}>
        <Monogram size={40} />

        <View style={styles.head}>
          <Chip label={sent ? 'E-MAIL UNTERWEGS' : 'KEINE E-MAIL VERSCHICKT'} tone={sent ? 'active' : 'warning'} />
          <Text variant="display" tone="primary">
            {sent ? 'Fast geschafft.' : 'Konto angelegt.'}
          </Text>
        </View>

        {sent ? (
          <Text variant="body" tone="tertiary" style={styles.body}>
            Wir haben dir eine Bestätigungsmail an{' '}
            <Text variant="body" tone="primary">
              {user?.email}
            </Text>{' '}
            geschickt. Tippe auf den Link darin, dann ist dein Konto vollständig
            freigeschaltet.
          </Text>
        ) : (
          <Surface style={styles.notice}>
            <Text variant="labelWide" tone="muted" uppercase>
              HINWEIS
            </Text>
            <Text variant="bodySmall" tone="secondary">
              {reason ?? 'Es konnte keine Bestätigungsmail verschickt werden.'}
            </Text>
            <Hairline style={styles.divider} />
            <Text variant="caption" tone="muted">
              Dein Konto ist trotzdem angelegt und du kannst die App normal benutzen. Die
              Bestätigung lässt sich jederzeit unter „Konto“ nachholen.
            </Text>
          </Surface>
        )}

        <View style={styles.actions}>
          <Button
            label="BESTÄTIGUNGSMAIL ERNEUT SENDEN"
            variant="secondary"
            fullWidth
            loading={resend.isPending}
            onPress={() => resend.mutate()}
          />
          <Button label="WEITER ZUR APP" variant="ghost" fullWidth onPress={skip} />
        </View>
      </View>

      {/* Der Spam-Hinweis ergibt nur Sinn, wenn tatsächlich etwas unterwegs ist. */}
      {sent && (
        <Text
          variant="caption"
          tone="muted"
          align="center"
          style={[styles.footnote, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
        >
          Nichts angekommen? Sieh auch im Spam-Ordner nach.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.paper, paddingHorizontal: layout.gutter },
  content: { flex: 1, gap: spacing.xl },
  head: { gap: spacing.base, alignItems: 'flex-start' },
  body: { maxWidth: 380 },
  notice: { padding: spacing.lg, gap: spacing.sm },
  divider: { marginVertical: spacing.xs },
  actions: { gap: spacing.sm, marginTop: 'auto' },
  footnote: { paddingTop: spacing.lg },
});
