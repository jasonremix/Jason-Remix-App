import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminForm, toNumber } from '@/components/admin/AdminForm';
import { CreditPill } from '@/components/credits/CreditPill';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Hairline } from '@/components/ui/Surface';
import { EmptyState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useMissions } from '@/hooks/useMissions';
import { adminService } from '@/services/admin.service';
import type { MissionType } from '@/types/models';

const TYPES: MissionType[] = [
  'DAILY_CHECK_IN',
  'CONNECT_SPOTIFY',
  'COMPLETE_PROFILE',
  'NEW_RELEASE',
  'COMMUNITY',
  'SPECIAL_EVENT',
];

export default function AdminMissions() {
  const missions = useMissions();

  const save = useCallback(
    async (values: Record<string, string | boolean>) => {
      const raw = String(values.type ?? '').trim().toUpperCase();
      const type = (TYPES as string[]).includes(raw) ? (raw as MissionType) : 'SPECIAL_EVENT';
      const cooldownHours = toNumber(values.cooldownHours);

      await adminService.upsertMission({
        id: String(values.id ?? '').trim() || undefined,
        type,
        title: String(values.title).trim(),
        description: String(values.description ?? '').trim(),
        reward: toNumber(values.reward) ?? 0,
        repeatable: Boolean(values.repeatable),
        cooldownSeconds: cooldownHours ? cooldownHours * 3_600 : null,
        startsAt: String(values.startsAt ?? '').trim() || null,
        endsAt: String(values.endsAt ?? '').trim() || null,
      });
      await missions.refetch();
    },
    [missions],
  );

  return (
    <Screen header={<ScreenHeader title="MISSIONS" />} contentStyle={styles.content}>
      <AdminForm
        title="ADD OR UPDATE A MISSION"
        description="The reward amount set here is the only amount the server will ever pay out for it."
        submitLabel="SAVE MISSION"
        onSubmit={save}
        fields={[
          { name: 'id', label: 'ID (LEAVE BLANK TO CREATE)', placeholder: 'msn-daily' },
          { name: 'title', label: 'TITLE', required: true, placeholder: 'COMMUNITY MISSION' },
          { name: 'description', label: 'DESCRIPTION', type: 'multiline' },
          { name: 'type', label: 'TYPE', initialValue: 'SPECIAL_EVENT', hint: TYPES.join(' · ') },
          { name: 'reward', label: 'REWARD IN CREDITS', type: 'number', required: true, placeholder: '250' },
          { name: 'repeatable', label: 'Can be completed more than once', type: 'switch' },
          { name: 'cooldownHours', label: 'COOLDOWN IN HOURS', type: 'number', placeholder: '24', hint: 'Only used for repeatable missions.' },
          { name: 'startsAt', label: 'STARTS AT', placeholder: '2026-08-01T00:00:00Z' },
          { name: 'endsAt', label: 'ENDS AT', placeholder: '2026-09-01T00:00:00Z' },
        ]}
      />

      <View style={styles.section}>
        <SectionHeader title="ACTIVE MISSIONS" meta={`${missions.data?.missions.length ?? 0}`} />
        {(missions.data?.missions ?? []).length === 0 ? (
          <EmptyState icon="token" title="No missions yet." />
        ) : (
          <View>
            {(missions.data?.missions ?? []).map((mission, index, all) => (
              <View key={mission.id}>
                <Row
                  title={mission.title}
                  subtitle={`${mission.id} · ${mission.type}`}
                  icon="token"
                  showChevron={false}
                  trailing={
                    <View style={styles.trailing}>
                      {mission.repeatable && <Chip label="REPEATS" tone="muted" />}
                      <CreditPill amount={mission.reward} size="sm" />
                    </View>
                  }
                />
                {index < all.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>

      <Text variant="caption" tone="muted">
        Missions of type CONNECT_SPOTIFY only ever pay out once a real Spotify connection
        exists on the account; the server refuses the claim otherwise.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
