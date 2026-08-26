import { StyleSheet, View } from 'react-native';

import { CreditPill } from '@/components/credits/CreditPill';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { palette, spacing } from '@/constants/theme';
import { formatCooldown } from '@/lib/format';
import type { Mission } from '@/types/models';

/**
 * One mission.
 *
 * The claim button is the only affordance; whether a claim is actually allowed is
 * decided by the server, so a stale row simply fails cleanly rather than paying out.
 */
export function MissionRow({
  mission,
  onClaim,
  claiming = false,
  disabled = false,
  disabledReason,
}: {
  mission: Mission;
  onClaim: () => void;
  claiming?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const claimable = mission.status === 'AVAILABLE' && !disabled;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.text}>
          <Text variant="label" tone={claimable ? 'chrome' : 'tertiary'} uppercase>
            {mission.title}
          </Text>
          <Text variant="bodySmall" tone="muted">
            {disabled && disabledReason ? disabledReason : mission.description}
          </Text>
        </View>
        <CreditPill amount={mission.reward} size="sm" />
      </View>

      <View style={styles.foot}>
        {mission.status === 'COMPLETED' ? (
          <View style={styles.done}>
            <Icon name="check" size={14} color={palette.success} strokeWidth={1.4} />
            <Text variant="labelWide" tone="muted" uppercase>
              COMPLETED
            </Text>
          </View>
        ) : mission.status === 'COOLDOWN' && mission.availableAt ? (
          <Chip label={formatCooldown(mission.availableAt)} tone="muted" />
        ) : mission.status === 'EXPIRED' ? (
          <Chip label="ENDED" tone="muted" />
        ) : (
          <Button
            label="CLAIM"
            size="sm"
            variant={claimable ? 'primary' : 'secondary'}
            onPress={onClaim}
            loading={claiming}
            disabled={!claimable}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: spacing.base, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.base },
  text: { flex: 1, gap: spacing.xs },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
