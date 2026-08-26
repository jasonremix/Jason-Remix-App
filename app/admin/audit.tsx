import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Hairline } from '@/components/ui/Surface';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { toAppError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/queryClient';
import { adminService } from '@/services/admin.service';

/** The audit log: append-only, newest first. */
export default function AdminAudit() {
  const audit = useQuery({
    queryKey: queryKeys.adminAudit,
    queryFn: () => adminService.auditLog(),
    staleTime: 15_000,
  });

  const entries = audit.data?.entries ?? [];

  return (
    <Screen
      header={<ScreenHeader title="AUDIT LOG" />}
      contentStyle={styles.content}
      onRefresh={() => void audit.refetch()}
      refreshing={audit.isRefetching}
    >
      <SectionHeader
        title="ADMINISTRATIVE ACTIONS"
        meta={audit.isPending ? undefined : `${entries.length}`}
      />

      {audit.isPending ? (
        <View style={styles.list}>
          <Skeleton height={44} />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </View>
      ) : audit.isError ? (
        <ErrorState message={toAppError(audit.error).message} onRetry={() => void audit.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="shield"
          title="Nothing recorded yet."
          message="Administrative actions appear here as they happen."
        />
      ) : (
        <View>
          {entries.map((entry, index) => (
            <View key={entry.id}>
              <Row
                title={entry.action}
                subtitle={`${entry.adminEmail} · ${formatDateTime(entry.createdAt)}${entry.targetId ? ` · ${entry.targetId}` : ''}`}
                icon="shield"
                showChevron={false}
              />
              {entry.metadata && (
                <Text variant="caption" tone="muted" style={styles.metadata}>
                  {Object.entries(entry.metadata)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(' · ')}
                </Text>
              )}
              {index < entries.length - 1 && <Hairline />}
            </View>
          ))}
        </View>
      )}

      <Text variant="caption" tone="muted">
        This log is append-only — there is no path in the app or the API to edit or delete
        an entry.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.base, paddingTop: spacing.lg },
  list: { gap: spacing.md },
  metadata: { paddingLeft: spacing.xxl, paddingBottom: spacing.md },
});
