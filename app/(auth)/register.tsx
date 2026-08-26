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
 * Registrierung.
 *
 * Bewusst knapp: E-Mail, Benutzername, Passwort. Kein Geburtsdatum, kein Klarname,
 * keine Werbe-Einwilligung im Konto versteckt — was die App nicht zwingend braucht,
 * wird nicht erhoben. Nach dem Alter wird nur dort gefragt, wo ein Gewinnspiel es
 * rechtlich verlangt, und zwar direkt bei der Teilnahme.
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
      // Nicht direkt in die App: der nächste Bildschirm sagt, was mit der
      // Bestätigungsmail passiert ist.
      router.replace('/(auth)/verify-email');
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
            KONTO ANLEGEN
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
          />

          <Input
            label="BENUTZERNAME"
            value={username}
            onChangeText={setUsername}
            error={fieldErrors.username}
            hint="Für andere Mitglieder sichtbar. 3–20 Zeichen."
            autoComplete="username-new"
            placeholder="dein_name"
            maxLength={20}
          />

          <Input
            label="PASSWORT"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
            hint={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen, davon mindestens eine Ziffer.`}
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
              {acceptedTerms && (
                <Icon name="check" size={12} color={palette.onAccent} strokeWidth={2.2} />
              )}
            </View>
            <Text variant="bodySmall" tone="tertiary" style={styles.consentText}>
              Ich akzeptiere die{' '}
              <Link href="/legal/terms" style={styles.inlineLink}>
                Nutzungsbedingungen
              </Link>{' '}
              und habe die{' '}
              <Link href="/legal/privacy" style={styles.inlineLink}>
                Datenschutzerklärung
              </Link>{' '}
              gelesen.
            </Text>
          </Pressable>

          {error && (
            <Text variant="bodySmall" tone="danger">
              {error}
            </Text>
          )}

          <Button
            label="KONTO ANLEGEN"
            variant="primary"
            fullWidth
            loading={submitting}
            disabled={!acceptedTerms}
            onPress={() => void submit()}
          />
        </View>

        <View style={styles.footer}>
          <Text variant="bodySmall" tone="muted">
            Schon Mitglied?
          </Text>
          <Link href="/(auth)/login" asChild>
            <Text variant="bodySmall" tone="accent" accessibilityRole="link">
              ANMELDEN
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
  form: { gap: spacing.lg },
  consent: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.ruleStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: palette.accent, borderColor: palette.accent },
  consentText: { flex: 1 },
  inlineLink: { color: palette.accent },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
});
