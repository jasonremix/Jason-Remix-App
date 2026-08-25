import { Link, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Wordmark';
import { DemoBanner } from '@/components/system/Banners';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { layout, palette, radius, spacing } from '@/constants/theme';
import { toAppError } from '@/lib/errors';
import { MIN_PASSWORD_LENGTH } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';

/**
 * Registration.
 *
 * Deliberately minimal: email, username, password. No date of birth, no real name, no
 * marketing consent bundled into the account — anything the app does not strictly need
 * is not collected. Age is asked for only where a giveaway legally requires it, at the
 * point of entry.
 */
export default function Register() {
  const insets = useSafeAreaInsets();
  const signUp = useAuthStore((state) => state.signUp);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await signUp({ email, password, username, acceptedTerms });
      router.replace('/(tabs)');
    } catch (caught) {
      const appError = toAppError(caught);
      setError(appError.message);
      setFieldErrors(appError.details ?? {});
    } finally {
      setSubmitting(false);
    }
  }, [acceptedTerms, email, password, signUp, username]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Wordmark size="md" tagline />
        <DemoBanner />

        <View style={styles.form}>
          <Text variant="labelWide" tone="muted" uppercase>
            CREATE YOUR ACCOUNT
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
          />

          <Input
            label="USERNAME"
            value={username}
            onChangeText={setUsername}
            error={fieldErrors.username}
            hint="Visible to other members. 3–20 characters."
            autoComplete="username-new"
            placeholder="your_name"
            maxLength={20}
          />

          <Input
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters, including a number.`}
            secure
            textContentType="newPassword"
            autoComplete="new-password"
            placeholder="••••••••••"
          />

          <Pressable
            onPress={() => setAcceptedTerms((value) => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
            style={styles.consent}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && <Icon name="check" size={12} color={palette.obsidian} strokeWidth={1.8} />}
            </View>
            <Text variant="bodySmall" tone="tertiary" style={styles.consentText}>
              I accept the{' '}
              <Link href="/legal/terms" style={styles.inlineLink}>
                Terms of Use
              </Link>{' '}
              and have read the{' '}
              <Link href="/legal/privacy" style={styles.inlineLink}>
                Privacy Policy
              </Link>
              .
            </Text>
          </Pressable>

          {error && (
            <Text variant="bodySmall" tone="danger">
              {error}
            </Text>
          )}

          <Button
            label="CREATE ACCOUNT"
            variant="primary"
            fullWidth
            loading={submitting}
            disabled={!acceptedTerms}
            onPress={() => void submit()}
          />
        </View>

        <View style={styles.footer}>
          <Text variant="bodySmall" tone="muted">
            Already a member?
          </Text>
          <Link href="/(auth)/login" asChild>
            <Text variant="bodySmall" tone="chrome" accessibilityRole="link">
              SIGN IN
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
  form: { gap: spacing.lg },
  consent: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: palette.chrome, borderColor: palette.chrome },
  consentText: { flex: 1 },
  inlineLink: { color: palette.chrome },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
});
