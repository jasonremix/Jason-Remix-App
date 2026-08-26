import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CreditPill } from '@/components/credits/CreditPill';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
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
import { formatLevel } from '@/lib/levels';
import { queryKeys } from '@/lib/queryClient';
import { adminService } from '@/services/admin.service';
import { useUiStore } from '@/store/uiStore';
import type { AdminUserSummary } from '@/types/models';

/** Member lookup, suspension and restoration. */
export default function AdminUsers() {
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<AdminUserSummary | null>(null);

  // Debounced so typing a search does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const users = useQuery({
    queryKey: [...queryKeys.adminUsers, search],
    queryFn: () => adminService.listUsers(undefined, search || undefined),
    staleTime: 15_000,
  });

  const setStatus = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'BANNED' }) =>
      adminService.setUserStatus(userId, status),
    onSuccess: (_result, variables) => {
      showToast(variables.status === 'BANNED' ? 'MEMBER SUSPENDED' : 'MEMBER RESTORED', 'neutral');
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminAudit });
    },
    onError: (error) => showToast(toAppError(error).message, 'negative'),
    onSettled: () => setPending(null),
  });

  const rows = users.data?.users ?? [];

  return (
    <Screen
      header={<ScreenHeader title="MEMBERS" />}
      contentStyle={styles.content}
      onRefresh={() => void users.refetch()}
      refreshing={users.isRefetching}
    >
      <Input
        label="SEARCH"
        value={query}
        onChangeText={setQuery}
        placeholder="Email or username"
        hint="Tap a member to suspend, restore, or copy their id for the credits screen."
      />

      <View style={styles.section}>
        <SectionHeader title="ACCOUNTS" meta={users.isPending ? undefined : `${rows.length}`} />

        {users.isPending ? (
          <View style={styles.list}>
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </View>
        ) : users.isError ? (
          <ErrorState message={toAppError(users.error).message} onRetry={() => void users.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon="user" title="No accounts match." />
        ) : (
          <View>
            {rows.map((user, index) => (
              <View key={user.id}>
                <Row
                  title={user.username ?? user.email}
                  subtitle={`${user.email} · ${formatLevel(user.level)}`}
                  icon="user"
                  onPress={() => setPending(user)}
                  showChevron={false}
                  trailing={
                    <View style={styles.trailing}>
                      {user.role === 'ADMIN' && <Chip label="ADMIN" tone="warning" />}
                      {user.status === 'BANNED' && <Chip label="SUSPENDED" tone="danger" />}
                      {user.spotifyConnected && <Chip label="SPOTIFY" tone="muted" />}
                      <CreditPill amount={user.balance} size="sm" />
                    </View>
                  }
                />
                {index < rows.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>

      <Text variant="caption" tone="muted">
        Suspending a member blocks sign-in immediately and revokes every active session.
        Credits and entries are preserved.
      </Text>

      <ConfirmDialog
        visible={pending !== null}
        eyebrow={pending?.status === 'BANNED' ? 'RESTORE MEMBER' : 'SUSPEND MEMBER'}
        title={pending?.username ?? pending?.email ?? ''}
        message={
          pending?.status === 'BANNED'
            ? 'The member will be able to sign in again straight away.'
            : 'The member will be signed out everywhere and blocked from signing in until restored.'
        }
        detail={pending ? `Member ${pending.id}` : undefined}
        confirmLabel={pending?.status === 'BANNED' ? 'RESTORE' : 'SUSPEND'}
        cancelLabel="COPY ID"
        destructive={pending?.status !== 'BANNED'}
        loading={setStatus.isPending}
        onConfirm={() => {
          if (!pending) return;
          setStatus.mutate({
            userId: pending.id,
            status: pending.status === 'BANNED' ? 'ACTIVE' : 'BANNED',
          });
        }}
        onCancel={async () => {
          // The cancel slot doubles as "copy id" — the credits screen needs it, and
          // there is nowhere else in the interface to get it from.
          if (pending) {
            await Clipboard.setStringAsync(pending.id);
            showToast('MEMBER ID COPIED', 'neutral');
          }
          setPending(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
  list: { gap: spacing.md },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
});
