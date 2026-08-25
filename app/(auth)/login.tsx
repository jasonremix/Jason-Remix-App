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
            SIGN IN
          </Text>

          <Input
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            placeholder="you@example.com"
            returnKeyType="next"
          />

          <Input
            label="PASSWORD"
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
            label="SIGN IN"
            variant="primary"
            fullWidth
            loading={submitting}
            onPress={() => void submit()}
          />

          {config.isDemoMode && (
            <Text variant="caption" tone="muted">
              Demo mode accepts any credentials. Sign in as admin@jasonremix.de to review the
              admin area.
            </Text>
          )}
        </View>

        <View style={styles.providers}>
          <View style={styles.rule} />
          <Text variant="labelWide" tone="muted" uppercase>
            OR
          </Text>
          <View style={styles.rule} />
        </View>

        {/*
          Apple and Google sign-in are part of the plan but not wired to a provider yet.
          They are shown disabled and labelled rather than presented as working.
        */}
        <View style={styles.form}>
          <View style={styles.providerRow}>
            <Button label="CONTINUE WITH APPLE" variant="secondary" fullWidth disabled style={styles.grow} />
            <Chip label="SOON" tone="muted" />
          </View>
          <View style={styles.providerRow}>
            <Button label="CONTINUE WITH GOOGLE" variant="secondary" fullWidth disabled style={styles.grow} />
            <Chip label="SOON" tone="muted" />
          </View>
        </View>

        <View style={styles.footer}>
          <Text variant="bodySmall" tone="muted">
            No account yet?
          </Text>
          <Link href="/(auth)/register" asChild>
            <Text variant="bodySmall" tone="chrome" accessibilityRole="link">
              CREATE ONE
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  content: { paddingHorizontal: layout.gutter, gap: spacing.xxl },
  notices: { gap: spacing.md },
  form: { gap: spacing.lg },
  providers: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)' },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
});
