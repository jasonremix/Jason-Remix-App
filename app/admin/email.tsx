import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Hairline, Surface } from '@/components/ui/Surface';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { toAppError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { getBackend } from '@/services/backend';

/** Der Server liefert Art und Status englisch; angezeigt werden sie deutsch. */
const KIND: Record<string, string> = {
  VERIFY_EMAIL: 'BESTÄTIGUNG',
  WELCOME: 'WILLKOMMEN',
  EMAIL_CHANGED: 'ADRESSE GEÄNDERT',
};

const STATUS: Record<string, string> = {
  SENT: 'ZUGESTELLT',
  FAILED: 'FEHLGESCHLAGEN',
  SKIPPED: 'NICHT VERSCHICKT',
};

const TRANSPORT: Record<string, string> = {
  resend: 'Resend',
  smtp: 'SMTP',
  none: 'nicht eingerichtet',
};

/**
 * Das E-Mail-Zustellprotokoll.
 *
 * Jeder Versuch steht hier, auch der gescheiterte. Damit ist „es wurde eine Mail
 * verschickt“ eine überprüfbare Aussage und keine Annahme. Empfängeradressen sind
 * serverseitig maskiert.
 */
export default function AdminEmail() {
  const log = useQuery({
    queryKey: ['admin', 'email-log'],
    queryFn: () => getBackend().adminEmailLog(),
    staleTime: 15_000,
  });

  const entries = log.data?.entries ?? [];

  return (
    <Screen
      header={<ScreenHeader title="E-MAIL-VERSAND" />}
      contentStyle={styles.content}
      onRefresh={() => void log.refetch()}
      refreshing={log.isRefetching}
    >
      <Surface style={styles.card}>
        <View style={styles.statusRow}>
          <Text variant="labelWide" tone="muted" uppercase>
            VERSANDWEG
          </Text>
          <Chip
            label={TRANSPORT[log.data?.transport ?? 'none'] ?? (log.data?.transport ?? '—')}
            tone={log.data?.configured ? 'success' : 'warning'}
          />
        </View>
        <Hairline style={styles.divider} />
        <Text variant="caption" tone="muted">
          {log.data?.configured
            ? 'Bestätigungs- und Willkommensmails werden über diesen Weg zugestellt.'
            : 'Es ist kein Versandweg hinterlegt. Setze RESEND_API_KEY oder SMTP_HOST auf dem Server — bis dahin wird keine Mail verschickt, und die App sagt das auch so.'}
        </Text>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="ZULETZT VERSCHICKT" meta={log.isPending ? undefined : `${entries.length}`} />

        {log.isPending ? (
          <View style={styles.list}>
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </View>
        ) : log.isError ? (
          <ErrorState message={toAppError(log.error).message} onRetry={() => void log.refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon="document"
            title="Noch nichts verschickt."
            message="Sobald sich jemand registriert, erscheint der Versand hier."
          />
        ) : (
          <View>
            {entries.map((entry, index) => (
              <View key={entry.id}>
                <Row
                  title={entry.recipient}
                  subtitle={`${KIND[entry.kind] ?? entry.kind} · ${formatDateTime(entry.createdAt)}`}
                  icon="document"
                  showChevron={false}
                  trailing={
                    <Chip
                      label={STATUS[entry.status] ?? entry.status}
                      tone={
                        entry.status === 'SENT'
                          ? 'success'
                          : entry.status === 'FAILED'
                            ? 'danger'
                            : 'muted'
                      }
                    />
                  }
                />
                {entry.error && (
                  <Text variant="caption" tone="danger" style={styles.error}>
                    {entry.error}
                  </Text>
                )}
                {index < entries.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  card: { padding: spacing.lg, gap: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { marginVertical: spacing.xs },
  section: { gap: spacing.base },
  list: { gap: spacing.md },
  error: { paddingLeft: spacing.xxl, paddingBottom: spacing.md },
});
