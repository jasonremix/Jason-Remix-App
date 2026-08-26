import { Link, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Wordmark';
import { DemoBanner, OfflineBanner } from '@/components/system/Banners';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { layout, palette, spacing } from '@/constants/theme';
import { toAppError } from '@/lib/errors';
import { useAuthStore } from '@/store/authStore';

/**
 * Anmeldung.
 *
 * E-Mail und Passwort, sonst nichts. Die Anbieter-Schaltflächen sind sichtbar
 * deaktiviert statt so zu tun, als würden sie schon funktionieren.
 */
export default function Login() {
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((state) => state.signIn);
  const expiredNotice = useAuthStore((state) => state.expiredNotice);
  const clearExpiredNotice = useAuthStore((state) => state.clearExpiredNotice);

  const [email, setEmail] = useState(config.isDemoMode ? 'demo@jasonremix.de' : '');
  const [password, setPassword] = useState(config.isDemoMode ? 'demo-mode' : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => clearExpiredNotice, [clearExpiredNotice]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await signIn({ email, password });
      router.replace('/(tabs)');
    } catch (caught) {
      const appError = toAppError(caught);
      setError(appError.message);
      setFieldErrors(appError.details ?? {});
    } finally {
      setSubmitting(false);
    }
  }, [email, password, signIn]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Wordmark size="lg" tagline />

        <View style={styles.notices}>
          <OfflineBanner />
          <DemoBanner />
        </View>

        <View style={styles.form}>
          <Text variant="labelWide" tone="muted" uppercase>
            ANMELDEN
          </Text>

          <Input
            label="E-MAIL"
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            placeholder="du@beispiel.de"
            returnKeyType="next"
          />

          <Input
            label="PASSWORT"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
            secure
            textContentType="password"
            autoComplete="current-password"
            placeholder="••••••••••"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />

          {(error || expiredNotice) && (
            <Text variant="bodySmall" tone="danger">
              {error ?? expiredNotice}
            </Text>
          )}

          <Button
            label="ANMELDEN"
            variant="primary"
            fullWidth
            loading={submitting}
            onPress={() => void submit()}
          />

          {config.isDemoMode && (
            <Text variant="caption" tone="muted">
              Im Demo-Modus wird jede Eingabe akzeptiert. Melde dich als admin@jasonremix.de
              an, um den Admin-Bereich anzusehen.
            </Text>
          )}
        </View>

        <View style={styles.providers}>
          <View style={styles.rule} />
          <Text variant="labelWide" tone="muted" uppercase>
            ODER
          </Text>
          <View style={styles.rule} />
        </View>

        {/*
          Anmeldung über Apple und Google ist geplant, aber noch an keinen Anbieter
          angebunden. Deshalb stehen die Schaltflächen sichtbar deaktiviert da, statt so
          zu tun, als würden sie funktionieren.
        */}
        <View style={styles.form}>
          <View style={styles.providerRow}>
            <Button
              label="WEITER MIT APPLE"
              variant="secondary"
              fullWidth
              disabled
              style={styles.grow}
            />
            <Chip label="BALD" tone="muted" />
          </View>
          <View style={styles.providerRow}>
            <Button
              label="WEITER MIT GOOGLE"
              variant="secondary"
              fullWidth
              disabled
              style={styles.grow}
            />
            <Chip label="BALD" tone="muted" />
          </View>
        </View>

        <View style={styles.footer}>
          <Text variant="bodySmall" tone="muted">
            Noch kein Konto?
          </Text>
          <Link href="/(auth)/register" asChild>
            <Text variant="bodySmall" tone="accent" accessibilityRole="link">
              JETZT ANLEGEN
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.paper },
  content: { paddingHorizontal: layout.gutter, gap: spacing.xxl },
  notices: { gap: spacing.md },
  form: { gap: spacing.lg },
  providers: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.rule },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
});
