import { Pressable, StyleSheet, View } from 'react-native';

import { CreditPill } from '@/components/credits/CreditPill';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { palette, spacing } from '@/constants/theme';
import { formatLevel } from '@/lib/levels';
import type { Reward } from '@/types/models';

export type RewardAvailability = {
  affordable: boolean;
  levelMet: boolean;
  inStock: boolean;
};

export function resolveAvailability(reward: Reward, balance: number, level: number): RewardAvailability {
  return {
    affordable: balance >= reward.cost,
    levelMet: reward.minLevel === null || level >= reward.minLevel,
    inStock: reward.remaining === null || reward.remaining > 0,
  };
}

/**
 * A reward tile. Locked rewards stay fully visible rather than being hidden or blurred —
 * seeing what is further up the ladder is the point of the ladder.
 */
export function RewardCard({
  reward,
  balance,
  level,
  onPress,
}: {
  reward: Reward;
  balance: number;
  level: number;
  onPress: () => void;
}) {
  const { affordable, levelMet, inStock } = resolveAvailability(reward, balance, level);
  const locked = !levelMet || !inStock;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${reward.title}, ${reward.cost} credits`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Surface style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="heading" tone={locked ? 'tertiary' : 'primary'} numberOfLines={1}>
              {reward.title}
            </Text>
            {reward.subtitle && (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {reward.subtitle}
              </Text>
            )}
          </View>
          {locked && <Icon name="lock" size={16} color={palette.titanium} />}
        </View>

        <Text variant="bodySmall" tone="tertiary" numberOfLines={2}>
          {reward.description}
        </Text>

        <View style={styles.footer}>
          <CreditPill amount={reward.cost} size="sm" />

          <View style={styles.tags}>
            {!levelMet && reward.minLevel !== null && (
              <Chip label={formatLevel(reward.minLevel)} tone="muted" />
            )}
            {!inStock && <Chip label="SOLD OUT" tone="muted" />}
            {levelMet && inStock && !affordable && <Chip label="KEEP EARNING" tone="muted" />}
            {levelMet && inStock && affordable && <Chip label="AVAILABLE" tone="active" />}
            {reward.remaining !== null && reward.remaining > 0 && reward.remaining <= 10 && (
              <Chip label={`${reward.remaining} LEFT`} tone="warning" />
            )}
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.md },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: 3 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end', flexShrink: 1 },
});
